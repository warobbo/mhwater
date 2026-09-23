#!/usr/bin/env node
"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var failed = 0;
var root = path.join(__dirname, "..");
var pages = [
  {
    file: "index.html",
    dest: "https://motorhometools.co.uk/water/",
    sources: ["/", "/index.html"]
  },
  {
    file: "gas.html",
    dest: "https://motorhometools.co.uk/water/gas.html",
    sources: ["/gas.html"]
  },
  {
    file: "tanks.html",
    dest: "https://motorhometools.co.uk/water/tanks.html",
    sources: ["/tanks.html"]
  },
  {
    file: "cassette.html",
    dest: "https://motorhometools.co.uk/water/cassette.html",
    sources: ["/cassette.html"]
  },
  {
    file: "bottles.html",
    dest: "https://motorhometools.co.uk/water/bottles.html",
    sources: ["/bottles.html"]
  },
  {
    file: "hotwater.html",
    dest: "https://motorhometools.co.uk/water/hotwater.html",
    sources: ["/hotwater.html"]
  },
  {
    file: "winterising.html",
    dest: "https://motorhometools.co.uk/water/winterising.html",
    sources: ["/winterising.html"]
  },
  {
    file: "topup.html",
    dest: "https://motorhometools.co.uk/water/topup.html",
    sources: ["/topup.html"]
  }
];

function test(name, fn) {
  try {
    fn();
    console.log("ok  - " + name);
  } catch (err) {
    failed += 1;
    console.error("fail - " + name);
    console.error("      " + err.message);
  }
}

function load(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

var yaml = load("render.yaml");
var redirectsFile = load("_redirects");

pages.forEach(function (page) {
  test(page.file + " is a noindex client redirect to the hub", function () {
    var html = load(page.file);
    assert.ok(html.indexOf('<meta name="robots" content="noindex">') !== -1, "missing noindex");
    assert.ok(
      html.indexOf('<link rel="canonical" href="' + page.dest + '">') !== -1,
      "missing canonical " + page.dest
    );
    assert.ok(
      html.indexOf('<meta http-equiv="refresh" content="0;url=' + page.dest + '">') !== -1,
      "missing meta refresh to " + page.dest
    );
    assert.ok(
      html.indexOf('location.replace("' + page.dest + '" + location.search + location.hash)') !== -1,
      "missing location.replace that keeps search and hash"
    );
    assert.ok(html.indexOf('href="' + page.dest + '"') !== -1, "missing fallback link");
    assert.ok(html.indexOf("motorhomewater.co.uk") === -1, "stub still names the old host");
    assert.ok(!/content=["']index,follow["']/i.test(html), "page must not ask to be indexed");
    assert.ok(html.indexOf("application/ld+json") === -1, "stub must not keep calculator JSON-LD");
  });

  page.sources.forEach(function (source) {
    test("render.yaml 301 " + source + " → " + page.dest, function () {
      var block = "source: " + source + "\n        destination: " + page.dest;
      assert.ok(yaml.indexOf(block) !== -1, "missing route\n" + block);
    });

    test("_redirects 301 " + source + " → " + page.dest, function () {
      var line = source + "  " + page.dest + "  301";
      assert.ok(redirectsFile.indexOf(line) !== -1, "missing " + line);
    });
  });
});

test("render.yaml catch-all 301s unknown paths to the hub Water page", function () {
  assert.ok(
    yaml.indexOf("source: /*\n        destination: https://motorhometools.co.uk/water/") !== -1,
    "missing /* redirect"
  );
  assert.ok(
    redirectsFile.indexOf("/*  https://motorhometools.co.uk/water/  301") !== -1,
    "missing _redirects catch-all"
  );
});

test("robots.txt asks crawlers to stay off the old host", function () {
  var robots = load("robots.txt");
  assert.ok(/Disallow:\s*\//.test(robots), "missing Disallow: /");
  assert.ok(!/Allow:\s*\//.test(robots), "Allow: / would keep the old host open");
  assert.ok(!/Sitemap:/i.test(robots), "sitemap line would keep advertising the old host");
  assert.ok(!/motorhomewater\.co\.uk/.test(load("sitemap.xml")), "sitemap still lists the old host");
});

test("root HTML stays in the publish directory so auto-deploy serves the stubs", function () {
  assert.ok(yaml.indexOf("staticPublishPath: .") !== -1, "publish directory must stay repo root");
  assert.ok(yaml.indexOf("staticPublishPath: public") === -1, "public/ publish would hide the stubs");
  assert.ok(!/rm -rf/.test(yaml), "build must not delete the root HTML stubs");
});

var hubMarkFiles = [
  "assets/logo.svg",
  "assets/favicon.svg",
  "assets/favicon-32.png",
  "assets/apple-touch-icon.png",
  "assets/icon-512.png"
];
var glyphFiles = [
  "assets/glyph-gas.svg",
  "assets/glyph-tanks.svg",
  "assets/glyph-cassette.svg",
  "assets/glyph-gas-32.png",
  "assets/glyph-tanks-32.png",
  "assets/glyph-cassette-32.png"
];

hubMarkFiles.concat(glyphFiles).forEach(function (file) {
  test(file + " is present", function () {
    assert.ok(fs.existsSync(path.join(root, file)), "missing " + file);
  });
});

if (failed) {
  console.error("\n" + failed + " test(s) failed");
  process.exit(1);
}

console.log("\nAll tests passed");
