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

      <view class="list-card">
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
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getTarget, getUser, saveUser, clearUser, toast } from '@/utils/common';
import ProfileSheet from '@/components/my/profile-sheet.vue';

const targetName = ref(getTarget().name);
const user = ref(getUser());
const logging = ref(false);
const showSheet = ref(false);

const loginTip = computed(() => {
  if (logging.value) return '正在唤起微信授权...';
  return user.value.nickName ? '' : '点击使用微信登录';
});

const load = () => {
  targetName.value = getTarget().name;
  user.value = getUser();
};

const goSetSite = () => {
  uni.navigateTo({ url: '/pages/my/setSite/index' });
};

// 微信登录：uni.login 建立会话，getUserProfile 取昵称头像
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

const applyUser = (nickName, avatarUrl = '') => {
  try {
    saveUser({ nickName, avatarUrl });
    user.value = getUser();
    toast('登录成功');
  } catch (e) {
    toast('保存失败，请重试');
  }
};

// 组件内已处理头像选择与 base64 转换，这里只负责落库
const onProfileConfirm = ({ nickName, avatarUrl }) => {
  applyUser(nickName, avatarUrl);
  showSheet.value = false;
};

const openSheet = () => {
  showSheet.value = true;
};

const logout = () => {
  clearUser();
  user.value = getUser();
  toast('已退出登录');
};

const login = async () => {
  if (logging.value) return;
  logging.value = true;
  try {
    // #ifdef MP-WEIXIN
    await weixinLogin();
    const info = await weixinProfile();
    const nickName = (info.nickName || '').trim();
    // 微信对旧接口只会返回"微信用户"，这种情况改用官方昵称填写能力
    if (nickName && nickName !== '微信用户') {
      applyUser(nickName, info.avatarUrl || '');
      return;
    }
    openSheet();
    return;
    // #endif
  } catch (e) {
    toast('已取消登录');
  } finally {
    logging.value = false;
  }
};

const handleProfileTap = () => {
  if (!user.value.nickName) login();
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

onShow(() => {
  load();
});
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
        margin-left: 24rpx;
        display: flex;
        flex-direction: column;
        align-items: flex-start;

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
