# 简介

对小程序原生框架进行扩展，提供新的特性以及一些通用功能。

使用方法：

1. 包装原生 App、Component 对象：

```js
import { wrap } from 'mpwjs'

const wApp = wrap(App) // App工厂
const wComponent = wrap(Component) // 组件工厂
const wView = wrap(Component) // 页面工厂

// 全局扩展
wApp.mixin({ ... })
wComponent.mixin({ ... })
wView.mixin({ ... })
```

2. 使用 wApp 创建应用：

```js
wApp()
```

3. 使用 wComponent/wView 创建组件或者页面：

```js
wView({
    name: 'User',
    props: {
        id: {
            type: String,
        },
    },
    data: {
        name: '',
        age: '',
    },
})
```

ps: 上述 Demo 没有使用`wView = wrap(Page)`是因为 `Page` 早期（<2.9.2）无法使用`Behavior`，而且在组件化编程体验上面跟`Component`不一致，所以统一使用`Component`。

# 自定义选项

在支持原生对象所有配置的基础上，增加了自定义选项：

<!-- prettier-ignore -->
| 配置项                                        | 说明            | 备注                                             |
| --------------------------------------------- | --------------- | ------------------------------------------------ |
| `name: string`                                | 组件名称        | 利于调试                                         |
| `props: object`                               | 组件属性定义    | 用法跟 Vue 的 props 一致，可以代替原`properties`      |
| `mixins: Array<options>`                      | 混入            | 支持嵌套，如`minxins: [{ mixins: [...]}]` |
| `store: Store`                                | 全局状态对象      | 详情见全局状态管理                               |
| `use: {[local:string]:string}`                | 引入 store 状态 |                                |
| `computed:{[key:string]:(data) => any} `      | 计算属性        | [文档](https://developers.weixin.qq.com/miniprogram/dev/extended/utils/computed.html)                                         |
| `watch: {[objPath:string]:(...vals) => void}` | 数据观测        | [文档](https://developers.weixin.qq.com/miniprogram/dev/extended/utils/computed.html)                                         |
| `cache: string[] \| object[]`                 | 路由级数据缓存  | 利用Storage实现                            |
| `globalCache: string[] \| object[]`           | 全局数据缓存    | 利用Storage实现                            |

## mixins 说明

支持小程序原生 options 以及自定义 options，如果使用如下 mixins：

```js
const B = {
    mixins: [D],
}

const C = {
    mixins: [E],
}

// A
{
    mixins: [B, C],
}
```

那么混入顺序为：D->B->E->C->A

## use 说明

use 声明是为了将 store 状态引入到本地。基本格式为：

```js
{
    use: {
        localName: 'storeName'
    }
}
```

比如`use: { myUser: "user" }`，那么本地就可以使用`this.data.myUser`访问 store 中的 user。

### 局部引用

storeName 支持 object-path，从而可以实现局部 store 状态引入：

```js
{
    // 只使用用户头像
    use: {
        avatar: 'user.avatar'
    }
}
```

### 通配符

引用 store 状态时，请牢记一个规则：父级状态发生改变时，会通知子级；但是子级状态发生改变时，不会通知父级。

比如在页面上引用用户信息`use: { user: "user" }`，那么当`$store.setData({ user: newUser})`时，页面上引用的 user 会响应式更新。如果是`$store.setData({{ "user.avatar": "xx.png" })`（只修改用户头像），页面上的 user 不会更新。

如果我们想引用多个 user 的子状态，但是又不想挨个去声明，那么我们可以使用通配符`user: { user: "user.**" }`。`user.**`表示我们既引用 user 状态，同时也监听其下所有子状态的更改。

## cache 配置说明

```ts
{
    cache: {
        [key: string]: {
            value?: any, // 默认值
            expire?: number, // 过期时间(毫秒)
            user?: boolean, // 是否区分登录用户
            query?: boolean, // 是否区分查询字符串
        }
    }
}
```

或者简单罗列 key：

```ts
{
    cache: Array<string>
}
```

globalCache 配置与 cache 一致。两者不同地方在于缓存命名空间不同，globalCache 存放于`data:xxx`，而 cache 存放于`data:path/to/some/page/xxx`。

cache 配置后，即可作为普通 data 数据来使用，框架本身会负责及时更新 Storage。另外如果 globalCache 与 cache 中有重名配置，优先使用 cache。

# 全局状态管理

全局状态管理是一个常见需求，因此 mpwjs 提供了一套简单易行的方案。

## 创建 Store

```js
import { createStore } from 'mpwjs'

const store = createStore({
    // 自定义状态
    data: {
        // 用户会话信息
        user: {
            // 用户头像
            avatar: '',
            // 权限
            access: {},
        },
    },
})

// 全局混入，之后凡事通过wView创建的组件都可通过use选项来引入该store的状态
wView.mixin({
    store,
})
```

## 修改 Store

store 提供了 `setData` 方法（类似原生 setData 方法，支持 object-path）。比如：

```js
store.setData({
    // 修改用户头像
    'user.avatar': 'xx.png',
})
```

组件内部可以使用`$store.setData`。比如：

```js
wView({
    use: {
        user: 'user',
    },
    methods: {
        onClick() {
            // 修改用户头像
            this.$store.setData({
                'user.avatar': 'xx.png',
            })
        },
    },
})
```

切记只有通过 `store.setData` 才是全局有效的。

## 监听 Store

支持通过`store.watch`监听状态改变（类似小程序的 observer），比如：

```js
// 当user以及其下子状态发生改变时，都会触发watcher
this.$store.watch('user.**', (user) => {
    // ...
})
```

不过 `$store.watch` 是一个偏底层的 api，一般只在框架层面使用。平时书写 View 页面时，直接使用 watch 选项即可：

```js
wView({
    use: {
        user: 'user',
    },
    // 既支持本地data，也支持storeData
    watch: {
        user: function () {
            // ...
        },
    },
})
```

# 自定义生命周期

| 事件名         | 说明                   | 备注                                               |
| -------------- | ---------------------- | -------------------------------------------------- |
| `beforeLaunch` | 在 appLaunch 之前发生  | 以异步队列运行，且会拦截 launch 事件               |
| `beforeEnter`  | 在组件 attach 之前发生 | 以异步队列运行，且会拦截 attached、load、show 事件 |
| `beforeShow`   | 在组件 show 之前发生   | 以异步队列运行，且会拦截 show 事件                 |

# 页面间通信

微信小程序通过`getCurrentPages()`可以获取到当前的页面栈，如果这些页面之间希望通信的话，则可以使用全局混入的$tab 对象，比如：

```js
// 监听其它页面的消息
this.$tab.addMessageListener(({ message, origin }) => {
    console.log(message, origin)
})
```

```js
// 发送消息给{ name:"home" }页面
this.$tab.postMessage({ type: 'loaded', data: 'hello world!' }, 'home')
// 广播消息
this.$tab.postMessage({ type: 'loaded', data: 'hello world!' }, '*')
// 发给所有path以`/detail`结尾的页面
this.$tab.postMessage({ type: 'loaded', data: 'hello world!' }, /\/detail$/)
```

```js
// A页面: 广播消息并期待一个应答
this.$tab.postMessage(
    { type: 'load', data: 'hello world!' },
    '*',
    // callback
    (err, res) => {
        console.log(res) // nice to meet you!
    }
)

// B页面: 监听消息
this.$tab.addMessageListener(({ message, origin, answer }) => {
    // 收到消息500ms后回应
    setTimeout(() => answer(null, 'nice to meet you!'), 500)
})
```
