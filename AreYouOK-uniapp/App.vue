<template>
    <view id="app">
        <!-- 应用入口 -->
    </view>
</template>

<script>
export default {
    onLaunch: function() {
        console.log('App Launch')
    },
    onShow: function() {
        console.log('App Show')
    },
    onHide: function() {
        console.log('App Hide')
    }
}
</script>

<style lang="scss">
/* 全局样式 - 精致极简风格 */
page {
    background-color: #FAF8F5;
    font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #2C2C2C;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

/* 注意：微信小程序 WXSS 不支持通配符选择器 */
</style>
