/**
 * 手动编译脚本 - 将 uniapp 项目编译为微信小程序
 * 使用方法: node build.js
 */

const fs = require('fs')
const path = require('path')

const srcDir = __dirname
const distDir = path.join(srcDir, 'dist', 'dev', 'mp-weixin')

// 确保输出目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// 复制文件
function copyFile(src, dest) {
  ensureDir(path.dirname(dest))
  fs.copyFileSync(src, dest)
}

// 复制目录
function copyDir(src, dest) {
  ensureDir(dest)
  const files = fs.readdirSync(src)
  files.forEach(file => {
    const srcPath = path.join(src, file)
    const destPath = path.join(dest, file)
    const stat = fs.statSync(srcPath)
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFile(srcPath, destPath)
    }
  })
}

// 读取并转换 manifest.json 为 app.json
function createAppJson() {
  const manifest = JSON.parse(fs.readFileSync(path.join(srcDir, 'manifest.json'), 'utf8'))
  const pagesJson = JSON.parse(fs.readFileSync(path.join(srcDir, 'pages.json'), 'utf8'))
  
  const mpWeixin = manifest['mp-weixin'] || {}
  
  const appJson = {
    pages: pagesJson.pages.map(page => {
      // 页面路径格式: pages/index/index
      // 微信小程序需要: pages/index/index/index (对应 pages/index/index/index.js)
      return page.path + '/index'
    }),
    window: {
      navigationBarTitleText: pagesJson.globalStyle.navigationBarTitleText || '上线否',
      navigationBarBackgroundColor: pagesJson.globalStyle.navigationBarBackgroundColor || '#ffffff',
      navigationBarTextStyle: pagesJson.globalStyle.navigationBarTextStyle || 'black',
      backgroundColor: pagesJson.globalStyle.backgroundColor || '#f5f5f5'
    },
    style: 'v2',
    sitemapLocation: 'sitemap.json'
  }
  
  fs.writeFileSync(
    path.join(distDir, 'app.json'),
    JSON.stringify(appJson, null, 2),
    'utf8'
  )
}

// 创建 app.js
function createAppJs() {
  const appVue = fs.readFileSync(path.join(srcDir, 'App.vue'), 'utf8')
  const scriptMatch = appVue.match(/<script>([\s\S]*?)<\/script>/)
  
  let appJs = `App({
  onLaunch: function() {
    console.log('App Launch')
  },
  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  },
  globalData: {
    userInfo: null
  }
})`
  
  if (scriptMatch) {
    const scriptContent = scriptMatch[1]
    const onLaunchMatch = scriptContent.match(/onLaunch:\s*function\s*\([^)]*\)\s*\{([^}]*)\}/)
    const onShowMatch = scriptContent.match(/onShow:\s*function\s*\([^)]*\)\s*\{([^}]*)\}/)
    const onHideMatch = scriptContent.match(/onHide:\s*function\s*\([^)]*\)\s*\{([^}]*)\}/)
    
    if (onLaunchMatch || onShowMatch || onHideMatch) {
      appJs = `App({
  onLaunch: function() {
    ${onLaunchMatch ? onLaunchMatch[1].trim() : "console.log('App Launch')"}
  },
  onShow: function() {
    ${onShowMatch ? onShowMatch[1].trim() : "console.log('App Show')"}
  },
  onHide: function() {
    ${onHideMatch ? onHideMatch[1].trim() : "console.log('App Hide')"}
  },
  globalData: {
    userInfo: null
  }
})`
    }
  }
  
  fs.writeFileSync(path.join(distDir, 'app.js'), appJs, 'utf8')
}

// 创建 app.wxss
function createAppWxss() {
  const appVue = fs.readFileSync(path.join(srcDir, 'App.vue'), 'utf8')
  const styleMatch = appVue.match(/<style[^>]*>([\s\S]*?)<\/style>/)
  
  let appWxss = `/* 全局样式 */
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
}

/* 注意：微信小程序 WXSS 不支持通配符选择器 * */
`
  
  if (styleMatch) {
    let styleContent = styleMatch[1]
    // 移除微信小程序不支持的 CSS 特性
    // 移除通配符选择器 *
    styleContent = styleContent.replace(/^\s*\*\s*\{[^}]*\}/gm, '')
    // 移除其他不支持的 CSS 特性（如 :before, :after 等伪元素）
    styleContent = styleContent.replace(/::?(before|after)\s*\{[^}]*\}/g, '')
    appWxss = styleContent
  }
  
  fs.writeFileSync(path.join(distDir, 'app.wxss'), appWxss, 'utf8')
}

