<template>
  <view class="page">
    <!-- 顶部品牌与问候 -->
    <view class="hero">
      <view class="glow glow-1"></view>
      <view class="glow glow-2"></view>

      <view class="brand-line">
        <view class="brand-dot"></view>
        <text class="brand-name">坚持号</text>
        <text class="brand-slogan">日日坚持 · 步步向前</text>
      </view>

      <view class="hero-head">
        <view class="hero-greet">
          <text class="greet">{{ greeting }}</text>
          <text class="date">{{ dateText }}</text>
        </view>
        <view class="streak-pill">
          <text class="streak-num">{{ stats.streak }}</text>
          <text class="streak-label">天</text>
        </view>
      </view>
    </view>

    <view class="content">
      <!-- 打卡主卡 -->
      <view class="card checkin-card">
        <view class="card-head">
          <view class="head-left">
            <text class="card-title">学习打卡点</text>
            <view class="head-site">
              <u-icon name="map-fill" color="#98a2b3" size="12"></u-icon>
              <text class="card-sub">{{ target.name }}</text>
            </view>
          </view>
          <view v-if="status" class="chip" :class="'chip-' + status.type">{{
            status.text
          }}</view>
        </view>

        <view class="checkin-stage">
          <view class="checkin-ring" :class="ringClass">
            <view
              class="checkin-inner"
              :class="ringClass"
              @click="handleCheckIn"
            >
              <u-icon
                v-if="finishedToday"
                name="checkmark"
                color="#ffffff"
                size="28"
                :bold="true"
              ></u-icon>
              <text v-else class="checkin-icon">{{ punchText }}</text>
              <text class="checkin-text">{{ btnSubText }}</text>
            </view>
          </view>
          <text
            class="stage-hint"
            :class="{
              success: inRange && !locationError,
              error: locationError
            }"
            >{{ tipText }}</text
          >
        </view>

        <view
          class="location-bar"
          :class="{ success: inRange && !locationError, error: locationError }"
        >
          <view class="loc-info">
            <view class="loc-dot"></view>
            <text class="loc-num">{{ distanceMain }}</text>
            <text class="loc-unit">{{ distanceUnit }}</text>
            <text class="loc-text">距离打卡点</text>
          </view>
          <view
            class="loc-btn"
            :class="{ disabled: locating }"
            @click="locate()"
          >
            <u-icon name="reload" color="#4f6ef7" size="13"></u-icon>
            <text class="loc-btn-text">{{
              locating ? '定位中' : '重新定位'
            }}</text>
          </view>
        </view>

        <text v-if="locationError" class="error-hint" @click="showLocationHelp">
          {{ locationErrorMsg }}，点此查看解决办法
        </text>
      </view>

      <!-- 本周记录 -->
      <view class="card week-card">
        <view class="card-head">
          <text class="card-title">本周打卡</text>
          <view class="head-right">
            <text class="card-sub">{{ weekDone }}/7 天</text>
            <text class="link" @click="goRecord">全部记录 ›</text>
          </view>
        </view>

        <view class="week-row">
          <view v-for="day in weekDays" :key="day.date" class="week-item">
            <text class="week-label" :class="{ today: day.isToday }">{{
              day.label
            }}</text>
            <view
              class="week-dot"
              :class="{ active: day.active, today: day.isToday && !day.active }"
            >
              <u-icon
                v-if="day.active"
                name="checkmark"
                color="#ffffff"
                size="13"
                :bold="true"
              ></u-icon>
            </view>
          </view>
        </view>

        <view class="today-line">
          <text v-if="todayRecord" class="today-text">{{ todaySummary }}</text>
          <text v-else class="today-text">{{
            beforeStart
              ? '签到 06:00 开始，到点后到打卡点签到'
              : '今天还没有签到，到达打卡点后开启学习'
          }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import {
  RANGE,
  RULES,
  DEFAULT_TARGET,
  formatDate,
  formatTime,
  formatDistance,
  formatDuration,
  minutesOf,
  getDutyDate,
  isLate,
  isEarly,
  isLateRecord,
  isEarlyRecord,
  toast,
  getRecords,
  saveRecords,
  getTarget,
  getUser,
  calcStreak
} from '@/utils/common';
import {
  getCurrentLocation,
  getDistanceMeters,
  explainLocationError
} from '@/utils/location';

const nowRef = ref(new Date());
const records = ref([]);
const user = ref(getUser());
const target = ref({ ...DEFAULT_TARGET });
const current = ref(null);
const locating = ref(false);
const locationError = ref(false);
const locationErrorMsg = ref('');

const greeting = computed(() => {
  const h = nowRef.value.getHours();
  if (h < 6) return '夜深了，注意休息';
  if (h < 12) return '早上好，开始学习吧';
  if (h < 14) return '中午好，别忘了打卡';
  if (h < 18) return '下午好，保持专注';
  return '晚上好，坚持一下';
});

const dateText = computed(() => {
  const d = nowRef.value;
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${week}`;
});

// 当前考勤日（凌晨 0:00–06:00 的签退仍算前一天）
const todayStr = computed(() => getDutyDate(nowRef.value));
const beforeStart = computed(
  () => minutesOf(nowRef.value) < RULES.START_EARLIEST
);
const loggedIn = computed(() => !!user.value.nickName);

// 未登录不读取记录，避免退出后仍显示上一个账号的打卡数据
const loadRecords = () => {
  records.value = loggedIn.value ? getRecords() : [];
};

const loadTarget = () => {
  target.value = getTarget();
};

const stats = computed(() => ({
  streak: calcStreak(records.value, nowRef.value)
}));

const weekDays = computed(() => {
  const base = nowRef.value;
  const set = new Set(records.value.map((r) => r.date));
  const labels = ['日', '一', '二', '三', '四', '五', '六'];
  const todayKey = formatDate(base);
  // 本周一
  const monday = new Date(base);
  const weekday = monday.getDay() === 0 ? 7 : monday.getDay();
  monday.setDate(monday.getDate() - (weekday - 1));
  const list = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = formatDate(d);
    list.push({
      date: key,
      label: key === todayKey ? '今' : labels[d.getDay()],
      active: set.has(key),
      isToday: key === todayKey
    });
  }
  return list;
});

const weekDone = computed(() => weekDays.value.filter((d) => d.active).length);

// 打卡用的记录：按考勤日取（凌晨 0–6 点仍算前一天，用于补签退）
const dutyRecord = computed(
  () => records.value.find((r) => r.date === todayStr.value) || null
);
const startedDuty = computed(
  () => !!(dutyRecord.value && dutyRecord.value.start)
);
const endedDuty = computed(() => !!(dutyRecord.value && dutyRecord.value.end));

// 展示用的记录：只认自然日，凌晨时不会再把昨天的记录当成"今日"
const calendarToday = computed(() => formatDate(nowRef.value));
const todayRecord = computed(
  () => records.value.find((r) => r.date === calendarToday.value) || null
);
const finishedToday = computed(
  () =>
    !!(todayRecord.value && todayRecord.value.start && todayRecord.value.end)
);

// 下一次该打哪种卡：start 签到 / end 签退 / '' 无（本次考勤已完成且不可再动）
// 当天已签退：当天（06:00 后）仍可更新签退时间；到了次日 0:00–6:00 就不再出现签退
const punchType = computed(() => {
  if (!startedDuty.value) return 'start';
  if (!endedDuty.value) return 'end';
  return beforeStart.value ? '' : 'end';
});

// 签到最早 06:00；签退只要已签到即可随时打（18:00 前签退记早退，18:00 后为正常考勤）
const canPunch = computed(() => {
  if (!punchType.value) return false;
  if (punchType.value === 'start' && beforeStart.value) return false;
  return true;
});

// 跨零点签退标注"次日"
const endTimeLabel = (rec) => {
  if (!rec || !rec.end) return '';
  const nextDay =
    rec.end.timestamp && formatDate(new Date(rec.end.timestamp)) !== rec.date;
  return `${nextDay ? '次日 ' : ''}${rec.end.time}`;
};

const todaySummary = computed(() => {
  const rec = todayRecord.value;
  if (!rec) return '';
  let text = `今日 ${rec.start.time} 签到${isLateRecord(rec) ? '（迟到）' : ''}`;
  text += rec.end
    ? ` · ${endTimeLabel(rec)} 签退${isEarlyRecord(rec) ? '（早退）' : ''}`
    : ' · 未签退';
  return text;
});

const distance = computed(() => getDistanceMeters(current.value, target.value));
const inRange = computed(
  () => distance.value !== null && distance.value <= RANGE
);

const distanceMain = computed(() => {
  if (distance.value === null) return '--';
  return distance.value < 1000
    ? `${Math.max(1, Math.round(distance.value))}`
    : (distance.value / 1000).toFixed(2);
});

const distanceUnit = computed(() => {
  if (distance.value === null) return '';
  return distance.value < 1000 ? 'm' : 'km';
});

const status = computed(() => {
  const rec = todayRecord.value;
  if (rec && rec.end) {
    const flags = [];
    if (isLateRecord(rec)) flags.push('迟到');
    if (isEarlyRecord(rec)) flags.push('早退');
    return flags.length ? { type: 'error', text: flags.join('·') } : null;
  }
  if (locating.value) return { type: 'loading', text: '定位中' };
  if (locationError.value) return { type: 'error', text: '定位失败' };
  if (!rec)
    return { type: 'warn', text: beforeStart.value ? '未到时间' : '未签到' };
  return isLateRecord(rec)
    ? { type: 'error', text: '迟到' }
    : { type: 'success', text: '学习中' };
});

const ringActive = computed(
  () =>
    !locating.value &&
    !locationError.value &&
    !!current.value &&
    inRange.value &&
    canPunch.value
);

const btnSubText = computed(() => {
  if (!loggedIn.value) return '登录后打卡';
  if (locating.value) return '定位中...';
  if (locationError.value) return '定位失败';
  if (!current.value) return '待定位';
  if (!inRange.value) return '不在范围';
  if (!canPunch.value) return '未到时间';
  return '';
});

const punchText = computed(() => (punchType.value === 'end' ? '签退' : '签到'));

const ringClass = computed(() => {
  if (finishedToday.value) return 'done';
  return ringActive.value ? 'ready' : 'disabled';
});

const tipText = computed(() => {
  if (!loggedIn.value) return '';
  if (locating.value) return '正在定位...';
  if (locationError.value) return '定位失败，请重试';
  if (!current.value) return '等待获取位置';
  if (!inRange.value) return `需进入 ${RANGE} 米范围内`;
  if (!canPunch.value) return '签到 06:00 开始';
  return '已到达打卡范围';
});

const locate = async () => {
  if (locating.value) return;
  locating.value = true;
  locationError.value = false;
  locationErrorMsg.value = '';
  try {
    current.value = await getCurrentLocation();
  } catch (e) {
    current.value = null;
    locationError.value = true;
    locationErrorMsg.value = explainLocationError(e);
    toast(locationErrorMsg.value);
  } finally {
    locating.value = false;
  }
};

const showLocationHelp = () => {
  let platform = '';
  try {
    const sys = uni.getSystemInfoSync();
    platform = `${sys.uniPlatform || ''} ${sys.osName || ''}`.trim();
  } catch (e) {}
  uni.showModal({
    title: '定位失败',
    content: `原因：${locationErrorMsg.value || '未知'}\n环境：${
      platform || '未知'
    }\n请依次确认：\n1. 已开启系统/浏览器定位权限\n2. H5 需 HTTPS 访问并配置地图 Key\n3. 微信小程序需真实 AppID 并允许位置\n4. App 需开启系统定位开关`,
    confirmText: '去设置',
    success: (res) => {
      if (!res.confirm) return;
      try {
        uni.openSetting({ fail: () => {} });
      } catch (e) {}
    }
  });
};

const vibrate = () => {
  try {
    uni.vibrateShort({ fail: () => {} });
  } catch (e) {}
};

const doCheckIn = () => {
  const now = new Date();
  const list = records.value.slice();
  const punch = {
    time: formatTime(now),
    timestamp: now.getTime(),
    latitude: current.value.latitude,
    longitude: current.value.longitude,
    distance: distance.value === null ? 0 : Math.round(distance.value),
    locationName: target.value ? target.value.name : '学习打卡点'
  };
  const idx = list.findIndex((r) => r.date === todayStr.value);
  let msg = '';
  if (punchType.value === 'start') {
    const late = isLate(now);
    const record = {
      id: `${now.getTime()}`,
      date: todayStr.value,
      start: { ...punch, late },
      end: null
    };
    if (idx >= 0) list.splice(idx, 1, record);
    else list.unshift(record);
    msg = late ? '签到成功 · 迟到' : '签到成功';
  } else {
    if (idx < 0) return;
    const target = list[idx];
    const early = isEarly(now, target.date);
    list.splice(idx, 1, { ...target, end: { ...punch, early } });
    if (target.end) msg = early ? '签退已更新 · 早退' : '签退时间已更新';
    else msg = early ? '签退成功 · 早退' : '签退成功';
  }
  records.value = list;
  saveRecords(list);
  vibrate();
  uni.showToast({ title: msg, icon: 'none', duration: 1500 });
};

// const confirmModal = (title, content, confirmText = '确定') =>
// 	new Promise((resolve) => {
// 		uni.showModal({
// 			title,
// 			content,
// 			confirmText,
// 			success: (res) => resolve(!!res.confirm),
// 			fail: () => resolve(false)
// 		})
// 	})

// 未登录不允许打卡，引导去"我的"页登录
const promptLogin = () => {
  uni.showModal({
    title: '请先登录',
    content: '登录后才能打卡，是否前往登录？',
    confirmText: '去登录',
    success: (res) => {
      if (res.confirm) uni.switchTab({ url: '/pages/my/my' });
    }
  });
};

const handleCheckIn = async () => {
  if (!loggedIn.value) {
    promptLogin();
    return;
  }
  if (!canPunch.value) {
    toast('签到时间 06:00 开始');
    return;
  }
  if (locating.value) {
    toast('正在定位，请稍候');
    return;
  }
  if (!current.value) {
    await locate();
    if (!current.value) {
      toast('定位失败，无法打卡');
      return;
    }
  }
  if (!inRange.value) {
    toast(`距离打卡点 ${formatDistance(distance.value)}，请靠近后打卡`);
    return;
  }
  doCheckIn();
};

const goRecord = () => {
  uni.switchTab({ url: '/pages/record/record' });
};

onShow(() => {
  nowRef.value = new Date();
  user.value = getUser();
  loadRecords();
  loadTarget();
  if (!current.value && !locating.value) locate();
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 40rpx;

  /* ---------- 顶部 ---------- */
  .hero {
    position: relative;
    padding: 30rpx 32rpx 100rpx;
    background: linear-gradient(150deg, #0f172a 0%, #1b2a4a 52%, #2f4b8f 100%);
    border-radius: 0 0 40rpx 40rpx;
    overflow: hidden;

    .glow {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
    }

    .glow-1 {
      width: 300rpx;
      height: 300rpx;
      top: -150rpx;
      right: -80rpx;
    }

    .glow-2 {
      width: 200rpx;
      height: 200rpx;
      bottom: -100rpx;
      left: -50rpx;
      background: rgba(255, 255, 255, 0.06);
    }

    .brand-line {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 26rpx;

      .brand-dot {
        width: 10rpx;
        height: 10rpx;
        margin-right: 12rpx;
        border-radius: 50%;
        background: linear-gradient(135deg, #6ea8ff, #b388ff);
      }

      .brand-name {
        font-size: 24rpx;
        font-weight: 600;
        letter-spacing: 2rpx;
        color: rgba(255, 255, 255, 0.92);
      }

      .brand-slogan {
        margin-left: 14rpx;
        padding-left: 14rpx;
        border-left: 1rpx solid rgba(255, 255, 255, 0.18);
        font-size: 22rpx;
        letter-spacing: 2rpx;
        color: rgba(255, 255, 255, 0.5);
      }
    }

    .hero-head {
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;

      .hero-greet {
        display: flex;
        flex-direction: column;

        .greet {
          font-size: 40rpx;
          font-weight: 600;
          letter-spacing: 1rpx;
          color: #ffffff;
        }

        .date {
          margin-top: 10rpx;
          font-size: 24rpx;
          color: rgba(255, 255, 255, 0.72);
        }
      }

      .streak-pill {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-width: 108rpx;
        padding: 10rpx 0;
        border-radius: 20rpx;
        background: rgba(255, 255, 255, 0.12);
        border: 1rpx solid rgba(255, 255, 255, 0.18);

        .streak-num {
          font-size: 34rpx;
          font-weight: 700;
          line-height: 1.1;
          color: #ffffff;
        }

        .streak-label {
          margin-top: 4rpx;
          font-size: 18rpx;
          color: rgba(255, 255, 255, 0.6);
        }
      }
    }
  }

  /* ---------- 内容 ---------- */
  .content {
    position: relative;
    margin-top: -64rpx;
    padding: 0 28rpx;

    .card {
      background: #ffffff;
      border-radius: 32rpx;
      padding: 30rpx 32rpx;
      margin-bottom: 20rpx;
      box-shadow: 0 10rpx 36rpx rgba(15, 23, 42, 0.06);
    }

    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .card-title {
        font-size: 28rpx;
        font-weight: 600;
        color: #1f2d5e;
      }

      .head-left {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        margin-right: 16rpx;

        .card-sub {
          margin-top: 6rpx;
          font-size: 23rpx;
          color: #98a2b3;
        }

        .head-site {
          display: flex;
          align-items: center;
          margin-top: 8rpx;
          min-width: 0;

          .card-sub {
            display: block;
            flex: 1;
            margin-top: 0;
            margin-left: 6rpx;
            font-size: 22rpx;
            color: #98a2b3;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }

      .head-right {
        display: flex;
        align-items: center;

        .card-sub {
          font-size: 22rpx;
          color: #98a2b3;
        }

        .link {
          margin-left: 20rpx;
          font-size: 23rpx;
          color: #4f6ef7;
        }
      }

      .chip {
        padding: 8rpx 18rpx;
        border-radius: 999rpx;
        font-size: 21rpx;
        line-height: 1.2;

        &.chip-success {
          color: #12b76a;
          background: rgba(18, 183, 106, 0.12);
        }

        &.chip-warn {
          color: #f79009;
          background: rgba(247, 144, 9, 0.12);
        }

        &.chip-error {
          color: #f04438;
          background: rgba(240, 68, 56, 0.12);
        }

        &.chip-loading {
          color: #4f6ef7;
          background: rgba(79, 110, 247, 0.12);
        }
      }
    }

    /* 打卡主卡 */
    .checkin-card {
      .checkin-stage {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 28rpx 0 0;

        .checkin-ring {
          position: relative;
          width: 208rpx;
          height: 208rpx;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: radial-gradient(
            circle,
            rgba(79, 110, 247, 0.08) 0%,
            rgba(79, 110, 247, 0.02) 70%
          );

          &.ready::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 50%;
            border: 2rpx solid rgba(79, 110, 247, 0.35);
            animation: ringPulse 2.2s ease-out infinite;
          }

          &.done {
            background: radial-gradient(
              circle,
              rgba(18, 183, 106, 0.08) 0%,
              rgba(18, 183, 106, 0.02) 70%
            );
          }

          .checkin-inner {
            position: relative;
            z-index: 1;
            width: 168rpx;
            height: 168rpx;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            background: linear-gradient(140deg, #5b7cfa, #7c5cf6);
            box-shadow: 0 14rpx 30rpx rgba(79, 110, 247, 0.32);
            transition: transform 0.15s ease;

            &:active {
              transform: scale(0.96);
            }

            &.done {
              background: linear-gradient(140deg, #12b76a, #0ba5a5);
              box-shadow: 0 14rpx 30rpx rgba(18, 183, 106, 0.28);
            }

            &.disabled {
              background: #e4e7ef;
              color: #98a2b3;
              box-shadow: none;
            }

            .checkin-icon {
              font-size: 36rpx;
              font-weight: 700;
              letter-spacing: 2rpx;
            }

            .checkin-text {
              margin-top: 8rpx;
              font-size: 20rpx;
              opacity: 0.82;
            }
          }
        }
      }

      .stage-hint {
        margin-top: 18rpx;
        font-size: 22rpx;
        text-align: center;
        color: #98a2b3;

        &.success {
          color: #12b76a;
        }

        &.error {
          color: #f04438;
        }
      }

      .location-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 24rpx;
        padding: 14rpx 16rpx 14rpx 22rpx;
        border-radius: 22rpx;
        background: #f7f8fc;

        .loc-info {
          display: flex;
          align-items: baseline;
          flex: 1;
          min-width: 0;

          .loc-dot {
            width: 12rpx;
            height: 12rpx;
            margin-right: 12rpx;
            border-radius: 50%;
            flex-shrink: 0;
            align-self: center;
            background: #f79009;
            transition: background 0.2s ease;
          }

          .loc-num {
            font-size: 34rpx;
            font-weight: 700;
            line-height: 1.1;
            color: #1f2d5e;
            font-variant-numeric: tabular-nums;
          }

          .loc-unit {
            margin-left: 4rpx;
            font-size: 21rpx;
            color: #98a2b3;
          }

          .loc-text {
            margin-left: 10rpx;
            font-size: 21rpx;
            color: #98a2b3;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        &.success .loc-dot {
          background: #12b76a;
        }

        &.error .loc-dot {
          background: #f04438;
        }

        .loc-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          min-height: 56rpx;
          margin-left: 16rpx;
          padding: 0 20rpx;
          border-radius: 999rpx;
          background: #eef1fe;

          .loc-btn-text {
            margin-left: 6rpx;
            font-size: 21rpx;
            color: #4f6ef7;
          }

          &.disabled {
            opacity: 0.6;
          }

          &:active {
            opacity: 0.85;
          }
        }
      }

      .error-hint {
        display: block;
        margin-top: 16rpx;
        font-size: 21rpx;
        color: #f04438;
        text-align: center;
        line-height: 1.5;
      }
    }

    /* 本周记录 */
    .week-card {
      .week-row {
        display: flex;
        justify-content: space-between;
        margin-top: 26rpx;

        .week-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;

          .week-label {
            font-size: 21rpx;
            color: #98a2b3;

            &.today {
              color: #4f6ef7;
              font-weight: 600;
            }
          }

          .week-dot {
            width: 52rpx;
            height: 52rpx;
            margin-top: 12rpx;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f2f4f9;
            font-size: 22rpx;
            color: #ffffff;

            &.active {
              background: linear-gradient(135deg, #5b7cfa, #7c5cf6);
            }

            &.today {
              background: #eef1fe;
              border: 2rpx solid rgba(79, 110, 247, 0.35);
            }
          }
        }
      }

      .today-line {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 24rpx;
        padding-top: 20rpx;
        border-top: 1rpx solid #f0f2f7;

        .today-text {
          font-size: 23rpx;
          color: #667085;
        }

        .today-sub {
          font-size: 21rpx;
          color: #98a2b3;
        }
      }
    }
  }
}

@keyframes ringPulse {
  0% {
    transform: scale(0.92);
    opacity: 0.9;
  }
  70% {
    transform: scale(1.06);
    opacity: 0;
  }
  100% {
    transform: scale(1.06);
    opacity: 0;
  }
}
</style>
