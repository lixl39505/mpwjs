import { wrap } from '../lib'

const formatNumber = (n) => {
    n = n.toString()
    return n[1] ? n : '0' + n
}

export const formatTime = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()

    return (
        [year, month, day].map(formatNumber).join('/') +
        ' ' +
        [hour, minute, second].map(formatNumber).join(':')
    )
}

export const wComponent = wrap(Component)
export const wView = wrap(Component)
export const wApp = wrap(App)