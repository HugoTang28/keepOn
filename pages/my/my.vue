<template>
  <view class="page">
    <view class="content">
      <!-- 顶部个人信息 -->
      <view class="profile-card" @click="handleProfileTap">
        <view class="avatar">
          <image
            v-if="user.avatarUrl"
            class="avatar-img"
            :src="user.avatarUrl"
            mode="aspectFill"
          ></image>
          <u-icon v-else name="account-fill" color="#ffffff" size="50"></u-icon>
        </view>
        <view class="profile-info">
          <text class="login-text">{{ user.nickName || '未登录' }}</text>
          <text class="login-tip">{{ loginTip }}</text>
        </view>
        <view
          v-if="user.nickName"
          class="logout-btn"
          @click.stop="handleLogout"
        >
          <image
            class="logout-icon"
            src="/static/imgages/logout.png"
            mode="aspectFit"
          ></image>
        </view>
      </view>

      <view v-if="loggedIn" class="list-card">
        <view class="list-item" @click="goSetSite">
          <view class="item-icon">
            <u-icon name="map-fill" color="#4f6ef7" size="18"></u-icon>
          </view>
          <text class="item-label">打卡点设置</text>
          <text class="item-value">{{ targetName }}</text>
          <view class="item-arrow"></view>
        </view>
      </view>
    </view>

    <!-- 微信头像昵称填写-->
    <profile-sheet
      :show="showSheet"
      @close="showSheet = false"
      @confirm="onProfileConfirm"
    />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { clearUser, getTarget, getUser, saveUser, toast } from '@/utils/common';
import ProfileSheet from '@/components/my/profile-sheet.vue';

const user = ref(getUser());
const targetName = ref(getTarget().name);
const logging = ref(false);
const showSheet = ref(false);

const loggedIn = computed(() => !!user.value.nickName);
const loginTip = computed(() => {
  if (logging.value) return '正在登录...';
  return loggedIn.value ? '' : '点击登录';
});

const load = () => {
  user.value = getUser();
  targetName.value = getTarget().name;
};

const goSetSite = () => {
  uni.navigateTo({ url: '/pages/my/setSite/index' });
};

// 微信登录：uni.login 建立会话，getUserProfile 获取昵称头像
// #ifdef MP-WEIXIN
const weixinLogin = () =>
  new Promise((resolve, reject) => {
    uni.login({ provider: 'weixin', success: resolve, fail: reject });
  });

const weixinProfile = () =>
  new Promise((resolve, reject) => {
    uni.getUserProfile({
      desc: '用于在“我的”页展示昵称和头像',
      success: (res) => resolve(res.userInfo || {}),
      fail: reject
    });
  });

const getWeixinProfile = async () => {
  await weixinLogin();
  return weixinProfile();
};
// #endif

const applyUser = (nickName, avatarUrl = '') => {
  try {
    saveUser({ nickName, avatarUrl });
    user.value = getUser();
    toast('登录成功');
    return true;
  } catch (e) {
    console.warn('[my] 保存用户信息失败：', e);
    toast('保存失败，请重试');
    return false;
  }
};

const openSheet = () => {
  showSheet.value = true;
};

// 组件内已处理头像选择与 base64 转换，这里只负责校验并落库
const onProfileConfirm = ({ nickName = '', avatarUrl = '' } = {}) => {
  const name = (nickName || '').trim();
  if (!name || !applyUser(name, avatarUrl)) return;
  showSheet.value = false;
};

const logout = () => {
  try {
    clearUser();
    user.value = getUser();
    toast('已退出登录');
  } catch (e) {
    console.warn('[my] 退出登录失败：', e);
    toast('退出失败，请重试');
  }
};

const login = async () => {
  if (logging.value) return;
  logging.value = true;
  try {
    // #ifdef MP-WEIXIN
    const info = await getWeixinProfile();
    const nickName = (info.nickName || '').trim();
    // 新版接口可能只返回“微信用户”，改用官方昵称头像填写能力
    if (nickName && nickName !== '微信用户') {
      if (applyUser(nickName, info.avatarUrl || '')) return;
    }
    // #endif
    openSheet();
  } catch (e) {
    console.warn('[my] 登录失败：', e);
    toast('已取消登录');
  } finally {
    logging.value = false;
  }
};

// 点击头像登录
const handleProfileTap = () => {
  if (!loggedIn.value) login();
};

const handleLogout = () => {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    success: (res) => {
      if (res.confirm) logout();
    }
  });
};

onShow(load);
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 60rpx;

  .content {
    padding: 24rpx 28rpx 0;
    .profile-card {
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 30rpx 32rpx;
      background-color: #fff;
      border-radius: 28rpx;
      margin-bottom: 24rpx;

      &:active {
        opacity: 0.9;
      }

      .avatar {
        width: 140rpx;
        height: 140rpx;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
        background: linear-gradient(
          135deg,
          #0f172a 0%,
          #1b2a4a 60%,
          #2f4b8f 100%
        );
        .avatar-img {
          width: 100%;
          height: 100%;
          display: block;
        }
      }

      .profile-info {
        flex: 1;
        min-width: 0;
        margin-left: 24rpx;
        display: flex;
        flex-direction: column;
        align-items: flex-start;

        .login-text,
        .login-tip {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .login-text {
          font-size: 32rpx;
          font-weight: 500;
          letter-spacing: 1rpx;
          color: #1f2d5e;
        }

        .login-tip {
          margin-top: 20rpx;
          font-size: 24rpx;
          color: #98a2b3;
        }
      }

      .logout-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 72rpx;
        height: 72rpx;
        margin-left: auto;
        border-radius: 50%;

        &:active {
          background: #f2f4f8;
        }

        .logout-icon {
          width: 40rpx;
          height: 40rpx;
          opacity: 0.65;
        }
      }
    }
    .list-card {
      padding: 0 28rpx;
      border-radius: 28rpx;
      background: #ffffff;
      box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.05);

      .list-item {
        display: flex;
        align-items: center;
        padding: 26rpx 0;

        & + .list-item {
          border-top: 1rpx solid #f4f6fa;
        }

        &:active {
          opacity: 0.7;
        }

        .item-icon {
          width: 64rpx;
          height: 64rpx;
          margin-right: 20rpx;
          border-radius: 18rpx;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #eef1fe;
        }

        .item-label {
          flex: 1;
          font-size: 28rpx;
          color: #1f2d5e;
        }

        .item-value {
          max-width: 300rpx;
          margin-right: 14rpx;
          font-size: 24rpx;
          color: #98a2b3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-arrow {
          width: 14rpx;
          height: 14rpx;
          border-top: 3rpx solid #c4c9d4;
          border-right: 3rpx solid #c4c9d4;
          transform: rotate(45deg);
          flex-shrink: 0;
        }
      }
    }
  }
}
</style>
