<template>
	<view class="page">
		<view class="content">
			<!-- 顶部个人信息 -->
			<view class="profile-card" @click="goLogin">
				<view class="avatar">
					<u-icon name="account-fill" color="#ffffff" size="50"></u-icon>
				</view>
				<view class="profile-info">
					<text class="login-text">未登录</text>
					<text class="login-tip">点击登录以使用完整功能</text>
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
	</view>
</template>

<script setup>
	import { ref } from 'vue'
	import { onShow } from '@dcloudio/uni-app'
	import { getTarget } from '@/utils/common'

	const targetName = ref(getTarget().name)

	const load = () => {
		targetName.value = getTarget().name
	}

	const goSetSite = () => {
		uni.navigateTo({ url: '/pages/my/setSite/index' })
	}

	const goLogin = () => {
		uni.navigateTo({ url: '/pages/login/login' })
	}

	onShow(() => {
		load()
	})
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
          background: linear-gradient(135deg, #0f172a 0%, #1b2a4a 60%, #2f4b8f 100%);
					box-shadow: 0 10rpx 22rpx rgba(79, 110, 247, 0.26);
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
