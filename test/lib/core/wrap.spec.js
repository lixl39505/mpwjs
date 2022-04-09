import { wrap, resolveOptions, createStore } from '../../../lib'

const wComponent = wrap(Component)
const baseOptions = () => ({
    externalClasses: ['custom-class'],
    mixins: [
        {
            externalClasses: ['custom-class', 'title-class', 'value-class'],
            // 嵌套
            mixins: [
                {
                    data: {
                        path: 'L1-1-1',
                        hp: 100,
                    },
                    onLoad(query) {
                        return 'onLoad L3'
                    },
                },
            ],
            data: {
                path: 'L1-1',
                sex: 'male',
            },
            use: {
                access: 'access',
            },
            lifetimes: {
                attached() {
                    return 'attached L2'
                },
            },
            pageLifetimes: {
                show() {
                    return 'show L2'
                },
            },
            onLoad(query) {
                return 'onLoad L2'
            },
            onReady() {
                return 'onReady L2'
            },
        },
        // 多个
        {
            data: {
                path: 'L1-2',
                mp: 50,
            },
        },
    ],
    data: {
        path: 'L1',
        name: 'who am I',
    },
    use: {
        user: 'user',
    },
    lifetimes: {
        attached() {
            return 'attached L1'
        },
    },
    pageLifetimes: {
        show() {
            return 'show L1'
        },
    },
    onLoad(query) {
        return 'onLoad L1'
    },
})

describe('wrap功能测试', function () {
    before(function () {
        global.getCurrentPages = function () {
            return [{}]
        }
    })

    after(function () {
        delete global.getCurrentPages
    })

    it('resolve options', function () {
        // create
        let options = resolveOptions(baseOptions())

        // 对比
        options.should.deep.include({
            externalClasses: ['custom-class', 'title-class', 'value-class'],
            data: {
                path: 'L1',
                hp: 100,
                sex: 'male',
                mp: 50,
                name: 'who am I',
            },
            use: {
                user: 'user',
                access: 'access',
            },
        })

        options.lifetimes.attached.should.have.lengthOf(2)
        options.pageLifetimes.show.should.have.lengthOf(2)
        options.onLoad.should.have.lengthOf(3)
        options.onReady.should.have.lengthOf(1)
    })

    it('shim props', function () {
        // create
        let options = wComponent(
            Object.assign(baseOptions(), {
                properties: {
                    name: {
                        type: String,
                        value: '',
                    },
                },
                props: {
                    name: {
                        type: [String, Number],
                        default: 'sam',
                    },
                    age: {
                        type: Number,
                        validator(val) {
                            return val >= 0
                        },
                    },
                    sex: {
                        type: String,
                        required: true,
                        validator(val) {
                            return ['male', 'female'].indexOf(val) >= 0
                        },
                    },
                },
            })
        )

        var properties = options.properties,
            observers = options.observers

        properties.should.deep.include({
            name: {
                type: String,
                optionalTypes: [Number],
                value: 'sam',
            },
            age: {
                type: Number,
            },
            sex: {
                type: String,
            },
        })

        // age
        var ageObs = observers.__age__
        ageObs.should.lengthOf(1)

        options.data.age = 1
        Should.not.throw(() => ageObs[0].call(options))

        options.data.age = -1
        Should.throw(() => ageObs[0].call(options))

        // sex
        observers.__sex__.should.have.lengthOf(2)
        // required
        options.data.sex = null
        Should.throw(() => observers.__sex__[0].call(options))
        // ['female', 'male']
        options.data.sex = 'female'
        Should.not.throw(() => observers.__sex__[1].call(options))
        options.data.sex = 'male'
        Should.not.throw(() => observers.__sex__[1].call(options))
        options.data.sex = 'man'
        Should.throw(() => observers.__sex__[1].call(options))
    })

    it('store injection', function () {
        let store = createStore({
                data: {
                    user: {
                        nickname: 'jack',
                    },
                    access: ['/add'],
                },
            }),
            ins = wComponent(
                Object.assign(baseOptions(), {
                    store,
                })
            )

        // data混入store
        ins.data.should.deep.equal({
            path: 'L1',
            hp: 100,
            sex: 'male',
            mp: 50,
            name: 'who am I',
            user: {
                nickname: 'jack',
            },
            access: ['/add'],
        })
    })

    it('message injection', function () {
        let ins = wComponent(baseOptions())

        // tab注入
        Should.equal(ins.$tab, undefined)
        ins.lifetimes.attached.call(ins)
        Should.exist(ins.$tab)

        // tab移除
        ins.lifetimes.detached.call(ins)
        Should.equal(ins.$tab, null)
    })

    it('custom lifetimes', function () {
        var seed = 0

        var options = wComponent({
            beforeEnter(next) {
                seed++

                next()
            },
        })

        Should.exist(options.attached)
    })
})
