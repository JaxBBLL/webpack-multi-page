# webpack-mutil-page

多页面 webpack 打包示例

- src/pages 目录下是所有的 html 页面，所有入口都是 index.js， 对应有个 index.html 模板页面
- template 是 html 的公共模板
- styles 里存放样式文件
- lib 目录是第三方库目录，不做任何处理，打包直接拷贝到 dist 目录
- 添加eslint 检查
- 打包会提取公共页面引入的 css
- npm run dev 开发运行
- npm run export 代码压缩生成，引用资源不添加 hash
- npm run build 代码压缩生成，引用资源添加 hash
- npm run serve 打包之后代码预览