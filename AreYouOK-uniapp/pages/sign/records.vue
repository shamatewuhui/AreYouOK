<template>
	<view class="container">
		<!-- 背景装饰 -->
		<view class="bg-decoration">
			<view class="bg-circle bg-circle-1"></view>
			<view class="bg-circle bg-circle-2"></view>
		</view>

		<!-- 顶部统计区域 -->
		<view class="header-section">
			<view class="header-title">签到记录</view>
			<view class="header-stats">
				<view class="stat-item">
					<text class="stat-value">{{ totalRecords }}</text>
					<text class="stat-label">总计</text>
				</view>
			</view>
		</view>

		<!-- 日期筛选器 -->
		<view class="filter-section">
			<view class="filter-item" @click="showDatePicker('start')">
				<text class="filter-label">开始日期</text>
				<text class="filter-value">{{ startDate || '全部' }}</text>
			</view>
			<view class="filter-divider"></view>
			<view class="filter-item" @click="showDatePicker('end')">
				<text class="filter-label">结束日期</text>
				<text class="filter-value">{{ endDate || '今天' }}</text>
			</view>
		</view>

		<!-- 加载状态 -->
		<view class="loading-wrapper" v-if="loading && records.length === 0">
			<view class="loading-spinner"></view>
			<text class="loading-text">加载中...</text>
		</view>

		<!-- 签到记录列表 -->
		<view class="records-section" v-else-if="records.length > 0">
			<view 
				class="record-item" 
				v-for="(record, index) in records" 
				:key="index"
				:style="{ 'animation-delay': (index * 0.05) + 's' }"
			>
				<view class="record-date-wrapper">
					<view class="record-day">{{ formatDay(record.signDate) }}</view>
					<view class="record-month">{{ formatMonth(record.signDate) }}</view>
				</view>
				<view class="record-info">
					<text class="record-date">{{ formatFullDate(record.signDate) }}</text>
					<text class="record-time">{{ formatTime(record.signTime) }}</text>
				</view>
				<view class="record-status">
					<text class="status-icon">✓</text>
				</view>
			</view>

			<!-- 加载更多 -->
			<view class="load-more" v-if="hasMore">
				<view class="load-more-content" @click="loadMore" v-if="!loadingMore">
					<text class="load-more-text">加载更多</text>
				</view>
				<view class="load-more-content" v-else>
					<view class="loading-spinner-small"></view>
					<text class="load-more-text">加载中...</text>
				</view>
			</view>

			<!-- 没有更多 -->
			<view class="no-more" v-else-if="records.length > 0">
				<text class="no-more-text">没有更多记录了</text>
			</view>
		</view>

		<!-- 空状态 -->
		<view class="empty-wrapper" v-else>
			<text class="empty-icon">📅</text>
			<text class="empty-text">暂无签到记录</text>
			<text class="empty-hint">快去签到吧！</text>
		</view>

		<!-- 日期选择器 -->
		<picker
			mode="date"
			:value="currentPickerDate"
			:start="minDate"
			:end="maxDate"
			v-on:change="onDateChange"
			v-if="showPicker"
		>
			<view style="display: none;"></view>
		</picker>
	</view>
</template>

<script>
import { getSignRecords } from '@/utils/api.js'
import store from '@/utils/store.js'

