<template>
	<view class="container">
		<!-- 背景装饰 -->
		<view class="bg-decoration">
			<view class="bg-circle bg-circle-1"></view>
			<view class="bg-circle bg-circle-2"></view>
		</view>

		<!-- 加载状态 -->
		<view class="loading-wrapper" v-if="loading">
			<view class="loading-spinner"></view>
			<text class="loading-text">加载中...</text>
		</view>

		<!-- 用户信息内容 -->
		<view class="content-wrapper" v-else-if="userInfo">
			<!-- 用户头像和基本信息 -->
			<view class="profile-card">
				<view class="avatar-wrapper">
					<image 
						class="avatar" 
						:src="userInfo.avatarUrl || '/static/default-avatar.png'" 
						mode="aspectFill"
					></image>
				</view>
				<view class="profile-info">
				<text class="nickname">{{ userInfo.nickname || '用户' }}</text>
				<text class="email">{{ userInfo.email }}</text>
				<view :class="'status-badge ' + (userInfo.emailVerified ? 'verified' : 'unverified')">
						<text class="status-text">{{ userInfo.emailVerified ? '已验证' : '未验证' }}</text>
					</view>
				</view>
			</view>

			<!-- 签到统计卡片 -->
			<view class="stats-card">
				<view class="stats-title">签到统计</view>
				<view class="stats-grid">
					<view class="stat-item">
						<text class="stat-value">{{ userInfo.continuousDays || 0 }}</text>
						<text class="stat-label">连续签到</text>
					</view>
					<view class="stat-divider"></view>
					<view class="stat-item">
						<text class="stat-value">{{ userInfo.totalSignDays || 0 }}</text>
						<text class="stat-label">累计签到</text>
					</view>
				</view>
				<view class="last-sign-time" v-if="userInfo.lastSignTime">
					<text class="last-sign-label">最后签到：</text>
					<text class="last-sign-value">{{ formatTime(userInfo.lastSignTime) }}</text>
				</view>
			</view>

			<!-- 功能列表 -->
			<view class="action-card">
				<view class="action-item" @click="goToSignRecords">
					<view class="action-left">
						<text class="action-icon">📝</text>
						<text class="action-text">签到记录</text>
					</view>
					<text class="action-arrow">›</text>
				</view>
				<view class="action-divider"></view>
				<view class="action-item" @click="refreshUserInfo">
					<view class="action-left">
						<text class="action-icon">🔄</text>
						<text class="action-text">刷新信息</text>
					</view>
					<text class="action-arrow">›</text>
				</view>
			</view>

			<!-- 返回首页按钮 -->
			<view class="footer-button">
				<button class="back-button" @click="goBack">返回首页</button>
			</view>
		</view>

		<!-- 错误状态 -->
		<view class="error-wrapper" v-else>
			<text class="error-icon">⚠️</text>
			<text class="error-text">{{ errorMessage }}</text>
			<button class="retry-button" @click="loadUserInfo">重新加载</button>
		</view>
	</view>
</template>

<script>
import { getUserInfo, getUserInfoByEmail } from '@/utils/api.js'
import store from '@/utils/store.js'