// 转换 WXML（Vue template -> 微信小程序）
function convertWxml(template) {
  let wxml = template
  
  // 移除 v-model，改为 bindinput
  // 处理 formData.name -> onInput_name
  wxml = wxml.replace(/v-model="([^"]+)"/g, (match, expr) => {
    // 提取字段名，如 formData.name -> name
    const fieldMatch = expr.match(/\.([^.]+)$/)
    const fieldName = fieldMatch ? fieldMatch[1] : expr
    return `value="{{${expr}}}" bindinput="onInput_${fieldName}"`
  })
  
  // 转换 v-if
  wxml = wxml.replace(/v-if="([^"]+)"/g, 'wx:if="{{$1}}"')
  wxml = wxml.replace(/v-else-if="([^"]+)"/g, 'wx:elif="{{$1}}"')
  wxml = wxml.replace(/v-else/g, 'wx:else')
  
  // 转换 :class
  // 处理 :class="variable" (简单变量)
  wxml = wxml.replace(/:class="([^"]+)"/g, (match, expr) => {
    // 如果不是对象语法，直接使用变量
    if (!expr.trim().startsWith('{')) {
      return `class="{{${expr}}}"`
    }
    return match // 对象语法会在下面处理
  })
  
  // 处理 :class="{ 'class1': condition1, 'class2': condition2 }" (对象语法)
  // 支持多行格式
  wxml = wxml.replace(/:class="\{\s*([^}]+)\s*\}"[\s]*>/g, (match, content) => {
    const classes = []
    // 处理多行内容
    const lines = content.split('\n').map(line => line.trim()).filter(line => line)
    
    lines.forEach(line => {
      // 移除末尾的逗号
      line = line.replace(/,\s*$/, '')
      // 匹配 'key': value 或 key: value
      const match = line.match(/^(['"]?)([^'":\s]+)\1\s*:\s*(.+)$/)
      if (match) {
        const className = match[2]
        const condition = match[3].trim()
        classes.push(`${condition} ? '${className}' : ''`)
      }
    })
    
    if (classes.length > 0) {
      // 查找是否有基础 class，如果有就合并
      const prevMatch = wxml.substring(0, wxml.indexOf(match)).match(/class="([^"]+)"/)
      const baseClass = prevMatch ? prevMatch[1] : ''
      return `class="${baseClass} {{${classes.join(' ')}}}"`
    }
    return match
  })
  
  // 处理单行 :class="{ 'class1': condition1 }"
  wxml = wxml.replace(/:class="\{([^}]+)\}"/g, (match, content) => {
    const classes = []
    // 分割多个键值对
    const pairs = content.split(',').map(pair => pair.trim()).filter(pair => pair)
    
    pairs.forEach(pair => {
      const match = pair.match(/^(['"]?)([^'":\s]+)\1\s*:\s*(.+)$/)
      if (match) {
        const className = match[2]
        const condition = match[3].trim()
        classes.push(`${condition} ? '${className}' : ''`)
      }
    })
    
    if (classes.length > 0) {
      return `class="{{${classes.join(' ')}}}"`
    }
    return match
  })
  
  // 转换 :value
  wxml = wxml.replace(/:value="([^"]+)"/g, 'value="{{$1}}"')
  
  // 转换 @input
  wxml = wxml.replace(/@input="([^"]+)"/g, 'bindinput="$1"')
  
  // 转换 @click
  wxml = wxml.replace(/@click="([^"]+)"/g, 'bindtap="$1"')
  
  // 转换 @change
  wxml = wxml.replace(/@change="([^"]+)"/g, 'bindchange="$1"')
  
  // 转换 v-on:change
  wxml = wxml.replace(/v-on:change="([^"]+)"/g, 'bindchange="$1"')
  
  // 移除 @focus 和 @blur（微信小程序不支持）
  wxml = wxml.replace(/\s*@focus="[^"]*"/g, '')
  wxml = wxml.replace(/\s*@blur="[^"]*"/g, '')
  
  // 转换 :disabled
  wxml = wxml.replace(/:disabled="([^"]+)"/g, 'disabled="{{$1}}"')
  
  // 移除 transition 组件（微信小程序不支持）
  wxml = wxml.replace(/<transition[^>]*>/g, '')
  wxml = wxml.replace(/<\/transition>/g, '')
  
  return wxml
}

