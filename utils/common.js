// 通用常量与工具函数

export const RECORD_KEY = 'keepon_checkin_records'
export const TARGET_KEY = 'keepon_checkin_target'
export const RANGE = 300

// 默认打卡点
export const DEFAULT_TARGET = {
  name: '仲恺农业工程学院(海珠校区)',
  latitude: 23.10753,
  longitude: 113.28139,
}

export const pad = (n) => (n < 10 ? '0' + n : '' + n)

// 日期 → YYYY-MM-DD
export const formatDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// 时间 → HH:mm
export const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

// 距离（米）→ 展示文本
export const formatDistance = (m) => {
  if (m === null || m === undefined) return '--'
  if (m < 1000) return `${Math.max(1, Math.round(m))} m`
  return `${(m / 1000).toFixed(2)} km`
}

export const toast = (title) => uni.showToast({ title, icon: 'none' })

// 读取打卡记录
export const getRecords = () => {
  const list = uni.getStorageSync(RECORD_KEY)
  return Array.isArray(list) ? list : []
}

export const saveRecords = (list) => {
  uni.setStorageSync(RECORD_KEY, list)
}

// 读取打卡点，未设置时返回默认校区
export const getTarget = () => {
  const t = uni.getStorageSync(TARGET_KEY)
  if (t && typeof t.latitude === 'number' && typeof t.longitude === 'number') {
    return {
      name: t.name || DEFAULT_TARGET.name,
      latitude: t.latitude,
      longitude: t.longitude,
    }
  }
  return { ...DEFAULT_TARGET }
}

export const saveTarget = (target) => {
  uni.setStorageSync(TARGET_KEY, {
    name: target.name,
    latitude: target.latitude,
    longitude: target.longitude,
  })
}

// 连续打卡天数（今天未打卡时从昨天开始往前算）
export const calcStreak = (list, base = new Date()) => {
  const set = new Set(list.map((r) => r.date))
  const d = new Date(base)
  if (!set.has(formatDate(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(formatDate(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
