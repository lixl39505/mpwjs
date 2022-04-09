import { visitObj } from '../support/index'
import { type } from 'es-sharp'

// 移植部分好用得vue特性，降低认知成本
export function injectShim(options) {
    var properties = visitObj(options, 'properties', {}),
        observers = visitObj(options, 'observers', {}),
        methods = visitObj(options, 'methods', {}),
        lifetimes = visitObj(options, 'lifetimes', {}),
        attached = visitObj(lifetimes, 'attached', []),
        props = options.props

    // @features 支持props、prop.type<Array>、prop.default、prop.validator
    if (props) {
        // 合并props与properties
        Object.assign(properties, props)
    }

    Object.entries(properties).forEach(([name, def]) => {
        var t = type(def)

        // 支持type数组
        if (t === 'array') {
            def = properties[name] = {
                type: def,
            }

            t = 'object'
        }

        // 对象声明
        if (t === 'object') {
            // 支持type为数组
            if (type(def.type) === 'array') {
                var typeArr = def.type

                if (typeArr.length) {
                    def.type = typeArr[0]

                    if (typeArr.length > 1) {
                        def.optionalTypes = typeArr.slice(1)
                    }
                }
            }

            // 支持default
            if (type(def.default) !== 'undefined') {
                def.value = def.default
                delete def.default
            }

            var seq = visitObj(observers, name, [])

            // 支持validator
            if (type(def.validator) === 'function') {
                var validator = def.validator

                seq.unshift(function () {
                    // @bugfix 官方computed模块的watch选项会影响observer，导致val不存在，因此在这里val直接从data上面获取
                    var val = this.data[name]
                    if (validator.call(this, val) !== true) {
                        throw new Error(`${val} for prop ${name} is invalid!`)
                    }
                })

                delete def.validator
            }

            // 支持required:true
            if (def.required === true) {
                seq.unshift(function (val) {
                    var t = type(val)

                    if (t === 'undefined' || t === 'null') {
                        throw new Error(`prop ${name} is required!`)
                    }
                })

                delete def.required
            }
        }
    })

    // @features 支持$emit事件发射
    methods.$emit = function (name, detail, opts) {
        return this.triggerEvent(name, detail, opts)
    }

    // @features 自定义组件支持refs
    attached.unshift(function () {
        // 依赖meta对象提供静态refs信息
        var meta = this.meta || {},
            refs = meta.refs || []

        this.$refs = refs.reduce((acc, id) => {
            // 快捷获取子组件实例
            Object.defineProperty(acc, id, {
                get() {
                    return this.selectComponent('#' + id)
                },
            })

            return acc
        }, {})
    })
}
