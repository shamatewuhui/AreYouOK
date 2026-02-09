/**
 * 全局状态管理
 * 使用 uni.setStorageSync 和 uni.getStorageSync 进行持久化
 */

class Store {
	constructor() {
		this.state = {
			userInfo: null,
			isLogin: false
		}
		this.loadState()
	}

	/**
	 * 从本地存储加载状态
	 */
	loadState() {
		try {
			const userInfo = uni.getStorageSync('userInfo')
			if (userInfo) {
				this.state.userInfo = JSON.parse(userInfo)
				this.state.isLogin = true
			}
		} catch (e) {
			console.error('加载用户信息失败:', e)
		}
	}

	/**
	 * 设置用户信息
	 * @param {Object} userInfo 用户信息
	 */
	setUserInfo(userInfo) {
		this.state.userInfo = userInfo
		this.state.isLogin = true
		try {
			uni.setStorageSync('userInfo', JSON.stringify(userInfo))
		} catch (e) {
			console.error('保存用户信息失败:', e)
		}
	}

	/**
	 * 获取用户信息
	 * @returns {Object} 用户信息
	 */
	getUserInfo() {
		return this.state.userInfo
	}

	/**
	 * 清除用户信息
	 */
	clearUserInfo() {
		this.state.userInfo = null
		this.state.isLogin = false
		try {
			uni.removeStorageSync('userInfo')
		} catch (e) {
			console.error('清除用户信息失败:', e)
		}
	}

	/**
	 * 检查是否登录
	 * @returns {Boolean} 是否登录
	 */
	isUserLogin() {
		return this.state.isLogin && this.state.userInfo !== null
	}

	/**
	 * 更新用户签到信息
	 * @param {Object} signData 签到数据
	 */
	updateSignInfo(signData) {
		if (this.state.userInfo) {
			this.state.userInfo.lastSignTime = signData.signTime
			this.state.userInfo.continuousDays = signData.continuousDays
			this.state.userInfo.totalSignDays = signData.totalSignDays
			this.setUserInfo(this.state.userInfo)
		}
	}
}

// 创建单例
const store = new Store()

export default store
