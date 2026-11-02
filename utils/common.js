// 通用常量与工具函数

export const RECORD_KEY = 'keepon_checkin_records'
export const TARGET_KEY = 'keepon_checkin_target'
export const RANGE = 300

// 考勤规则（单位：当日分钟数）
export const RULES = {
  START_EARLIEST: 6 * 60, // 06:00 起可签到
  START_LATEST: 8 * 60, // 08:00 之后签到记迟到
  END_EARLIEST: 18 * 60, // 18:00 之前签退记早退
  END_LATEST: 6 * 60, // 次日 06:00 前可签退
}

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

// 时间 → 当日分钟数（用于时间窗判断）
export const minutesOf = (d) => d.getHours() * 60 + d.getMinutes()

// 当前"考勤日"：凌晨 0:00–06:00 的签退仍归属于前一天
export const getDutyDate = (d = new Date()) => {
  const day = new Date(d)
  if (minutesOf(d) < RULES.END_LATEST) day.setDate(day.getDate() - 1)
  return formatDate(day)
}

// 签到是否迟到（晚于 08:00）
export const isLate = (d) => minutesOf(d) > RULES.START_LATEST

// 签退是否早退（18:00 前签退；次日 0:00–6:00 签退不算早退）
export const isEarly = (d, dutyDate) =>
  formatDate(d) === dutyDate && minutesOf(d) < RULES.END_EARLIEST

// "HH:mm" → 当日分钟数
export const minutesOfTime = (t) => {
  const [h, m] = String(t || '0:0').split(':')
  return Number(h) * 60 + Number(m)
}

// 记录是否迟到：优先按签到时间重算，避免旧数据缺少/写错 late 字段
export const isLateRecord = (r) => {
  if (!r || !r.start) return false
  if (r.start.time) return minutesOfTime(r.start.time) > RULES.START_LATEST
  return !!r.start.late
}

// 记录是否早退：同样按签退时间重算；跨零点的签退不算早退
export const isEarlyRecord = (r) => {
  if (!r || !r.end) return false
  if (r.end.timestamp && formatDate(new Date(r.end.timestamp)) !== r.date) return false
  if (r.end.time) return minutesOfTime(r.end.time) < RULES.END_EARLIEST
  return !!r.end.early
}

// 学习时长（毫秒 → 文本）
export const formatDuration = (ms) => {
  if (!ms || ms < 0) return '--'
  const total = Math.floor(ms / 60000)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? `${h} 小时 ${m} 分` : `${m} 分钟`
}

// 距离（米）→ 展示文本
export const formatDistance = (m) => {
  if (m === null || m === undefined) return '--'
  if (m < 1000) return `${Math.max(1, Math.round(m))} m`
  return `${(m / 1000).toFixed(2)} km`
}

export const toast = (title) => uni.showToast({ title, icon: 'none' })

// 旧版记录（单次打卡 time/timestamp）→ 签到记录（start），便于兼容历史数据
export const normalizeRecord = (r) => {
  if (!r || !r.date) return null
  if (r.start) return r
  if (!r.time) return null
  return {
    id: r.id || `${r.timestamp || 0}`,
    date: r.date,
    start: {
      time: r.time,
      timestamp: r.timestamp || 0,
      late: false,
      latitude: r.latitude,
      longitude: r.longitude,
      distance: r.distance,
    },
    end: null,
  }
}

// 读取打卡记录（一条 = 一天：start 签到 / end 签退）
export const getRecords = () => {
  const list = uni.getStorageSync(RECORD_KEY)
  if (!Array.isArray(list)) return []
  return list.map(normalizeRecord).filter(Boolean)
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

// 登录用户（目前只存昵称与头像，用于"我的"页展示）
export const USER_KEY = 'keepon_user'

export const getUser = () => {
  const u = uni.getStorageSync(USER_KEY)
  if (!u || typeof u !== 'object') return { nickName: '', avatarUrl: '' }
  return { nickName: u.nickName || '', avatarUrl: u.avatarUrl || '' }
}

export const saveUser = (user) => {
  uni.setStorageSync(USER_KEY, {
    nickName: user.nickName || '',
    avatarUrl: user.avatarUrl || '',
  })
}

export const clearUser = () => {
  uni.removeStorageSync(USER_KEY)
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
