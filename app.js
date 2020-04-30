const Koa = require('koa')
const Router = require('@koa/router')
const route = require('koa-route')
const { getProducts } = require('./controller/getProducts')
const fs = require('fs')
const Pug = require('koa-pug')
const path = require('path')
const websocketify = require('koa-websocket')

const app = websocketify(new Koa())
const router = new Router()

const pug = new Pug({
  viewPath: path.join(__dirname, './views'),
  locals: {},
  basedir: 'path/for/pug/extends',
  app
})

router.get('/', async ctx => {
  ctx.body = '请访问地址localhost:4000/jd-store开始抓取数据'
})

router.get('/jd-store', async ctx => {
  const results = await getProducts()
  ctx.body = results
})

router.get('/index', async ctx => {
  pug.locals.someKey = 'some value'
  await ctx.render('index', pug.locals, true)
})

router.get('/start', async ctx => {
  const link = ctx.query.link
  console.log('link', ctx.query.link)
  if (!link) {
    const err = new Error('query field link required')
    err.status = 400
    throw err
  }
  ctx.body = {
    ok: true,
    link
  }
})

app.ws.use(
  route.all('/websocket/:id', async (ctx, id) => {
    console.log('get id', id)
    let t = setInterval(function () {
      let n = Math.random()
      if (n > 0.3) {
        let msg = JSON.stringify({ 'id': id, 'n': n })
        ctx.websocket.send(msg)
      }
    })
    ctx.websocket.on('message', msg => {
      console.log('前端发过来的数据', msg)
    })
    ctx.websocket.on('close', () => {
      console.log('前端关闭了websocket')
    })
  })
)

app.use(router.routes())

// 错误处理
app.on('error', (err, ctx) => {
  console.error('server error', {
    ok: false,
    message: err
  })
  err.expose = true
})

app.listen(4000, () => {
  console.log('koa is listening to localhost:4000')
})
