import { capitalize, partial } from 'es-sharp'
//
import { getCurrentRoute, visitObj } from '../support/index'

// 注入自定义生命周期
// name: 自定义事件名称, before: 事件handle, original: 拦截对象
const onceAppCache = {}

//   App级
function onceAppBefore(name, before, original) {
    var e = name

    return function (...args) {
        if (!onceAppCache[e]) {
            onceAppCache[e] = before.apply(this, args)
        }

        return onceAppCache[e].then(
            () => original && original.apply(this, args)
        )
    }
}

let onceRouteCache = {},
    lastUrl = '' // 上一条路由

//   路由级
function onceRouteBefore(name, before, original) {
    var e = name

    return function (...args) {
        var route = getCurrentRoute()

        if (!route) {
            console.warn(
                `路由未加载，${
                    this.name ? this.name + '.' + name : name
                }事件无效`
            )
            // 若route不存在，自定义routeHook是不会触发的
            return original && original.apply(this, args)
        }

        var url = route.is, // 当前路由
            cache = visitObj(onceRouteCache, url, {})

        // 移除上一次路由缓存，以便下次调用
        if (lastUrl && lastUrl !== url) {
            delete onceRouteCache[lastUrl]
        }

        // 记住上一次的路由
        lastUrl = url

        if (!cache[e]) {
            cache[e] = before.apply(this, args)
        }

        return cache[e].then(() => original && original.apply(this, args))
    }
}

//   实例级
function onceInsBefore(name, before, original) {
    var e = `__on${capitalize(name)}__`

    return function (...args) {
        if (!this[e]) {
            this[e] = before.apply(this, args)
        }

        return this[e].then(() => original && original.apply(this, args))
    }
}

//    移除实例级别缓存
function removeInsBefore(name, original) {
    var e = `__on${capitalize(name)}__`

    return function (...args) {
        delete this[e]

        return original && original.apply(this, args)
    }
}

const onceBeforeLaunch = partial(onceAppBefore, 'beforeLaunch')
const onceBeforeEnter = partial(onceRouteBefore, 'beforeEnter')
const onceBeforeShow = partial(onceInsBefore, 'beforeShow')

// 清理路由级生命周期缓存（部分场景框架无法判断是否应该触发，如reLaunch刷新当前页面，所以交给应用层手动控制）
export function clearRouteHookCache() {
    onceRouteCache = {}
    lastUrl = ''
}

export function injectCustomHook(options) {
    // App beforeLaunch
    if (options.beforeLaunch) {
        // onLaunch
        options.onLaunch = onceBeforeLaunch(
            options.beforeLaunch,
            options.onLaunch
        )
    }

    // Component.beforeEnter
    if (options.beforeEnter && options.ctor === Component) {
        var lifetimes = visitObj(options, 'lifetimes', {}),
            pageLifetimes = visitObj(options, 'pageLifetimes', {})
        methods = visitObj(options, 'methods', {})

        // attached
        //   beforeEnter至少会由attached触发一次
        options.attached = onceBeforeEnter(
            options.beforeEnter,
            options.attached
        )

        // lifetimes.attached
        if (lifetimes.attached) {
            lifetimes.attached = onceBeforeEnter(
                options.beforeEnter,
                lifetimes.attached
            )
        }

        // methods.onLoad
        if (methods.onLoad) {
            methods.onLoad = onceBeforeEnter(
                options.beforeEnter,
                methods.onLoad
            )
        }

        // pageLifetimes.show
        if (pageLifetimes.show) {
            pageLifetimes.show = onceBeforeEnter(
                options.beforeEnter,
                pageLifetimes.show
            )
        }

        // methods.onShow
        if (methods.onShow) {
            methods.onShow = onceBeforeEnter(
                options.beforeEnter,
                methods.onShow
            )
        }
    }

    // Page.beforeEnter
    if (options.beforeEnter && options.ctor === Page) {
        // onLoad
        //     至少由onLoad触发一次
        options.onLoad = onceBeforeEnter(options.beforeEnter, options.onLoad)

        // onShow
        if (options.onShow) {
            options.onShow = onceBeforeEnter(
                options.beforeEnter,
                options.onShow
            )
        }
    }

    // Component.beforeShow
    if (options.beforeShow && options.ctor === Component) {
        var pageLifetimes = visitObj(options, 'pageLifetimes', {}),
            methods = visitObj(options, 'methods', {})

        // pageLifetimes.show
        //     至少触发一次
        pageLifetimes.show = onceBeforeShow(
            options.beforeShow,
            pageLifetimes.show
        )

        // methods.onShow
        if (methods.onShow) {
            methods.onShow = onceBeforeShow(options.beforeShow, methods.onShow)
        }

        // 保证beforeShow在下一次显示时被调用
        methods.onHide = removeInsBefore('beforeShow', options.onHide)
    }

    // Page.beforeShow or App.beforeShow
    if (options.beforeShow && (options.ctor === Page || options.ctor === App)) {
        // onShow
        //     至少触发一次
        options.onShow = onceBeforeShow(options.beforeShow, options.onShow)
        options.onHide = removeInsBefore('beforeShow', options.onHide)
    }
}
