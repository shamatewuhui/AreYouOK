<template>
	<view class="container">
		<!-- 赛博朋克背景层 -->
		<view class="cyber-bg">
			<view class="grid-lines"></view>
			<view class="neon-glow neon-glow-1"></view>
			<view class="neon-glow neon-glow-2"></view>
			<view class="particle particle-1"></view>
			<view class="particle particle-2"></view>
			<view class="particle particle-3"></view>
			<view class="scan-line"></view>
		</view>
		
		<!-- 主内容区 -->
		<view class="content-wrapper">
		<!-- 标题区域 -->
		<view class="header-section">
			<view class="title-main">
				<text class="title-text">8点上线？</text>
				<view class="title-glitch" aria-hidden="true">8点上线？</view>
			</view>
			<view class="title-subtitle">
				<text class="pixel-text">日吃一🐔，🐔🐔复🐔🐔</text>
			</view>
		</view>
			
		<!-- 用户信息快捷入口 -->
		<view class="quick-info cyber-card" v-if="userInfo" @click="goToUserInfo">
			<view class="card-glow"></view>
			<view class="quick-info-left">
				<text class="quick-info-name neon-text">{{ userInfo.nickname || formData.name }}</text>
				<view class="quick-info-stats">
					<text class="quick-stat cyber-badge">连续 {{ userInfo.continuousDays || 0 }} 天</text>
					<text class="quick-divider">|</text>
					<text class="quick-stat cyber-badge">累计 {{ userInfo.totalSignDays || 0 }} 天</text>
				</view>
			</view>
			<text class="quick-info-arrow neon-arrow">▶</text>
		</view>
			
		<!-- 表单卡片 -->
		<view class="form-card cyber-panel">
			<view class="panel-border"></view>
			<!-- 姓名输入 -->
			<view class="input-wrapper">
				<text class="input-label cyber-label">
					<text class="label-icon">▸</text> 姓名
				</text>
				<view class="input-container">
					<view class="input-glow"></view>
					<input 
						class="input-field cyber-input" 
						type="text" 
						:value="formData.name"
						@input="onNameInput"
						placeholder="请输入您的姓名"
						placeholder-class="input-placeholder"
					/>
				</view>
			</view>
			
			<!-- 邮箱输入 -->
			<view class="input-wrapper">
				<text class="input-label cyber-label">
					<text class="label-icon">▸</text> 联系邮箱
				</text>
				<view class="input-container">
					<view class="input-glow"></view>
					<input 
						class="input-field cyber-input" 
						type="text" 
						:value="formData.email"
						@input="onEmailInput"
						placeholder="请输入联系邮箱"
						placeholder-class="input-placeholder"
					/>
				</view>
			</view>
		</view>
			
		<!-- 签到按钮 -->
	<view class="button-wrapper">
		<view 
			:class="['sign-button cyber-button', !canSign ? 'disabled' : '', loading ? 'loading' : '', canSign && !loading ? 'ready' : '']"
			@click="handleSign"
		>
			<view class="button-bg-effects">
				<view class="hex-grid"></view>
				<view class="energy-ring"></view>
			</view>
			<view class="button-content">
				<text class="button-text cyber-text" v-if="!loading">
					<text class="text-main">上线</text>
				</text>
				<text class="button-text loading-text cyber-loading" v-else>
					<text class="loading-spinner">◐</text> 连接中...
				</text>
			</view>
			<view class="button-pulse" v-if="canSign && !loading"></view>
		</view>
		<text class="button-hint cyber-hint" v-if="!loading && !canSign">
			<text class="hint-icon">⚠</text> 请先填写完整信息
		</text>
	</view>
			
	<!-- 提示信息 -->
	<view class="tip-wrapper" v-if="tipMessage">
		<view :class="'tip-content cyber-alert ' + tipType">
			<view class="alert-border"></view>
			<text class="tip-icon">{{ tipType === 'success' ? '✓' : '✕' }}</text>
			<text class="tip-message">{{ tipMessage }}</text>
		</view>
	</view>
		
		<!-- 底部功能按钮 -->
		<view class="footer-actions" v-if="userInfo">
			<view class="action-button cyber-action" @click="goToSignRecords">
				<view class="action-glow"></view>
				<text class="action-icon">📊</text>
				<text class="action-text">签到记录</text>
			</view>
		</view>
		</view>
	</view>