// 转换 JS（Vue -> 微信小程序 Page）
function convertJs(scriptContent) {
  let js = scriptContent
  
  // 处理 import
  // 从 pages/index/index/index.js 到 utils/ 需要三层向上：../../../utils/
  js = js.replace(/import\s+\{([^}]+)\}\s+from\s+['"]@\/utils\/([^'"]+)['"]/g, (match, imports, file) => {
    const importList = imports.split(',').map(i => i.trim())
    return importList.map(imp => {
      return `const ${imp} = require('../../../utils/${file}').${imp}`
    }).join('\n')
  })
  
  js = js.replace(/import\s+.*?from\s+['"]@\/utils\/([^'"]+)['"]/g, (match, file) => {
    const varName = file.replace('.js', '').replace(/\//g, '_')
    return `const ${varName} = require('../../../utils/${file}')`
  })
  
  // 转换 export default { 为 Page({
  js = js.replace(/export\s+default\s+\{/, 'Page({')
  
  // 转换 data() { return {...} } 为 data: {...}
  js = js.replace(/data\s*\(\)\s*\{\s*return\s*(\{[\s\S]*?\})\s*\}/g, (match, dataObj) => {
    return `data: ${dataObj}`
  })
  
  // 移除 computed，将计算属性转换为方法
  // 使用更智能的方法处理嵌套的大括号
  const computedRegex = /computed:\s*\{/g
  let computedMatch
  while ((computedMatch = computedRegex.exec(js)) !== null) {
    const startIndex = computedMatch.index
    const contentStart = js.indexOf('{', startIndex) + 1
    
    // 找到匹配的结束大括号
    let braceCount = 1
    let endIndex = contentStart
    while (braceCount > 0 && endIndex < js.length) {
      if (js[endIndex] === '{') braceCount++
      if (js[endIndex] === '}') braceCount--
      endIndex++
    }
    
    const computedContent = js.substring(contentStart, endIndex - 1)
    const afterComputed = js[endIndex] === ',' ? endIndex + 1 : endIndex
    
    // 将计算属性转换为方法（保持原样，后续的 methodName() {} 转换会处理）
    const replacement = `// computed转换为方法\n${computedContent},\n`
    
    js = js.substring(0, startIndex) + replacement + js.substring(afterComputed)
    
    // 重置正则，从头开始
    computedRegex.lastIndex = 0
    break // 只处理第一个，然后重新开始
  }
  
  // 转换 methods: { 为直接的方法定义
  // 使用智能解析找到并移除 methods 块
  const methodsRegex = /methods:\s*\{/g
  let methodsMatch
  while ((methodsMatch = methodsRegex.exec(js)) !== null) {
    const startIndex = methodsMatch.index
    const contentStart = js.indexOf('{', startIndex) + 1
    
    // 找到匹配的结束大括号
    let braceCount = 1
    let endIndex = contentStart
    while (braceCount > 0 && endIndex < js.length) {
      if (js[endIndex] === '{') braceCount++
      if (js[endIndex] === '}') braceCount--
      endIndex++
    }
    
    const methodsContent = js.substring(contentStart, endIndex - 1)
    const afterMethods = js[endIndex] === ',' ? endIndex + 1 : endIndex
    
    // 替换为方法内容（不包含 methods: { 和 }）
    js = js.substring(0, startIndex) + methodsContent + ',\n' + js.substring(afterMethods)
    
    // 重置正则，从头开始
    methodsRegex.lastIndex = 0
    break // 只处理第一个，然后重新开始
  }
  
  // 转换方法定义：methodName() {} -> methodName: function() {}
  // 处理普通方法和 async 方法
  // 排除 JavaScript 关键字和语句
  const jsKeywords = ['if', 'else', 'for', 'while', 'switch', 'catch', 'finally', 'Page', 'Component', 'Behavior', 'return', 'break', 'continue', 'function']
  js = js.replace(/(\s+)(async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/g, (match, indent, asyncKeyword, methodName, params, offset, fullString) => {
    // 跳过 JavaScript 关键字和语句
    if (jsKeywords.includes(methodName)) {
      return match
    }
    // 跳过已经是 function 声明的情况（检查前面是否有 'function' 关键字）
    const before = fullString.substring(Math.max(0, offset - 200), offset)
    if (/\bfunction\s+$/.test(before)) {
      return match
    }
    // 跳过已经是 function 表达式的情况
    if (match.includes('function')) {
      return match
    }
    // 处理默认参数：移除默认值
    const cleanParams = params.split(',').map(p => {
      const parts = p.trim().split('=')
      return parts[0].trim()
    }).join(', ')
    
    // 如果是 async 方法，保留 async 关键字（微信小程序支持 async/await）
    if (asyncKeyword) {
      return `${indent}${methodName}: async function(${cleanParams}) {`
    }
    return `${indent}${methodName}: function(${cleanParams}) {`
  })
  
  // 处理默认参数：在函数体内添加 type = type || 'default'
  // 查找 showTip(message, type = 'success') 这样的模式
  js = js.replace(/showTip:\s*function\s*\(([^)]+)\)\s*\{/g, (match, params) => {
    const paramList = params.split(',').map(p => p.trim())
    let functionBody = match
    paramList.forEach(param => {
      if (param.includes('=')) {
        const parts = param.split('=')
        const paramName = parts[0].trim()
        const defaultValue = parts[1].trim()
        functionBody = functionBody.replace(match, match + `\n    ${paramName} = ${paramName} || ${defaultValue}`)
      }
    })
    return functionBody
  })
  
  // 先转换 this.formData.xxx = value; 为 this.setData({ 'formData.xxx': value });
  // 必须在转换 this.formData 为 this.data.formData 之前执行
  js = js.replace(/this\.formData\.(\w+)\s*=\s*([^\n;]+);?/g, (match, prop, value) => {
    return `this.setData({ 'formData.${prop}': ${value.trim()} });`
  })
  
  // 转换直接赋值 this.xxx = value 为 this.setData({ xxx: value })
  // 匹配到分号为止（包括多行）
  js = js.replace(/this\.(loading|tipMessage|tipType|canSign|userInfo|errorMessage)\s*=\s*([\s\S]*?);/g, (match, prop, value) => {
    const cleanValue = value.trim();
    return `this.setData({ ${prop}: ${cleanValue} });`;
  })
  
  // 转换读取 this.formData 为 this.data.formData（在方法体内，但不在 setData 中）
  // 使用更精确的匹配，避免替换 this.data.formData
  js = js.replace(/this\.formData(?!\.)/g, 'this.data.formData')
  js = js.replace(/this\.formData\./g, 'this.data.formData.')
  
  // 处理 async/await：移除 async，将 await 转换为 Promise
  // 这个比较复杂，暂时先移除 async 关键字
  js = js.replace(/\s*async\s+/g, ' ')
  
  // 处理 await：将 await promise 转换为 promise.then()
  // 这个转换比较复杂，需要更智能的处理
  // 暂时先简单处理：await xxx() -> xxx().then()
  
  // 处理 uni API
  js = js.replace(/uni\./g, 'wx.')
  js = js.replace(/uni\.getStorageSync/g, 'wx.getStorageSync')
  js = js.replace(/uni\.setStorageSync/g, 'wx.setStorageSync')
  js = js.replace(/uni\.login/g, 'wx.login')
  js = js.replace(/uni\.request/g, 'wx.request')
  js = js.replace(/uni\.vibrateShort/g, 'wx.vibrateShort')
  
  // 最后闭合 Page({
  js = js.replace(/\}\s*$/, '})')
  
  return js
}

// 转换 WXSS（SCSS -> 微信小程序 WXSS）
function convertWxss(scssContent) {
  let wxss = scssContent
  
  // 移除微信小程序不支持的 CSS 特性
  // 移除通配符选择器 *
  wxss = wxss.replace(/^\s*\*\s*\{[^}]*\}/gm, '')
  
  // 移除伪元素 ::before, ::after（微信小程序不支持）
  wxss = wxss.replace(/::?(before|after)\s*\{[^}]*\}/g, '')
  
  // 展开 SCSS 嵌套语法（&）
  // 使用更简单直接的方式处理嵌套
  function expandNested(css) {
    const lines = css.split('\n')
    const result = []
    const selectorStack = []
    let currentIndent = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      const indent = line.match(/^(\s*)/)[1]
      const indentLevel = indent.length
      
      // 跳过注释和空行
      if (trimmed.startsWith('/*') || trimmed.startsWith('//') || trimmed === '') {
        result.push(line)
        continue
      }
      
      // 检测选择器开始（包含 { 但不包含 &）
      if (trimmed.includes('{') && !trimmed.includes('&')) {
        const selector = trimmed.split('{')[0].trim()
        if (selector && !selector.startsWith('@')) {
          // 更新选择器栈
          while (selectorStack.length > 0 && selectorStack[selectorStack.length - 1].indent >= indentLevel) {
            selectorStack.pop()
          }
          selectorStack.push({ selector: selector, indent: indentLevel })
          currentIndent = indentLevel
          result.push(line)
          continue
        }
      }
      
      // 检测 & 选择器
      if (trimmed.includes('&')) {
        const parentSelector = selectorStack.length > 0 ? selectorStack[selectorStack.length - 1].selector : ''
        let expanded = line
        
        // 处理 &:pseudo-class (如 &:last-child, &:focus)
        expanded = expanded.replace(/&:([a-z-]+)/g, (match, pseudo) => {
          return parentSelector ? `${parentSelector}:${pseudo}` : match.replace('&', '')
        })
        
        // 处理 &.class (如 &.disabled, &.loading)
        expanded = expanded.replace(/&\.([a-z-]+)/g, (match, className) => {
          return parentSelector ? `${parentSelector}.${className}` : match.replace('&', '')
        })
        
        // 处理单独的 & {（应该移除，因为已经在父选择器内）
        if (trimmed.match(/^\s*&\s*\{/)) {
          // 移除这一行，因为内容已经在父选择器内
          continue
        }
        
        // 处理 & 在选择器中间的情况
        expanded = expanded.replace(/\s*&\s*\{/g, parentSelector ? ` ${parentSelector} {` : ' {')
        
        // 如果展开后的选择器需要独立出来（如 &:last-child）
        if (expanded.includes(':') || expanded.includes('.')) {
          // 将缩进调整为与父选择器同级
          const parentIndent = selectorStack.length > 0 ? selectorStack[selectorStack.length - 1].indent : 0
          const newIndent = ' '.repeat(parentIndent)
          expanded = newIndent + expanded.trim()
        }
        
        result.push(expanded)
        continue
      }
      
      // 检测闭合括号
      if (trimmed === '}') {
        // 如果当前缩进小于等于栈顶缩进，说明这个块结束了
        if (selectorStack.length > 0 && indentLevel <= selectorStack[selectorStack.length - 1].indent) {
          selectorStack.pop()
        }
        result.push(line)
        continue
      }
      
      result.push(line)
    }
    
    return result.join('\n')
  }
  
  // 多次展开直到没有 & 为止
  let previousWxss = ''
  let iterations = 0
  while (wxss !== previousWxss && iterations < 10) {
    previousWxss = wxss
    wxss = expandNested(wxss)
    iterations++
  }
  
  // 最后清理：移除空的选择器块和多余的空白
  wxss = wxss.replace(/[^{]+\{\s*\}/g, '')
  wxss = wxss.replace(/\n{3,}/g, '\n\n')
  
  return wxss.trim()
}

// 转换页面文件
function convertPage(pagePath) {
  // pagePath 格式: pages/index/index
  // src 文件: pages/index/index.vue
  // dist 目录: dist/dev/mp-weixin/pages/index/index/
  const srcPagePath = path.join(srcDir, pagePath + '.vue')
  const distPageDir = path.join(distDir, pagePath)
  
  if (!fs.existsSync(srcPagePath)) {
    console.warn(`页面文件不存在: ${srcPagePath}`)
    return
  }
  
  ensureDir(distPageDir)
  
  const vueContent = fs.readFileSync(srcPagePath, 'utf8')
  
  // 提取 template
  const templateMatch = vueContent.match(/<template>([\s\S]*?)<\/template>/)
  if (templateMatch) {
    let wxml = convertWxml(templateMatch[1])
    fs.writeFileSync(path.join(distPageDir, 'index.wxml'), wxml, 'utf8')
  }
  
  // 提取 script
  const scriptMatch = vueContent.match(/<script>([\s\S]*?)<\/script>/)
  if (scriptMatch) {
    let js = convertJs(scriptMatch[1])
    
    // 添加输入处理函数
    if (js.includes('onInput_')) {
      const inputHandlers = js.match(/onInput_(\w+)/g)
      if (inputHandlers) {
        const handlers = [...new Set(inputHandlers)].map(handler => {
          const field = handler.replace('onInput_', '')
          return `  ${handler}: function(e) {
    this.setData({
      'formData.${field}': e.detail.value
    })
  },`
        }).join('\n')
        js = js.replace(/\}\s*$/, `${handlers}\n})`)
      }
    }
    
    fs.writeFileSync(path.join(distPageDir, 'index.js'), js, 'utf8')
  }
  
  // 提取 style
  const styleMatch = vueContent.match(/<style[^>]*>([\s\S]*?)<\/style>/)
  if (styleMatch) {
    let wxss = convertWxss(styleMatch[1])
    fs.writeFileSync(path.join(distPageDir, 'index.wxss'), wxss, 'utf8')
  }
}

// 创建 sitemap.json
function createSitemap() {
  const sitemap = {
    desc: '关于本文件的更多信息，请参考文档 https://developers.weixin.qq.com/miniprogram/dev/framework/sitemap.html',
    rules: [{
      action: 'allow',
      page: '*'
    }]
  }
  fs.writeFileSync(path.join(distDir, 'sitemap.json'), JSON.stringify(sitemap, null, 2), 'utf8')
}

// 创建 project.config.json
function createProjectConfig() {
  const projectConfig = {
    description: '项目配置文件',
    packOptions: {
      ignore: []
    },
    setting: {
      urlCheck: false,
      es6: true,
      enhance: true,
      postcss: true,
      minified: true,
      lazyCodeLoading: 'requiredComponents'
    },
    compileType: 'miniprogram',
    appid: 'wx9d3afb740a541e4e',
    projectname: '上线否'
  }
  fs.writeFileSync(path.join(distDir, 'project.config.json'), JSON.stringify(projectConfig, null, 2), 'utf8')
}

// 主函数
function main() {
  console.log('开始编译...')
  
  // 清空输出目录（如果存在且可删除）
  if (fs.existsSync(distDir)) {
    try {
      fs.rmSync(distDir, { recursive: true, force: true })
    } catch (e) {
      console.warn('无法删除输出目录，将覆盖现有文件:', e.message)
    }
  }
  
  // 创建输出目录
  ensureDir(distDir)
  
  // 创建 app.json, app.js, app.wxss
  createAppJson()
  createAppJs()
  createAppWxss()
  
  // 复制并转换 utils 目录
  if (fs.existsSync(path.join(srcDir, 'utils'))) {
    const utilsDir = path.join(distDir, 'utils')
    copyDir(path.join(srcDir, 'utils'), utilsDir)
    
    // 转换 utils 文件中的 uni API 和 export 语法
    const utilsFiles = fs.readdirSync(utilsDir)
    utilsFiles.forEach(file => {
      if (file.endsWith('.js')) {
        const filePath = path.join(utilsDir, file)
        let content = fs.readFileSync(filePath, 'utf8')
        
        // 转换 uni -> wx
        content = content.replace(/\buni\./g, 'wx.')
        
        // 转换 export default -> module.exports
        content = content.replace(/export\s+default\s+/g, 'module.exports = ')
        
        fs.writeFileSync(filePath, content, 'utf8')
      }
    })
    console.log('已转换 utils 目录中的 API 和导出语法')
  }
  
  // 转换页面
  const pagesJson = JSON.parse(fs.readFileSync(path.join(srcDir, 'pages.json'), 'utf8'))
  pagesJson.pages.forEach(page => {
    // page.path 格式: pages/index/index
    // 需要转换为: pages/index/index (保持不变)
    convertPage(page.path)
  })
  
  // 创建其他必要文件
  createSitemap()
  createProjectConfig()
  
  console.log('编译完成！')
  console.log(`输出目录: ${distDir}`)
  console.log('\n下一步：')
  console.log('1. 打开微信开发者工具')
  console.log('2. 选择"导入项目"')
  console.log(`3. 项目目录选择: ${distDir}`)
  console.log('4. AppID: wx9d3afb740a541e4e')
}

main()
