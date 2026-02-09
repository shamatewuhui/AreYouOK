/**
 * 修复编译后的微信小程序代码中的错误
 * 在编译后运行此脚本：node fix-compile-errors.js
 */

const fs = require('fs')
const path = require('path')

const distDir = path.join(__dirname, 'dist', 'dev', 'mp-weixin')

function fixWxmlFiles() {
  const wxmlFiles = []
  
  function findWxmlFiles(dir) {
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        findWxmlFiles(filePath)
      } else if (file.endsWith('.wxml')) {
        wxmlFiles.push(filePath)
      }
    })
  }
  
  if (fs.existsSync(distDir)) {
    findWxmlFiles(distDir)
  }
  
  wxmlFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false
    
    // 修复 @change -> bindchange
    if (content.includes('@change=')) {
      content = content.replace(/@change="([^"]+)"/g, 'bindchange="$1"')
      modified = true
      console.log(`修复 ${filePath}: @change -> bindchange`)
    }
    
    // 修复 v-on:change -> bindchange
    if (content.includes('v-on:change=')) {
      content = content.replace(/v-on:change="([^"]+)"/g, 'bindchange="$1"')
      modified = true
      console.log(`修复 ${filePath}: v-on:change -> bindchange`)
    }
    
    // 修复 :value -> value="{{...}}"
    if (content.includes(':value=')) {
      content = content.replace(/:value="([^"]+)"/g, 'value="{{$1}}"')
      modified = true
      console.log(`修复 ${filePath}: :value -> value`)
    }
    
    // 修复 :start -> start="{{...}}"
    if (content.includes(':start=')) {
      content = content.replace(/:start="([^"]+)"/g, 'start="{{$1}}"')
      modified = true
      console.log(`修复 ${filePath}: :start -> start`)
    }
    
    // 修复 :end -> end="{{...}}"
    if (content.includes(':end=')) {
      content = content.replace(/:end="([^"]+)"/g, 'end="{{$1}}"')
      modified = true
      console.log(`修复 ${filePath}: :end -> end`)
    }
    
    // 修复错误的数组语法编译
    // 匹配: class="{{['base', expr1 ? 'class1' : '', ...]}}"
    // 或: class="{{['base', expr1 ? 'class1' : '', expr2 && {{expr3 ? ...}}]}}"
    if (content.includes("class=\"{{['")) {
      content = content.replace(/class="\{\{\[([^\]]+)\]\}\}"/g, (match, arrayContent) => {
        // 解析数组元素
        const elements = []
        let current = ''
        let depth = 0
        let inString = false
        let stringChar = null
        
        for (let i = 0; i < arrayContent.length; i++) {
          const char = arrayContent[i]
          const prevChar = i > 0 ? arrayContent[i - 1] : ''
          
          if ((char === '"' || char === "'") && prevChar !== '\\') {
            if (!inString) {
              inString = true
              stringChar = char
            } else if (char === stringChar) {
              inString = false
              stringChar = null
            }
          }
          
          if (!inString) {
            if (char === '{') depth++
            if (char === '}') depth--
            
            if (char === ',' && depth === 0) {
              elements.push(current.trim())
              current = ''
              continue
            }
          }
          
          current += char
        }
        if (current.trim()) {
          elements.push(current.trim())
        }
        
        // 处理每个元素
        const processedElements = elements.map(elem => {
          elem = elem.trim()
          // 移除字符串引号（静态类名）
          if ((elem.startsWith("'") && elem.endsWith("'")) || 
              (elem.startsWith('"') && elem.endsWith('"'))) {
            return elem.slice(1, -1)
          }
          // 三元表达式或逻辑表达式，需要 {{}}
          if (elem.includes('?') || elem.includes('&&') || elem.includes('||')) {
            // 移除可能嵌套的 {{}}
            elem = elem.replace(/\{\{/g, '').replace(/\}\}/g, '')
            return `{{${elem}}}`
          }
          return elem
        })
        
        // 拼接结果
        const result = processedElements.join(' ')
        return `class="${result}"`
      })
      modified = true
      console.log(`修复 ${filePath}: 修复数组语法的 class 绑定`)
    }
    
    // 修复数组形式的 class 绑定未正确编译的问题
    // 匹配: class="base-class expr1 ? 'class1' : '' expr2 ? 'class2' : ''"
    // 应该变成: class="base-class {{expr1 ? 'class1' : ''}} {{expr2 ? 'class2' : ''}}"
    const arrayClassRegex = /class="([^"]*\w+[^"]*?)(\s+[!?\w&|]+\s*\?\s*'[^']+'\s*:\s*'[^']*'[^"]*)"/g
    if (arrayClassRegex.test(content)) {
      content = content.replace(arrayClassRegex, (match, baseClass, expressions) => {
        // 分割多个三元表达式
        const parts = expressions.split(/(?=\s+[!?\w&|]+\s*\?\s*'[^']+'\s*:\s*'[^']*')/)
        const wrappedParts = parts.map(part => {
          const trimmed = part.trim()
          if (trimmed && !trimmed.startsWith('{{')) {
            return ` {{${trimmed}}}`
          }
          return part
        }).join('')
        return `class="${baseClass}${wrappedParts}"`
      })
      modified = true
      console.log(`修复 ${filePath}: 修复数组形式的 class 绑定`)
    }
    
    // 修复重复的 class 属性（仅同一行，避免跨行匹配破坏文件）
    // 匹配: class="..." class="{{...}}" 或 class="..." class="..."
    const duplicateClassRegex1 = /class="([^"]+)"\s+class="{{([^}]+)}}"/g
    if (duplicateClassRegex1.test(content)) {
      content = content.replace(duplicateClassRegex1, (match, baseClass, dynamicClass) => {
        return `class="${baseClass} {{${dynamicClass}}}"`
      })
      modified = true
      console.log(`修复 ${filePath}: 合并重复的 class 属性（动态）`)
    }
    
    const duplicateClassRegex2 = /class="([^"]+)"\s+class="([^"]+)"/g
    if (duplicateClassRegex2.test(content)) {
      content = content.replace(duplicateClassRegex2, (match, baseClass, dynamicClass) => {
        return `class="${baseClass} ${dynamicClass}"`
      })
      modified = true
      console.log(`修复 ${filePath}: 合并重复的 class 属性（静态）`)
    }
    
    // 修复 class 绑定中缺少运算符的问题
    // 匹配类似: {{!canSign ? 'disabled' : '' loading ? 'loading' : ''}}
    // 这种情况是多个三元表达式没有正确分隔
    const brokenClassRegex = /class="{{([^}]*)\s+(\w+)\s*\?\s*'([^']+)'\s*:\s*'([^']*)'([^}]*)}}"/g
    if (brokenClassRegex.test(content)) {
      content = content.replace(brokenClassRegex, (match, before, condition, trueVal, falseVal, after) => {
        // 在条件前添加 }} 和空格，在条件后添加空格和 {{
        return `class="{{${before}}} {{${condition} ? '${trueVal}' : '${falseVal}'}${after}}}"`
      })
      modified = true
      console.log(`修复 ${filePath}: 修复 class 绑定语法`)
    }
    
    // 修复嵌套的 {{}}
    // 匹配: {{...{{...}}...}}
    const nestedBracesRegex = /\{\{([^{}]*)\{\{([^{}]*)\}\}([^{}]*)\}\}/g
    let iterations = 0
    while (nestedBracesRegex.test(content) && iterations < 10) {
      content = content.replace(nestedBracesRegex, (match, before, inner, after) => {
        return `{{${before}${inner}${after}}}`
      })
      modified = true
      iterations++
    }
    if (iterations > 0) {
      console.log(`修复 ${filePath}: 移除嵌套的 {{}}`)
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
    }
  })
}