</template>

<script>
import { signIn, getUserInfo, getUserInfoByEmail } from '@/utils/api.js'
import { validateEmail, validateName, validateRequired } from '@/utils/validate.js'
import store from '@/utils/store.js'

export default {
	data() {
		return {
			formData: {
				name: '',
				email: ''
			},
			loading: false,
			tipMessage: '',
			tipType: 'success',
			userInfo: null,
			canSign: false,  // 改为 data 属性
			isFormDirty: false  // 标记表单是否被用户修改过
		}
	},
	onLoad() {
		this.loadSavedUserInfo();
		this.loadUserInfo();
		this.updateCanSign();
	},
	onShow() {
		// 每次显示页面时刷新用户信息
		this.loadUserInfo();
		this.updateCanSign();
	},
	methods: {
		// 处理姓名输入
		onNameInput(e) {
			this.formData.name = e.detail.value;
			this.isFormDirty = true;  // 标记表单已被修改
			this.updateCanSign();
		},
		
		// 处理邮箱输入
		onEmailInput(e) {
			this.formData.email = e.detail.value;
			this.isFormDirty = true;  // 标记表单已被修改
			this.updateCanSign();
		},
		
		// 更新 canSign 状态
		updateCanSign() {
			this.canSign = validateRequired(this.formData.name) && 
						   validateRequired(this.formData.email) && 
						   validateEmail(this.formData.email);
		},
		
		loadSavedUserInfo() {
			try {
				const savedName = uni.getStorageSync('userName');
				const savedEmail = uni.getStorageSync('userEmail');
				if (savedName) this.formData.name = savedName;
				if (savedEmail) this.formData.email = savedEmail;
			} catch (e) {
				console.log('加载本地用户信息失败:', e);
			}
		},
		
		loadUserInfo() {
			// 从全局状态获取用户信息
			const storeUserInfo = store.getUserInfo();
			if (storeUserInfo) {
				this.userInfo = storeUserInfo;
				// 只有在表单未被修改时才自动填充
				if (!this.isFormDirty) {
					// 优先使用本地存储的最新数据
					const savedName = uni.getStorageSync('userName');
					const savedEmail = uni.getStorageSync('userEmail');
					this.formData.name = savedName || storeUserInfo.nickname || '';
					this.formData.email = savedEmail || storeUserInfo.email || '';
				}
				return;
			}
			
			// 如果没有全局状态，尝试从本地获取邮箱，然后查询
			const savedEmail = uni.getStorageSync('userEmail');
			if (savedEmail) {
				getUserInfoByEmail(savedEmail).then(res => {
					if (res.code === 0 && res.data) {
						this.userInfo = res.data;
						store.setUserInfo(res.data);
						// 只有在表单未被修改时才自动填充
						if (!this.isFormDirty) {
							const savedName = uni.getStorageSync('userName');
							this.formData.name = savedName || res.data.nickname || '';
							this.formData.email = savedEmail;
						}
					}
				}).catch(e => {
					console.log('获取用户信息失败:', e);
				});
			}
		},
		
		saveUserInfo() {
			try {
				uni.setStorageSync('userName', this.formData.name.trim());
				uni.setStorageSync('userEmail', this.formData.email.trim());
			} catch (e) {
				console.log('保存用户信息失败:', e);
			}
		},
		
		handleSign() {
			if (!validateRequired(this.formData.name)) {
				this.showTip('请输入您的姓名', 'error');
				return;
			}
			
			if (!validateName(this.formData.name)) {
				this.showTip('姓名格式不正确（2-20个字符）', 'error');
				return;
			}
			
			if (!validateRequired(this.formData.email)) {
				this.showTip('请输入联系人邮箱', 'error');
				return;
			}
			
			if (!validateEmail(this.formData.email)) {
				this.showTip('请输入正确的邮箱格式', 'error');
				return;
			}
			
			this.loading = true;
			this.tipMessage = '';
			
			// 先尝试获取微信登录信息
			uni.login({
				provider: 'weixin',
				success: (loginRes) => {
					console.log('微信登录code:', loginRes.code);
					this.doSignIn('');
				},
				fail: (e) => {
					console.log('获取微信登录信息失败:', e);
					this.doSignIn('');
				}
			});
		},
		
		doSignIn(openid) {
			signIn({
				name: this.formData.name.trim(),
				email: this.formData.email.trim(),
				openid: openid
			}).then(res => {
				this.showTip('签到成功！', 'success');
				this.saveUserInfo();
				
				// 更新全局状态中的签到信息
				if (res.data) {
					store.updateSignInfo({
						signTime: res.data.signTime,
						continuousDays: res.data.continuousDays,
						totalSignDays: res.data.totalSignDays
					});
					// 重新加载用户信息,但不覆盖表单
					// 因为用户可能刚修改了姓名和邮箱
					this.loadUserInfo();
				}
				
				// 签到成功后,清除修改标记,允许下次自动填充
				// 但保持当前表单内容不变
				this.isFormDirty = false;
				
				uni.vibrateShort({
					type: 'medium'
				});
				
				this.loading = false;
			}).catch(error => {
				console.error('签到失败:', error);
				const errorMsg = error.message || '签到失败，请检查网络连接';
				this.showTip(errorMsg, 'error');
				
				uni.vibrateShort({
					type: 'heavy'
				});
				
				this.loading = false;
			});
		},
		
		showTip(message, type = 'success') {
			this.tipMessage = message;
			this.tipType = type;
			setTimeout(() => {
				this.tipMessage = '';
			}, 3000);
		},
		
		goToUserInfo() {
			if (!this.userInfo) return;
			uni.navigateTo({
				url: '/pages/user/info'
			});
		},
		
		goToSignRecords() {
			if (!this.userInfo) return;
			uni.navigateTo({
				url: `/pages/sign/records?openid=${this.userInfo.openid || ''}&email=${this.userInfo.email || ''}`
			});
		}
	}
}
</script>

