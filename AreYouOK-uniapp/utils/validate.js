/**
 * 表单验证工具
 */

/**
 * 验证邮箱格式
 * @param {String} email 邮箱地址
 * @returns {Boolean} 是否有效
 */
export function validateEmail(email) {
	if (!email) return false
	const reg = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
	return reg.test(email)
}

/**
 * 验证姓名（2-20个字符，支持中文、英文、数字）
 * @param {String} name 姓名
 * @returns {Boolean} 是否有效
 */
export function validateName(name) {
	if (!name) return false
	const reg = /^[\u4e00-\u9fa5a-zA-Z0-9]{2,20}$/
	return reg.test(name.trim())
}

/**
 * 验证必填项
 * @param {String} value 值
 * @returns {Boolean} 是否有效
 */
export function validateRequired(value) {
	return value && value.trim().length > 0
}

export default {
	validateEmail,
	validateName,
	validateRequired
}
