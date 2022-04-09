import { wrap, resolveOptions } from './core/wrap'
import { clearRouteHookCache } from './core/hooks'
import { createStore } from './core/store'
import { setDefaultCacheOptions } from './core/data-cache'
import {
    mergeOptions,
    mergeStrats,
    componentHooks,
    pageLifeHooks,
    pageHooks,
    customHooks,
} from './core/options'

// interface
export {
    // wrap
    wrap,
    resolveOptions,
    setDefaultCacheOptions,
    // injector
    clearRouteHookCache,
    // store
    createStore,
    // options
    mergeOptions,
    mergeStrats,
    mergeStrats as optionMergeStrategies, // alias
    componentHooks,
    pageLifeHooks,
    pageHooks,
    customHooks,
}