<style lang="scss" scoped>
/* 赛博朋克游戏风格 - CYBERPUNK AESTHETIC */

.container {
	min-height: 100vh;
	background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1429 100%);
	position: relative;
	overflow: hidden;
	padding: 60rpx 40rpx 80rpx;
}

/* 赛博朋克背景层 */
.cyber-bg {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 0;
	overflow: hidden;
}

.grid-lines {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-image: 
		linear-gradient(rgba(0, 255, 255, 0.03) 1rpx, transparent 1rpx),
		linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1rpx, transparent 1rpx);
	background-size: 50rpx 50rpx;
	animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
	0% {
		transform: translateY(0);
	}
	100% {
		transform: translateY(50rpx);
	}
}

.neon-glow {
	position: absolute;
	border-radius: 50%;
	filter: blur(80rpx);
	animation: neonPulse 4s ease-in-out infinite;
}

.neon-glow-1 {
	width: 400rpx;
	height: 400rpx;
	top: -100rpx;
	right: -100rpx;
	background: radial-gradient(circle, rgba(0, 255, 255, 0.15) 0%, transparent 70%);
	animation-delay: 0s;
}

.neon-glow-2 {
	width: 350rpx;
	height: 350rpx;
	bottom: 10%;
	left: -80rpx;
	background: radial-gradient(circle, rgba(255, 0, 255, 0.12) 0%, transparent 70%);
	animation-delay: 2s;
}

@keyframes neonPulse {
	0%, 100% {
		opacity: 0.5;
		transform: scale(1);
	}
	50% {
		opacity: 0.8;
		transform: scale(1.1);
	}
}

.particle {
	position: absolute;
	width: 4rpx;
	height: 4rpx;
	background: rgba(0, 255, 255, 0.6);
	border-radius: 50%;
	box-shadow: 0 0 10rpx rgba(0, 255, 255, 0.8);
	animation: particleFloat 8s ease-in-out infinite;
}

.particle-1 {
	top: 20%;
	left: 10%;
	animation-delay: 0s;
}

