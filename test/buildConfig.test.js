import { jest } from "@jest/globals";

jest.useFakeTimers();

import { posix as path } from "path";

import buildConfig from "../lib/buildConfig.js";

// beforeEach(() => {
//   // console.log = jest.fn();
// });

afterEach(() => {
  jest.clearAllMocks();
  // mockResolve.mockResolvedValue(["11.22.33.44"]);
});

test("Defaults with no config file", () => {
  expect(buildConfig()).toHaveProperty("src");
  expect(buildConfig()).toHaveProperty("dist");
  expect(buildConfig()).toHaveProperty("entry");
  expect(buildConfig()).toHaveProperty("manifestFile");
  expect(buildConfig()).toHaveProperty("proxy");
  expect(buildConfig()).toHaveProperty("sass");
  expect(buildConfig()).toHaveProperty("transpileDependencies");
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
  let config;

  config = { sass: "dart-sass" };
  expect(buildConfig({ config })).toHaveProperty("sass", "sass");

  config = { sass: "sass" };
  expect(buildConfig({ config })).toHaveProperty("sass", "sass");

  config = { sass: "node-sass" };
  expect(buildConfig({ config })).toHaveProperty("sass", "node-sass");

  config = { sass: "node" };
  expect(buildConfig({ config })).toHaveProperty("sass", false);

  config = { sass: "sass-embedded" };
  expect(buildConfig({ config })).toHaveProperty("sass", "sass-embedded");

  config = { sass: "embedded" };
  expect(buildConfig({ config })).toHaveProperty("sass", "sass-embedded");

  expect(buildConfig({ config: {} })).toHaveProperty("sass", "sass");
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

  let config = { src: "./path/to/theme" };
  expect(buildConfig({ config })).toHaveProperty("src");
  expect(buildConfig({ config }).src).toMatch(/site\/path\/to\/theme$/);
  expect(logSpy).toHaveBeenLastCalledWith(
    expect.stringContaining("does not exist")
  );
});
