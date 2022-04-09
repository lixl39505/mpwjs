import Tab from './tab'
import { getCurrentRoute, visitObj } from '../../support/index'

// 注入tab通信功能
export function injectTab(options) {
    let lifetimes = visitObj(options, 'lifetimes', {}),
        attached = visitObj(lifetimes, 'attached', []),
        detached = visitObj(lifetimes, 'detached', [])

    // 引用或创建tab对象
    attached.unshift(function () {
        // getCurrentRoute只能在attached阶段之后可用
        var curRoute = getCurrentRoute()

        if (curRoute) {
            if (!curRoute.$tab) {
                curRoute.$tab = new Tab({
                    route: curRoute,
                })
            }

            // 一个路由只有一个tab
            this.$tab = curRoute.$tab
        }
    })

    // 撤销tab引用
    detached.unshift(function () {
        this.$tab = null
    })
}
