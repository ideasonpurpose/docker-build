const promisify = require("util").promisify;
const dns = require("dns");

const lookup = promisify(dns.lookup);

const cosmiconfig = require("cosmiconfig");
const browsersync = require("browser-sync").create();

const explorer = cosmiconfig("ideasonpurpose");
const { config } = explorer.searchSync("../site");

const getIP = async addr => (await lookup(addr)).address;

(async () =>
  browsersync.init({
    proxy: config.proxy,
    open: false,
    host: await getIP("host.docker.internal")
  }))();
