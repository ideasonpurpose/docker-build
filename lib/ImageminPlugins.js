/**
 * Container to provide plugin objects to the imageMin loader
 */
const { extendDefaultPlugins } = require("svgo");

/**
 * We use the same svgo config for dev and prod
 */
const svgoConfig = {
  js2svg: { pretty: true },
  floatPrecision: 3,
  plugins: extendDefaultPlugins([
    { name: "cleanupIDs", active: false },
    { name: "removeViewBox", active: false },
    { name: "sortAttrs" },
  ]),
};

/**
 * Optimized for size/quality
 */
const imageminProdPlugins = [
  ["gifsicle", { optimizationLevel: 3 }],
  [
    "pngquant",
    {
      strip: true,
      dithering: 0.3,
      quality: [0.5, 0.8],
      verbose: true,
    },
  ],
  ["mozjpeg", { quality: 80, progressive: true }],
  ["svgo", svgoConfig],
];

/**
 * Optimized for speed
 */
const imageminDevPlugins = [
  ["gifsicle", { optimizationLevel: 1 }],
  ["optipng", { optimizationLevel: 0 }],
  ["jpegtran", { progressive: true }],
  ["svgo", svgoConfig],
];

const plugins = (isProd) => (isProd ? plugins.prod : plugins.dev);
plugins.dev = imageminDevPlugins;
plugins.prod = imageminProdPlugins;

module.exports = plugins;
