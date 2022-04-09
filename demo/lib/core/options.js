import { deepCopy, objMerge, type, setUnion } from 'es-sharp'
import { visitObj } from '../support/index'

// App生命周期
const appHooks = [
    'onLaunch',
    'onShow',
    'onHide',
    'onError',
    'onPageNotFound',
    'onUnhandledRejection',
    'onThemeChange',
]
// 组件生命周期事件
const componentHooks = [
    'created',
    'attached',
    'ready',
    'moved',
    'detached',
    'error',
]
// 组件所在页面生命周期
const pageLifeHooks = ['show', 'hide', 'resize']
// 页面生命周期事件
const pageHooks = [
    'onLoad',
    'onShow',
    'onReady',
    'onHide',
    'onUnload',
    'onPullDownRefresh',
    'onReachBottom',
    'onPageScroll',
    'onResize',
    'onTabItemTap',
]
// 自定义生命周期事件
const customHooks = ['beforeLaunch', 'beforeShow', 'beforeEnter']

// 链式合并策略
function chainMerge(parent = [], child = []) {
    if (type(parent) !== 'array') {
        parent = [parent]
    }

    if (type(child) !== 'array') {
        child = [child]
    }

    return parent.concat(child)
}

// 取并集（会去重)
function unionMerge(parent = [], child = []) {
    if (type(parent) !== 'array') {
        parent = [parent]
    }

    if (type(child) !== 'array') {
        child = [child]
    }

    return setUnion(parent, child)
}

// 监听合并
function listenerMapMerge(parent, child = {}) {
    var result = Object.assign({}, parent)

    Object.entries(child).forEach(([k, v]) => {
        result[k] = chainMerge(result[k], v)
    })

    return result
}

// 方法合并
const pageHooksMap = pageHooks.reduce((acc, k) => ((acc[k] = true), acc), {})
function methodsMerge(parent = {}, child = {}) {
    Object.keys(child).forEach((k) => {
        // chain pageHooks
        if (pageHooksMap[k]) {
            parent[k] = chainMerge(parent[k], child[k])
        }
        // 其余覆盖
        else {
            parent[k] = child[k]
        }
    })

    return parent
}

// 合并策略集（针对一级属性）
const mergeStrats = {
    // 并集-外部样式类
    externalClasses: unionMerge,
    // chain-数据监听器
    observers: listenerMapMerge,
    watch: listenerMapMerge,
    // chain-组件生命周期函数
    lifetimes: listenerMapMerge,
    // chain-组件所在页面的生命周期
    pageLifetimes: listenerMapMerge,
    // chain-旧式组件生命周期函数
    ...componentHooks.reduce((acc, e) => ((acc[e] = chainMerge), acc), {}),
    // chain-页面生命周期函数
    ...pageHooks.reduce((acc, e) => ((acc[e] = chainMerge), acc), {}),
    // chain-App生命周期函数
    ...appHooks.reduce((acc, e) => ((acc[e] = chainMerge), acc), {}),
    // chain-自定义生命周期函数
    ...customHooks.reduce((acc, e) => ((acc[e] = chainMerge), acc), {}),
    // methods-chain-其中的pageHooks
    methods: methodsMerge,
}

// 选项合并
function mergeOptions(parent, child) {
    if (typeof child === 'function') {
        child = child.options
    }

    // 最终options
    const options = {}

    let key
    for (key in parent) {
        if (key === 'mixins') {
            continue
        }

        mergeField(key, options, parent)
    }

    for (key in child) {
        if (key === 'mixins') {
            continue
        }

        mergeField(key, options, child)
    }

    function mergeField(key, to, from) {
        var toVal = to[key],
            fromVal = from[key],
            strat = mergeStrats[key]

        if (strat) {
            options[key] = strat(deepCopy(toVal), deepCopy(fromVal))
        } else {
            options[key] = objMerge(toVal, fromVal)
        }
    }

    return options
}

// 注入$options
export function injectOptions(options) {
    let lifetimes = visitObj(options, 'lifetimes', {}),
        created = visitObj(lifetimes, 'created', [])

    // 在最前方插入，保证后续生命周期都能正常访问$options
    created.unshift(function () {
        this.$options = options
    })
}

export {
    mergeOptions,
    mergeStrats,
    componentHooks,
    pageLifeHooks,
    pageHooks,
    appHooks,
    customHooks,
}
