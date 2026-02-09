/**
 * 简单但有效的语法修复脚本
 * 只修复特定的已知问题
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist', 'dev', 'mp-weixin');

console.log('开始修复语法错误...\n');

// 要修复的文件列表
const filesToFix = [
	'pages/index/index/index.js',
	'pages/user/info/index.js',
	'pages/sign/records/index.js',
	'utils/api.js'
];

filesToFix.forEach(relativePath => {
	const filePath = path.join(distDir, relativePath);
	
	if (!fs.existsSync(filePath)) {
		console.log(`⚠️  文件不存在: ${relativePath}`);
		return;
	}
	
	let content = fs.readFileSync(filePath, 'utf8');
	const original = content;
	
	// 1. 修复 function xxx: function() -> function xxx()
	content = content.replace(/^function\s+(\w+):\s*function\s*\(/gm, 'function $1(');
	
	// 2. 修复 wx.request/login 等调用缺少闭合括号
	// fail: (err) => { xxx }\n\t\t}\n} -> fail: (err) => { xxx }\n\t\t})\n\t})\n}
	content = content.replace(/(fail|success):\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\t\t\}\n\t\}\n\}/g, (match) => {
		// 统计左右括号数量
		const openCount = (match.match(/\{/g) || []).length;
		const closeCount = (match.match(/\}/g) || []).length;
		
		if (openCount > closeCount) {
			// 需要添加闭合括号
			return match.replace(/\n\t\}\n\}$/, '\n\t\t})\n\t})\n}');
		}
		return match;
	});
	
	// 3. 修复 return; }) -> return;
	content = content.replace(/return;\s*\}\)/g, 'return;');
	
	// 4. 修复 this.xxx() }) -> this.xxx();
	content = content.replace(/(\w+\([^)]*\))\s*\}\)$/gm, '$1;');
	
	// 5. 修复 email = xxx; }) -> email = xxx;
	content = content.replace(/(\w+\s*=\s*[^;]+);\s*\}\)/g, '$1;');
	
	// 6. 修复缺少分号的函数调用
	content = content.replace(/^(\s+)(this\.\w+|console\.\w+|wx\.\w+|store\.\w+)\(([^)]*)\)$/gm, (match, indent, func, args) => {
		// 确保不是在对象字面量中
		if (!match.includes(':')) {
			return `${indent}${func}(${args});`;
		}
		return match;
	});
	
	// 7. 修复 setData 缺少闭合
	content = content.replace(/this\.setData\(\{\s*([^}]+)\}$/gm, 'this.setData({ $1 });');
	
	if (content !== original) {
		fs.writeFileSync(filePath, content, 'utf8');
		console.log(`✓ 已修复: ${relativePath}`);
	} else {
		console.log(`  未变更: ${relativePath}`);
	}
});

console.log('\n修复完成！');