.particle-2 {
	top: 60%;
	right: 15%;
	animation-delay: 2.5s;
	background: rgba(255, 0, 255, 0.6);
	box-shadow: 0 0 10rpx rgba(255, 0, 255, 0.8);
}

.particle-3 {
	top: 45%;
	left: 70%;
	animation-delay: 5s;
}

@keyframes particleFloat {
	0%, 100% {
		transform: translate(0, 0);
		opacity: 0.3;
	}
	50% {
		transform: translate(30rpx, -50rpx);
		opacity: 1;
	}
}

.scan-line {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 4rpx;
	background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.8), transparent);
	box-shadow: 0 0 20rpx rgba(0, 255, 255, 0.8);
	animation: scan 3s linear infinite;
}

@keyframes scan {
	0% {
		transform: translateY(-10rpx);
		opacity: 0;
	}
	10% {
		opacity: 1;
	}
	90% {
		opacity: 1;
	}
	100% {
		transform: translateY(100vh);
		opacity: 0;
	}
}

/* 主内容区 */
.content-wrapper {
	position: relative;
	z-index: 1;
	max-width: 640rpx;
	margin: 0 auto;
	width: 100%;
	box-sizing: border-box;
}

/* 标题区域 - 赛博朋克风格 */
.header-section {
	margin-bottom: 60rpx;
	text-align: left;
	position: relative;
}

.title-main {
	position: relative;
	margin-bottom: 20rpx;
}

.title-text {
	font-size: 88rpx;
	font-weight: 900;
	letter-spacing: 12rpx;
	color: #00ffff;
	text-shadow: 
		0 0 10rpx rgba(0, 255, 255, 0.8),
		0 0 20rpx rgba(0, 255, 255, 0.6),
		0 0 30rpx rgba(0, 255, 255, 0.4),
		2rpx 2rpx 4rpx rgba(255, 0, 255, 0.5);
	line-height: 1.1;
	font-family: 'Courier New', 'PingFang SC', monospace;
	display: inline-block;
	animation: titleGlow 2s ease-in-out infinite;
}

@keyframes titleGlow {
	0%, 100% {
		text-shadow: 
			0 0 10rpx rgba(0, 255, 255, 0.8),
			0 0 20rpx rgba(0, 255, 255, 0.6),
			0 0 30rpx rgba(0, 255, 255, 0.4),
			2rpx 2rpx 4rpx rgba(255, 0, 255, 0.5);
	}
	50% {
		text-shadow: 
			0 0 20rpx rgba(0, 255, 255, 1),
			0 0 30rpx rgba(0, 255, 255, 0.8),
			0 0 40rpx rgba(0, 255, 255, 0.6),
			2rpx 2rpx 4rpx rgba(255, 0, 255, 0.7);
	}
}

.title-glitch {
	position: absolute;
	top: 0;
	left: 0;
	font-size: 88rpx;
	font-weight: 900;
	letter-spacing: 12rpx;
	color: #ff00ff;
	opacity: 0.7;
	animation: glitch 3s infinite;
	pointer-events: none;
}

@keyframes glitch {
	0%, 90%, 100% {
		transform: translate(0, 0);
		opacity: 0;
	}
	91% {
		transform: translate(-4rpx, 2rpx);
		opacity: 0.7;
	}
	93% {
		transform: translate(4rpx, -2rpx);
		opacity: 0.7;
	}
	95% {
		transform: translate(-2rpx, 3rpx);
		opacity: 0.7;
	}
}

.title-subtitle {
	display: inline-block;
}

.pixel-text {
	font-size: 28rpx;
	color: #00ff00;
	letter-spacing: 4rpx;
	font-weight: 500;
	font-family: 'Courier New', monospace;
	text-shadow: 0 0 10rpx rgba(0, 255, 0, 0.8);
	animation: pixelBlink 1.5s step-end infinite;
}

@keyframes pixelBlink {
	0%, 50%, 100% {
		opacity: 1;
	}
	25%, 75% {
		opacity: 0.7;
	}
}

