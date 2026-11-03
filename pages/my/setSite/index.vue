<template>
  <view class="page">
    <view class="card">
      <view class="card-head">
        <text class="card-title">打卡点设置</text>
        <text class="reset" @click="resetForm">恢复默认</text>
      </view>
      <text class="card-desc"
        >打卡需在打卡点范围内完成，默认位置为仲恺农业工程学院（海珠校区）。</text
      >

      <view class="field">
        <text class="label">名称</text>
        <input
          v-model="form.name"
          class="input"
          placeholder="打卡点名称"
          maxlength="20"
        />
      </view>
      <view class="field">
        <text class="label">纬度</text>
        <input
          v-model="form.latitude"
          class="input"
          type="digit"
          placeholder="如 23.10608"
        />
      </view>
      <view class="field">
        <text class="label">经度</text>
        <input
          v-model="form.longitude"
          class="input"
          type="digit"
          placeholder="如 113.28146"
        />
      </view>

      <view class="actions">
        <view
          class="btn ghost"
          :class="{ disabled: locating }"
          @click="useCurrentLocation"
        >
          {{ locating ? '定位中...' : '使用当前位置' }}
        </view>
      </view>
    </view>

    <view class="save-btn" @click="save">保存打卡点</view>
    <text class="hint">保存后，首页需在打卡点 300 米范围内才能打卡</text>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { DEFAULT_TARGET, toast, getTarget, saveTarget } from '@/utils/common'
import { getCurrentLocation, explainLocationError } from '@/utils/location'

const form = reactive({ name: '', latitude: '', longitude: '' })
const locating = ref(false)

const fill = (t) => {
  form.name = t.name
  form.latitude = String(t.latitude)
  form.longitude = String(t.longitude)
}

const load = () => {
  fill(getTarget())
}

const resetForm = () => {
  fill(DEFAULT_TARGET)
  toast('已恢复默认，记得保存')
}

const useCurrentLocation = async () => {
  if (locating.value) return
  locating.value = true
  try {
    const pos = await getCurrentLocation()
    form.latitude = String(pos.latitude.toFixed(6))
    form.longitude = String(pos.longitude.toFixed(6))
    toast('已填入当前位置')
  } catch (e) {
    console.warn('[setSite] 定位失败：', e)
    toast(explainLocationError(e))
  } finally {
    locating.value = false
  }
}

const goBack = () => {
  if (getCurrentPages().length > 1) {
    setTimeout(() => uni.navigateBack(), 600)
  }
}

const save = () => {
  const name = (form.name || '').trim()
  const lat = Number(form.latitude)
  const lng = Number(form.longitude)
  if (!name) {
    toast('请填写打卡点名称')
    return
  }
  if (!form.latitude || !isFinite(lat) || lat < -90 || lat > 90) {
    toast('纬度格式不正确')
    return
  }
  if (!form.longitude || !isFinite(lng) || lng < -180 || lng > 180) {
    toast('经度格式不正确')
    return
  }
  saveTarget({ name, latitude: lat, longitude: lng })
  fill({ name, latitude: lat, longitude: lng })
  toast('保存成功')
  goBack()
}

onShow(() => {
  load()
})
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 24rpx 28rpx 60rpx;
}

.card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 10rpx 36rpx rgba(31, 45, 94, 0.06);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2d5e;
}

.reset {
  font-size: 24rpx;
  color: #4f6ef7;
}

.card-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 23rpx;
  line-height: 1.6;
  color: #98a2b3;
}

.field {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f2f7;
}

.label {
  width: 100rpx;
  font-size: 26rpx;
  color: #667085;
}

.input {
  flex: 1;
  font-size: 28rpx;
  color: #1f2d5e;
}

.actions {
  display: flex;
  margin-top: 28rpx;
}

.btn {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  border-radius: 999rpx;
  font-size: 27rpx;
  color: #4f6ef7;
  background: #eef1fe;

  &.disabled {
    opacity: 0.6;
  }

  &:active {
    opacity: 0.85;
  }
}

.save-btn {
  height: 88rpx;
  line-height: 88rpx;
  margin-top: 32rpx;
  border-radius: 999rpx;
  text-align: center;
  font-size: 30rpx;
  color: #ffffff;
  background: linear-gradient(135deg, #5b7cfa, #7c5cf6);
  box-shadow: 0 12rpx 30rpx rgba(79, 110, 247, 0.28);

  &:active {
    opacity: 0.9;
  }
}

.hint {
  display: block;
  margin-top: 22rpx;
  font-size: 22rpx;
  color: #b0b8c9;
  text-align: center;
}
</style>
