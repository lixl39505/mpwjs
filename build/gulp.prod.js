const path = require('path')
const del = require('del')
const { src, dest, series, parallel } = require('gulp')

const libSrc = path.resolve('./lib/**/*.js')
const demoDest = path.resolve('./demo/lib')
const miniDest = path.resolve('./miniprogram_dist')

function clean() {
    return del([
        demoDest,
        miniDest,
    ])
}

const tasks = series(
    clean,
    parallel(
        // copy lib to demo
        function() {
            return src(libSrc)
            	.pipe(dest(demoDest))
        },
        
        // copy lib to miniprogram_dist
        function() {
            return src(libSrc)
            	.pipe(dest(miniDest))
        }
    ),
    cb => {
        console.log("build done")
        cb()
    }
)

tasks()