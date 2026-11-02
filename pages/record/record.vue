<template>
	<view class="page">
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
			<view class="group-head">
				<text class="group-title">{{ group.title }}</text>
				<text class="group-count">共 {{ group.items.length }} 次</text>
			</view>

			<view class="group-card">
				<view v-for="item in group.items" :key="item.id" class="record">
					<view class="record-dot"></view>
					<view class="record-date">
						<text class="date-main">{{ item.monthDay }}</text>
						<text class="date-sub">{{ item.weekday }}</text>
					</view>
					<text class="record-time">{{ item.time }}</text>
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
	</view>
</template>

<script setup>
	import { ref, computed } from 'vue'
	import { onShow } from '@dcloudio/uni-app'
	import { getRecords, calcStreak, pad } from '@/utils/common'

	const records = ref([])
	const WEEK = ['日', '一', '二', '三', '四', '五', '六']

	const parseDate = (str) => {
		const parts = String(str || '').split('-')
		const y = Number(parts[0])
		const m = Number(parts[1])
		const d = Number(parts[2])
		const date = new Date(y, (m || 1) - 1, d || 1)
		return {
			monthDay: `${m}月${pad(d)}日`,
			weekday: `星期${WEEK[date.getDay()]}`,
			monthKey: `${y}-${pad(m)}`,
			monthTitle: `${y}年${m}月`
		}
	}

	const groups = computed(() => {
		const map = new Map()
		records.value.forEach((r) => {
			const p = parseDate(r.date)
			if (!map.has(p.monthKey)) {
				map.set(p.monthKey, { key: p.monthKey, title: p.monthTitle, items: [] })
			}
			map.get(p.monthKey).items.push({
				id: r.id,
				time: r.time,
				monthDay: p.monthDay,
				weekday: p.weekday
			})
		})
		return Array.from(map.values())
	})

	const stats = computed(() => {
		const now = new Date()
		const prefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
		return {
			total: records.value.length,
			month: records.value.filter((r) => typeof r.date === 'string' && r.date.indexOf(prefix) === 0).length,
			streak: calcStreak(records.value, now)
		}
	})

	const load = () => {
		records.value = getRecords()
			.filter((r) => r && r.date)
			.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
	}

	const goHome = () => {
		uni.switchTab({ url: '/pages/index/index' })
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

	/* ---------- 概览 ---------- */
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

	/* ---------- 分组列表 ---------- */
	.group {
		margin-bottom: 28rpx;

		.group-head {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			padding: 0 8rpx 16rpx;

			.group-title {
				font-size: 26rpx;
				font-weight: 600;
				letter-spacing: 1rpx;
				color: #1f2d5e;
			}

			.group-count {
				font-size: 21rpx;
				color: #98a2b3;
			}
		}

		.group-card {
			padding: 4rpx 28rpx;
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
				background: linear-gradient(135deg, #5b7cfa, #7c5cf6);
				flex-shrink: 0;
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

			.record-time {
				font-size: 34rpx;
				font-weight: 600;
				color: #1f2d5e;
				font-variant-numeric: tabular-nums;
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