/* 用户信息卡片 - 赛博风格 */
.cyber-card {
	position: relative;
	background: rgba(10, 20, 40, 0.6);
	backdrop-filter: blur(10rpx);
	border: 2rpx solid rgba(0, 255, 255, 0.3);
	border-radius: 16rpx;
	padding: 32rpx;
	margin-bottom: 50rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-shadow: 
		0 0 20rpx rgba(0, 255, 255, 0.2),
		inset 0 0 30rpx rgba(0, 255, 255, 0.05);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	overflow: hidden;
}

.card-glow {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: linear-gradient(45deg, transparent, rgba(0, 255, 255, 0.1), transparent);
	animation: cardScan 3s linear infinite;
	pointer-events: none;
}

@keyframes cardScan {
	0% {
		transform: translateX(-100%);
	}
	100% {
		transform: translateX(100%);
	}
}

.cyber-card:active {
	transform: scale(0.98);
	border-color: rgba(0, 255, 255, 0.6);
	box-shadow: 
		0 0 30rpx rgba(0, 255, 255, 0.4),
		inset 0 0 30rpx rgba(0, 255, 255, 0.1);
}

.quick-info-left {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
	z-index: 1;
}

.neon-text {
	font-size: 34rpx;
	color: #00ffff;
	font-weight: 700;
	letter-spacing: 2rpx;
	font-family: 'Courier New', monospace;
	text-shadow: 0 0 10rpx rgba(0, 255, 255, 0.8);
}

