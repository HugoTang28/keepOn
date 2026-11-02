<template>
	<view class="page">
		<!-- 顶部数据区 -->
		<view class="hero">
			<view class="glow glow-1"></view>
			<view class="glow glow-2"></view>

			<view class="hero-head">
				<view class="hero-greet">
					<text class="greet">{{ greeting }}</text>
					<text class="date">{{ dateText }}</text>
				</view>
				<view class="streak-pill">
					<text class="streak-num">{{ stats.streak }}</text>
					<text class="streak-label">连续打卡</text>
				</view>
			</view>

			<view class="hero-panel">
				<view class="panel-item">
					<text class="panel-num">{{ stats.month }}</text>
					<text class="panel-label">本月打卡</text>
				</view>
				<view class="panel-line"></view>
				<view class="panel-item">
					<text class="panel-num">{{ stats.total }}</text>
					<text class="panel-label">累计打卡</text>
				</view>
				<view class="panel-line"></view>
				<view class="panel-item">
					<text class="panel-num">{{ stats.rate }}<text class="panel-unit">%</text></text>
					<text class="panel-label">本月达成率</text>
				</view>
			</view>
		</view>

		<view class="content">
			<!-- 定位卡片 -->
			<view class="card location-card">
				<view class="card-head">
					<view class="head-left">
						<text class="card-title">学习打卡点</text>
						<text class="card-sub">{{ target ? target.name : '尚未设置打卡点' }}</text>
					</view>
					<view class="chip" :class="'chip-' + status.type">{{ status.text }}</view>
				</view>

				<view class="loc-list">
					<view class="loc-item">
						<view class="loc-icon">定</view>
						<view class="loc-body">
							<text class="loc-label">当前定位</text>
							<text class="loc-value">{{ locationText }}</text>
						</view>
					</view>
					<view class="loc-item">
						<view class="loc-icon">距</view>
						<view class="loc-body">
							<text class="loc-label">距离打卡点</text>
							<text class="loc-value strong">{{ distanceText }}</text>
						</view>
					</view>
				</view>

				<view class="loc-actions">
					<view class="ghost-btn" :class="{ disabled: locating }" @click="locate()">
						{{ locating ? '定位中...' : '重新定位' }}
					</view>
				</view>
				<text v-if="locationError" class="error-hint" @click="showLocationHelp">
					{{ locationErrorMsg }}，点此查看解决办法
				</text>
				<text v-else class="range-tip">打卡范围：距离打卡点 {{ RANGE }} 米内，可在「我的」中修改</text>
			</view>

			<!-- 打卡按钮 -->
			<view class="checkin">
				<view class="checkin-ring" :class="ringClass">
					<view class="checkin-inner" :class="ringClass" @click="handleCheckIn">
						<text class="checkin-icon">{{ checkedToday ? '✓' : '打卡' }}</text>
						<text class="checkin-text">{{ btnSubText }}</text>
					</view>
				</view>
				<text class="checkin-tip">{{ tipText }}</text>
			</view>

			<!-- 今日打卡 -->
			<view class="card today-card">
				<view class="card-head">
					<text class="card-title">今日学习</text>
					<text class="link" @click="goRecord">全部记录 ›</text>
				</view>

				<view v-if="todayRecord" class="today-body">
					<view class="today-main">
						<text class="time-big">{{ todayRecord.time }}</text>
						<text class="time-label">打卡时间</text>
					</view>
					<view class="today-meta">
						<text class="meta-line">{{ todayRecord.locationName || '学习打卡点' }}</text>
						<text class="meta-line">距离 {{ formatDistance(todayRecord.distance) }}</text>
						<text class="meta-line success">已完成今日学习打卡</text>
					</view>
				</view>

				<view v-else class="today-empty">
					<text class="empty-title">今天还没有打卡</text>
					<text class="empty-sub">到达打卡点后点击上方按钮，开启今日学习</text>
				</view>
			</view>

			<!-- 本周打卡 -->
			<view class="card week-card">
				<view class="card-head">
					<text class="card-title">本周打卡</text>
					<text class="card-sub">{{ weekDone }} / 7 天</text>
				</view>
				<view class="week-row">
					<view v-for="day in weekDays" :key="day.date" class="week-item">
						<text class="week-label" :class="{ today: day.isToday }">{{ day.label }}</text>
						<view class="week-dot" :class="{ active: day.active, today: day.isToday && !day.active }">
							<text v-if="day.active" class="week-check">✓</text>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import { ref, computed } from 'vue'
	import { onShow } from '@dcloudio/uni-app'
	import {
		RANGE,
		DEFAULT_TARGET,
		pad,
		formatDate,
		formatTime,
		formatDistance,
		toast,
		getRecords,
		saveRecords,
		getTarget,
		calcStreak
	} from '@/utils/common'
	import { getCurrentLocation, getDistanceMeters, explainLocationError } from '@/utils/location'

	const nowRef = ref(new Date())
	const records = ref([])
	const target = ref({ ...DEFAULT_TARGET })
	const current = ref(null)
	const locating = ref(false)
	const locationError = ref(false)
	const locationErrorMsg = ref('')

	const greeting = computed(() => {
		const h = nowRef.value.getHours()
		if (h < 6) return '夜深了，注意休息'
		if (h < 12) return '早上好，开始学习吧'
		if (h < 14) return '中午好，别忘了打卡'
		if (h < 18) return '下午好，保持专注'
		return '晚上好，坚持一下'
	})

	const dateText = computed(() => {
		const d = nowRef.value
		const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
		return `${d.getMonth() + 1}月${d.getDate()}日 星期${week}`
	})

	const todayStr = computed(() => formatDate(nowRef.value))

	const loadRecords = () => {
		records.value = getRecords()
	}

	const loadTarget = () => {
		target.value = getTarget()
	}

	const stats = computed(() => {
		const base = nowRef.value
		const prefix = `${base.getFullYear()}-${pad(base.getMonth() + 1)}`
		const month = records.value.filter((r) => typeof r.date === 'string' && r.date.indexOf(prefix) === 0).length
		const day = base.getDate()
		return {
			total: records.value.length,
			month,
			rate: day ? Math.min(100, Math.round((month / day) * 100)) : 0,
			streak: calcStreak(records.value, base)
		}
	})

	const weekDays = computed(() => {
		const base = nowRef.value
		const set = new Set(records.value.map((r) => r.date))
		const labels = ['日', '一', '二', '三', '四', '五', '六']
		const list = []
		for (let i = 6; i >= 0; i--) {
			const d = new Date(base)
			d.setDate(d.getDate() - i)
			const key = formatDate(d)
			list.push({
				date: key,
				label: i === 0 ? '今' : labels[d.getDay()],
				active: set.has(key),
				isToday: i === 0
			})
		}
		return list
	})

	const weekDone = computed(() => weekDays.value.filter((d) => d.active).length)

	const checkedToday = computed(() => records.value.some((r) => r.date === todayStr.value))
	const todayRecord = computed(() => records.value.find((r) => r.date === todayStr.value) || null)

	const distance = computed(() => getDistanceMeters(current.value, target.value))

	const distanceText = computed(() => (distance.value === null ? '--' : formatDistance(distance.value)))

	const locationText = computed(() => {
		if (locating.value) return '正在获取位置...'
		if (locationError.value) return '定位失败'
		if (!current.value) return '未获取'
		return `${current.value.latitude.toFixed(5)}, ${current.value.longitude.toFixed(5)}`
	})

	const status = computed(() => {
		if (locating.value) return { type: 'loading', text: '定位中' }
		if (locationError.value) return { type: 'error', text: '定位失败' }
		if (!current.value) return { type: 'warn', text: '待定位' }
		if (distance.value !== null && distance.value <= RANGE) return { type: 'success', text: '范围内' }
		return { type: 'warn', text: '超出范围' }
	})

	const btnSubText = computed(() => {
		if (checkedToday.value) return '今日已完成'
		if (locating.value) return '定位中...'
		if (locationError.value) return '定位失败'
		if (!current.value) return '待定位'
		if (distance.value !== null && distance.value > RANGE) return '不在范围'
		return '点击打卡'
	})

	const ringClass = computed(() => {
		if (checkedToday.value) return 'done'
		if (btnSubText.value === '点击打卡') return 'ready'
		return 'disabled'
	})

	const tipText = computed(() => {
		if (checkedToday.value) return '今日学习已打卡，连续坚持中'
		if (locating.value) return '正在获取你的位置，请稍候'
		if (!current.value) return '点击“重新定位”获取当前位置'
		if (distance.value !== null && distance.value > RANGE)
			return `距离打卡点 ${distanceText.value}，需进入 ${RANGE} 米内打卡`
		return '已到达打卡范围，点击按钮完成打卡'
	})


	const locate = async () => {
		if (locating.value) return
		locating.value = true
		locationError.value = false
		locationErrorMsg.value = ''
		try {
			current.value = await getCurrentLocation()
		} catch (e) {
			current.value = null
			locationError.value = true
			locationErrorMsg.value = explainLocationError(e)
			toast(locationErrorMsg.value)
		} finally {
			locating.value = false
		}
	}

	const showLocationHelp = () => {
		let platform = ''
		try {
			const sys = uni.getSystemInfoSync()
			platform = `${sys.uniPlatform || ''} ${sys.osName || ''}`.trim()
		} catch (e) {}
		uni.showModal({
			title: '定位失败',
			content: `原因：${locationErrorMsg.value || '未知'}\n环境：${platform || '未知'}\n请依次确认：\n1. 已开启系统/浏览器定位权限\n2. H5 需 HTTPS 访问并配置地图 Key\n3. 微信小程序需真实 AppID 并允许位置\n4. App 需开启系统定位开关`,
			confirmText: '去设置',
			success: (res) => {
				if (!res.confirm) return
				try {
					uni.openSetting({ fail: () => {} })
				} catch (e) {}
			}
		})
	}

	const vibrate = () => {
		try {
			uni.vibrateShort({ fail: () => {} })
		} catch (e) {}
	}

	const doCheckIn = () => {
		const now = new Date()
		const record = {
			id: `${now.getTime()}`,
			date: formatDate(now),
			time: formatTime(now),
			timestamp: now.getTime(),
			latitude: current.value.latitude,
			longitude: current.value.longitude,
			distance: distance.value === null ? 0 : Math.round(distance.value),
			locationName: target.value ? target.value.name : '学习打卡点'
		}
		const list = [record, ...records.value]
		records.value = list
		saveRecords(list)
		vibrate()
		uni.showToast({ title: '打卡成功', icon: 'success', duration: 1500 })
	}

	const handleCheckIn = async () => {
		if (checkedToday.value) {
			toast('今天已经打过卡啦')
			return
		}
		if (locating.value) {
			toast('正在定位，请稍候')
			return
		}
		if (!current.value) {
			await locate()
			if (!current.value) {
				toast('定位失败，无法打卡')
				return
			}
		}
		if (distance.value !== null && distance.value > RANGE) {
			toast(`距离打卡点 ${distanceText.value}，请靠近后打卡`)
			return
		}
		doCheckIn()
	}

	const goRecord = () => {
		uni.switchTab({ url: '/pages/record/record' })
	}

	onShow(() => {
		nowRef.value = new Date()
		loadRecords()
		loadTarget()
		if (!current.value && !locating.value) locate()
	})
