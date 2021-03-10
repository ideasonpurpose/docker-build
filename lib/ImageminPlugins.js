/**
 * Container to provide plugin objects to the imageMin loader
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
  [
    "svgo",
    {
      floatPrecision: 3, // https://github.com/svg/svgo/issues/171#issuecomment-235605112
      plugins: [
        // {mergePaths: true},
        { cleanupIDs: false },
        // { convertTransform: true }, // default?
        // { removeTitle: true },
        { removeViewBox: false },
        // { removeDimensions: true },
        { sortAttrs: true },
      ],
    },
  ],
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
        { removeViewBox: false },
        // { removeDimensions: true },
        { sortAttrs: true },
      ],
    },
  ],
];

const plugins = (isProd) => (isProd ? plugins.prod : plugins.dev);
plugins.dev = imageminDevPlugins;
plugins.prod = imageminProdPlugins;

module.exports = plugins;
