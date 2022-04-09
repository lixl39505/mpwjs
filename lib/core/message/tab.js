// 获取当前路由
import tabManager from './tab-manager'

// 页签对象
function Tab(options) {
    this.init(options)
}

Object.assign(Tab.prototype, {
    init(options = {}) {
        this.options = Object.assign({}, options)
        this.listeners = [] // 监听器
        this.route = this.options.route // 当前路由对象
    },

    // 发送消息
    postMessage(message, targetOrigin = '*', answer) {
        tabManager.postMessage(this.route, message, targetOrigin, answer)
    },

    // 监听消息
    addMessageListener(callback) {
        this.listeners.push(callback)
    },

    // 移除监听
    removeMessageListener(callback) {
        var index = this.listeners.indexOf(callback)

        if (index >= 0) {
            this.listeners.splice(index, 1)
        }
    },

    // 触发消息
    notify(event) {
        // event 包含 message以及origin
        this.listeners.forEach((cb) => cb(event))
    },
})

export default Tab
