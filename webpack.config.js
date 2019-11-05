// TODO: Try out HTML-wbpack-plugin with dual outputs (head and footer)
// TODO: Recognize project types and adjust output? WordPress? Jekyll?

const fs = require("fs-extra");
const path = require("path").posix;

const webpack = require("webpack");

const cosmiconfig = require("cosmiconfig");

const chalk = require("chalk");

const chokidar = require("chokidar");

const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
// const ManifestPlugin = require("webpack-manifest-plugin");
const copyPlugin = require("copy-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const DependencyManifestPlugin = require("./lib/DependencyManifestPlugin.js");

const ImageminPlugin = require("imagemin-webpack");
// const imageminGifsicle = require("imagemin-gifsicle");
// const imageminJpegtran = require("imagemin-jpegtran");
// const imageminOptipng = require("imagemin-optipng");
// const imageminPngquant = require("imagemin-pngquant");
// const imageminSvgo = require("imagemin-svgo");
// const imageminMozjpeg = require("imagemin-mozjpeg");

const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");

// TODO: Not working with the devserver proxy, lauches ok but throws:
//      'socket hang up' ECONNRESET errors on every request
// const BrowserSyncPlugin = require("browser-sync-webpack-plugin");

const prettyHrtime = require("pretty-hrtime");

/**
 * Force mode: production when running the analyzer
 */
if (process.env.WEBPACK_BUNDLE_ANALYZER) process.env.NODE_ENV = "production";

const isProduction = process.env.NODE_ENV === "production";
/**
 * This is a placeholder, try and detect native Windows Docker mounts since
 * they don't support file-watching (no inotify events), if there's something
 * clean, use that instead. For now, this will force-enable polling.
 */
const usePolling = true;

// /**
//  * Use `writeFiles` to output everything to disk for non-devServer previews without building for production
//  */
// const writeFiles = !!process.env.WRITEFILES;

// console.log("WRITEFILES: ", process.env.WRITEFILES);

/**
 * Attempt to catch the ECONNRESET (Error: socket hang up) errors
 * which might be slowing WordPress admin stuff to a crawl
 *
 * refs:
 *  https://stackoverflow.com/questions/17245881/node-js-econnreset
 *  https://github.com/webpack/webpack-dev-server/issues/1642
 */
// process.on("uncaughtException", (err, origin) => {
//   console.log(err.msg);
//   console.err(err.stack);
//   console.log("Error caught?");
// });

const siteDir = path.resolve(__dirname, "../site");

const explorer = cosmiconfig("ideasonpurpose");
const configFile = explorer.searchSync(siteDir);

// TODO: This should migrate to a separate, imported file
const defaultConfig = require("./default.config.js");
// const defaultConfig = {
//   src: "./src",
//   dist: "./dist",
//   entry: ["./js/index.js"],
//   publicPath: "/dist/",
//   proxy: null // TODO this doesn't do much yet, make devServer condtional
// };

const config = { ...defaultConfig, ...configFile.config };

try {
  config.proxyUrl = new URL(config.proxy);
  // console.log(config.proxyUrl);
} catch (err) {
  console.log("proxy couldn't be parsed", err);
  config.proxyUrl = {};
}

/**
 * Normalize paths relative to our webpack.config.js file
 *
 * If the `config.src` directory doesn't exist, bail out here
 *
 * Tools live in /usr/src/tools
 * Site is linked to /src/src/site
 */
config.src = path.resolve("../site", config.src);
config.dist = path.resolve("../site", config.dist);

// TODO: Should we create these if they don't exist? Would help with spinning up
//       a new evnironment. Maybe?
if (!fs.existsSync(config.src)) {
  throw new Error(
    `src directory '${config.src}' ` +
      "does not exist. Set a NAME environment variable."
  );
}

// console.log("Initial Memory Usage:", process.memoryUsage());

/**
 * Generate an entry object from config.entry.
 * Output names will be based on the source file's basename.
 *
 * Config.entry should preferrably be an array, but strings or objects
 * will also work. Strings will be treated as a single-item array. Arrays
 * be parsed into an object, objects (or whatever) will be passed through.
 *
 * A setting like this:
 *   [ "./js/index.js" ]
 *
 * Yields an entry object like this:
 *  { index: "./js/index.js"}
 *
 * A string will be wrapped in an array:
 *   "./js/main.js"  =>  [ "./js/main.js" ]
 *
 * Objects pass stright through
 *   { app: "./js/main.js" }
 *
 * Overlapping basenames will be joined into a single entrypoint
 *   ["./index.js", "./app.js", "./index.scss"]  =>  { app: ["./app.js"], index: ["./index.js", "./index.scss"]}
 */
config.entry = typeof config.entry === "string" ? [config.entry] : config.entry;
const entry = !Array.isArray(config.entry)
  ? config.entry
  : config.entry.reduce((obj, src) => {
      obj[path.parse(src).name] = []
        .concat(obj[path.parse(src).name], src)
        .filter(i => i);
      return obj;
    }, {});

const imageminpProdPlugins = [
  ["gifsicle", { optimizationLevel: 3 }],
  [
    "pngquant",
    {
      strip: true,
      dithering: 0.3,
      quality: [0.5, 0.8],
      verbose: true
    }
  ],
  ["mozjpeg", { quality: 80, progressive: true }],
  [
    "svgo",
    {
      floatPrecision: 3, // https://github.com/svg/svgo/issues/171#issuecomment-235605112
      plugins: [
        // {mergePaths: true},
        { cleanupIDs: false },
        // { convertTransform: true }, // default?
        // { removeTitle: true },
        { sortAttrs: true }
      ]
    }
  ]
];

const imageminDevPlugins = [
  ["gifsicle", { optimizationLevel: 1 }],
  ["optipng", { optimizationLevel: 0 }],
  ["jpegtran", { progressive: true }],
  [
    "svgo",
    {
      js2svg: { pretty: true },
      floatPrecision: 3,
      plugins: [
        { cleanupIDs: false },
        // { convertTransform: true }, // default
        // { removeTitle: true },  //default?
        { sortAttrs: true }
      ]
    }
  ]
];

class BrowsersyncPlugin {
  constructor(opts1, opts2) {
    console.log(opts1, opts2);
    this.isWatch = false;
  }

  apply(compiler) {
    compiler.hooks.watchRun.tap(
      "browsersyncPlugin",
      () => (this.isWatch = true)
    );

    console.log(
      chalk.magenta(">>>>>>>>>>> in browserSyncPlugin Class, apply method")
      // compiler
    );
    compiler.hooks.emit.tapAsync(
      "browsersyncPlugin",
      (compilation, callback) => {
        console.log(
          chalk.magenta(">>>>>>>>>>> in compiler.hooks.emit"),
          Object.keys(compilation.assets)
          //  compilation.assets
        );
        Object.keys(compilation.assets)
          .filter(key => compilation.assets[key].emitted)
          .forEach(
            key => {
              const { _cachedSize, existsAt, emitted } = compilation.assets[
                key
              ];
              console.log(key, { _cachedSize, existsAt, emitted });
              // console.log(Object.keys(compilation.assets[key]));
            }
            //   console.log(Object.keys(a))
          );
        callback();
      }
    );
  }
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
            sourceType: "unambiguous",
            plugins: [
              "@babel/plugin-syntax-dynamic-import",
              ...(isProduction
                ? []
                : ["@babel/plugin-transform-react-jsx-source"])
            ],
            presets: [
              [
                "@babel/preset-env",
                {
                  forceAllTransforms: true,
                  useBuiltIns: "usage",
                  configPath: config.src,
                  corejs: 3,
                  modules: false,
                  debug: false
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
          // TODO: enable watching and extracting css for an alternative to WebPack CSS loading
          // isProduction || writeFiles
          //   ? MiniCssExtractPlugin.loader
          //   : "style-loader",
          {
            loader: MiniCssExtractPlugin.loader,
            options: { hmr: !isProduction, sourceMap: true }
          },
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
              sassOptions: {
                includePaths: ["node_modules"],
                sourceComments: true,
                outputStyle: "expanded",
                sourceMap: true
              }
            }
          }
        ]
      },
      /**
       * This image loader is specifically for images which are required or
       * imported into a webpack processed entry file. Optimization is
       * handled by the imagemin-webpack plugin. These assets will be renamed
       * with a chunkhash fragment.
       *
       * All images in `config.src` will be optimized and copied by
       * copy-webpack-plugin but will keep their original filenames.
       */
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 8192,
              fallback: {
                loader: "file-loader",
                options: {
                  name: "images/[name]-[hash:6].[ext]"
                }
              }
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
    path: path.resolve(config.dist),
    /**
     * Primary output filenames SHOULD NOT include hashes in development
     */
    filename: isProduction ? "js/[name]-[hash].js" : "js/[name].js",
    chunkFilename: "js/[id]-[chunkhash:6].js",
    publicPath: config.publicPath
  },

  // TODO: Add contentBase property to the devServer object.
  //  https://webpack.js.org/configuration/dev-server/#devservercontentbase
  // Should fix this path:
  //  >  ℹ ｢wds｣: Content not from webpack is served from /usr/src/tools
  devServer: {
    index: "", // enable root proxying
    // bonjour: true, // TODO: Isn't this useless inside a container?
    host: "0.0.0.0",
    disableHostCheck: true,
    contentBase: "/usr/src/site",
    hot: true,
    overlay: { warnings: true, errors: true },
    writeToDisk: true,
    stats: {
      all: false,
      assets: true,
      chunks: false,
      colors: true,
      depth: false,
      errorDetails: true,
      errors: true,
      timings: true,
      warnings: true
    },

    before: function(app, server) {
      // TODO: What is this and does it do anything? Leftover?
      app.all("/inform", () => false);
      /**
       * The "/webpack/reload" endpoint will trigger a full devServer refresh
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
       * TODO: maybe this could move outside the devserver? Would it still be called?`
       */
      chokidar
        .watch([path.resolve(config.src, "../**/*.php")], {
          ignored: ["**/.git/**", "**/vendor/**"],
          ignoreInitial: true,
          ignorePermissionErrors: true
        })
        .on("all", (event, changedPath) => {
          const basePath = path.resolve(config.src, "..");
          const relPath = path.relative(basePath, changedPath);
          console.log(`Chokidar event: ${event} (${relPath}). Reloading...`);
          server.sockWrite(server.sockets, "content-changed");
        });
    },

    /*
     * TODO: Poll options were enabled as a workaround for Docker-win volume inotify
     *       issues. Looking to make this conditional...
     *       Maybe defined `isWindows` or `hasiNotify` for assigning a value
     *       Placehodler defined at the top of the file.
     *       For now, `usePolling` is a boolean (set to true)
     *       ref: https://github.com/docker/for-win/issues/56
     */
    watchOptions: {
      poll: usePolling && 1000,
      ignored: ["node_modules", "vendor"]
    },

    proxy: {
      "**": {
        target: config.proxyUrl.origin,
        secure: false,
        autoRewrite: true,
        selfHandleResponse: true, // necessary to avoid res.end being called automatically
        changeOrigin: true, // needed for virtual hosted sites
        cookieDomainRewrite: "", // was `${config.host}:8080` ??
        headers: { "Accept-Encoding": "identity" },
        // logLevel: "debug",

        onError: (err, req, res) => {
          if (err.code === "ECONNRESET") {
            console.log("Caught ECONNRESET error, ignoring...");
          } else {
            console.log("PROXY ERROR: ", req.url, err, err.stack);
            res.writeHead(500, { "Content-Type": "text-plain" });
            res.end("Webpack DevServer Proxy Error: " + err);
          }
          // res.writeHead(500, { "Content-Type": "text-plain" });
          // res.end("Webpack DevServer Proxy Error: " + err);
        },

        onProxyRes: function(proxyRes, req, res) {
          // console.log('config.proxyUrl.origin', config.proxyUrl.origin);
          // TODO: WHY OH WHY is this replacing the hostname and not the protocol too?
          //      Seems like a disaster waiting to happen.
          //      Maybe this should be several replacements? They're fast enough
          // TODO: Log the fuck out of this.
          const replaceTarget = str =>
            str.replace(
              new RegExp(config.proxyUrl.host, "gi"),
              req.headers.host
            );

          // Update urls in files with these content-types
          const contentTypes = [
            "application/javascript",
            "application/json",
            "multipart/form-data",
            "text/css",
            "text/html",
            "text/plain"
          ];

          const wpRegexp = new RegExp(
            "^/wp-(?:admin|includes|content/plugins).*(?:css|js|map)$"
          );

          let originalBody = []; //Buffer.from([]);

          proxyRes.on("data", data => {
            // console.log("got data", data.length);
            // console.log("memoryUsage:", process.memoryUsage());

            // originalBody = Buffer.concat([originalBody, data]);
            originalBody.push(data);
          });

          proxyRes.on("end", () => {
            // console.log("proxy ending. chunks:", originalBody.length);

            // console.log("memoryUsage:", process.memoryUsage());
            const start = process.hrtime();
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

            let newBody;
            originalBody = Buffer.concat(originalBody);

            if (contentTypes.includes(type) && !wpRegexp.test(req.path)) {
              // console.log(req.path, chalk.green(path.basename(req.path)));
              // console.log(
              //   `${chalk.green(req.path)} (${chalk.yellow(type)}) - Replacing`
              // );

              newBody = replaceTarget(originalBody.toString("utf8"));
              res.setHeader("Content-Length", Buffer.byteLength(newBody));
              const end = process.hrtime(start);
              // console.log(
              //   `${chalk.magenta("Total Processing Time")} : ${chalk.cyan(
              //     prettyHrtime(end)
              //   )}`
              // );
            } else {
              // console.log(`Skipping ${chalk.gray(req.path)}`);
              newBody = originalBody;
            }

            res.end(newBody);
          });
        }
      }
    }
  },

  mode: isProduction ? "production" : "development",

  devtool: !isProduction
    ? "cheap-module-eval-source-map"
    : process.env.WEBPACK_BUNDLE_ANALYZER && "hidden-source-map",

  plugins: [
    new CaseSensitivePathsPlugin(),

    // TODO: Remove this for production?
    new webpack.HotModuleReplacementPlugin(),
    // TODO: cleanStaleWebpackAssets isn't working, dist is full of old
    //       garbage that's never getting removed
    new CleanWebpackPlugin({ verbose: false, cleanStaleWebpackAssets: false }),
    new MiniCssExtractPlugin({
      filename: isProduction ? "css/[name]-[hash].css" : "css/[name].css"
    }),
    // new ManifestPlugin({ writeToFileEmit: true }),
    new copyPlugin([{ from: "**/*", cache: true }], {
      logLevel: isProduction ? "warn" : "error",
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

    new DependencyManifestPlugin({ writeManifestFile: true }),
    // new BrowserSyncPlugin(
    //   {
    //     host: "localhost",
    //     // port: 8080,
    //     proxy: "http://localhost:8080/"
    //   },
    //   { reload: false }
    // )

    // TODO: Get BundleAnalyzer working
    // TODO: Get explore.js running from postanalyze npm hook
    // TODO: run source-map-explorer
    // TODO: echo a message with soruce-map-=explorer and webpack0-analyzer urls

    // ...(process.env.WEBPACK_BUNDLE_ANALYZER
    //   ? (
    new BundleAnalyzerPlugin({
      analyzerMode: "static",
      generateStatsFile: isProduction,
      openAnalyzer: false,
      reportFilename: `${config.dist}/webpack/stats/index.html`,
      statsFilename: `${config.dist}/webpack/stats/stats.json`
    })
    // new BrowsersyncPlugin()
    // )
    //   : false)
  ],
  optimization: {
    splitChunks: {
      chunks: "all",
      // name: !isProduction,
      cacheGroups: {
        vendors: {
          priority: -10,
          test: /[\\/]node_modules[\\/]/,
          reuseExistingChunk: true
        }
      },
      minSize: 30000
    }
  }
};
