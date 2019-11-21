const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const Glob = require('glob')

const config = {
  port: 8087,
  proxyServer: '',
  devPublicPath: '',
  buildPublicPath: ''
}

function resolve(dir) {
  return path.join(__dirname, dir)
}

function fileGlob() {
  const entryPaths = new Glob('**/index.js', {
    cwd: resolve('src/pages'), // 在pages目录里找
    sync: true // 这里不能异步，只能同步
  })
  const entry = {}
  const devHtmlWebpackPlugins = []
  const buildHtmlWebpackPlugins = []
  entryPaths.forEach(filePath => {
    // 获取去除后缀名的路径
    const path = filePath.replace(/\.[^.]+$/g, '')
    const filename = path.replace(/\//g, '_')
    entry[filename] = resolve('./src/pages/') + filePath
    devHtmlWebpackPlugins.push(
      new HtmlWebpackPlugin({
        filename: resolve('./dist/') + path + '.html',
        template: resolve('./src/pages/') + path + '.html',
        chunks: ['manifest', 'commons', filename],
        inlineSource: '.(js|css)$'
      })
    )
    buildHtmlWebpackPlugins.push(
      new HtmlWebpackPlugin({
        minify: {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true
        },
        filename: resolve('./dist/') + path + '.html',
        template: resolve('./src/pages/') + path + '.html',
        chunks: ['manifest', 'common', filename],
        inlineSource: '.(js|css)$'
      })
    )
  })
  return {
    entry,
    devHtmlWebpackPlugins,
    buildHtmlWebpackPlugins
  }
}

const { entry, devHtmlWebpackPlugins, buildHtmlWebpackPlugins } = fileGlob()

function getName(env) {
  return env === 'production' ? '[name].[contenthash:5]' : '[name]'
}

function getPlugins(env) {
  const devPlugins = [
    // new webpack.HotModuleReplacementPlugin(),
    new CopyWebpackPlugin([
      {
        from: resolve('src/lib'),
        to: resolve('dist/lib')
      }
    ]),
    ...devHtmlWebpackPlugins
  ]
  const buildPlugins = [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin([
      {
        from: resolve('src/lib'),
        to: resolve('dist/lib')
      }
    ]),
    ...buildHtmlWebpackPlugins,
    new MiniCssExtractPlugin({
      filename: 'style/' + getName(env) + '.css',
      chunkFilename: 'style/' + getName(env) + '.css'
    }),
    new OptimizeCssAssetsPlugin({
      assetNameRegExp: /\.css$/g,
      cssProcessor: require('cssnano'),
      cssProcessorPluginOptions: {
        preset: ['default', { discardComments: { removeAll: true } }]
      },
      canPrint: true
    })
  ]
  return {
    devPlugins,
    buildPlugins
  }
}

module.exports = env => {
  const isDev = env === 'development'
  const publicPath = isDev ? config.devPublicPath : config.buildPublicPath
  const { devPlugins, buildPlugins } = getPlugins(env)

  const webpackConfig = {
    mode: isDev ? 'development' : 'production',
    entry: entry,
    output: {
      path: resolve('dist'),
      filename: isDev ? '[name].js' : 'script/' + getName(env) + '.js',
      chunkFilename: isDev ? '[name].js' : 'script/' + getName(env) + '.js',
      publicPath: publicPath
    },
    resolve: {
      extensions: ['.js'],
      alias: {
        '@': resolve('src'),
        '@styles': resolve('src/styles'),
        '@images': resolve('src/images'),
        '@pages': resolve('src/pages'),
        '@tpl': resolve('src/template')
      }
    },
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.js$/,
          exclude: /node_modules/,
          use: 'eslint-loader'
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: 'babel-loader'
        },
        {
          test: /\.css$/,
          use: [
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: { importLoaders: 1 }
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: isDev ? [] : [require('autoprefixer')()]
              }
            }
          ]
        },
        {
          test: /\.less$/,
          use: [
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: { importLoaders: 2 }
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: isDev ? [] : [require('autoprefixer')()]
              }
            },
            'less-loader'
          ]
        },
        {
          test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf|otf)(\?.*)?$/i,
          use: {
            loader: 'url-loader',
            options: {
              limit: 8192,
              // [path][name].[ext] path是绝对路径
              name: isDev ? '[path][name].[ext]' : 'assets/' + getName(env) + '.[ext]',
              publicPath: publicPath,
              outputPath: ''
            }
          }
        },
        {
          test: /\.html$/,
          include: resolve('src/template'),
          use: 'html-loader'
        },
        {
          test: /\.html$/,
          include: resolve('src/pages'),
          use: 'html-withimg-loader'
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(env)
      })
    ].concat(isDev ? devPlugins : buildPlugins),
    devtool: isDev ? 'cheap-module-eval-source-map' : 'none',
    devServer: {
      contentBase: resolve('dist/'),
      open: true,
      port: config.port,
      // hot: true,
      proxy: {
        '/proxyApi': {
          target: config.proxyServer,
          changeOrigin: true,
          pathRewrite: {
            '^/proxyApi': '/'
          }
        }
      }
    }
  }

  if (!isDev) {
    webpackConfig.optimization = {
      usedExports: true, // 开启Tree Shaking
      sideEffects: true, // 副作用
      minimizer: [
        new UglifyJsPlugin({
          cache: true,
          parallel: true,
          sourceMap: true,
          uglifyOptions: {
            warnings: false,
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log']
            }
          }
        })
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          commons: {
            name: 'common', // 提取出来的文件命名
            chunks: 'initial', // initial表示提取入口文件的公共css及js部分
            test: /\.(css|less)$/, // 只提取公共css ，命名可改styles
            minChunks: 2, // 表示提取公共部分最少的文件数
            minSize: 0 // 表示提取公共部分最小的大小
            // 如果发现页面中未引用公共文件，加上enforce: true
          }
        }
      },
      runtimeChunk: {
        name: 'manifest'
      }
    }
  }
  return webpackConfig
}
