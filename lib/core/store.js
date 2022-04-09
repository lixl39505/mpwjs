import { setPropByPath } from 'es-sharp'
import { visitObj } from '../support/index'

let uid = 1

function clone(value) {
    return JSON.parse(JSON.stringify(value))
}

// 若obj-path不存在会返回null
function getPropByPath(obj, path) {
    let val = obj

    if (!path) {
        return null
    }

    let keyArr = path.split('.')

    for (let i = 0; i < keyArr.length; ++i) {
        let key = keyArr[i]

        if (
            val !== null &&
            val !== undefined &&
            val.hasOwnProperty &&
            val.hasOwnProperty(key)
        ) {
            val = val[key]
        } else {
            return null
        }
    }

    return val
}

/*
 * 状态管理器
 */
function Store(options) {
    this._data = {}
    this._instances = []
    this._watcher = []

    this.init(options)
}

// 全局更新
Object.assign(Store.prototype, {
    init(options) {
        this._data = clone(options.data)
    },
    // 获取store状态
    getProp(path) {
        return getPropByPath(this._data, path.replace(/\.\*\*/, ''))
    },
    // alias for getProp
    getData(path) {
        return this.getProp(path)
    },
    // 设置store状态
    setData(data) {
        var patch = {}

        Object.keys(data).forEach((path) => {
            var result = setPropByPath(this._data, path, data[path])

            if (result && result.a) {
                var normalPath = result.a.join('.')

                patch[normalPath] = {
                    oldVal: result.p,
                    newVal: result.v,
                }
            }
        })

        // 触发实例setData
        this._instances.forEach((v) => {
            var useConfig = v.useConfig,
                diff = {},
                hasChanged = false,
                localNames = Object.keys(useConfig)

            // patch 脏检查
            this.match(Object.values(useConfig), patch, (change, index) => {
                hasChanged = true
                diff[localNames[index]] = change.newVal
            })

            if (hasChanged) {
                v.instance.setData(diff)
            }
        })

        // 触发watch
        this.notify(patch)
    },
    // 添加组件实例
    addIns(instance, useConfig) {
        this._instances.push({
            instance,
            useConfig: Object.keys(useConfig).reduce((acc, path) => {
                acc[this.normalizeObjPath(path)] = useConfig[path]

                return acc
            }, {}),
        })
    },
    // 移除组件实例
    removeIns(instance) {
        var index = this._instances.findIndex((v) => v.instance == instance)

        if (index >= 0) {
            this._instances.splice(index, 1)
        }
    },
    // 非use场景使用，语法类似observer "path1, path2": (val1, val2) => {...}
    watch(paths, cb, ctx) {
        if (paths) {
            var watcher = {
                uid: uid++,
                paths: paths,
                pathArr: paths.split(',').map((v) => v.trim()),
                handler: cb,
                ctx: ctx || null,
            }

            this._watcher.push(watcher)

            var me = this

            // unwatch
            return function () {
                var index = me._watcher.findIndex((v) => v.uid == watcher.uid)

                if (index >= 0) {
                    me._watcher.splice(index, 1)
                }
            }
        }
    },
    // 按paths批量删除
    unwatch(paths, cb) {
        for (let i = 0; i < this._watcher.length; ) {
            if (this._watcher[i].paths === paths) {
                this._watcher.splice(i, 1)
            } else {
                i++
            }
        }
    },
    // 通知watcher
    notify(patch) {
        this._watcher.forEach((v) => {
            var paths = v.pathArr,
                matched = this.match(paths, patch)

            if (
                matched.length &&
                matched.some((v) => v.change.oldVal !== v.change.newVal)
            ) {
                v.handler.call(v.ctx, ...paths.map((p) => this.getProp(p)))
            }
        })
    },
    // diff 逻辑
    match(paths, patch, cb) {
        var patchPaths = Object.keys(patch).reverse(), // 倒序，保证最后一次更新有效
            matched = []

        paths.forEach((path, index) => {
            var wildcard = /(.*)\.\*\*/.exec(path),
                target = path

            if (wildcard) {
                target = wildcard[1]
            }

            // 熔断式
            patchPaths.some((updatePath) => {
                // 相同路径
                if (target === updatePath) {
                    matched.push({
                        target,
                        change: patch[target],
                    })

                    if (cb) {
                        cb(patch[target], index)
                    }

                    return true
                }

                // 一般情况下，出于性能考虑，父级改变，其子级也视为改变，但反之无效
                if (target.startsWith(updatePath)) {
                    var subpath = target.replace(updatePath + '.', ''),
                        change = {
                            oldVal: getPropByPath(
                                patch[updatePath].oldVal,
                                subpath
                            ),
                            newVal: getPropByPath(
                                patch[updatePath].newVal,
                                subpath
                            ),
                        }

                    matched.push({
                        target,
                        change,
                    })

                    if (cb) {
                        cb(change, index)
                    }

                    return true
                }

                // **通配符场景，子级改变，父级也视为改变
                if (wildcard && updatePath.startsWith(target)) {
                    // 如some.obj.** <- some.obj.a = xx
                    var change = {
                        oldVal: null, // 没有历史副本可查
                        newVal: getPropByPath(this._data, target),
                    }

                    matched.push({
                        target,
                        change,
                    })

                    if (cb) {
                        cb(change, index)
                    }

                    return true
                }
            })
        })

        return matched
    },
    // 标准化obj-path，主要是将[n]改为.n
    normalizeObjPath(path) {
        return path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '')
    },
})

// 创建Store
export function createStore(options) {
    return new Store(options)
}

// 注入Store状态
export function injectStore(options) {
    // 前置条件
    if (!options.use || !options.store) {
        return options
    }

    if (!options.data) {
        options.data = {}
    }

    var use = options.use,
        store = options.store,
        data = options.data

    // 初始化store data
    Object.keys(use).forEach((name) => {
        var path = use[name]

        data[name] = store.getProp(path)
    })

    // 依赖收集
    var lifetimes = visitObj(options, 'lifetimes', {}),
        created = visitObj(lifetimes, 'created', []),
        attached = visitObj(lifetimes, 'attached', []),
        detached = visitObj(lifetimes, 'detached', [])

    // $store注入
    created.unshift(function () {
        this.$store = store // alias
        this.$store.addIns(this, use)
    })

    // store可能发生过变化，重新赋值（setData最早只能在attached阶段处理）
    attached.unshift(function () {
        // 小程序中存在实例提前回收的场景(如reLaunch)，此时$store已经为null了
        if (this.$store) {
            var change = {}
            Object.keys(use).forEach((name) => {
                var path = use[name]

                change[name] = this.$store.getProp(path)
            })
            this.setData(change)
        }
    })

    // 移除$store
    detached.unshift(function () {
        if (this.$store) {
            this.$store.removeIns(this)
            this.$store = null
        }
    })

    return options
}
