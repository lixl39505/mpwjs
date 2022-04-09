import {
    injectOptions,
    mergeOptions,
    componentHooks,
    pageHooks,
    appHooks,
    pageLifeHooks,
    customHooks,
} from './options'
import { injectComputed } from './computed'
import { injectMeta } from './meta'
import { injectStore } from './store'
import { injectTab } from './message/index'
import { injectCustomHook } from './hooks'
import { injectDataCache } from './data-cache'
import { injectShim } from './shim'

// 包装器
function wrap(fn, config = {}) {
    let baseOptions = {
        ctor: fn,
    }

    let {
        optionsResolved, // options解析完成后调用
    } = config

    function wrapped(options = {}) {
        let result = resolveOptions(extend(baseOptions, options))

        // custom merge
        if (typeof optionsResolved === 'function') {
            optionsResolved(result)
        }

        // 增强小程序自定义组件
        if (fn === Component) {
            // 移植vue部分特性
            injectShim(result)
            // 注入computed/watch
            injectComputed(result)
            // 注入cache/globalCache
            injectDataCache(result)
            // 注入meta
            injectMeta(result)
            // 注入store状态
            injectStore(result)
            // 注入message通信
            injectTab(result)
            // 注入options，便于使用
            injectOptions(result)
        }

        // 链式生命周期
        setPropInvoke(
            result,
            seqInvoke,
            ...componentHooks,
            ...pageHooks,
            ...appHooks
        )

        if (result.methods) {
            setPropInvoke(result.methods, seqInvoke, ...pageHooks)
        }
        if (result.observers) {
            setPropInvoke(
                result.observers,
                seqInvoke,
                ...Object.keys(result.observers)
            )
        }

        if (result.watch) {
            setPropInvoke(result.watch, seqInvoke, ...Object.keys(result.watch))
        }

        if (result.lifetimes) {
            setPropInvoke(result.lifetimes, seqInvoke, ...componentHooks)
        }

        if (result.pageLifetimes) {
            setPropInvoke(result.pageLifetimes, seqInvoke, ...pageLifeHooks)
        }

        // 异步队列式生命周期
        setQueueInvoke(result, ...customHooks)

        // 注入自定义生命周期（必须在设置链式生命周期之后）
        injectCustomHook(result)

        // 返回小程序全局标识符
        return fn(result)
    }

    // 全局mixin方法
    wrapped.mixin = function (options) {
        baseOptions = resolveOptions(extend(baseOptions, options))

        return wrapped
    }

    // 构造器
    return wrapped
}

// 继承扩展
function extend(sup, options) {
    if (!options.mixins) {
        options.mixins = []
    }

    options.mixins.unshift(sup)

    return options
}

// 解析options
function resolveOptions(options) {
    options = Object.assign({}, options)

    let mixins = options.mixins || []
    delete options.mixins

    if (mixins.length) {
        return mergeOptions(
            mixins
                .slice(1)
                .reduce(
                    (acc, v) => mergeOptions(acc, resolveOptions(v)),
                    resolveOptions(mixins[0])
                ),
            options
        )
    } else {
        return mergeOptions({}, options)
    }
}

// 顺序调用
function seqInvoke(fns, params, context) {
    fns.forEach((v) => v.apply(context, params))
}

// 设置调用模式
function setPropInvoke(obj, invoke, ...keys) {
    Array.from(new Set(keys)).forEach((k) => {
        let tasks = obj[k]

        if (tasks) {
            // 保留原始引用，便于测试
            Object.defineProperty(obj, `__${k}__`, {
                value: tasks,
            })

            obj[k] = function (...args) {
                invoke(tasks, args, this)
            }
        }
    })
}

// 异步队列调用
function queueInvoke(fns, params, context) {
    return new Promise(function (resolve, reject) {
        const results = []

        const step = (index) => {
            if (index < fns.length) {
                if (fns[index]) {
                    // handle(next, ...params)
                    results.push(
                        fns[index].apply(context, [
                            // next
                            (err) => (err ? reject(err) : step(index + 1)),
                            // others
                            ...params,
                        ])
                    )
                } else {
                    step(index + 1)
                }
            } else {
                resolve(results)
            }
        }

        try {
            step(0)
        } catch (e) {
            reject(e)
        }
    })
}

// 设置异步队列调用
function setQueueInvoke(obj, ...keys) {
    Array.from(new Set(keys)).forEach((k) => {
        let tasks = obj[k]

        if (tasks) {
            // 保留原始引用，便于测试
            Object.defineProperty(obj, `__${k}__`, {
                value: tasks,
            })

            obj[k] = function (...args) {
                return queueInvoke(tasks, args, this)
            }
        }
    })
}

export default wrap
export { wrap, resolveOptions, queueInvoke, seqInvoke }
