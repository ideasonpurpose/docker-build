const fs = require("fs");

const mockResolve = jest.fn().mockResolvedValue(["11.22.33.44"]);
jest.mock("dns", () => {
  return { promises: { resolve: mockResolve } };
});
require("dns");

const devserverProxy = require("../lib/devserver-proxy.js");

afterEach(() => {
  jest.clearAllMocks();
  mockResolve.mockResolvedValue(["11.22.33.44"]);
});

test("Notify and redirect legacy devserver-proxy-token value", async () => {
  console.log = jest.fn();
  let proxy =
    "http://devserver-proxy-token--d939bef2a41c4aa154ddb8db903ce19fff338b61";
  expect(await devserverProxy({ proxy })).toHaveProperty("proxy.**.target");
  expect(mockResolve).toHaveBeenLastCalledWith("wordpress");
});

test("Send legacy token where there's no wordpress service", async () => {
  console.log = jest.fn();
  let proxy =
    "http://devserver-proxy-token--d939bef2a41c4aa154ddb8db903ce19fff338b61";
  mockResolve.mockRejectedValueOnce(new Error());
  expect(await devserverProxy({ proxy })).toStrictEqual({});
  expect(mockResolve).toHaveBeenLastCalledWith("wordpress");
});

test("Test proxy settings", async () => {
  let proxy;

  proxy = "wordpress";
  expect(await devserverProxy({ proxy })).toHaveProperty("proxy.**.target");
  expect(mockResolve).toBeCalledWith("wordpress");

  proxy = "bad_name";
  mockResolve.mockRejectedValueOnce(new Error());
  expect(await devserverProxy({ proxy })).toStrictEqual({});
  expect(mockResolve).toHaveBeenLastCalledWith("bad_name");

  proxy = false;
  expect(await devserverProxy({ proxy })).toStrictEqual({});

  proxy = "google.com";
  expect(await devserverProxy({ proxy })).toHaveProperty("proxy.**.target");
  expect(mockResolve).toHaveBeenLastCalledWith("google.com");
});

test("proxy is bare IP address", async () => {
  expect(await devserverProxy({ proxy: "4.3.2.1" })).toHaveProperty(
    "proxy.**.target",
    "http://4.3.2.1"
  );
});

test("Proxy is a boolean, true should never happen, false fails", async () => {
  expect(await devserverProxy({ proxy: true })).toStrictEqual({});
  expect(await devserverProxy({ proxy: false })).toStrictEqual({});
});

test("test the returned proxy onError handler", async () => {
  console.log = jest.fn(); // mock console.log

  const { proxy } = await devserverProxy({ proxy: "wordpress" });
  const route = proxy["**"];
  let err = new Error("boo");
  err.code = "ECONNRESET";
  route.onError(err);
  expect(console.log.mock.calls[0][0]).toMatch(/ECONNRESET/);

  const writeHead = jest.fn();
  const end = jest.fn();
  const res = { writeHead, end };
  const req = { url: "url" };
  route.onError(new Error("guh"), req, res);

  expect(console.log.mock.calls[1][0]).toMatch(/PROXY ERROR/);
  expect(end.mock.calls[0][0]).toMatch(/^Webpack DevServer/);
});

test("test proxy's onProxyRes handler", async () => {
  const { proxy } = await devserverProxy({ proxy: "https://example.com" });
  const route = proxy["**"];
  const mockProxyRes = fs.createReadStream(__filename);

  mockProxyRes.headers = {
    headerKey: "value",
    host: "example.com",
    "content-type": "text/html; charset=utf-8",
  };
  mockProxyRes.statusCode = "statusCode";
  mockProxyRes.statusMessage = "statusMessage";

  const events = {};
  jest.spyOn(mockProxyRes, "on").mockImplementation((event, handler) => {
    events[event] = handler;
    return mockProxyRes;
  });

  const setHeader = jest.fn();
  const end = jest.fn();

  const res = { setHeader, end };
  const req = {
    headers: { host: "req.headers.host" },
    path: "path",
  };

  route.onProxyRes(mockProxyRes, req, res);
  events.data(Buffer.from("A string with 28 characters."));
  events.end();

  expect(res.statusCode).toBe(mockProxyRes.statusCode);
  expect(res.statusMessage).toBe(mockProxyRes.statusMessage);
  expect(req.headers.host).toBe("req.headers.host");
  expect(setHeader).toHaveBeenLastCalledWith("Content-Length", 28);
});

test("test proxy's onProxyRes handler onEnd passthrough", async () => {
  const { proxy } = await devserverProxy({ proxy: "https://example.com" });
  const route = proxy["**"];
  const mockProxyRes = fs.createReadStream(__filename);

  mockProxyRes.headers = {
    headerKey: "value",
    host: "example.com",
    "Content-Length": 123,
  };

  const events = {};
  jest.spyOn(mockProxyRes, "on").mockImplementation((event, handler) => {
    events[event] = handler;
    return mockProxyRes;
  });

  const setHeader = jest.fn();
  const end = jest.fn();

  const res = { setHeader, end };
  const req = {
    headers: { host: "req.headers.host" },
    path: "/wp-admin/fake.css",
  };

  route.onProxyRes(mockProxyRes, req, res);
  events.end();

  expect(end).toHaveBeenCalled();
});

test("proxy should rewrite http:// and http:\\/\\/", async () => {
  const { proxy } = await devserverProxy({ proxy: "wordpress" });
  const route = proxy["**"];
  const mockProxyRes = fs.createReadStream(__filename);

  mockProxyRes.headers = {
    headerKey: "value",
    host: "example.com",
    "content-type": "text/html; charset=utf-8",
  };

  const events = {};
  jest.spyOn(mockProxyRes, "on").mockImplementation((event, handler) => {
    events[event] = handler;
    return mockProxyRes;
  });

  const setHeader = jest.fn();
  const end = jest.fn();

  const res = { setHeader, end };
  const req = {
    headers: { host: "req.headers.host" },
    path: "path",
  };

  route.onProxyRes(mockProxyRes, req, res);
  events.data(Buffer.from("http://11.22.33.44\n"));
  events.data(Buffer.from("http:\\/\\/11.22.33.44\n"));
  events.end();

  expect(end.mock.calls[0][0].toString("utf8")).toMatch(
    /http:\/\/req.headers.host/
  );

  expect(end.mock.calls[0][0].toString("utf8")).toMatch(
    /http:\\\/\\\/req.headers.host/
  );
});
