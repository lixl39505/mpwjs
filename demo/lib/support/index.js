import { pathJoin, qs } from 'es-sharp'

export { pathJoin, qs }

// 获取指定prop，可指定缺省值
export function visitObj(obj, prop, defaultVal) {
    if (typeof obj[prop] === 'undefined') {
        obj[prop] = defaultVal
    }

    return obj[prop]
}

// 获取当前路由
export function getCurrentRoute() {
    // wx
    var routes = getCurrentPages()

    return routes[routes.length - 1]
}

// 获取当前页面url
export function getCurrentUrl(withQuery = true) {
    var route = getCurrentRoute()

    return getRoutePath(route, withQuery)
}

// 获取路由path
export function getRoutePath(route, withQuery = true) {
    var url = pathJoin('/', route.route)

    // 带上query参数
    if (withQuery) {
        url += '?' + qs.stringify(route.options)
    }

    return url
}

// 获取所有page实例
export function getAllPages() {
    return getCurrentPages()
}

// hash-it
export function hash(s) {
    var h = 0,
        l = s.length,
        i = 0

    if (l > 0) while (i < l) h = ((h << 5) - h + s.charCodeAt(i++)) | 0
    return h
}

// 读写localStorage
export const ls = {
    get(key, defVal = '') {
        var v = wx.getStorageSync(key)
        return v || defVal
    },
    set(key, val) {
        return wx.setStorageSync(key, val)
    },
}
