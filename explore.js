const path = require("path");

const { explore } = require("source-map-explorer");
const { cosmiconfigSync } = require("cosmiconfig");
const explorerSync = cosmiconfigSync("ideasonpurpose");
const configFile = explorerSync.search("../site");

// TODO: Get Express in here and serve the dist/webpack directory

// TODO: This should migrate to a separate, imported file
const defaultConfig = {
  src: "./src",
  dist: "./dist",
  entry: ["./js/index.js"],
  publicPath: "/dist/",
  proxy: null // TODO this doesn't do much yet, make devServer condtional
};

const config = { ...defaultConfig, ...configFile.config };

config.src = path.resolve("../site", config.src);
config.dist = path.resolve("../site", config.dist);

explore(`${config.dist}/js/*`, {
  output: {
    format: "html",
    filename: `${config.dist}/webpack/explore/index.html`
  }
})
  .then(result => console.log("SourceMap Exploreer!"))
  .catch(err => console.log(err));
