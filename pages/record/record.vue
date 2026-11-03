<template>
  <view class="page">
    <!-- 未登录：引导去「我的」页登录 -->
    <view v-if="!loggedIn" class="empty">
      <text class="empty-title">登录后查看打卡记录</text>
      <text class="empty-tip">请先登录账号，才能同步你的打卡记录</text>
      <view class="empty-btn" @click="goMy">去登录</view>
    </view>

    <template v-else>
      <!-- 数据概览 -->
      <view v-if="records.length" class="summary">
        <view class="summary-item">
          <text class="summary-num">{{ stats.streak }}</text>
          <text class="summary-label">连续打卡</text>
        </view>
        <view class="summary-line"></view>
        <view class="summary-item">
          <text class="summary-num">{{ stats.month }}</text>
          <text class="summary-label">本月打卡</text>
        </view>
        <view class="summary-line"></view>
        <view class="summary-item">
          <text class="summary-num">{{ stats.total }}</text>
          <text class="summary-label">累计打卡</text>
        </view>
      </view>

      <!-- 按月分组 -->
      <view v-for="group in groups" :key="group.key" class="group">
        <view class="group-head" @click="toggleGroup(group.key)">
          <text class="group-title"
            >{{ group.title }}——{{ group.items.length }} 次</text
          >
          <view class="group-arrow">
            <u-icon
              :name="isClosed(group.key) ? 'arrow-right' : 'arrow-down'"
              color="#98a2b3"
              size="18"
            ></u-icon>
          </view>
        </view>

        <view v-if="!isClosed(group.key)" class="group-card">
          <view v-for="item in group.items" :key="item.id" class="record">
            <view
              class="record-dot"
              :class="{ warn: item.status === 'abnormal' }"
            ></view>
            <view class="record-date">
              <text class="date-main">{{ item.monthDay }}</text>
              <text class="date-sub">{{ item.weekday }}</text>
            </view>
            <view v-if="item.status" class="record-flags">
              <text class="flag" :class="item.status">{{
                item.status === 'normal' ? '正常' : '异常'
              }}</text>
            </view>
            <view class="record-times">
              <view class="time-tags">
                <text class="time-tag">签到</text>
                <text v-if="item.endTime" class="time-tag">签退</text>
              </view>
              <view class="time-values">
                <text class="time-value">{{ item.startTime }}</text>
                <view class="time-value-row">
                  <text class="time-value">{{ item.endTime || '未签退' }}</text>
                  <text v-if="item.endNextDay" class="time-plus">+1</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="!records.length" class="empty">
        <view class="empty-icon">
          <u-icon name="calendar" color="#c4c9d4" size="38"></u-icon>
        </view>
        <text class="empty-title">还没有打卡记录</text>
        <view class="empty-btn" @click="goHome">去打卡</view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import {
  getRecords,
  getUser,
  calcStreak,
  formatDate,
  getDutyDate,
  isLateRecord,
  isEarlyRecord,
  pad
} from '@/utils/common';

const records = ref([]);
const user = ref(getUser());
const loggedIn = computed(() => !!user.value.nickName);
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

// 已折叠的月份（存月份 key，切页面时保留本次操作）
const closedKeys = ref([]);
const isClosed = (key) => closedKeys.value.indexOf(key) >= 0;
const toggleGroup = (key) => {
  const list = closedKeys.value.slice();
  const i = list.indexOf(key);
  if (i >= 0) list.splice(i, 1);
  else list.push(key);
  closedKeys.value = list;
};

const parseDate = (str) => {
  const parts = String(str || '').split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return {
    monthDay: `${m}月${pad(d)}日`,
    weekday: `星期${WEEK[date.getDay()]}`,
    monthKey: `${y}-${pad(m)}`,
    monthTitle: `${y}年${m}月`
  };
};

// 签退时间；跨零点时单独标记，由模板在右上角显示 "+1"
const endLabel = (r) => (r.end ? r.end.time : '');
const isNextDay = (r) =>
  !!(
    r.end &&
    r.end.timestamp &&
    formatDate(new Date(r.end.timestamp)) !== r.date
  );

// 考勤标签：
// 1. 迟到判定不看签退：只要晚于 08:00 签到就是异常
// 2. 未签退：当天（含凌晨 0–6 点归属前一天）算进行中，不判定；已过期则异常
// 3. 签到签退齐全：无迟到/早退为正常，否则异常
const statusOf = (r) => {
  if (!r.start) return '';
  const late = isLateRecord(r);
  if (!r.end) {
    if (late) return 'abnormal';
    return r.date === getDutyDate(new Date()) ? '' : 'abnormal';
  }
  return late || isEarlyRecord(r) ? 'abnormal' : 'normal';
};

const groups = computed(() => {
  const map = new Map();
  records.value.forEach((r) => {
    const p = parseDate(r.date);
    if (!map.has(p.monthKey)) {
      map.set(p.monthKey, { key: p.monthKey, title: p.monthTitle, items: [] });
    }
    map.get(p.monthKey).items.push({
      id: r.id,
      startTime: r.start ? r.start.time : '--',
      endTime: endLabel(r),
      endNextDay: isNextDay(r),
      status: statusOf(r),
      monthDay: p.monthDay,
      weekday: p.weekday
    });
  });
  return Array.from(map.values());
});

