// const { puppeteerOpenPage } = require('./utils')
const config = require('../config.json')
const fs = require('fs')
const path = require('path')
const PuppeTeerInstance = require('./puppeTeerInstance')
const { dirSetter, asyncPool, urlToImg } = require('./utils')

// https://beats.jd.com/view_search-392293-0-5-1-24-1.html
// 
/**
 * 在浏览器端执行的方法
 */

// 获取产品列表链接
const evaluateGetProductLinks = () => Array.from($('.jSubObject')).map(item => ('http:' + $(item).find('.jDesc a').attr('href')))

// 获取产品详细资料
const evaluateGetProductItem = (link) => {
  let data = {
    name: $('.sku-name').text().replace(/\\n/g, '').trim(),
    price: $('.p-price .price').text(),
    pictures: (() => {
      let items = []
      $('#spec-list').find('img').each((idx, img) => {
        items.push('http:' + $(img).attr('src').replace('54x54', '450x450'))
      })
      return items
    })(),
    spec: (() => {
      let items = []
      $('#choose-attrs').find('.li.p-choose').each((idx, spec) => {
        let title = $(spec).attr('data-type')
        let children = []
        $(spec).find('.dd .item').each((idx, child) => {
          children.push($(child).attr('title'))
        })
        items.push({
          title, children
        })
      })
      return items
    })()
  }
  return data
}

// 获取店铺信息
const evaluateGetStoreInfo = () => {
  return {
    title: document.title
  }
}

module.exports = {
  async getProducts () {
    try {
      const puppeTeer = new PuppeTeerInstance()
      await puppeTeer.openBrowser()
      let results = {}

      // 获取产品链接队列和店铺信息
      const page = await puppeTeer.openPage(config.entry)
      const productLinks = await page.evaluate(evaluateGetProductLinks)
      const storeInfo = await page.evaluate(evaluateGetStoreInfo)
      results = {
        ...storeInfo
      }
      console.log(`当前店铺：${results.title}`)
      page.close()

      let progress = 0
      console.log('正在获取产品列表')
      // 并发任务，限制同时进行5个
      let products = await asyncPool(
        5,
        productLinks,
        // .filter((item, index) => index < 3),
        async (link) => {
          // console.log('正在获取产品详情', link)
          const detailPage = await puppeTeer.openPage(link)
          const product = await detailPage.evaluate(evaluateGetProductItem)
          detailPage.close()
          progress++
          console.log('获取成功', `${progress}/${productLinks.length}`)
          return product
        }
      )

      results.products = products
      // const results = require('../output/results-test.json')

      // 缓存数据
      // 边界处理，创建文件夹
      await dirSetter(path.join(__dirname, `../output/${results.title}`))

      console.log('正在缓存数据')

      fs.writeFileSync(path.join(__dirname, `../output/${results.title}/results.json`), JSON.stringify(results))

      await puppeTeer.browser.close()
      console.log('正在下载图片')
      await asyncPool(5, results.products, async (item) => {
        console.log('创建产品文件夹', item.name)
        const productPath = path.join(__dirname, `../output/${results.title}/${item.name.replace(/\//g, '-')}`)
        await dirSetter(productPath)
        fs.writeFileSync(`${productPath}/data.json`, JSON.stringify(item))
        for (let picture of item.pictures) {
          let arr = picture.split('/')
          const filename = arr[arr.length - 1]
          await urlToImg(picture, productPath, filename)
        }
        return true
      })

      console.log('保存成功')
      return results
    } catch (err) {
      console.error('err', err)
    }
  }
}
