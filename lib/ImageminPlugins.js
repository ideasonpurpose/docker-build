/**
 * Container to provide plugin objects to the imageMin loader
 */

/**
 * We use the same svgo config for dev and prod
 */
const svgoConfig = {
  js2svg: { pretty: true },
  floatPrecision: 3,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          cleanupIDs: false,
          removeViewBox: false,
        },
      },
    },
    "sortAttrs"
  ],
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

// const plugins = (isProd) => (isProd ? plugins.prod : plugins.dev);
// plugins.dev = imageminDevPlugins;
// plugins.prod = imageminProdPlugins;
// const plugins = (isProd) => (isProd ? imageminDevPlugins : imageminDevPlugins);
const plugins = (isProd) => (isProd ? imageminProdPlugins : imageminDevPlugins);

export default plugins;
// module.exports = plugins;
