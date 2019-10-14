const promisify = require("util").promisify;
const dns = require("dns");

const chalk = require("chalk");

const lookup = promisify(dns.lookup);

const cosmiconfig = require("cosmiconfig");
const browsersync = require("browser-sync").create();

const explorer = cosmiconfig("ideasonpurpose");
const { config } = explorer.searchSync("../site");

const getIP = async addr => (await lookup(addr)).address;

console.log(
  chalk.bold("Previewing Production Build with Browsersync"),
  chalk.gray(" (Control-C to cancel)")
);

(async () =>
  browsersync.init({
    proxy: config.proxy,
    open: false,
    host: await getIP("host.docker.internal")
  }))();