.quick-info-stats {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.cyber-badge {
	font-size: 22rpx;
	color: #00ff00;
	font-weight: 600;
	font-family: 'Courier New', monospace;
	text-shadow: 0 0 8rpx rgba(0, 255, 0, 0.6);
	padding: 4rpx 12rpx;
	background: rgba(0, 255, 0, 0.1);
	border: 1rpx solid rgba(0, 255, 0, 0.3);
	border-radius: 4rpx;
}

.quick-divider {
	font-size: 20rpx;
	color: rgba(0, 255, 255, 0.5);
}

.neon-arrow {
	font-size: 40rpx;
	color: #ff00ff;
	text-shadow: 0 0 10rpx rgba(255, 0, 255, 0.8);
	animation: arrowBounce 1s ease-in-out infinite;
	z-index: 1;
}

@keyframes arrowBounce {
	0%, 100% {
		transform: translateX(0);
	}
	50% {
		transform: translateX(10rpx);
	}
}

/* 表单面板 - 赛博风格 */
.cyber-panel {
	position: relative;
	background: rgba(10, 20, 40, 0.7);
	backdrop-filter: blur(15rpx);
	border: 2rpx solid rgba(0, 255, 255, 0.4);
	border-radius: 20rpx;
	padding: 50rpx 40rpx;
	margin-bottom: 70rpx;
	box-sizing: border-box;
	box-shadow: 
		0 8rpx 32rpx rgba(0, 0, 0, 0.5),
		0 0 40rpx rgba(0, 255, 255, 0.15),
		inset 0 0 50rpx rgba(0, 255, 255, 0.03);
	overflow: hidden;
}

.panel-border {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 4rpx;
	background: linear-gradient(90deg, 
		transparent,
		rgba(0, 255, 255, 0.8),
		rgba(255, 0, 255, 0.8),
		transparent);
	animation: borderFlow 3s linear infinite;
}

@keyframes borderFlow {
	0% {
		transform: translateX(-100%);
	}
	100% {
		transform: translateX(100%);
	}
}

.input-wrapper {
	margin-bottom: 48rpx;
	position: relative;
	width: 100%;
	box-sizing: border-box;
}

.input-wrapper:last-child {
	margin-bottom: 0;
}

.cyber-label {
	display: flex;
	align-items: center;
	gap: 8rpx;
	font-size: 26rpx;
	color: #00ffff;
	margin-bottom: 16rpx;
	font-weight: 600;
	letter-spacing: 2rpx;
	font-family: 'Courier New', monospace;
	text-shadow: 0 0 8rpx rgba(0, 255, 255, 0.6);
	text-transform: uppercase;
}

.label-icon {
	color: #ff00ff;
	text-shadow: 0 0 8rpx rgba(255, 0, 255, 0.6);
}

.input-container {
	position: relative;
	width: 100%;
	box-sizing: border-box;
}

.input-glow {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	border-radius: 12rpx;
	background: rgba(0, 255, 255, 0.05);
	opacity: 0;
	transition: opacity 0.3s;
	pointer-events: none;
}

.cyber-input {
	width: 100%;
	height: 100rpx;
	background: rgba(0, 20, 40, 0.6);
	border-radius: 12rpx;
	padding: 0 30rpx;
	font-size: 30rpx;
	color: #00ffff;
	font-family: 'Courier New', monospace;
	border: 2rpx solid rgba(0, 255, 255, 0.3);
	box-sizing: border-box;
	box-shadow: 
		inset 0 0 20rpx rgba(0, 0, 0, 0.5),
		0 0 10rpx rgba(0, 255, 255, 0.1);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cyber-input:focus {
	background: rgba(0, 30, 50, 0.8);
	border-color: #00ffff;
	box-shadow: 
		inset 0 0 20rpx rgba(0, 0, 0, 0.5),
		0 0 20rpx rgba(0, 255, 255, 0.4),
		0 0 40rpx rgba(0, 255, 255, 0.2);
}

.cyber-input:focus + .input-glow {
	opacity: 1;
}

.input-placeholder {
	color: rgba(0, 255, 255, 0.3);
	font-size: 26rpx;
	font-family: 'Courier New', monospace;
}

/* 赛博按钮区域 */
.button-wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin: 60rpx 0;
	position: relative;
}

.cyber-button {
	width: 280rpx;
	height: 280rpx;
	border-radius: 50%;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	background: radial-gradient(circle, rgba(0, 150, 150, 0.2), rgba(0, 50, 80, 0.9));
	border: 4rpx solid #00ffff;
	box-shadow: 
		0 0 30rpx rgba(0, 255, 255, 0.6),
		0 0 60rpx rgba(0, 255, 255, 0.4),
		inset 0 0 40rpx rgba(0, 255, 255, 0.2);
	overflow: visible;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	cursor: pointer;
}

.button-bg-effects {
	position: absolute;
	width: 100%;
	height: 100%;
	border-radius: 50%;
	overflow: hidden;
}

.hex-grid {
	position: absolute;
	width: 100%;
	height: 100%;
	background-image: 
		linear-gradient(30deg, rgba(0, 255, 255, 0.1) 12%, transparent 12.5%, transparent 87%, rgba(0, 255, 255, 0.1) 87.5%, rgba(0, 255, 255, 0.1)),
		linear-gradient(150deg, rgba(0, 255, 255, 0.1) 12%, transparent 12.5%, transparent 87%, rgba(0, 255, 255, 0.1) 87.5%, rgba(0, 255, 255, 0.1)),
		linear-gradient(30deg, rgba(0, 255, 255, 0.1) 12%, transparent 12.5%, transparent 87%, rgba(0, 255, 255, 0.1) 87.5%, rgba(0, 255, 255, 0.1)),
		linear-gradient(150deg, rgba(0, 255, 255, 0.1) 12%, transparent 12.5%, transparent 87%, rgba(0, 255, 255, 0.1) 87.5%, rgba(0, 255, 255, 0.1));
	background-size: 40rpx 70rpx;
	animation: hexMove 10s linear infinite;
}

@keyframes hexMove {
	0% {
		background-position: 0 0, 0 0, 20rpx 35rpx, 20rpx 35rpx;
	}
	100% {
		background-position: 0 140rpx, 0 140rpx, 20rpx 175rpx, 20rpx 175rpx;
	}
}

.energy-ring {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 200%;
	height: 200%;
	border-radius: 50%;
	border: 4rpx solid transparent;
	border-top-color: rgba(0, 255, 255, 0.6);
	border-right-color: rgba(255, 0, 255, 0.4);
	transform: translate(-50%, -50%);
	animation: ringRotate 3s linear infinite;
}

@keyframes ringRotate {
	0% {
		transform: translate(-50%, -50%) rotate(0deg);
	}
	100% {
		transform: translate(-50%, -50%) rotate(360deg);
	}
}

.cyber-button.ready {
	animation: cyberPulse 2s ease-in-out infinite;
}

@keyframes cyberPulse {
	0%, 100% {
		box-shadow: 
			0 0 30rpx rgba(0, 255, 255, 0.6),
			0 0 60rpx rgba(0, 255, 255, 0.4),
			inset 0 0 40rpx rgba(0, 255, 255, 0.2);
		transform: scale(1);
	}
	50% {
		box-shadow: 
			0 0 40rpx rgba(0, 255, 255, 0.8),
			0 0 80rpx rgba(0, 255, 255, 0.6),
			0 0 120rpx rgba(0, 255, 255, 0.3),
			inset 0 0 50rpx rgba(0, 255, 255, 0.3);
		transform: scale(1.05);
	}
}

.cyber-button:active {
	transform: scale(0.92);
	box-shadow: 
		0 0 20rpx rgba(0, 255, 255, 0.8),
		inset 0 0 30rpx rgba(0, 255, 255, 0.3);
}

.cyber-button.disabled {
	background: radial-gradient(circle, rgba(50, 50, 50, 0.2), rgba(30, 30, 30, 0.9));
	border-color: rgba(100, 100, 100, 0.5);
	box-shadow: 
		0 0 10rpx rgba(100, 100, 100, 0.3),
		inset 0 0 20rpx rgba(0, 0, 0, 0.5);
	opacity: 0.6;
}

.cyber-button.disabled:active {
	transform: none;
}

.cyber-button.loading {
	pointer-events: none;
}

.button-content {
	position: relative;
	z-index: 10;
	text-align: center;
}

.cyber-text {
	display: block;
}

.text-main {
	font-size: 72rpx;
	font-weight: 900;
	color: #00ffff;
	letter-spacing: 8rpx;
	font-family: 'Courier New', 'Impact', monospace;
	text-shadow: 
		0 0 10rpx rgba(0, 255, 255, 1),
		0 0 20rpx rgba(0, 255, 255, 0.8),
		0 0 30rpx rgba(0, 255, 255, 0.6),
		2rpx 2rpx 4rpx rgba(255, 0, 255, 0.5);
	animation: textFlicker 0.15s infinite;
}

@keyframes textFlicker {
	0%, 100% {
		opacity: 1;
	}
	50% {
		opacity: 0.95;
	}
}

.cyber-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	font-size: 28rpx;
	color: #00ff00;
	font-family: 'Courier New', monospace;
	text-shadow: 0 0 10rpx rgba(0, 255, 0, 0.8);
}

