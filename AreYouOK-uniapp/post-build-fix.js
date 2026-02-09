/**
 * 编译后修复脚本
 * 修复 build.js 无法正确处理的语法问题
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist', 'dev', 'mp-weixin');

console.log('开始修复编译后的文件...');

// 递归查找所有 JS 文件
function findJsFiles(dir) {
	const files = [];
	const items = fs.readdirSync(dir);
	
	items.forEach(item => {
		const fullPath = path.join(dir, item);
		const stat = fs.statSync(fullPath);
		
		if (stat.isDirectory()) {
			files.push(...findJsFiles(fullPath));
		} else if (item.endsWith('.js')) {
			files.push(fullPath);
		}
	});
	
	return files;
}

// 修复文件中的语法错误
function fixFile(filePath) {
	let content = fs.readFileSync(filePath, 'utf8');
	let originalContent = content;
	
	// 修复 1: function xxx: function() { -> function xxx() {
	content = content.replace(/function\s+(\w+):\s*function\s*\(/g, 'function $1(');
	
	// 修复 2: this.setData({ xxx: yyy; -> this.setData({ xxx: yyy });
	// 处理 setData 内有分号的情况
	content = content.replace(/this\.setData\(\{\s*([^}]+?);\s*$/gm, (match, inner) => {
		return `this.setData({ ${inner.trim()} });`;
	});
	
	// 修复 3: this.xxx = yyy; -> this.setData({ xxx: yyy });
	// 但跳过已经在 setData 中的
	content = content.replace(/(?<!setData\(\{ )this\.(errorMessage|loading)\s*=\s*([^;]+);/g, 
		'this.setData({ $1: $2 });');
	
	// 修复 4: 错误的括号嵌套 }) }) -> }
	content = content.replace(/\}\)\s*\}\)/g, '}');
	
	// 修复 5: return; }) -> return;
	// 和 return }); }) -> return;
	content = content.replace(/return\s*\}\);\s*\}\)/g, 'return;');
	content = content.replace(/return\s*\}\)/g, 'return;');
	
	// 修复 6: store.setUserInfo(xxx); }) -> store.setUserInfo(xxx);
	content = content.replace(/(store\.\w+\([^)]+\));?\s*\}\)\s*\}\)/g, '$1;');
	content = content.replace(/(store\.\w+\([^)]+\));?\s*\}\)/g, '$1;');
	
	// 修复 7: 多余的右大括号 }
	// this.setData({ xxx: yyy });\n}
	// 其实是 if 块结束，不应该有额外的 }
	content = content.replace(/(\t\t\treturn;)\n\t\t\}\n\t\t\t\}/gm, '$1\n\t\t}');
	
	// 修复 8: this.setData({ xxx: yyy 缺少闭合括号
	// 匹配 setData 后面跟着换行和其他语句的情况
	content = content.replace(/this\.setData\(\{\s*([^:]+):\s*([^};\n]+)\n\s+(this\.|const |let |store\.)/g, 
		'this.setData({ $1: $2 });\n\t\t\t$3');
	
	// 修复 9: return; }) 多余的括号
	content = content.replace(/return;\s*\}\)/g, 'return;');
	
	// 修复 10: wx.request 缺少闭合括号
	// fail: (err) => { reject(err) }\n\t\t}\n}
	// 应该是 fail: (err) => { reject(err) }\n\t\t})\n\t})\n}
	content = content.replace(/(fail:\s*\([^)]*\)\s*=>\s*\{[^}]+\})\n(\t+)\}\n\}/g, '$1\n$2})\n\t})\n}');
	
	// 修复 11: this.doSignIn('') }) -> this.doSignIn('');
	content = content.replace(/this\.\w+\([^)]*\)\s*\}\)/g, (match) => {
		return match.replace(/\s*\}\)/, ';');
	});
	
	// 修复 12: console.log('xxx') -> console.log('xxx');
	// 确保所有函数调用都有分号
	content = content.replace(/^(\s+)(console\.\w+|wx\.\w+|this\.\w+)\([^)]*\)$/gm, '$1$2();');
	
	if (content !== originalContent) {
		fs.writeFileSync(filePath, content, 'utf8');
		console.log(`已修复: ${path.relative(distDir, filePath)}`);
		return true;
	}
	return false;
}

// 执行修复
try {
	const jsFiles = findJsFiles(distDir);
	let fixedCount = 0;
	
	jsFiles.forEach(file => {
		const before = fs.readFileSync(file, 'utf8');
		fixFile(file);
		const after = fs.readFileSync(file, 'utf8');
		if (before !== after) fixedCount++;
	});
	
	console.log(`\n修复完成！共修复 ${fixedCount} 个文件`);
} catch (error) {
	console.error('修复过程中出错:', error);
	process.exit(1);
}