export default {
	data() {
		// 获取当前日期作为默认值
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const currentDate = `${year}-${month}-${day}`;
		
		return {
			records: [],
			loading: true,
			loadingMore: false,
			page: 1,
			pageSize: 20,
			totalRecords: 0,
			hasMore: true,
			startDate: '',
			endDate: '',
			openid: '',
			email: '',
			// 日期选择器相关
			showPicker: false,
			currentPickerType: 'start', // 'start' 或 'end'
			currentPickerDate: '',
			minDate: '2020-01-01',
			maxDate: currentDate
		}
	},
	onLoad(options) {
		// 获取用户标识
		this.openid = options.openid || '';
		this.email = options.email || '';
		
		// 如果没有传参，尝试从全局状态获取
		if (!this.openid && !this.email) {
			const userInfo = store.getUserInfo();
			if (userInfo) {
				this.openid = userInfo.openid || '';
				this.email = userInfo.email || '';
			}
		}
		
		// 如果还是没有，尝试从本地存储获取
		if (!this.openid && !this.email) {
			this.email = uni.getStorageSync('userEmail') || '';
		}
		
		this.loadRecords();
	},
	onPullDownRefresh() {
		this.refreshRecords();
	},
	onReachBottom() {
		if (this.hasMore && !this.loadingMore) {
			this.loadMore();
		}
	},
	methods: {
		// 辅助函数：获取当前日期
		getCurrentDateString() {
			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const day = String(now.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		},
		
		loadRecords() {
			if (!this.openid && !this.email) {
				uni.showToast({
					title: '无法获取用户信息',
					icon: 'none'
				});
				this.loading = false;
				return;
			}

			this.loading = true;
			
			const params = {
				page: this.page,
				pageSize: this.pageSize
			};
			
			if (this.openid) params.openid = this.openid;
			if (this.email) params.email = this.email;
			if (this.startDate) params.startDate = this.startDate;
			if (this.endDate) params.endDate = this.endDate;

			getSignRecords(params).then(res => {
				if (res.code === 0 && res.data) {
					this.records = res.data.records || [];
					this.totalRecords = res.data.total || 0;
					this.hasMore = this.records.length < this.totalRecords;
				} else {
					throw new Error(res.message || '获取签到记录失败');
				}
			}).catch(error => {
				console.error('加载签到记录失败:', error);
				uni.showToast({
					title: error.message || '加载失败',
					icon: 'none'
				});
			}).finally(() => {
				this.loading = false;
			});
		},

		loadMore() {
			if (this.loadingMore || !this.hasMore) return;

			this.loadingMore = true;
			this.page++;

			const params = {
				page: this.page,
				pageSize: this.pageSize
			};
			
			if (this.openid) params.openid = this.openid;
			if (this.email) params.email = this.email;
			if (this.startDate) params.startDate = this.startDate;
			if (this.endDate) params.endDate = this.endDate;

			getSignRecords(params).then(res => {
				if (res.code === 0 && res.data) {
					const newRecords = res.data.records || [];
					this.records = [...this.records, ...newRecords];
					this.totalRecords = res.data.total || 0;
					this.hasMore = this.records.length < this.totalRecords;
				}
			}).catch(error => {
				console.error('加载更多失败:', error);
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				});
				this.page--; // 恢复页码
			}).finally(() => {
				this.loadingMore = false;
			});
		},

		refreshRecords() {
			this.page = 1;
			this.hasMore = true;
			this.loadRecords();
			uni.stopPullDownRefresh();
		},

		showDatePicker(type) {
			this.currentPickerType = type;
			this.currentPickerDate = type === 'start' ? this.startDate : this.endDate;
			if (!this.currentPickerDate) {
				this.currentPickerDate = this.getCurrentDate();
			}
			// 触发选择器
			setTimeout(() => {
				this.showPicker = true;
			}, 50);
		},

		onDateChange(e) {
			const date = e.detail.value;
			if (this.currentPickerType === 'start') {
				this.startDate = date;
			} else {
				this.endDate = date;
			}
			this.showPicker = false;
			// 刷新列表
			this.page = 1;
			this.loadRecords();
		},


		formatDay(dateStr) {
			if (!dateStr) return '';
			return dateStr.split('-')[2];
		},

		formatMonth(dateStr) {
			if (!dateStr) return '';
			const [year, month] = dateStr.split('-');
			return `${year}/${month}`;
		},

		formatFullDate(dateStr) {
			if (!dateStr) return '';
			const date = new Date(dateStr);
			const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
			const weekday = weekdays[date.getDay()];
			return `${dateStr} ${weekday}`;
		},

		formatTime(timeStr) {
			if (!timeStr) return '';
			return timeStr.substring(11, 19);
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #FAF8F5;
	position: relative;
	padding-bottom: 40rpx;
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
	background: radial-gradient(circle, rgba(232, 168, 124, 0.1) 0%, transparent 70%);
	filter: blur(50rpx);
	animation: float 18s ease-in-out infinite;
}

.bg-circle-1 {
	width: 400rpx;
	height: 400rpx;
	top: -150rpx;
	right: -100rpx;
}

.bg-circle-2 {
	width: 350rpx;
	height: 350rpx;
	bottom: 15%;
	left: -100rpx;
	animation-delay: 9s;
}

@keyframes float {
	0%, 100% {
		transform: translate(0, 0) scale(1);
	}
	50% {
		transform: translate(25rpx, -25rpx) scale(1.08);
	}
}

/* 顶部统计区域 */
.header-section {
	position: relative;
	z-index: 1;
	padding: 40rpx 40rpx 32rpx;
}

.header-title {
	font-size: 48rpx;
	font-weight: 300;
	color: #2C2C2C;
	letter-spacing: 4rpx;
	margin-bottom: 24rpx;
}

.header-stats {
	display: flex;
	gap: 40rpx;
}

.stat-item {
	display: flex;
	align-items: baseline;
	gap: 12rpx;
}

.stat-value {
	font-size: 40rpx;
	font-weight: 300;
	color: #E8A87C;
	letter-spacing: 1rpx;
}

.stat-label {
	font-size: 24rpx;
	color: #6B6B6B;
}

/* 日期筛选器 */
.filter-section {
	position: relative;
	z-index: 1;
	background: #FFFFFF;
	border-radius: 24rpx;
	margin: 0 40rpx 32rpx;
	padding: 0 32rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	display: flex;
	align-items: center;
}

.filter-item {
	flex: 1;
	padding: 28rpx 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.filter-label {
	font-size: 22rpx;
	color: #9B9B9B;
	letter-spacing: 0.5rpx;
}

.filter-value {
	font-size: 26rpx;
	color: #2C2C2C;
	font-weight: 500;
	letter-spacing: 0.5rpx;
}

.filter-divider {
	width: 2rpx;
	height: 60rpx;
	background: #E8E8E8;
}

/* 加载状态 */
.loading-wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 120rpx 40rpx;
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

/* 签到记录列表 */
.records-section {
	position: relative;
	z-index: 1;
	padding: 0 40rpx;
}

.record-item {
	background: #FFFFFF;
	border-radius: 24rpx;
	padding: 32rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
	display: flex;
	align-items: center;
	gap: 24rpx;
	animation: slideIn 0.4s ease-out;
	transition: transform 0.3s;
}

.record-item:active {
	transform: scale(0.98);
}

@keyframes slideIn {
	from {
		opacity: 0;
		transform: translateY(20rpx);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.record-date-wrapper {
	flex-shrink: 0;
	width: 100rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 16rpx 12rpx;
	background: linear-gradient(135deg, rgba(232, 168, 124, 0.1) 0%, rgba(244, 209, 174, 0.1) 100%);
	border-radius: 16rpx;
}

.record-day {
	font-size: 40rpx;
	font-weight: 300;
	color: #E8A87C;
	line-height: 1.2;
	letter-spacing: 1rpx;
}

.record-month {
	font-size: 20rpx;
	color: #9B9B9B;
	margin-top: 4rpx;
	letter-spacing: 0.5rpx;
}

.record-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.record-date {
	font-size: 28rpx;
	color: #2C2C2C;
	font-weight: 500;
	letter-spacing: 0.5rpx;
}

.record-time {
	font-size: 24rpx;
	color: #6B6B6B;
	letter-spacing: 0.5rpx;
}

.record-status {
	flex-shrink: 0;
	width: 56rpx;
	height: 56rpx;
	background: linear-gradient(135deg, #7FB069 0%, #6FA055 100%);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.status-icon {
	font-size: 32rpx;
	color: #FFFFFF;
	font-weight: bold;
}

/* 加载更多 */
.load-more {
	padding: 32rpx 0;
}

.load-more-content {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
}

.loading-spinner-small {
	width: 32rpx;
	height: 32rpx;
	border: 3rpx solid #E8E8E8;
	border-top-color: #E8A87C;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

.load-more-text {
	font-size: 26rpx;
	color: #6B6B6B;
}

/* 没有更多 */
.no-more {
	padding: 32rpx 0;
	text-align: center;
}

.no-more-text {
	font-size: 24rpx;
	color: #9B9B9B;
}

/* 空状态 */
.empty-wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 120rpx 40rpx;
	position: relative;
	z-index: 1;
}

.empty-icon {
	font-size: 100rpx;
	margin-bottom: 24rpx;
	opacity: 0.5;
}

.empty-text {
	font-size: 32rpx;
	color: #6B6B6B;
	margin-bottom: 16rpx;
	letter-spacing: 1rpx;
}

.empty-hint {
	font-size: 24rpx;
	color: #9B9B9B;
	letter-spacing: 0.5rpx;
}
</style>
