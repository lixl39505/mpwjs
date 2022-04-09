import { behavior } from 'miniprogram-computed'
import { visitObj } from '../support/index'

// 注入computed、watch选项
export function injectComputed(options) {
    var behaviors = visitObj(options, 'behaviors', [])

    behaviors.push(behavior)
}
