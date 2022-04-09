import { type } from 'es-sharp'
import { getAllPages } from '../../support/index'

// 空函数
function noop() {}

// 页面通信桥梁
export default {
    // tab间通信
    postMessage(sourceOrigin, message, targetOrigin, answerOrigin) {
        var targets = [],
            sourceRoute = sourceOrigin.route,
            routes = getAllPages()

        if (Array.isArray(targetOrigin) === false) {
            targetOrigin = [targetOrigin]
        }

        // origin 过滤
        targets = routes.filter((v) =>
            targetOrigin.some((rule) => {
                // common
                if (rule == '*') {
                    return v.route !== sourceRoute
                }
                // self
                if (rule === 'self') {
                    return v.route === sourceRoute
                }
                // exclude self
                if (v.route === sourceRoute) {
                    return false
                }
                // name or path
                if (type(rule) == 'string') {
                    return v.name === rule || v.route === rule
                }
                // regex
                if (type(rule) == 'regExp') {
                    return rule.test(v.route)
                }

                return false
            })
        )

        var answer = answerOrigin || noop,
            wait = 1000

        if (type(answer) == 'object') {
            answer = answerOrigin.handler || noop
            wait = answerOrigin.wait || 1000
        }

        // 无可应答者
        if (targets.length <= 0) {
            return answer(new Error('no reciever'))
        }

        // 无回复
        var timeoutError = new Error('timeout ' + wait + 'ms'),
            sendTime = new Date().getTime()

        var afterWait = setTimeout(() => {
            afterWait = null
            answer(timeoutError)
        }, wait)

        // notify
        targets.forEach((t) =>
            t.$tab.notify({
                message,
                origin: sourceOrigin,
                answer: function (payload) {
                    var now = new Date().getTime()

                    if (afterWait) {
                        clearTimeout(afterWait)
                    }

                    // 超时应答
                    if (now - sendTime > wait) {
                        return answer(timeoutError)
                    }

                    answer(null, payload, t)
                },
            })
        )
    },
}
