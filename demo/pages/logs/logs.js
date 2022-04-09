//logs.js
const util = require('../../utils/helper.js')

Page({
    data: {
        logs: [],
    },
    onLoad: function () {
        this.setData({
            logs: (wx.getStorageSync('logs') || []).map((log) => {
                return util.formatTime(new Date(log))
            }),
        })
    },
})
