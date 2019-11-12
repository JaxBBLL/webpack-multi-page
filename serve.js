const path = require('path')
const Koa = require('koa')
const static = require('koa-static')
const cp = require('child_process')
const app = new Koa()

const PORT = 3001

app.use(static(path.join(__dirname, 'dist')))

app.listen(PORT, () => {
  cp.exec(`start http://localhost:${PORT}`)
  console.log(`Listening at http://localhost:${PORT}`)
})
