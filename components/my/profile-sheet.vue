<template>
	<view v-if="show" class="sheet-mask" @click="emit('close')">
		<view class="sheet" @click.stop>
			<text class="sheet-title">完善微信资料</text>
			<text class="sheet-sub">请选择微信头像并填写微信昵称</text>

			<view class="sheet-field">
				<text class="sheet-label">头像</text>
				<button class="avatar-picker" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
					<image v-if="draft.avatarUrl" class="avatar-preview" :src="draft.avatarUrl" mode="aspectFill"></image>
					<text v-else class="avatar-picker-text">使用微信头像</text>
				</button>
			</view>

			<view class="sheet-field">
				<text class="sheet-label">昵称</text>
				<input class="sheet-input" type="nickname" placeholder="点击输入微信昵称" v-model="draft.nickName" />
			</view>

			<view class="sheet-actions">
				<view class="sheet-btn ghost" @click="emit('close')">取消</view>
				<view class="sheet-btn primary" @click="confirm">完成</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import { ref, watch } from 'vue'
	import { toast } from '@/utils/common'

	const props = defineProps({
		show: {
			type: Boolean,
			default: false
		}
	})

	const emit = defineEmits(['close', 'confirm'])

	const draft = ref({ nickName: '', avatarUrl: '' })

	// 每次打开都重置，避免上次填写的内容残留
	watch(
		() => props.show,
		(v) => {
			if (v) draft.value = { nickName: '', avatarUrl: '' }
		}
	)

	// 微信头像选择（open-type="chooseAvatar"）
	const onChooseAvatar = (e) => {
		const url = e && e.detail ? e.detail.avatarUrl : ''
		if (url) draft.value = { ...draft.value, avatarUrl: url }
	}

	// 头像是微信返回的临时路径，转成 base64 才能长期保存
	const fileToBase64 = (filePath) =>
		new Promise((resolve) => {
			// #ifdef MP-WEIXIN
			uni.getFileSystemManager().readFile({
				filePath,
				encoding: 'base64',
				success: (res) => {
					const mime = /\.png$/i.test(filePath) ? 'image/png' : 'image/jpeg'
					resolve(`data:${mime};base64,${res.data}`)
				},
				fail: () => resolve(filePath)
			})
			// #endif
			// #ifndef MP-WEIXIN
			resolve(filePath)
			// #endif
		})

	const confirm = async () => {
		const nickName = (draft.value.nickName || '').trim()
		if (!nickName) {
			toast('请输入昵称')
			return
		}
		const raw = draft.value.avatarUrl
		const avatarUrl = raw ? await fileToBase64(raw) : ''
		emit('confirm', { nickName, avatarUrl })
	}
</script>

<style scoped lang="scss">
	.sheet-mask {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 99;
		display: flex;
		align-items: flex-end;
		background: rgba(15, 23, 42, 0.45);

		.sheet {
			width: 100%;
			padding: 36rpx 36rpx 56rpx;
			border-radius: 32rpx 32rpx 0 0;
			background: #ffffff;

			.sheet-title {
				display: block;
				font-size: 30rpx;
				font-weight: 600;
				text-align: center;
				color: #1f2d5e;
			}

			.sheet-sub {
				display: block;
				margin-top: 12rpx;
				font-size: 22rpx;
				line-height: 1.5;
				text-align: center;
				color: #98a2b3;
			}

			.sheet-field {
				display: flex;
				align-items: center;
				margin-top: 36rpx;
				padding: 20rpx 24rpx;
				border-radius: 20rpx;
				background: #f7f8fc;

				& + .sheet-field {
					margin-top: 20rpx;
				}

				.sheet-label {
					margin-right: 24rpx;
					font-size: 26rpx;
					color: #1f2d5e;
				}

				.sheet-input {
					flex: 1;
					height: 46rpx;
					font-size: 26rpx;
					color: #1f2d5e;
				}

				.avatar-picker {
					flex: 1;
					display: flex;
					align-items: center;
					justify-content: flex-end;
					margin: 0;
					padding: 0;
					background: transparent;
					border: none;
					line-height: normal;

					&::after {
						border: none;
					}

					.avatar-preview {
						width: 76rpx;
						height: 76rpx;
						border-radius: 50%;
					}

					.avatar-picker-text {
						font-size: 24rpx;
						color: #07c160;
					}
				}
			}

			.sheet-actions {
				display: flex;
				margin-top: 44rpx;

				.sheet-btn {
					flex: 1;
					height: 84rpx;
					line-height: 84rpx;
					text-align: center;
					border-radius: 20rpx;
					font-size: 28rpx;

					& + .sheet-btn {
						margin-left: 20rpx;
					}

					&.ghost {
						color: #98a2b3;
						background: #f2f4f8;
					}

					&.primary {
						color: #ffffff;
						background-color: #07c160;
					}

					&:active {
						opacity: 0.9;
					}
				}
			}
		}
	}
</style>
