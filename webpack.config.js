const fs = require("fs");
const path = require("path");

const webpack = require("webpack");

const chokidar = require("chokidar");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const ManifestPlugin = require("webpack-manifest-plugin");
const copyPlugin = require("copy-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const ImageminPlugin = require("imagemin-webpack");
const imageminGifsicle = require("imagemin-gifsicle");
const imageminJpegtran = require("imagemin-jpegtran");
const imageminOptipng = require("imagemin-optipng");
const imageminPngquant = require("imagemin-pngquant");
const imageminSvgo = require("imagemin-svgo");
const imageminMozjpeg = require("imagemin-mozjpeg");

const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");

// TODO: Not working with the devserver proxy, lauches ok but throws:
//      'socket hang up' ECONNRESET errors on every request
// const BrowserSyncPlugin = require("browser-sync-webpack-plugin");

// TODO: These can go away now that we're in Docker
//       We still need pkgName, but it should pull from process.env
const readPkgUp = require("read-pkg-up");
const { pkg } = readPkgUp.sync();
const pkgName = process.env.NAME || process.env.npm_package_name || pkg.name;

/**
 * Force mode: production when running the analyzer
 */
if (process.env.WEBPACK_BUNDLE_ANALYZER) process.env.NODE_ENV = "production";

const isProduction = process.env.NODE_ENV === "production";

const config = {
  src: `../site/wp-content/themes/${pkgName}/src`,
  dist: `../site/wp-content/themes/${pkgName}/dist`,
  vm: process.env.VM || pkgName // TODO: Terrible variable name. Maybe devUrl or devDomain or something
};

/**
 * If `src` doesn't exist, bail out here
 */
if (!fs.existsSync(path.resolve(config.src))) {
  throw new Error(
    `src directory '${
      config.src
    }' does not exist. Set a NAME environment variable.`
  );
}

const analyzerSettings = {
  // analyzerMode: isProduction ? "static" : "disabled",
  analyzerMode: "static",
  generateStatsFile: isProduction,
  reportFilename: "../site/webpack/stats/index.html",
  statsFilename: "../site/webpack/stats/stats.json"
};

if (process.env.WEBPACK_BUNDLE_ANALYZER) {
  // analyzerSettings.analyzerMode = "server";
  // analyzerSettings.analyzerHost = "0.0.0.0";
  // analyzerSettings.analyzerPort = 8080;
  Object.assign(analyzerSettings, {
    analyzerMode: "server",
    analyzerHost: "0.0.0.0",
    analyzerPort: 8080
  });
}

const imageminpProdPlugins = [
  imageminGifsicle({ optimizationLevel: 3 }),
  imageminPngquant({
    strip: true,
    dithering: 0.3,
    quality: [0.5, 0.8],
    verbose: true
  }),
  imageminMozjpeg({ quality: 80, progressive: true }),
  imageminSvgo({
    floatPrecision: 3, // https://github.com/svg/svgo/issues/171#issuecomment-235605112
    plugins: [
      // {mergePaths: true},
      { cleanupIDs: false },
      // { convertTransform: true }, // default?
      // { removeTitle: true },
      { sortAttrs: true }
    ]
  })
];

const imageminDevPlugins = [
  imageminGifsicle({ optimizationLevel: 1 }),
  imageminOptipng({ optimizationLevel: 0 }),
  imageminJpegtran({ progressive: true }),
  imageminSvgo({
    js2svg: { pretty: true },
    floatPrecision: 3,
    plugins: [
      { cleanupIDs: false },
      // { convertTransform: true }, // default
      // { removeTitle: true },  //default?
      { sortAttrs: true }
    ]
  })
];

const entry = {
  app: "./js/index.js",
  admin: "./js/admin.js"
};

if (fs.existsSync(`${path.resolve(config.src)}/js/editor-blocks.js`)) {
  entry["editor-blocks"] = "./js/editor-blocks.js";
}

module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(config.src),
        use: {
          loader: "babel-loader",
          options: {
            plugins: ["syntax-dynamic-import"],
            presets: [
              [
                "@babel/preset-env",
                {
                  forceAllTransforms: true,
                  useBuiltIns: "usage",
                  corejs: 3,
                  modules: false,
                  debug: true
                }
              ],
              "@babel/preset-react"
            ]
          }
        }
      },
      {
        test: /\.(scss|css)$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : "style-loader",
          {
            loader: "css-loader",
            options: { sourceMap: true }
          },
          {
            loader: "postcss-loader",
            options: {
              sourceMap: true,
              plugins: [autoprefixer, ...(isProduction ? [cssnano] : [])]
            }
          },
          {
            loader: "sass-loader",
            options: {
              includePaths: ["node_modules"],
              sourceComments: true,
              outputStyle: "expanded",
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
          {
            loader: "url-loader",
            options: {
              fallback: "file-loader",
              limit: 8192,
              name: "images/[name]-[hash:6].[ext]"
            }
          }
        ]
      },
      {
        test: /fonts\/.*\.(ttf|eot|woff2?)/i,
        use: [
          {
            loader: "file-loader",
            options: { name: "fonts/[name].[ext]" }
          }
        ]
      }
    ]
  },

  context: path.resolve(config.src),

  resolve: {
    // symlinks: false, // attempted fix for `Cannot assign to read only property 'exports' of object` (module.exports)-- didn't work
    modules: [
      path.resolve("../tools/node_modules"),
      path.resolve("../site/node_modules")
    ]
  },

  resolveLoader: {
    modules: [path.resolve("../tools/node_modules")]
  },

  entry,

  output: {
    path: path.resolve(`${config.dist}`),
    filename: "js/[name]-[hash].js",
    chunkFilename: "js/[name].bundle.js",

    publicPath: `/wp-content/themes/${pkgName}/dist/`
  },

  devServer: {
    index: "", // enable root proxying
    bonjour: true,
    host: "0.0.0.0",
    disableHostCheck: true,
    hot: true,
    overlay: true,
    writeToDisk: true,
    stats: {
      all: false,
      assets: true,
      chunks: true,
      colors: true,
      errorDetails: true,
      errors: true,
      timings: true,
      warnings: true
    },
    // watchOptions: {
    //   poll: 1000
    // },

    before: function(app, server) {
      app.all("/inform", () => false);
      /**
       * This endpoint triggers a full refresh of the dev server
       * See current Browsersync implementation here:
       *
       * https://github.com/ideasonpurpose/wp-theme-init/blob/master/src/ThemeInit.php#L85-L111
       */
      app.get("/webpack/reload", function(req, res) {
        server.sockWrite(server.sockets, "content-changed");
        res.json({ status: "Reloading!" });
      });

      /**
       * Watch PHP files and reload everything on change
       */
      chokidar
        // TODO: this path is kind of hidden down here
        // .watch([`../site/wp-content/themes/${pkgName}/**/*.php`], {
        .watch([path.resolve(config.src, "../**/*.php")], {
          // TODO: Remove this stuff after some more testing
          // alwaysStat: true,
          // atomic: false,
          // followSymlinks: false,
          ignored: ["**/.git/**", "**/vendor/**"],
          ignoreInitial: true,
          ignorePermissionErrors: true
          // persistent: true,
          // usePolling: true,
          // interval: 500
        })
        .on("all", (event, changedPath) => {
          const basePath = path.resolve(config.src, "..");
          const relPath = path.relative(basePath, changedPath);
          console.log(`Chokidar event: ${event} (${relPath}). Reloading...`);
          server.sockWrite(server.sockets, "content-changed");
        });
    },

    watchOptions: {
      ignored: ["node_modules", "vendor"]
    },

    proxy: {
      "**": {
        target: `http://${config.vm}`,
        secure: false,
        autoRewrite: true,
        selfHandleResponse: true, // necessary to avoid res.end being called automatically
        changeOrigin: true, // needed for virtual hosted sites
        cookieDomainRewrite: "", // was `${config.host}:8080` ??
        headers: { "Accept-Encoding": "identity" },
        // logLevel: "debug",

        onError: (err, req, res) => {
          console.log("PROXY ERROR: ", req.url, err, err.stack);
          res.writeHead(500, { "Content-Type": "text-plain" });
          res.end("Webpack DevServer Proxy Error: " + err);
        },

        onProxyRes: function(proxyRes, req, res) {
          const replaceTarget = str =>
            str.replace(new RegExp(config.vm, "gi"), req.headers.host);

          // Update urls in files with these content-types
          const contentTypes = [
            "application/javascript",
            "application/json",
            "text/css",
            "text/html",
            "text/plain"
          ];

          let originalBody = Buffer.from([]);

          proxyRes.on(
            "data",
            data => (originalBody = Buffer.concat([originalBody, data]))
          );

          proxyRes.on("end", () => {
            res.statusCode = proxyRes.statusCode;
            if (proxyRes.statusMessage) {
              res.statusMessage = proxyRes.statusMessage;
            }

            Object.keys(proxyRes.headers).forEach(key => {
              const header = proxyRes.headers[key];
              if (header !== undefined) {
                res.setHeader(
                  String(key).trim(),
                  typeof header == "string" ? replaceTarget(header) : header
                );
              }
            });

            const type = (proxyRes.headers["content-type"] || "").split(";")[0];
            let newBody = originalBody;

            if (contentTypes.includes(type)) {
              newBody = replaceTarget(originalBody.toString("utf8"));
              res.setHeader("Content-Length", Buffer.byteLength(newBody));
            }
            res.end(newBody);
          });
        }
      }
    }
  },

  mode: isProduction ? "production" : "development",

  devtool:
    process.env.NODE_ENV !== "production"
      ? "cheap-module-eval-source-map"
      : false,

  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({ filename: "css/[name]-[hash].css" }),
    new ManifestPlugin({ writeToFileEmit: true }),
    new copyPlugin([{ from: "**/*", cache: true }], {
      logLevel: isProduction ? "info" : "warn",
      ignore: [".DS_Store", "js/**/*", "sass/**/*", "fonts/**/*", "blocks/**/*"]
    }),

    new ImageminPlugin({
      bail: false, // Ignore errors on corrupted images
      cache: false,
      name: "[path][name].[ext]",
      imageminOptions: {
        plugins: isProduction ? imageminpProdPlugins : imageminDevPlugins
      }
    }),
    // new BrowserSyncPlugin(
    //   {
    //     host: "localhost",
    //     // port: 8080,
    //     proxy: "http://localhost:8080/"
    //   },
    //   { reload: false }
    // )
    new BundleAnalyzerPlugin(analyzerSettings)
  ],
  optimization: {
    // splitChunks: {
    //   chunks: "async",
    //   minSize: 30000,
    //   maxSize: 100000,
    //   minChunks: 1,
    //   maxAsyncRequests: 3,
    //   maxInitialRequests: 3,
    //   automaticNameDelimiter: "~",
    //   name: true,
    //   cacheGroups: {
    //     vendors: {
    //       test: /[\\/]node_modules[\\/]/,
    //       priority: -10
    //     },
    //     default: {
    //       minChunks: 2,
    //       priority: -20,
    //       reuseExistingChunk: true
    //     }
    //   }
    // }
    splitChunks: {
      name: "vendor",
      chunks: "all"
    }
  }
};
