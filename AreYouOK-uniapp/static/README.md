# Static 资源目录

## 说明

此目录用于存放小程序的静态资源文件。

## 需要添加的资源

### 1. 默认头像图片

**文件名**：`default-avatar.png`

**规格要求**：
- 尺寸：200x200 像素
- 格式：PNG
- 背景：透明或纯色
- 建议：使用简洁的图标或占位符

**用途**：当用户未设置微信头像或头像加载失败时显示

**示例位置**：
```
/static/default-avatar.png
```

**在代码中的引用**：
```vue
<image 
  class="avatar" 
  :src="userInfo.avatarUrl || '/static/default-avatar.png'" 
  mode="aspectFill"
></image>
```

---

## 其他可能需要的资源

### 2. 空状态图标

可以添加更丰富的空状态图片，替代emoji表情：

- `empty-record.png` - 无签到记录
- `empty-data.png` - 无数据
- `error.png` - 错误状态

### 3. Logo 图片

- `logo.png` - 应用图标
- `logo-text.png` - 带文字的logo

---

## 注意事项

1. **文件大小**：建议单个图片不超过 200KB
2. **命名规范**：使用小写字母和连字符，如 `default-avatar.png`
3. **兼容性**：确保图片在不同设备上显示正常
4. **路径引用**：使用绝对路径 `/static/xxx.png`
