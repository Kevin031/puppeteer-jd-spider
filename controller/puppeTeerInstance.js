const puppeteer = require('puppeteer')

class PuppeerTeerInstance {
  constructor () {
    this.browser = null
  }

  async openBrowser () {
    this.browser = await puppeteer.launch({
      headless: true,
      devtools: true
    })
    return true
  }

  async openPage (url) {
    // console.log('open page', url)
    const page = await this.browser.newPage()
    await page.setJavaScriptEnabled(true)
    await page.setViewport({
      width: 1440,
      height: 1080
    })
    // page.on('console', msg => {
    //   for (let i = 0; i < msg.args().length; ++i) {
    //     console.log(`${i}: ${msg.args()[i]}`)
    //   }
    // })

    await page.goto(url, { waitUntil: 'networkidle0' })

    return page
  }

  async end () {
    this.browser.close()
    return true
  }
}

module.exports = PuppeerTeerInstance
