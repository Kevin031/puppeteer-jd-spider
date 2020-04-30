const puppeteer = require('puppeteer')
const http = require('http')
const fs = require('fs')
const path = require('path')

const dirSetter = async (dir) => {
  try {
    await fs.accessSync(dir)
  } catch (e) {
    await fs.mkdirSync(dir)
    return false
  }
  return true
}

const asyncPool = (poolLimit, array, iteratorFn) => {
  let i = 0
  const ret = []
  const executing = []
  const enqueue = function () {
      // 边界处理，array为空数组
      if (i === array.length) {
          return Promise.resolve()
      }
      // 每调一次enqueue，初始化一个promise
      const item = array[i++]
      const p = Promise.resolve().then(() => iteratorFn(item, array))
      // 放入promises数组
      ret.push(p)
      // promise执行完毕，从executing数组中删除
      const e = p.then(() => executing.splice(executing.indexOf(e), 1))
      // 插入executing数字，表示正在执行的promise
      executing.push(e)
      // 使用Promise.rece，每当executing数组中promise数量低于poolLimit，就实例化新的promise并执行
      let r = Promise.resolve()
      if (executing.length >= poolLimit) {
          r = Promise.race(executing)
      }
      // 递归，直到遍历完array
      return r.then(() => enqueue())
  }
  return enqueue().then(() => Promise.all(ret))
  // example
  // const timeout = i => new Promise(resolve => setTimeout(() => resolve(i), i))
  // return asyncPool(2, [1000, 5000, 3000, 2000], timeout).then(results => {
  //     ...
  // })
}

const urlToImg = (url, dir, filename) => {
  return new Promise((resolve) => {
    dirSetter(dir).then(() => {
      const file = path.join(dir, `${filename}`)
      http.get(url, res => {
        res.pipe(fs.createWriteStream(file))
          .on('finish', () => {
            return resolve()
          })
      })
    })
  })
}

module.exports = {
  dirSetter,
  asyncPool,
  urlToImg
}
