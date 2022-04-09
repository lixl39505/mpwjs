import { visitObj, hash, ls, qs, pathJoin } from '../support/index'

// 1. 支持路由级缓存以及全局缓存（命名空间不同）

// 存储罐
function Tin(path = '', options) {
    this._ns = 'data:' + path // 空间
    this._id = '' // 键
    this._data = null // 值

    this.options = options

    this._init()
}
Object.assign(Tin.prototype, {
    // 初始化
    _init() {
        var { key, userId, queryStr } = this.options
        // 主键
        this._id = hash(key + userId + queryStr) + ''
        // restore from localStorage
        var data = ls.get(pathJoin(this._ns, this._id))

        this._data = data || {
            key,
            queryStr,
            userId,
            timestamp: Date.now(),
        }
    },
    // 获取缓存值
    value() {
        var value = this._data.value
        // timeout controll
        if (this._overtime()) {
            value = undefined
        }

        return (value === undefined ? this.options.value : value) || ''
    },
    // 更新缓存
    update(val) {
        this._data.value = val
        this._data.timestamp = Date.now()

        ls.set(pathJoin(this._ns, this._id), this._data)
    },
    // 是否超时
    _overtime() {
        var now = Date.now(), // 时间戳
            expire = this.options.expire

        return expire > 0 && now - this._data.timestamp > expire
    },
})

// 默认cache配置
const defaultCacheOptions = {}
function normalizeCache(cache, global = false) {
    if (Array.isArray(cache)) {
        return cache.reduce((acc, v) => {
            var name = v,
                opts = Object.assign({}, defaultCacheOptions)

            // 支持arr/obj混合式配置
            if (typeof v === 'object') {
                name = v.name
                Object.assign(opts, v)
                delete opts.name
            }
            acc[name] = Object.assign(opts, { global })

            return acc
        }, {})
    } else {
        return Object.entries(cache).reduce((acc, [k, v]) => {
            acc[k] = Object.assign({}, defaultCacheOptions, v, { global })
            return acc
        }, {})
    }
}

// 获取当前页面缓存配置对象
// (this: Component, cache: {
//     [key: string]: {
//         value?: any,
//         expire?: number,
//         user?: boolean,
//         query?: boolean,
//         global: boolean,
//     }
// }) => {
//     [key:string]: {
//         key: string,
//         value:any,
//         expire:number,
//         global: boolean,
//         queryStr: string,
//         userId: string,
//     }
// }
function resolveTinConfig(cache) {
    return Object.keys(cache).reduce((acc, k) => {
        var config = cache[k],
            result = {}

        result.key = k
        result.value = config.value
        result.expire = config.expire || 0
        result.global = config.global
        if (config.query) {
            result.queryStr = qs.stringify(this.options || {})
        } else {
            result.queryStr = ''
        }
        if (config.user) {
            if (this.resolveUserId) {
                result.userId = this.resolveUserId()
            } else {
                throw new Error('缺少resolveUserId方法，无法区分user')
            }
        } else {
            result.userId = ''
        }

        acc[k] = result
        return acc
    }, {})
}

// 修改默认cache配置
export function setDefaultCacheOptions(options) {
    Object.assign(defaultCacheOptions, options)
}
// 注入cache选项
export function injectDataCache(options) {
    var cache = options.cache,
        globalCache = options.globalCache

    if (cache || globalCache) {
        var observers = visitObj(options, 'observers', []),
            data = visitObj(options, 'data', {}),
            lifetimes = visitObj(options, 'lifetimes')

        if (cache) cache = normalizeCache(cache)
        if (globalCache) globalCache = normalizeCache(globalCache, true)

        // 合并处理(cache > globalCache)
        cache = Object.assign({}, globalCache, cache)
        Object.keys(cache).forEach((k) => {
            // 插入data
            data[k] = ''

            // 监听改变
            var seq = visitObj(observers, k + '.**', [])
            seq.unshift(function (val) {
                // 更新localStorage
                if (this.__initCache__) {
                    this.__tins__.get(k).update(val)
                }
            })
        })

        // 初始化缓存
        var attached = visitObj(lifetimes, 'attached', [])

        attached.unshift(function () {
            // 路由级缓存
            var tinsConfig = resolveTinConfig.call(this, cache),
                change = {}

            this.__tins__ = new Map()
            Object.entries(tinsConfig).forEach(([k, v]) => {
                var tin = new Tin(v.global ? '' : this.is, v)

                this.__tins__.set(k, tin)
                change[k] = tin.value()
            })

            this.setData(change)
            this.__initCache__ = true
        })
    }
}