</script>

<style scoped lang="scss">
	.page {
		min-height: 100vh;
		background: #f5f6fa;
		padding-bottom: 40rpx;
	}

	/* ---------- 顶部 ---------- */
	.hero {
		position: relative;
		padding: 40rpx 36rpx 120rpx;
		background: linear-gradient(135deg, #4f6ef7 0%, #6b5bf2 55%, #8a5cf6 100%);
		border-radius: 0 0 48rpx 48rpx;
		overflow: hidden;
	}

	.glow {
		position: absolute;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.16);
	}

	.glow-1 {
		width: 320rpx;
		height: 320rpx;
		top: -140rpx;
		right: -80rpx;
	}

	.glow-2 {
		width: 220rpx;
		height: 220rpx;
		bottom: -120rpx;
		left: -60rpx;
		background: rgba(255, 255, 255, 0.1);
	}

	.hero-head {
		position: relative;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.hero-greet {
		display: flex;
		flex-direction: column;
	}

	.greet {
		font-size: 40rpx;
		font-weight: 600;
		color: #ffffff;
		letter-spacing: 1rpx;
	}

	.date {
		margin-top: 12rpx;
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.78);
	}

	.streak-pill {
		display: flex;
		align-items: baseline;
		padding: 10rpx 22rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.18);
		border: 1rpx solid rgba(255, 255, 255, 0.28);
	}

	.streak-num {
		font-size: 36rpx;
		font-weight: 700;
		color: #ffffff;
	}

	.streak-label {
		margin-left: 6rpx;
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.85);
	}

	.hero-panel {
		position: relative;
		display: flex;
		align-items: center;
		margin-top: 44rpx;
		padding: 28rpx 0;
		border-radius: 28rpx;
		background: rgba(255, 255, 255, 0.16);
		border: 1rpx solid rgba(255, 255, 255, 0.22);
	}

	.panel-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.panel-num {
		font-size: 44rpx;
		font-weight: 700;
		color: #ffffff;
		line-height: 1.1;
	}

	.panel-unit {
		font-size: 24rpx;
		font-weight: 500;
	}

	.panel-label {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.75);
	}

	.panel-line {
		width: 1rpx;
		height: 56rpx;
		background: rgba(255, 255, 255, 0.24);
	}

	/* ---------- 内容 ---------- */
	.content {
		position: relative;
		margin-top: -84rpx;
		padding: 0 28rpx;
	}

	.card {
		background: #ffffff;
		border-radius: 32rpx;
		padding: 32rpx;
		margin-bottom: 24rpx;
		box-shadow: 0 10rpx 36rpx rgba(31, 45, 94, 0.06);
	}

	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.head-left {
		display: flex;
		flex-direction: column;
	}

	.card-title {
		font-size: 30rpx;
		font-weight: 600;
		color: #1f2d5e;
	}

	.card-sub {
		margin-top: 8rpx;
		font-size: 24rpx;
		color: #98a2b3;
	}

	.chip {
		padding: 8rpx 20rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		line-height: 1.2;
	}

	.chip-success {
		color: #12b76a;
		background: rgba(18, 183, 106, 0.12);
	}

	.chip-warn {
		color: #f79009;
		background: rgba(247, 144, 9, 0.12);
	}

	.chip-error {
		color: #f04438;
		background: rgba(240, 68, 56, 0.12);
	}

	.chip-loading {
		color: #4f6ef7;
		background: rgba(79, 110, 247, 0.12);
	}

	.loc-list {
		margin-top: 28rpx;
	}

	.loc-item {
		display: flex;
		align-items: center;
		padding: 18rpx 0;

		& + .loc-item {
			border-top: 1rpx solid #f0f2f7;
		}
	}

	.loc-icon {
		width: 48rpx;
		height: 48rpx;
		margin-right: 20rpx;
		border-radius: 14rpx;
		background: #eef1fe;
		color: #4f6ef7;
		font-size: 22rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.loc-body {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-width: 0;
	}

	.loc-label {
		font-size: 26rpx;
		color: #667085;
	}

	.loc-value {
		max-width: 420rpx;
		font-size: 26rpx;
		color: #344054;
		text-align: right;
		word-break: break-all;
	}

	.loc-value.strong {
		font-size: 30rpx;
		font-weight: 600;
		color: #4f6ef7;
	}

	.loc-actions {
		display: flex;
		margin-top: 26rpx;
	}

	.ghost-btn {
		flex: 1;
		height: 72rpx;
		line-height: 72rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 26rpx;
		color: #4f6ef7;
		background: #eef1fe;

		& + .ghost-btn {
			margin-left: 20rpx;
		}

		&.primary {
			color: #ffffff;
			background: linear-gradient(135deg, #5b7cfa, #7c5cf6);
		}

		&.disabled {
			opacity: 0.6;
		}

		&:active {
			opacity: 0.85;
		}
	}

	.range-tip {
		display: block;
		margin-top: 20rpx;
		font-size: 22rpx;
		color: #b0b8c9;
		text-align: center;
	}

	.error-hint {
		display: block;
		margin-top: 20rpx;
		font-size: 22rpx;
		color: #f04438;
		text-align: center;
		line-height: 1.5;
	}

	/* ---------- 打卡按钮 ---------- */
	.checkin {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 16rpx 0 28rpx;
	}

	.checkin-ring {
		position: relative;
		width: 360rpx;
		height: 360rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: radial-gradient(circle, rgba(79, 110, 247, 0.1) 0%, rgba(79, 110, 247, 0.02) 72%);

		&.ready::before {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			border-radius: 50%;
			border: 2rpx solid rgba(79, 110, 247, 0.4);
			animation: ringPulse 2.2s ease-out infinite;
		}

		&.done {
			background: radial-gradient(circle, rgba(18, 183, 106, 0.1) 0%, rgba(18, 183, 106, 0.02) 72%);
		}
	}

	.checkin-inner {
		width: 288rpx;
		height: 288rpx;
		border-radius: 50%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		background: linear-gradient(140deg, #5b7cfa, #7c5cf6);
		box-shadow: 0 18rpx 44rpx rgba(79, 110, 247, 0.36);
		transition: transform 0.15s ease;

		&:active {
			transform: scale(0.96);
		}

		&.done {
			background: linear-gradient(140deg, #12b76a, #0ba5a5);
			box-shadow: 0 18rpx 44rpx rgba(18, 183, 106, 0.3);
		}

		&.disabled {
			background: #e4e7ef;
			color: #98a2b3;
			box-shadow: none;
		}
	}

	.checkin-icon {
		font-size: 46rpx;
		font-weight: 700;
		letter-spacing: 2rpx;
	}

	.checkin-text {
		margin-top: 10rpx;
		font-size: 22rpx;
		opacity: 0.82;
	}

	.checkin-tip {
		margin-top: 22rpx;
		padding: 0 40rpx;
		font-size: 24rpx;
		color: #7d8698;
		text-align: center;
		line-height: 1.5;
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

	/* ---------- 今日 ---------- */
	.link {
		font-size: 24rpx;
		color: #98a2b3;
	}

	.today-body {
		display: flex;
		align-items: center;
		margin-top: 28rpx;
	}

	.today-main {
		width: 200rpx;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.time-big {
		font-size: 52rpx;
		font-weight: 700;
		color: #1f2d5e;
		line-height: 1.1;
	}

	.time-label {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: #98a2b3;
	}

	.today-meta {
		flex: 1;
		padding-left: 28rpx;
		border-left: 1rpx solid #f0f2f7;
		display: flex;
		flex-direction: column;
	}

	.meta-line {
		font-size: 24rpx;
		color: #667085;
		line-height: 1.7;

		&.success {
			color: #12b76a;
		}
	}

	.today-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 34rpx 0 20rpx;
	}

	.empty-title {
		font-size: 28rpx;
		color: #344054;
	}

	.empty-sub {
		margin-top: 12rpx;
		font-size: 23rpx;
		color: #98a2b3;
		text-align: center;
	}

	/* ---------- 本周 ---------- */
	.week-row {
		display: flex;
		justify-content: space-between;
		margin-top: 30rpx;
	}

	.week-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.week-label {
		font-size: 22rpx;
		color: #98a2b3;

		&.today {
			color: #4f6ef7;
			font-weight: 600;
		}
	}

	.week-dot {
		width: 56rpx;
		height: 56rpx;
		margin-top: 14rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f2f4f9;
		font-size: 24rpx;
		color: #ffffff;

		&.active {
			background: linear-gradient(135deg, #5b7cfa, #7c5cf6);
		}

		&.today {
			background: #eef1fe;
			border: 2rpx solid rgba(79, 110, 247, 0.4);
		}
	}
</style>
