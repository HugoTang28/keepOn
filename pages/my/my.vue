<template>
	<view class="page">
		<view class="header">
			<view class="avatar">坚</view>
			<view class="user-info">
				<text class="nickname">坚持号</text>
				<text class="subtitle">每天进步一点点</text>
			</view>
		</view>

		<view class="list-card">
			<view class="list-item" @click="goSetSite">
				<text class="item-icon">📍</text>
				<text class="item-label">打卡点设置</text>
				<text class="item-value">{{ targetName }}</text>
				<view class="item-arrow"></view>
			</view>
		</view>

	</view>
</template>

<script setup>
	import { ref } from 'vue'
	import { onShow } from '@dcloudio/uni-app'
	import { getTarget, getRecords } from '@/utils/common'

	const targetName = ref(getTarget().name)
	const total = ref(0)

	const load = () => {
		targetName.value = getTarget().name
		total.value = getRecords().length
	}

	const goSetSite = () => {
		uni.navigateTo({ url: '/pages/my/setSite/index' })
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

	.header {
		display: flex;
		align-items: center;
		padding: 36rpx 32rpx;
		margin-bottom: 24rpx;
		border-radius: 32rpx;
		background: linear-gradient(135deg, #5b7cfa, #7c5cf6);
		box-shadow: 0 14rpx 36rpx rgba(79, 110, 247, 0.25);
	}

	.avatar {
		width: 96rpx;
		height: 96rpx;
		margin-right: 24rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.24);
		color: #ffffff;
		font-size: 38rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.user-info {
		display: flex;
		flex-direction: column;
	}

	.nickname {
		font-size: 34rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.subtitle {
		margin-top: 8rpx;
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.8);
	}

	.list-card {
		background: #ffffff;
		border-radius: 28rpx;
		padding: 0 32rpx;
		box-shadow: 0 10rpx 36rpx rgba(31, 45, 94, 0.06);
	}

	.list-item {
		display: flex;
		align-items: center;
		padding: 32rpx 0;

		& + .list-item {
			border-top: 1rpx solid #f0f2f7;
		}

		&:active {
			opacity: 0.7;
		}
	}

	.item-icon {
		width: 56rpx;
		margin-right: 20rpx;
		font-size: 38rpx;
		line-height: 1;
	}

	.item-label {
		flex: 1;
		font-size: 29rpx;
		color: #1f2d5e;
	}

	.item-value {
		max-width: 300rpx;
		margin-right: 16rpx;
		font-size: 25rpx;
		color: #98a2b3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-arrow {
		width: 16rpx;
		height: 16rpx;
		border-top: 3rpx solid #c4c9d4;
		border-right: 3rpx solid #c4c9d4;
		transform: rotate(45deg);
		flex-shrink: 0;
	}
</style>