const stats = computed(() => {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  return {
    total: records.value.length,
    month: records.value.filter(
      (r) => typeof r.date === 'string' && r.date.indexOf(prefix) === 0
    ).length,
    streak: calcStreak(records.value, now)
  };
});

const load = () => {
  user.value = getUser();
  if (!loggedIn.value) {
    records.value = [];
    return;
  }
  records.value = getRecords()
    .filter((r) => r && r.date && r.start)
    .sort((a, b) => (b.start.timestamp || 0) - (a.start.timestamp || 0));
};

const goHome = () => {
  uni.switchTab({ url: '/pages/home/home' });
};

const goMy = () => {
  uni.switchTab({ url: '/pages/my/my' });
};

onShow(() => {
  load();
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 24rpx 28rpx 60rpx;
}
.summary {
  display: flex;
  align-items: center;
  padding: 32rpx 0;
  margin-bottom: 28rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #0f172a 0%, #1b2a4a 60%, #2f4b8f 100%);
  box-shadow: 0 14rpx 34rpx rgba(15, 23, 42, 0.18);
  .summary-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    .summary-num {
      font-size: 44rpx;
      font-weight: 700;
      line-height: 1.1;
      color: #ffffff;
    }
    .summary-label {
      margin-top: 8rpx;
      font-size: 21rpx;
      color: rgba(255, 255, 255, 0.55);
    }
  }

  .summary-line {
    width: 1rpx;
    height: 48rpx;
    background: rgba(255, 255, 255, 0.14);
  }
}
.group {
  margin-bottom: 28rpx;

  .group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8rpx 16rpx;

    &:active {
      opacity: 0.7;
    }

    .group-title {
      font-size: 26rpx;
      font-weight: 600;
      letter-spacing: 1rpx;
      color: #1f2d5e;
    }

    .group-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40rpx;
      height: 40rpx;
      transition: transform 0.22s ease;
    }
  }

  .group-card {
    padding: 4rpx 34rpx;
    border-radius: 28rpx;
    background: #ffffff;
    box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.05);
  }

  .record {
    display: flex;
    align-items: center;
    padding: 26rpx 0;

    & + .record {
      border-top: 1rpx solid #f4f6fa;
    }

    .record-dot {
      width: 12rpx;
      height: 12rpx;
      margin-right: 18rpx;
      border-radius: 50%;
      background-color: #12b76a;
      flex-shrink: 0;

      &.warn {
        background-color: #f04438;
      }
    }

    .record-flags {
      display: flex;
      align-items: center;
      margin-right: 18rpx;

      .flag {
        padding: 4rpx 12rpx;
        border-radius: 999rpx;
        font-size: 19rpx;
        line-height: 1.3;
        white-space: nowrap;

        &.normal {
          color: #12b76a;
          background: rgba(18, 183, 106, 0.12);
        }

        &.abnormal {
          color: #f04438;
          background: rgba(240, 68, 56, 0.12);
        }
      }
    }

    .record-times {
      display: flex;
      align-items: flex-start;
      flex-shrink: 0;

      .time-tags,
      .time-values {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .time-tags {
        margin-right: 14rpx;
      }

      .time-tag {
        height: 38rpx;
        line-height: 38rpx;
        font-size: 20rpx;
        color: #98a2b3;

        & + .time-tag {
          margin-top: 6rpx;
        }
      }

      .time-value {
        height: 38rpx;
        line-height: 38rpx;
        font-size: 28rpx;
        font-weight: 600;
        color: #1f2d5e;
        font-variant-numeric: tabular-nums;

        & + .time-value {
          margin-top: 6rpx;
        }
      }

      .time-value-row {
        position: relative;
        margin-top: 6rpx;
      }
      .time-plus {
        position: absolute;
        top: 2rpx;
        right: -20rpx;
        font-size: 18rpx;
        line-height: 1;
        color: #98a2b3;
      }
    }

    .record-date {
      flex: 1;
      display: flex;
      flex-direction: column;

      .date-main {
        font-size: 27rpx;
        font-weight: 500;
        color: #1f2d5e;
      }

      .date-sub {
        margin-top: 6rpx;
        font-size: 21rpx;
        color: #98a2b3;
      }
    }
  }
}

/* ---------- 空状态 ---------- */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 140rpx;

  .empty-icon {
    width: 140rpx;
    height: 140rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    box-shadow: 0 12rpx 30rpx rgba(15, 23, 42, 0.06);
  }

  .empty-title {
    margin-top: 30rpx;
    font-size: 30rpx;
    font-weight: 600;
    color: #1f2d5e;
  }

  .empty-tip {
    margin-top: 16rpx;
    font-size: 24rpx;
    color: #98a2b3;
  }

  .empty-btn {
    margin-top: 40rpx;
    padding: 0 64rpx;
    height: 76rpx;
    line-height: 76rpx;
    border-radius: 999rpx;
    font-size: 27rpx;
    color: #ffffff;
    background: linear-gradient(135deg, #5b7cfa, #7c5cf6);
    box-shadow: 0 12rpx 28rpx rgba(79, 110, 247, 0.3);

    &:active {
      opacity: 0.9;
    }
  }
}
</style>
