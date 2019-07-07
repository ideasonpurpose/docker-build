const { explore } = require("source-map-explorer");
const config = require("./ideasonpurpose.config.js");

explore(`${config.dist}/js/*`, {
  output: {
    format: "html",
    filename: `${config.dist}/webpack/explore/index.html`
  }
}).then((result) => console.log('SourceMap Exploreer!'));

console.log(config);
