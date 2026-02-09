/**
 * 应用配置文件
 * 用于管理不同环境的配置信息
 */

// 开发环境配置
const devConfig = {
	// API基础地址 - 本地开发环境
	baseURL: 'http://localhost:8080/api',
	// 或使用局域网IP: 'http://192.168.1.100:8080/api',
	
	// 请求超时时间（毫秒）
	timeout: 10000,
	
	// 是否开启日志
	enableLog: true
}

// 生产环境配置
const prodConfig = {
	// API基础地址 - 生产环境（请修改为实际地址）
	baseURL: 'https://fticilgnlucq.sealoshzh.site/api',
	
	// 请求超时时间（毫秒）
	timeout: 10000,
	
	// 是否开启日志
	enableLog: false
}

// 根据环境选择配置
// 注意：微信小程序中 process.env.NODE_ENV 可能不可用
// 可以手动切换或通过构建工具注入
const isProduction = false // 手动切换：false=开发环境，true=生产环境

const config = isProduction ? prodConfig : devConfig

// 导出配置
export default {
	...config,
	
	// 应用信息
	appName: '上线否',
	appVersion: '1.0.0',
	
	// 本地存储键名
	storageKeys: {
		userName: 'userName',
		userEmail: 'userEmail',
		userInfo: 'userInfo'
	},
	
	// 默认头像
	defaultAvatar: '/static/default-avatar.png',
	
	// 分页配置
	pagination: {
		defaultPageSize: 20,
		maxPageSize: 100
	}
}
