const path = require("path");

require("dotenv").config("/usr/src/site");

const browsersync = require("browser-sync").create(process.env.NAME);
const webpack = require("webpack");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");

const webpackConfig = require("./webpack.config");

webpackConfig.entry.main.unshift(
  "webpack/hot/dev-server",
  "webpack-hot-middleware/client"
);
webpackConfig.plugins.unshift(
  new webpack.HotModuleReplacementPlugin(),
  new webpack.NoEmitOnErrorsPlugin()
);
// webpackConfig.mode = "development"; // l
webpackConfig.devtool = "cheap-module-eval-source-map";

const bundler = webpack(webpackConfig);

// console.log(process.env);
// console.log(webpackConfig);

// console.log(webpackHotMiddleware(bundler));

const target =
  "http://devserver-proxy-token--d939bef2a41c4aa154ddb8db903ce19fff338b61";

const middleware = [
  webpackDevMiddleware(bundler, {
    publicPath: webpackConfig.output.publicPath,
    path: webpackConfig.output.path,
    stats: webpackConfig.stats,
    // writeToDisk: true
  }),
  webpackHotMiddleware(bundler)
];

// console.log(middleware);

browsersync.init({
  open: false,

  server: {
    baseDir: "../site/",  //"/usr/src/site/", //webpackConfig.output.path,

    directory: true,

  },
  middleware,

  // proxy: { target },

  logConnections: true,
  files: [
    path.resolve(webpackConfig.context, "../**/*.php")
    // path.resolve(webpackConfig.context, "../dist/{css,images}/**/*")
  ]
});
