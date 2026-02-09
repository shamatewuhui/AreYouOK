/**
 * API 请求工具
 * 统一管理 API 请求地址和请求方法
 */

// API 基础地址（需要根据实际后端地址修改）
const BASE_URL = 'https://fticilgnlucq.sealoshzh.site/api'

/**
 * 统一请求方法
 * @param {Object} options 请求配置
 */
function request(options) {
	return new Promise((resolve, reject) => {
		uni.request({
			url: BASE_URL + options.url,
			method: options.method || 'GET',
			data: options.data || {},
			header: {
				'Content-Type': 'application/json',
				...options.header
			},
			success: (res) => {
				if (res.statusCode === 200) {
					if (res.data.code === 0) {
						resolve(res.data)
					} else {
						reject(new Error(res.data.message || '请求失败'))
					}
				} else {
					reject(new Error(`请求失败: ${res.statusCode}`))
				}
			},
			fail: (err) => {
				reject(err)
			}
		})
	})
}

/**
 * 签到接口
 * @param {Object} data 签到数据
 * @param {String} data.name 用户姓名
 * @param {String} data.email 联系人邮箱
 * @param {String} data.openid 微信openid（可选）
 */
export function signIn(data) {
	return request({
		url: '/sign',
		method: 'POST',
		data: data
	})
}

/**
 * 获取用户信息
 * @param {String} openid 微信openid
 */
export function getUserInfo(openid) {
	return request({
		url: '/user/info',
		method: 'GET',
		data: { openid }
	})
}

/**
 * 获取签到记录
 * @param {Object} params 查询参数
 * @param {String} params.openid 微信openid（openid和email至少提供一个）
 * @param {String} params.email 用户邮箱（openid和email至少提供一个）
 * @param {String} params.startDate 开始日期，格式：YYYY-MM-DD
 * @param {String} params.endDate 结束日期，格式：YYYY-MM-DD
 * @param {Number} params.page 页码，从1开始，默认1
 * @param {Number} params.pageSize 每页数量，默认30，最大100
 */
export function getSignRecords(params) {
	return request({
		url: '/sign/records',
		method: 'GET',
		data: params
	})
}

/**
 * 获取用户信息（通过邮箱）
 * @param {String} email 用户邮箱
 */
export function getUserInfoByEmail(email) {
	return request({
		url: '/user/info',
		method: 'GET',
		data: { email }
	})
}

export default {
	signIn,
	getUserInfo,
	getUserInfoByEmail,
	getSignRecords
}