export default {
	data() {
		return {
			userInfo: null,
			loading: true,
			errorMessage: ''
		}
	},
	onLoad(options) {
		this.loadUserInfo(options)
	},
	onShow() {
		// 每次显示页面时刷新用户信息
		const storeUserInfo = store.getUserInfo();
		if (storeUserInfo) {
			this.userInfo = storeUserInfo;
		}
	},
	methods: {
		loadUserInfo(options = {}) {
			this.loading = true;
			this.errorMessage = '';
			
			// 获取用户标识（优先级：参数 > 本地存储）
			let openid = options.openid;
			let email = options.email;
			
			// 如果参数中没有，尝试从本地存储获取
			if (!openid && !email) {
				const storeUserInfo = store.getUserInfo();
				if (storeUserInfo) {
					openid = storeUserInfo.openid;
					email = storeUserInfo.email;
				}
			}
			
			// 如果还是没有，尝试从本地存储获取邮箱
			if (!openid && !email) {
				email = uni.getStorageSync('userEmail');
			}
			
			if (!openid && !email) {
				this.errorMessage = '无法获取用户信息，请先进行签到';
				this.loading = false;
				uni.showToast({
					title: this.errorMessage,
					icon: 'none',
					duration: 2000
				});
				return;
			}
			
			// 调用接口获取用户信息
			const apiCall = openid ? getUserInfo(openid) : getUserInfoByEmail(email);
			
			apiCall.then(res => {
				if (res.code === 0 && res.data) {
					this.userInfo = res.data;
					// 保存到全局状态
					store.setUserInfo(res.data);
				} else {
					throw new Error(res.message || '获取用户信息失败');
				}
			}).catch(error => {
				console.error('加载用户信息失败:', error);
				this.errorMessage = error.message || '加载失败，请检查网络连接';
				uni.showToast({
					title: this.errorMessage,
					icon: 'none',
					duration: 2000
				});
			}).finally(() => {
				this.loading = false;
			});
		},
		
		refreshUserInfo() {
			uni.showLoading({
				title: '刷新中...'
			});
			this.loadUserInfo();
			// 等待一小段时间后隐藏 loading
			setTimeout(() => {
				uni.hideLoading();
				uni.showToast({
					title: '刷新成功',
					icon: 'success',
					duration: 1500
				});
			}, 500);
		},
		
		goToSignRecords() {
			const userInfo = this.userInfo;
			if (!userInfo) return;
			
			uni.navigateTo({
				url: `/pages/sign/records?openid=${userInfo.openid || ''}&email=${userInfo.email || ''}`
			});
		},
		
		goBack() {
			uni.switchTab({
				url: '/pages/index/index'
			});
		},
		
		formatTime(timeStr) {
			if (!timeStr) return '';
			const date = new Date(timeStr);
			const now = new Date();
			const diff = now - date;
			const days = Math.floor(diff / (1000 * 60 * 60 * 24));
			
			if (days === 0) {
				return '今天 ' + timeStr.substring(11, 16);
			} else if (days === 1) {
				return '昨天 ' + timeStr.substring(11, 16);
			} else if (days < 7) {
				return days + '天前';
			} else {
				return timeStr.substring(0, 10);
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #FAF8F5;
	position: relative;
	padding: 40rpx;
}

/* 背景装饰 */
.bg-decoration {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 0;
}

.bg-circle {
	position: absolute;
	border-radius: 50%;
	background: radial-gradient(circle, rgba(232, 168, 124, 0.12) 0%, transparent 70%);
	filter: blur(50rpx);
	animation: float 15s ease-in-out infinite;
}

.bg-circle-1 {
	width: 350rpx;
	height: 350rpx;
	top: -100rpx;
	right: -50rpx;
}

.bg-circle-2 {
	width: 300rpx;
	height: 300rpx;
	bottom: 20%;
	left: -80rpx;
	animation-delay: 7s;
}

@keyframes float {
	0%, 100% {
		transform: translate(0, 0) scale(1);
	}
	50% {
		transform: translate(20rpx, -20rpx) scale(1.05);
	}
}

/* 加载状态 */
.loading-wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 60vh;
	position: relative;
	z-index: 1;
}

.loading-spinner {
	width: 80rpx;
	height: 80rpx;
	border: 4rpx solid #E8E8E8;
	border-top-color: #E8A87C;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.loading-text {
	margin-top: 32rpx;
	font-size: 28rpx;
	color: #6B6B6B;
}

/* 内容区域 */
.content-wrapper {
	position: relative;
	z-index: 1;
	max-width: 680rpx;
	margin: 0 auto;
}

/* 用户头像卡片 */
.profile-card {
	background: #FFFFFF;
	border-radius: 32rpx;
	padding: 48rpx;
	margin-bottom: 32rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	display: flex;
	align-items: center;
	gap: 32rpx;
}

.avatar-wrapper {
	flex-shrink: 0;
}

.avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	border: 4rpx solid #E8A87C;
	background: #F5F5F5;
}

.profile-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.nickname {
	font-size: 36rpx;
	font-weight: 500;
	color: #2C2C2C;
	letter-spacing: 1rpx;
}

.email {
	font-size: 24rpx;
	color: #6B6B6B;
	letter-spacing: 0.5rpx;
}

.status-badge {
	align-self: flex-start;
	padding: 8rpx 20rpx;
	border-radius: 20rpx;
	margin-top: 8rpx;
}

.status-badge.verified {
	background: rgba(127, 176, 105, 0.1);
	border: 1rpx solid rgba(127, 176, 105, 0.3);
}

.status-badge.unverified {
	background: rgba(155, 155, 155, 0.1);
	border: 1rpx solid rgba(155, 155, 155, 0.3);
}

.status-text {
	font-size: 22rpx;
	color: #7FB069;
	font-weight: 500;
}

.status-badge.unverified .status-text {
	color: #9B9B9B;
}

/* 签到统计卡片 */
.stats-card {
	background: #FFFFFF;
	border-radius: 32rpx;
	padding: 40rpx;
	margin-bottom: 32rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.stats-title {
	font-size: 32rpx;
	font-weight: 500;
	color: #2C2C2C;
	margin-bottom: 32rpx;
	letter-spacing: 1rpx;
}

.stats-grid {
	display: flex;
	align-items: center;
	justify-content: space-around;
	padding: 32rpx 0;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
}

.stat-value {
	font-size: 56rpx;
	font-weight: 300;
	color: #E8A87C;
	letter-spacing: 2rpx;
}

.stat-label {
	font-size: 24rpx;
	color: #6B6B6B;
	letter-spacing: 1rpx;
}

.stat-divider {
	width: 2rpx;
	height: 80rpx;
	background: #E8E8E8;
}

.last-sign-time {
	margin-top: 32rpx;
	padding-top: 32rpx;
	border-top: 1rpx solid #E8E8E8;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
}

.last-sign-label {
	font-size: 24rpx;
	color: #6B6B6B;
}

.last-sign-value {
	font-size: 24rpx;
	color: #2C2C2C;
	font-weight: 500;
}

/* 功能列表卡片 */
.action-card {
	background: #FFFFFF;
	border-radius: 32rpx;
	padding: 0 40rpx;
	margin-bottom: 32rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.action-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 32rpx 0;
	transition: opacity 0.3s;
}

.action-item:active {
	opacity: 0.6;
}

.action-left {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.action-icon {
	font-size: 40rpx;
}

.action-text {
	font-size: 28rpx;
	color: #2C2C2C;
	letter-spacing: 1rpx;
}

.action-arrow {
	font-size: 48rpx;
	color: #CCCCCC;
	font-weight: 300;
	line-height: 1;
}

.action-divider {
	height: 1rpx;
	background: #E8E8E8;
	margin: 0 -40rpx;
	padding: 0 40rpx;
}

/* 底部按钮 */
.footer-button {
	margin-top: 40rpx;
}

.back-button {
	width: 100%;
	height: 88rpx;
	background: linear-gradient(135deg, #E8A87C 0%, #D4946A 100%);
	border-radius: 20rpx;
	border: none;
	color: #FFFFFF;
	font-size: 30rpx;
	font-weight: 400;
	letter-spacing: 2rpx;
	box-shadow: 0 4rpx 16rpx rgba(232, 168, 124, 0.3);
	transition: all 0.3s;
}

.back-button:active {
	transform: scale(0.98);
	box-shadow: 0 2rpx 8rpx rgba(232, 168, 124, 0.2);
}

/* 错误状态 */
.error-wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 60vh;
	position: relative;
	z-index: 1;
	padding: 40rpx;
}

.error-icon {
	font-size: 80rpx;
	margin-bottom: 24rpx;
}

.error-text {
	font-size: 28rpx;
	color: #6B6B6B;
	text-align: center;
	margin-bottom: 48rpx;
	line-height: 1.6;
}

.retry-button {
	width: 320rpx;
	height: 80rpx;
	background: linear-gradient(135deg, #E8A87C 0%, #D4946A 100%);
	border-radius: 20rpx;
	border: none;
	color: #FFFFFF;
	font-size: 28rpx;
	letter-spacing: 2rpx;
	box-shadow: 0 4rpx 16rpx rgba(232, 168, 124, 0.3);
}

.retry-button:active {
	transform: scale(0.98);
}
</style>
