// TODO: Recognize project types and adjust output? WordPress? Jekyll?

const path = require("path").posix;
const { statSync } = require("fs");
// const { resolve } = require("dns").promises;

const webpack = require("webpack");

const { cosmiconfigSync } = require("cosmiconfig");

const chalk = require("chalk");

// const chokidar = require("chokidar");
const devserverProxy = require("./lib/devserver-proxy");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const CopyPlugin = require("copy-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const DependencyManifestPlugin = require("./lib/DependencyManifestPlugin.js");
const AfterDoneReporterPlugin = require("./lib/AfterDoneReporterPlugin");
const WatchRunReporterPlugin = require("./lib/WatchRunReporterPlugin");
const ImageminPlugins = require("./lib/ImageminPlugins.js");

const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");

const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");

/**
 * Force `mode: production` when running the analyzer
 * TODO: webpack5 changed env in here, might need to change WEBPACK_BUNDLE_ANALYZER
 */
if (process.env.WEBPACK_BUNDLE_ANALYZER) process.env.NODE_ENV = "production";

const isProduction = process.env.NODE_ENV === "production";

const stats = {
  all: false,
  assets: true,
  builtAt: true,
  cachedModules: false,
  children: false, // Adds a bunch of blank lines to stats output
  chunkGroups: false,
  chunkModules: false,
  chunkOrigins: false,
  chunks: false,
  colors: true,
  depth: false,
  env: true,
  // errorDetails: "auto",
  errorDetails: true,
  errors: true,
  errorStack: true,
  excludeAssets: [/hot-update/, /_sock-/],
  groupAssetsByChunk: true,
  logging: "info",
  loggingTrace: false,
  performance: true,
  reasons: true,
  relatedAssets: false,
  timings: true,
  version: true,
  warnings: true,
};

const siteDir = path.resolve(__dirname, "../site");
const explorerSync = cosmiconfigSync("ideasonpurpose");
const configFile = explorerSync.search(siteDir);

const buildConfig = require("./lib/buildConfig.js");

const config = buildConfig(configFile);

/**
 * TODO: Is this used?
 */
// const projectDir = path.resolve(siteDir, config.src, "../");

/**
 * This changes the reported port for websockets, so devserver updates
 * work even if the docker listening port is changed via npm config.
 */
const sockPort = parseInt(process.env.PORT || config.port);

/**
 * `usePolling` is a placeholder, try and detect native Windows Docker mounts
 * since they don't support file-watching (no inotify events), if there's
 * something clean, use that instead. For now, this will force-enable polling.
 *
 * TODO: Why so much dancing around defaults when this could just inherit from default.config?
 */
const usePolling = Boolean(config.usePolling);
const pollInterval = Math.max(
  parseInt(config.pollInterval, 10) || parseInt(config.usePolling, 10) || 400,
  400
);

// const devtool = !isProduction
//   ? config.devtool
//   : process.env.WEBPACK_BUNDLE_ANALYZER && "hidden-source-map";

// const devtool = isProduction
//   ? false
//   : config.devtool || "eval-cheap-source-map";
const devtool = config.devtool || false;

module.exports = async (env, argv) => {
  return {
    module: {
      rules: [
        {
          test: /\.(js|jsx|mjs)$/,
          include: [
            path.resolve(config.src),
            path.resolve("../tools/node_modules"),
            path.resolve("../site/node_modules"),
          ],
          exclude: function (module) {
            const moduleRegex = new RegExp(
              `node_modules/(${config.transpileDependencies.join("|")})`
            );
            return /node_modules/.test(module) && !moduleRegex.test(module);
          },

          /**
           * EXPERIMENTAL!!
           * If JS compilation breaks, try reverting this first.
           */
          loader: "esbuild-loader",
          options: {
            loader: "jsx",
            target: "es2015",
          },

          // use: {
          //   loader: "babel-loader",
          //   options: {
          //     cacheDirectory: !isProduction,
          //     sourceType: "unambiguous",
          //     plugins: [
          //       "@babel/plugin-syntax-dynamic-import",
          //       ...(isProduction
          //         ? []
          //         : ["@babel/plugin-transform-react-jsx-source"]),
          //     ],
          //     presets: [
          //       [
          //         "@babel/preset-env",
          //         {
          //           forceAllTransforms: true,
          //           useBuiltIns: "usage",
          //           configPath: config.src,
          //           corejs: 3,
          //           modules: false,
          //           debug: false,
          //         },
          //       ],
          //       "@babel/preset-react",
          //     ],
          //   },
          // },
        },
        {
          test: /\.(scss|css)$/,
          use: [
            { loader: MiniCssExtractPlugin.loader },
            {
              loader: "css-loader",
              options: {
                import: false, // imports already handled by Sass or PostCSS
                // sourceMap: !isProduction,
              },
            },
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: isProduction
                    ? [
                        autoprefixer,
                        cssnano({ preset: ["default", { colormin: false }] }),
                      ]
                    : [autoprefixer],
                },
              },
            },
            // {
            //   loader: "resolve-url-loader",
            //   options: {
            //     // sourceMap: true,
            //     // debug: true,
            //   },
            // },
            {
              loader: "sass-loader",
              options: {
                implementation: require(config.sass),
                sourceMap: !isProduction,
                // sourceMap: true,
                webpackImporter: false,
                sassOptions: {
                  includePaths: [
                    path.resolve(config.src, "sass"),
                    path.resolve("../site/node_modules"),
                  ],
                  outputStyle: "expanded",
                  // TODO: Drop this when we drop node-sass
                  ...(config.sass === "node-sass"
                    ? { sourceComments: true }
                    : {}),
                },
              },
            },
          ],
        },
        /**
         * This image loader is specifically for images which are required or
         * imported into a webpack processed entry file. Optimization is
         * handled by image-minimizer-webpack-plugin. These assets will be
         * renamed with a chunkhash fragment.
         *
         * All images under `config.src` will be optimized and copied by
         * copy-webpack-plugin but will keep their original filenames and
         * relative paths. Images included in SCSS files will be processed
         * twice, once with a hashed name and again with its original name.
         */
        {
          test: /.(jpe?g|png|gif|tif|webp|svg|avif)$/i,
          type: "asset",
          // use: [
          //   {
          //     loader: "url-loader",
          //     options: {
          //       limit: 8192,
          //       esModule: false,
          //       fallback: {
          //         loader: "file-loader",
          //         options: {
          //           name: "[name]-[contenthash:8].[ext]",
          //         },
          //       },
          //     },
          //   },
          // ],
        },
        {
          test: /fonts\/.*\.(ttf|eot|woff2?)/i,
          type: "asset",
        },
      ],
    },

    context: path.resolve(config.src),

    resolve: {
      modules: [
        path.resolve("../tools/node_modules"),
        path.resolve("../site/node_modules"),
        path.resolve("./node_modules"),
      ],
    },

    resolveLoader: {
      modules: [
        path.resolve("../tools/node_modules"),
        path.resolve("./node_modules"), // for local development when running outside of Docker
      ],
    },

    entry: config.entry,

    output: {
      path: path.resolve(__dirname, config.dist),
      // pathinfo: false,
      /**
       * Primary output filenames SHOULD NOT include hashes in development
       */
      filename: isProduction ? "[name]-[contenthash:8].js" : "[name].js",
      chunkFilename: "[id]-[chunkhash:8].js",
      publicPath: config.publicPath,
      /**
       * TODO: Check that clean is a sound replacement for the clean-webpack plugin (might not be)
       *
       * @link https://github.com/johnagan/clean-webpack-plugin/issues/197
       * @link https://github.com/webpack/webpack-dev-middleware/issues/861
       */
      clean: true,
      // clean: {
      //   dry: true, // Log the assets that should be removed instead of deleting them.
      // },
    },

    devServer: {
      host: "0.0.0.0",
      allowedHosts: "all",
      setupExitSignals: true,

      compress: config.devServerCompress || false, // TODO: True by default in devServer v4, exposed via config.devServerCompress to test speed impact
      port: config.port,
      hot: true,
      client: {
        logging: "info", // TODO: New, is this ok?
        overlay: { warnings: true, errors: true },
        // progress: true,   // TODO: New, is this ok?
      },
      static: {
        // TODO: Should contentBase be `false` when there's a proxy?
        directory: path.join("/usr/src/site/", config.contentBase),
        /*
         * TODO: Poll options were enabled as a workaround for Docker-win volume inotify
         *       issues. Looking to make this conditional...
         *       Maybe defined `isWindows` or `hasiNotify` for assigning a value
         *       Placeholder defined at the top of the file.
         *       For now, `usePolling` is a boolean (set to true)
         *       ref: https://github.com/docker/for-win/issues/56
         *            https://www.npmjs.com/package/is-windows
         *       TODO: Safe to remove?
         *       TODO: Test on vanilla Windows (should now work in WSL)
         */

        watch: {
          poll: usePolling && pollInterval,
          ignored: ["node_modules", "vendor"],
        },
      },

      devMiddleware: {
        index: false, // enable root proxying

        writeToDisk: (filePath) => {
          /**
           * Note: If this is an async function, it will write everything to disk
           *
           * Never write hot-update files to disk.
           */
          if (/.+hot-update\.(js|json)$/.test(filePath)) {
            return false;
          }

          if (/.+\.(svg|json|jpg|png)$/.test(filePath)) {
            const fileStat = statSync(filePath, { throwIfNoEntry: false });

            /**
             * Always write SVG and JSON files
             */
            if (/.+\.(svg|json)$/.test(filePath)) {
              return true;
            } else {
              /**
               * Write any images under 100k and anything not yet on disk
               */
              if (!fileStat || fileStat.size < 100 * 1024) {
                return true;
              }
              /**
               * TODO: This might all be unnecessary. Webpack seems to be doing a good job with its native caching
               */
              // const randOffset = Math.random() * 300000; // 0-5 minutes
              // const expired = new Date() - fileStat.mtime > randOffset;
              // const relPath = filePath.replace(config.dist, "dist");
              // if (expired) {
              //   console.log("DEBUG writeToDisk:", { replacing: relPath });
              //   return true;
              // }
              // console.log("DEBUG writeToDisk:", { cached: relPath });
            }
          }
          return false;
        },
        stats,
      },

      // NOTE: trying to make injection conditional so wp-admin stops reloading
      // injectClient: compilerConfig => {
      //   console.log(compilerConfig);
      //   return true;
      // },

      onBeforeSetupMiddleware: function (devServer) {
        /**
         * The `/inform` route is an annoying bit of code. Here's why:
         * Ubiquity Wi-fi hardware frequently spams the shit out of their
         * networks, specifically requesting the `/inform` route from
         * every device. Our office and my home network both have
         * Ubiquity hardware, so dev servers were constantly responding
         * to `/inform` requests with 404s, filling logs and cluttering
         * terminals. So that's why this is here. I hate it.
         */
        devServer.app.all("/inform", () => false);

        /**
         * The "/webpack/reload" endpoint will trigger a full devServer refresh
         * See current Browsersync implementation here:
         *
         * https://github.com/ideasonpurpose/wp-theme-init/blob/ad8039c9757ffc3a0a0ed0adcc616a013fdc8604/src/ThemeInit.php#L202
         */
        devServer.app.get("/webpack/reload", function (req, res) {
          console.log(
            chalk.yellow("Reload triggered by request to /webpack/reload")
          );

          devServer.sendMessage(
            devServer.webSocketServer.clients,
            "content-changed"
          );
          res.json({ status: "Reloading!" });
        });

        /**
         * Watch PHP files and reload everything on change
         * TODO: maybe this could move outside the devserver? Would it still be called?`
         * TODO: If this is only for proxied projects, it should be more than just php files?
         *
         * TODO: V4 introduced a watchFiles method which should mean we can drop chokidar?
         * @link https://webpack.js.org/configuration/dev-server/#devserverwatchfiles
         */
        // chokidar
        //   .watch(
        //     [
        //       path.resolve(config.src, "../**/*.php"), // WordPress
        //       path.resolve(config.src, `../${config.contentBase}/*.html`), // Jekyll
        //     ],
        //     {
        //       ignored: ["**/.git/**", "**/vendor/**", "**/node_modules/**"],
        //       ignoreInitial: true,
        //       ignorePermissionErrors: true,
        //       usePolling,
        //       interval: pollInterval,
        //     }
        //   )
        //   .on("all", (event, changedPath) => {
        //     const basePath = path.resolve(config.src, "..");
        //     const relPath = path.relative(basePath, changedPath);
        //     console.log(
        //       "Reload triggered by",
        //       chalk.bold.yellow(event),
        //       "event in",
        //       chalk.green(relPath)
        //     );

        //     server.sendMessage(server.sockets, "content-changed");
        //   });
      },

      watchFiles: {
        paths: [
          path.resolve(config.src, "../**/*.php"), // WordPress
          path.resolve(config.src, `../${config.contentBase}/*.html`), // Jekyll
        ],
        options: {
          ignored: ["**/.git/**", "**/vendor/**", "**/node_modules/**"],
          ignoreInitial: true,
          ignorePermissionErrors: true,
          usePolling,
          interval: pollInterval,
        },
      },

      ...(await devserverProxy(config)),
    },

    mode: isProduction ? "production" : "development",

    stats,

    performance: {
      hints: isProduction ? "warning" : false,
    },

    devtool,

    infrastructureLogging: {
      colors: true,
      level: isProduction ? "warn" : "error",
      // level: "info",
    },

    plugins: [
      // ...(isProduction ? [new webpack.ProgressPlugin()] : []),
      // new webpack.ProgressPlugin(),

      // new webpack.debug.ProfilingPlugin({
      //   outputPath: path.resolve(siteDir, "_builds/webpack-stats/profile.json"),
      // }),

      new MiniCssExtractPlugin({
        filename: isProduction ? "[name]-[contenthash:8].css" : "[name].css",
      }),

      new CopyPlugin({
        patterns: [
          {
            from: "**/*",
            globOptions: {
              dot: true, // TODO: Dangerous? Why is this ever necessary?!
              ignore: [
                "**/{.gitignore,.DS_Store}",
                config.src + "/{blocks,fonts,js,sass}/**",
              ],
            },
            // filter: (copyPath) => {
            //   console.log({ copyPath });
            //   return true;
            // },
          },
        ],
        options: { concurrency: 30 },
      }),

      new ImageMinimizerPlugin({
        minimizerOptions: {
          plugins: ImageminPlugins(isProduction),
        },
      }),

      new DependencyManifestPlugin({
        writeManifestFile: true,
        manifestFile: config.manifestFile,
      }),

      new WatchRunReporterPlugin(),

      new AfterDoneReporterPlugin({
        echo: env && env.WEBPACK_SERVE,
        message: "Dev site " + chalk.blue.bold(`http://localhost:${sockPort}`),
      }),

      new BundleAnalyzerPlugin({
        analyzerMode: isProduction ? "static" : "disabled",
        openAnalyzer: false,
        reportFilename: path.resolve(
          siteDir,
          "_builds/webpack-stats/index.html"
        ),
      }),
    ],
    optimization: {
      splitChunks: {
        // include all types of chunks
        chunks: "all",
      },
    },
  };
};
// });
