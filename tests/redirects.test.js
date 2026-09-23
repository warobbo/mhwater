#!/usr/bin/env node
"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log("ok - " + name);
  } catch (err) {
    failed += 1;
    console.error("fail - " + name);
    console.error("  " + err.message);
  }
}

var yaml = fs.readFileSync(path.join(root, "render.yaml"), "utf8");

function routesFromBlueprint(text) {
  var routesStart = text.indexOf("\n    routes:\n");
  assert.ok(routesStart !== -1, "missing routes list");
  var routesText = text.slice(routesStart);
  var envAt = routesText.indexOf("\n    envVars:");
  if (envAt !== -1) routesText = routesText.slice(0, envAt);
  var routes = [];
  routesText.split(/\n      - type: /).slice(1).forEach(function (block) {
    var type = block.slice(0, block.indexOf("\n")).trim();
    var source = (block.match(/\n\s*source:\s+(\S+)/) || [])[1];
    var destination = (block.match(/\n\s*destination:\s+(\S+)/) || [])[1];
    routes.push({ type: type, source: source, destination: destination });
  });
  return routes;
}

var HUB = "https://motorhometools.co.uk/water/";

var mapped = {
  "/": HUB,
  "/index.html": HUB,
  "/gas.html": HUB + "gas.html",
  "/tanks.html": HUB + "tanks.html",
  "/cassette.html": HUB + "cassette.html",
  "/bottles.html": HUB + "bottles.html",
  "/hotwater.html": HUB + "hotwater.html",
  "/winterising.html": HUB + "winterising.html",
  "/topup.html": HUB + "topup.html",
  "/*": HUB
};

test("static site publishes repo root so the HTML stubs auto-deploy", function () {
  assert.ok(yaml.indexOf("runtime: static") !== -1);
  assert.ok(yaml.indexOf("staticPublishPath: .") !== -1);
  assert.ok(yaml.indexOf("staticPublishPath: public") === -1);
  assert.ok(yaml.indexOf("name: mhwater") !== -1);
  assert.ok(!/rm -rf/.test(yaml), "do not delete root HTML on build");
  ["index.html", "gas.html", "cassette.html", "robots.txt"].forEach(function (file) {
    assert.ok(fs.existsSync(path.join(root, file)), file + " must stay at the publish root");
  });
});

test("every known calculator path 301s to the matching hub URL", function () {
  var routes = routesFromBlueprint(yaml);
  assert.ok(routes.length >= Object.keys(mapped).length, "missing routes");
  routes.forEach(function (route) {
    assert.strictEqual(route.type, "redirect", route.source + " must be a redirect (301)");
    assert.ok(mapped[route.source], "unexpected route " + route.source);
    assert.strictEqual(route.destination, mapped[route.source], route.source);
  });
  Object.keys(mapped).forEach(function (source) {
    assert.ok(
      routes.some(function (route) { return route.source === source; }),
      "missing route for " + source
    );
  });
  assert.strictEqual(routes[routes.length - 1].source, "/*", "catch-all must be last");
  assert.strictEqual(routes[0].source, "/", "root redirect must be first");
});

if (failed) {
  process.exit(1);
}
