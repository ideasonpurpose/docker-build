import { jest } from "@jest/globals";

jest.useFakeTimers();

import { posix as path } from "path";

import buildConfig from "../lib/buildConfig.js";

beforeEach(() => {
  console.log = jest.fn();
});

const filepath = process.cwd() + "/fake.file";

afterEach(() => {
  jest.clearAllMocks();
});

test("Defaults with no config file", () => {
  const logSpy = jest.spyOn(console, "log");

  const builtConfig = buildConfig();

  expect(builtConfig).toHaveProperty("src");
  expect(builtConfig).toHaveProperty("dist");
  expect(builtConfig).toHaveProperty("entry");
  expect(builtConfig).toHaveProperty("manifestFile");
  expect(builtConfig).toHaveProperty("proxy");
  expect(builtConfig).toHaveProperty("sass");
  expect(builtConfig).toHaveProperty("transpileDependencies");

  expect(logSpy).toHaveBeenCalledWith(
    expect.any(String),
    expect.stringContaining("does not exist")
  );
});

test("default proxy value", () => {
  expect(buildConfig({ config: {} })).toHaveProperty("proxy", "wordpress");
});

test("remap proxy:true to default", () => {
  expect(buildConfig({ config: { proxy: true } })).toHaveProperty(
    "proxy",
    "wordpress"
  );
});

test("Entry object transformations", () => {
  let config;

  config = { entry: ["./js/index.js"] };
  expect(buildConfig({ config })).toHaveProperty("entry.index", [
    "./js/index.js",
  ]);

  config = { entry: "./js/main.js" };
  expect(buildConfig({ config })).toHaveProperty("entry.main", [
    "./js/main.js",
  ]);

  config = { entry: "./js/main.js" };
  expect(buildConfig({ config })).toHaveProperty("entry.main", [
    "./js/main.js",
  ]);

  config = { entry: ["./index.js", "./app.js", "./index.scss"] };
  expect(buildConfig({ config })).toHaveProperty("entry", {
    app: ["./app.js"],
    index: ["./index.js", "./index.scss"],
  });

  config = { entry: { app: ["index.js"] } };
  expect(buildConfig({ config })).toHaveProperty("entry", config.entry);
});

test("Check Sass implementations", () => {
  const logSpy = jest.spyOn(console, "log");

  let config;

  config = { sass: "dart-sass" };
  expect(buildConfig({ config })).toHaveProperty("sass", "sass-embedded");

  config = { sass: "sass" };
  expect(buildConfig({ config })).toHaveProperty("sass", "sass");

  // config = { sass: "node-sass" };
  // expect(buildConfig({ config })).toHaveProperty("sass", "node-sass");

  // config = { sass: "node" };
  // expect(buildConfig({ config })).toHaveProperty("sass", false);

  config = { sass: "sass-embedded" };
  expect(buildConfig({ config })).toHaveProperty("sass", "sass-embedded");

  config = { sass: "embedded" };
  expect(buildConfig({ config })).toHaveProperty("sass", "sass-embedded");

  expect(buildConfig({ config: {} })).toHaveProperty("sass", "sass-embedded");

  expect(logSpy).toHaveBeenCalledWith(
    expect.any(String),
    expect.stringContaining("does not exist")
  );
});

test("merge transpiled dependencies", () => {
  let config, expected;

  config = {};
  expected = ["ansi-regex", "normalize-url"];
  expect(buildConfig({ config })).toHaveProperty(
    "transpileDependencies",
    expected
  );

  config = { transpileDependencies: ["newlib"] };
  expected = ["ansi-regex", "normalize-url", "newlib"];
  expect(buildConfig({ config })).toHaveProperty(
    "transpileDependencies",
    expected
  );

  config = { transpileDependencies: "newlib" };
  expected = ["ansi-regex", "normalize-url", "newlib"];
  expect(buildConfig({ config })).toHaveProperty(
    "transpileDependencies",
    expected
  );
});

test("Check src path exists", () => {
  const logSpy = jest.spyOn(console, "log");
  const src = path.dirname(new URL(import.meta.url).pathname);

  let config = { src };
  expect(buildConfig({ config })).toHaveProperty("src");
  expect(logSpy).not.toHaveBeenCalled();
});

test("Check src path doesn't exist", () => {
  const logSpy = jest.spyOn(console, "log");

  let config = { config: { src: "./path/to/theme" } };
  const result = buildConfig(config);
  expect(result).toHaveProperty("src");
  expect(result.src).toMatch(/site\/path\/to\/theme$/);
  expect(logSpy).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.stringContaining("does not exist")
  );
});

test("check for NAME envvar mismatch", () => {
  const logSpy = jest.spyOn(console, "log");
  process.env.NAME = "ENV_NAME";
  const configFile = {
    config: { src: `./wp-content/themes/${process.env.NAME}/src` },
    filepath: path.resolve("./test/fixtures/config/ideasonpurpose.config.js"),
  };
  buildConfig(configFile);
  expect(logSpy).toHaveBeenCalledWith(
    expect.any(String),
    expect.stringContaining("WARNING")
  );
});

test("coverage: NAME envvar matches package.json", () => {
  const logSpy = jest.spyOn(console, "log");
  process.env.NAME = "fixture-package";
  const configFile = {
    config: { src: `./wp-content/themes/${process.env.NAME}/src` },
    filepath: path.resolve("./test/fixtures/config/ideasonpurpose.config.js"),
  };
  buildConfig(configFile);
  expect(logSpy).not.toHaveBeenCalledWith(
    expect.any(String),
    expect.stringContaining("WARNING")
  );
});