function fixWxssFiles() {
  const wxssFiles = []
  
  function findWxssFiles(dir) {
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        findWxssFiles(filePath)
      } else if (file.endsWith('.wxss')) {
        wxssFiles.push(filePath)
      }
    })
  }
  
  if (fs.existsSync(distDir)) {
    findWxssFiles(distDir)
  }
  
  wxssFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false
    
    // 修复多余的 }
    // 匹配 .class { ... } } 这种模式
    const lines = content.split('\n')
    const fixedLines = []
    let braceCount = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const openBraces = (line.match(/\{/g) || []).length
      const closeBraces = (line.match(/\}/g) || []).length
      
      // 检查是否是多余的 }
      if (closeBraces > 0 && i > 0) {
        const prevLine = lines[i - 1]
        // 如果上一行已经有一个 }，且当前行只有一个 }，可能是多余的
        if (prevLine.trim().endsWith('}') && line.trim() === '}' && braceCount <= 0) {
          console.log(`修复 ${filePath} 第 ${i + 1} 行: 移除多余的 }`)
          modified = true
          continue // 跳过这一行
        }
      }
      
      braceCount += openBraces - closeBraces
      fixedLines.push(line)
    }
    
    if (modified) {
      fs.writeFileSync(filePath, fixedLines.join('\n'), 'utf8')
    }
  })
}

