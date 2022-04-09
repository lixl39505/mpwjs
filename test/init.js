const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
// 启用BDD
const should = chai.should()
global.Should = should
// 让chai支持promise
chai.use(chaiAsPromised)

// Mock Weapp
global.Component = (res) => Object.assign({}, res)
global.Page = (res) => Object.assign({}, res)
global.App = (res) => Object.assign({}, res)
global.Behavior = (res) => Object.assign({}, res)