.loading-spinner {
	display: inline-block;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.button-pulse {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 100%;
	height: 100%;
	border-radius: 50%;
	border: 4rpx solid rgba(0, 255, 255, 0.6);
	transform: translate(-50%, -50%);
	animation: energyPulse 2s ease-out infinite;
}

@keyframes energyPulse {
	0% {
		width: 100%;
		height: 100%;
		opacity: 1;
		border-width: 4rpx;
	}
	100% {
		width: 150%;
		height: 150%;
		opacity: 0;
		border-width: 1rpx;
	}
}

.cyber-hint {
	display: flex;
	align-items: center;
	gap: 8rpx;
	font-size: 24rpx;
	color: rgba(255, 100, 100, 0.8);
	margin-top: 30rpx;
	letter-spacing: 2rpx;
	font-family: 'Courier New', monospace;
	text-shadow: 0 0 10rpx rgba(255, 100, 100, 0.5);
	animation: hintBlink 2s ease-in-out infinite;
}

.hint-icon {
	animation: iconPulse 1s ease-in-out infinite;
}

@keyframes hintBlink {
	0%, 100% {
		opacity: 1;
	}
	50% {
		opacity: 0.6;
	}
}

@keyframes iconPulse {
	0%, 100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.2);
	}
}

/* 赛博提示信息 */
.tip-wrapper {
	margin-top: 40rpx;
	animation: alertSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes alertSlideIn {
	from {
		opacity: 0;
		transform: translateY(-20rpx) scale(0.9);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}

.cyber-alert {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 28rpx 36rpx;
	border-radius: 16rpx;
	font-size: 28rpx;
	gap: 16rpx;
	backdrop-filter: blur(10rpx);
	overflow: hidden;
}

.alert-border {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	border-radius: 16rpx;
	animation: borderScan 2s linear infinite;
	pointer-events: none;
}

@keyframes borderScan {
	0% {
		box-shadow: inset 0 0 0 2rpx rgba(0, 255, 255, 0.5);
	}
	50% {
		box-shadow: inset 0 0 0 2rpx rgba(0, 255, 255, 1);
	}
	100% {
		box-shadow: inset 0 0 0 2rpx rgba(0, 255, 255, 0.5);
	}
}

.cyber-alert.success {
	background: rgba(0, 255, 100, 0.15);
	color: #00ff66;
	border: 2rpx solid rgba(0, 255, 100, 0.4);
	box-shadow: 
		0 0 20rpx rgba(0, 255, 100, 0.3),
		inset 0 0 30rpx rgba(0, 255, 100, 0.1);
}

.cyber-alert.success .alert-border {
	animation: borderScan 2s linear infinite;
	box-shadow: inset 0 0 0 2rpx rgba(0, 255, 100, 0.5);
}

.cyber-alert.error {
	background: rgba(255, 0, 100, 0.15);
	color: #ff3366;
	border: 2rpx solid rgba(255, 0, 100, 0.4);
	box-shadow: 
		0 0 20rpx rgba(255, 0, 100, 0.3),
		inset 0 0 30rpx rgba(255, 0, 100, 0.1);
}

.cyber-alert.error .alert-border {
	animation: errorPulse 1s ease-in-out infinite;
}

@keyframes errorPulse {
	0%, 100% {
		box-shadow: inset 0 0 0 2rpx rgba(255, 0, 100, 0.5);
	}
	50% {
		box-shadow: inset 0 0 0 2rpx rgba(255, 0, 100, 1);
	}
}

.tip-icon {
	font-size: 36rpx;
	font-weight: 900;
	text-shadow: 0 0 10rpx currentColor;
	animation: iconGlow 1s ease-in-out infinite;
	z-index: 1;
}

@keyframes iconGlow {
	0%, 100% {
		text-shadow: 0 0 10rpx currentColor;
	}
	50% {
		text-shadow: 0 0 20rpx currentColor;
	}
}

.tip-message {
	letter-spacing: 2rpx;
	font-family: 'Courier New', monospace;
	font-weight: 600;
	text-shadow: 0 0 10rpx currentColor;
	z-index: 1;
}

/* 赛博底部按钮 */
.footer-actions {
	margin-top: 70rpx;
	display: flex;
	justify-content: center;
	gap: 32rpx;
}

.cyber-action {
	position: relative;
	background: rgba(10, 20, 40, 0.6);
	backdrop-filter: blur(10rpx);
	border-radius: 16rpx;
	padding: 28rpx 44rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
	border: 2rpx solid rgba(0, 255, 255, 0.3);
	box-shadow: 
		0 4rpx 20rpx rgba(0, 0, 0, 0.3),
		0 0 30rpx rgba(0, 255, 255, 0.15),
		inset 0 0 30rpx rgba(0, 255, 255, 0.05);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	overflow: hidden;
}

.action-glow {
	position: absolute;
	top: -50%;
	left: -50%;
	width: 200%;
	height: 200%;
	background: linear-gradient(45deg, 
		transparent, 
		rgba(0, 255, 255, 0.1), 
		transparent);
	animation: actionScan 3s linear infinite;
	pointer-events: none;
}

@keyframes actionScan {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.cyber-action:active {
	transform: scale(0.95);
	border-color: rgba(0, 255, 255, 0.6);
	box-shadow: 
		0 2rpx 10rpx rgba(0, 0, 0, 0.5),
		0 0 40rpx rgba(0, 255, 255, 0.3),
		inset 0 0 30rpx rgba(0, 255, 255, 0.1);
}

.action-icon {
	font-size: 32rpx;
	filter: drop-shadow(0 0 8rpx rgba(0, 255, 255, 0.6));
	z-index: 1;
}

.action-text {
	font-size: 26rpx;
	color: #00ffff;
	font-weight: 600;
	letter-spacing: 2rpx;
	font-family: 'Courier New', monospace;
	text-shadow: 0 0 10rpx rgba(0, 255, 255, 0.6);
	z-index: 1;
}
</style>
