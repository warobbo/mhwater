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

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

var livePages = [
  { file: "index.html", canonical: "https://motorhomewater.co.uk/" },
  { file: "gas.html", canonical: "https://motorhomewater.co.uk/gas.html" },
  { file: "tanks.html", canonical: "https://motorhomewater.co.uk/tanks.html" },
  { file: "cassette.html", canonical: "https://motorhomewater.co.uk/cassette.html" }
];

var comingSoonPages = [
  "bottles.html",
  "hotwater.html",
  "winterising.html",
  "topup.html"
];

livePages.forEach(function (page) {
  test(page.file + " has a self-canonical and matching og:url", function () {
    var html = read(page.file);
    assert.ok(
      html.indexOf('<link rel="canonical" href="' + page.canonical + '">') !== -1,
      "missing canonical " + page.canonical
    );
    assert.ok(
      html.indexOf('<meta property="og:url" content="' + page.canonical + '">') !== -1,
      "missing og:url " + page.canonical
    );
    assert.ok(
      html.indexOf('<meta name="robots" content="index,follow">') !== -1,
      "live page should stay index,follow"
    );
  });
});

comingSoonPages.forEach(function (file) {
  test(file + " is noindex,follow and still reachable", function () {
    var html = read(file);
    assert.ok(
      html.indexOf('<meta name="robots" content="noindex,follow">') !== -1,
      "coming soon page should be noindex,follow"
    );
    assert.ok(html.indexOf("Coming soon") !== -1, "keep the placeholder page");
  });
});

test("sitemap lists only live absolute URLs", function () {
  var xml = read("sitemap.xml");
  livePages.forEach(function (page) {
    assert.ok(xml.indexOf("<loc>" + page.canonical + "</loc>") !== -1, "missing " + page.canonical);
    assert.ok(xml.indexOf("<lastmod>") !== -1, "keep lastmod");
  });
  comingSoonPages.forEach(function (file) {
    assert.ok(xml.indexOf(file) === -1, file + " should not be in the sitemap");
  });
  assert.ok(xml.indexOf("index.html") === -1, "home loc should be / not index.html");
});

test("HTML pages no longer link to index.html", function () {
  var htmlFiles = livePages.map(function (page) { return page.file; }).concat(comingSoonPages);
  htmlFiles.forEach(function (file) {
    var html = read(file);
    assert.ok(html.indexOf("index.html") === -1, file + " still links to index.html");
  });
});

test("render.yaml 301s /index.html to /", function () {
  var yaml = read("render.yaml");
  assert.ok(yaml.indexOf("type: redirect") !== -1, "missing redirect route");
  assert.ok(yaml.indexOf("source: /index.html") !== -1, "missing /index.html source");
  assert.ok(yaml.indexOf("destination: /") !== -1, "missing / destination");
});

if (failed) {
  process.exit(1);
}
