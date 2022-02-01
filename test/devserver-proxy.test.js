import { jest } from "@jest/globals";

// jest.useFakeTimers();

import fs from "fs";
import dns from "dns";

import devserverProxy from "../lib/devserver-proxy.js";

const expected = "11.22.33.44";

// });

beforeEach(() => {
  jest.spyOn(dns, "promises", "get").mockImplementation(() => {
    return { resolve: async () => [expected] };
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  // mockResolve.mockResolvedValue(["11.22.33.44"]);
});

// disabled because we're now mocking the library
// test.skip("dns works normally", async () => {
//   const actual = await dns.promises.resolve("apple.com");
//   expect(actual[0]).toMatch(/^17\.253/);
// });

// test("mock dns.promises.resolve", async () => {
//   const actual = await dns.promises.resolve("hello");
//   expect(actual).toBe(expected);
// });

// test("resolve from file", async () => {
//   const actual = await resolveFromFile("wordpress");
//   expect(actual).toBe(expected);
// });

test("Notify and redirect legacy devserver-proxy-token value", async () => {
  let proxy =
    "http://devserver-proxy-token--d939bef2a41c4aa154ddb8db903ce19fff338b61";

  const logSpy = jest.spyOn(console, "log");
  const actual = await devserverProxy({ proxy });

  expect(actual).toHaveProperty("proxy");
  expect(logSpy).toHaveBeenCalledWith(
    expect.stringContaining("devserver-proxy-token")
  );
});

test("Send legacy token where there's no wordpress service", async () => {
  jest.spyOn(dns, "promises", "get").mockImplementation(() => {
    // console.log("ONLY ONCE");
    return { resolve: () => new Promise((resolve, reject) => reject()) };
  });

  let proxy =
    "http://devserver-proxy-token--d939bef2a41c4aa154ddb8db903ce19fff338b61";

  const logSpy = jest.spyOn(console, "log");
  const actual = await devserverProxy({ proxy });

  expect(actual).toStrictEqual({});
  // expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("ONCE"));
  expect(logSpy).toHaveBeenCalledWith(
    expect.stringContaining("devserver-proxy-token")
  );
});

test("prefix http onto string", async () => {
  jest.spyOn(dns, "promises", "get").mockImplementation(() => {
    return {
      resolve: () => new Promise((resolve, reject) => resolve(["fake-url"])),
    };
  });

  let proxy = "placeholder string";
  const actual = await devserverProxy({ proxy });
  expect(actual).toHaveProperty("proxy.**.target", "http://fake-url");
});

test("fail to prefix http onto string", async () => {
  jest.spyOn(dns, "promises", "get").mockImplementation(() => {
    return {
      resolve: () => new Promise((resolve, reject) => reject()),
    };
  });

  let proxy = "placeholder string";
  const actual = await devserverProxy({ proxy });
  expect(actual).toStrictEqual({});
});

test("Test proxy settings", async () => {
  let proxy = "wordpress";
  const actual = await devserverProxy({ proxy });
  expect(actual).toHaveProperty("proxy.**.target");
});

test("proxy is bare IP address", async () => {
  let proxy = "4.3.2.1";
  const actual = await devserverProxy({ proxy });
  expect(actual).toHaveProperty("proxy.**.target", "http://4.3.2.1");
});

test("Proxy is a boolean, both should fail", async () => {
  expect(await devserverProxy({ proxy: true })).toStrictEqual({});
  expect(await devserverProxy({ proxy: false })).toStrictEqual({});
});

test("test the returned proxy onError handler", async () => {
  let proxy = "wordpress";
  const logSpy = jest.spyOn(console, "log");
  const actual = await devserverProxy({ proxy });

  expect(actual).toHaveProperty("proxy.**");

  const route = actual.proxy["**"];
  let err = new Error("boom");
  err.code = "ECONNRESET";
  route.onError(err);

  expect(route).toHaveProperty("onError");
  expect(logSpy).toHaveBeenLastCalledWith(
    expect.stringContaining("ECONNRESET")
  );

  const writeHead = jest.fn();
  const end = jest.fn();
  const res = { writeHead, end };
  const req = { url: "url" };

  err = new Error("boom-again ");
  err.code = "Unknown Error Code";
  route.onError(err, req, res);

  expect(logSpy.mock.calls[1][0]).toMatch(/^PROXY ERROR/);
  expect(end.mock.calls[0][0]).toMatch(/^Webpack DevServer/);
});

test("test proxy's onProxyRes handler", async () => {
  let proxy = "https://example.com";
  const logSpy = jest.spyOn(console, "log");
  const actual = await devserverProxy({ proxy });

  const route = actual.proxy["**"];
  const mockProxyRes = fs.createReadStream(new URL(import.meta.url));

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
  let proxy = "https://example.com";
  // const logSpy = jest.spyOn(console, "log");
  const actual = await devserverProxy({ proxy });

  const route = actual.proxy["**"];
  const mockProxyRes = fs.createReadStream(new URL(import.meta.url));

  console.log("hello");
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
  let proxy = "wordpress";

  const logSpy = jest.spyOn(console, "log");
  const actual = await devserverProxy({ proxy });
  const route = actual.proxy["**"];
  const mockProxyRes = fs.createReadStream(new URL(import.meta.url));

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