function fixJsFiles() {
  const jsFiles = []
  
  function findJsFiles(dir) {
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        findJsFiles(filePath)
      } else if (file.endsWith('.js') && !file.includes('app.js')) {
        jsFiles.push(filePath)
      }
    })
  }
  
  if (fs.existsSync(distDir)) {
    findJsFiles(distDir)
  }
  
  jsFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false
    
    // 修复 Page: function({ -> Page({
    if (content.includes('Page: function({')) {
      content = content.replace(/Page:\s*function\s*\(/g, 'Page(')
      modified = true
      console.log(`修复 ${filePath}: Page: function( -> Page(`)
    }
    
    // 修复 if: function(...) -> if (...)
    if (content.includes('if: function(')) {
      content = content.replace(/if:\s*function\s*\(/g, 'if (')
      modified = true
      console.log(`修复 ${filePath}: if: function( -> if (`)
    }
    
    // 修复 else: function(...) -> else (...)  (虽然少见)
    if (content.includes('else: function(')) {
      content = content.replace(/else:\s*function\s*\(/g, 'else (')
      modified = true
      console.log(`修复 ${filePath}: else: function( -> else (`)
    }
    
    // 修复 for: function(...) -> for (...)
    if (content.includes('for: function(')) {
      content = content.replace(/for:\s*function\s*\(/g, 'for (')
      modified = true
      console.log(`修复 ${filePath}: for: function( -> for (`)
    }
    
    // 修复 while: function(...) -> while (...)
    if (content.includes('while: function(')) {
      content = content.replace(/while:\s*function\s*\(/g, 'while (')
      modified = true
      console.log(`修复 ${filePath}: while: function( -> while (`)
    }
    
    // 修复 switch: function(...) -> switch (...)
    if (content.includes('switch: function(')) {
      content = content.replace(/switch:\s*function\s*\(/g, 'switch (')
      modified = true
      console.log(`修复 ${filePath}: switch: function( -> switch (`)
    }
    
    // 修复 catch: function(...) -> catch (...)
    if (content.includes('catch: function(')) {
      content = content.replace(/catch:\s*function\s*\(/g, 'catch (')
      modified = true
      console.log(`修复 ${filePath}: catch: function( -> catch (`)
    }
    
    // 修复多余的大括号: }\n}\n}) -> }\n})
    // 这通常发生在最后一个方法定义后
    const extraBraceRegex = /\n\t\}\n\}\n\}\)/g
    if (extraBraceRegex.test(content)) {
      content = content.replace(extraBraceRegex, '\n\t}\n})')
      modified = true
      console.log(`修复 ${filePath}: 移除多余的大括号`)
    }
    
    // 修复 uni API -> wx API
    if (content.includes('uni.')) {
      content = content.replace(/\buni\./g, 'wx.')
      modified = true
      console.log(`修复 ${filePath}: uni API -> wx API`)
    }
    
    // 修复 export default -> module.exports
    if (content.includes('export default')) {
      content = content.replace(/export\s+default\s+/g, 'module.exports = ')
      modified = true
      console.log(`修复 ${filePath}: export default -> module.exports`)
    }
    
    // 修复错误的函数声明: function name: function() -> function name()
    if (/function\s+\w+:\s*function\s*\(/.test(content)) {
      content = content.replace(/function\s+(\w+):\s*function\s*\(/g, 'function $1(')
      modified = true
      console.log(`修复 ${filePath}: 错误的函数声明语法`)
    }
    
    // 修复缺少 async 关键字的函数（包含 await 但不是 async）
    // 匹配函数定义后面包含 await 的情况
    const lines = content.split('\n')
    const functionStarts = []
    
    // 找出所有函数定义的位置
    lines.forEach((line, index) => {
      // 匹配: methodName: function(...) {
      const match = line.match(/(\s*)(\w+):\s*function\s*\(([^)]*)\)\s*\{/)
      if (match && !line.includes('async function')) {
        functionStarts.push({ index, indent: match[1], name: match[2], params: match[3] })
      }
    })
    
    // 检查每个函数是否包含 await
    functionStarts.forEach(funcInfo => {
      let braceCount = 1
      let hasAwait = false
      
      // 从函数开始的下一行开始检查
      for (let i = funcInfo.index + 1; i < lines.length && braceCount > 0; i++) {
        const line = lines[i]
        
        // 统计大括号，确定函数范围
        braceCount += (line.match(/\{/g) || []).length
        braceCount -= (line.match(/\}/g) || []).length
        
        // 检查是否有 await
        if (line.includes('await ')) {
          hasAwait = true
          break
        }
      }
      
      // 如果有 await，添加 async
      if (hasAwait) {
        const oldLine = lines[funcInfo.index]
        const newLine = oldLine.replace(/:\s*function\s*\(/, ': async function(')
        lines[funcInfo.index] = newLine
        modified = true
        console.log(`修复 ${filePath}: 为 ${funcInfo.name} 添加 async 关键字`)
      }
    })
    
    if (modified) {
      content = lines.join('\n')
      fs.writeFileSync(filePath, content, 'utf8')
    }
  })
}

// 执行修复
console.log('开始修复编译错误...')
fixWxmlFiles()
fixWxssFiles()
fixJsFiles()
console.log('修复完成！')
