import { visitObj } from '../support/index'

// 注入meta元信息
export function injectMeta(options) {
    var lifetimes = visitObj(options, 'lifetimes', {}),
        created = visitObj(lifetimes, 'created', []),
        cid = 1

    created.unshift(function () {
        // 支持name
        this.name = options.name || `Component${cid++}`
        // 支持meta
        this.meta = options.meta || {}
    })
}
