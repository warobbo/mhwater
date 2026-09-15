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

var guideUrls = [
  "https://motorhometools.co.uk/guides/fresh-waste-tanks.html",
  "https://motorhometools.co.uk/guides/gas-lpg-basics.html",
  "https://motorhometools.co.uk/guides/cassette-toilet-empty.html",
  "https://motorhometools.co.uk/guides/"
];

var legalUrls = [
  "https://motorhometools.co.uk/privacy.html",
  "https://motorhometools.co.uk/cookies.html",
  "https://motorhometools.co.uk/disclaimer.html"
];

livePages.forEach(function (page) {
  test(page.file + " links to matching Tools guides and legal pages", function () {
    var html = read(page.file);
    assert.ok(html.indexOf('class="help-card guides-strip') !== -1, "missing Guides strip");
    assert.ok(html.indexOf("<h2 id=\"guides-title\">Guides</h2>") !== -1, "Guides heading should be plain English");
    guideUrls.forEach(function (url) {
      assert.ok(html.indexOf('href="' + url + '"') !== -1, "missing guide " + url);
    });
    legalUrls.forEach(function (url) {
      assert.ok(html.indexOf('href="' + url + '"') !== -1, "missing legal " + url);
    });
    assert.ok(
      html.indexOf('<meta property="og:image" content="https://motorhomewater.co.uk/assets/icon-512.png">') !== -1,
      "missing og:image from existing icon"
    );
  });
});

test("Water home has honest WebApplication and BreadcrumbList JSON-LD", function () {
  var html = read("index.html");
  var match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, "missing JSON-LD script");
  var data = JSON.parse(match[1]);
  var graph = data["@graph"] || [];
  var types = graph.map(function (node) { return node["@type"]; });
  assert.ok(types.indexOf("WebApplication") !== -1, "need WebApplication");
  assert.ok(types.indexOf("BreadcrumbList") !== -1, "need BreadcrumbList");
  assert.ok(types.indexOf("FAQPage") === -1, "do not add FAQ JSON-LD");
  assert.ok(types.indexOf("AggregateRating") === -1, "do not invent ratings");

  var app = graph.filter(function (node) { return node["@type"] === "WebApplication"; })[0];
  var meta = html.match(/<meta name="description" content="([^"]+)">/);
  assert.ok(app, "WebApplication node missing");
  assert.equal(app.url, "https://motorhomewater.co.uk/");
  assert.equal(app.name, "Motorhome Water Usage Calculator");
  assert.equal(app.description, meta[1], "JSON-LD description must match the on-page meta description");
  assert.equal(app.isAccessibleForFree, true);
  assert.ok(!app.offers, "do not invent a price Offer");
  assert.ok(!app.aggregateRating, "do not invent ratings");
  assert.ok(!app.review, "do not invent reviews");

  var crumbs = graph.filter(function (node) { return node["@type"] === "BreadcrumbList"; })[0];
  var items = crumbs.itemListElement || [];
  assert.equal(items[0].name, "Home");
  assert.equal(items[0].item, "https://motorhometools.co.uk/");
  assert.equal(items[1].name, "Water");
  assert.equal(items[1].item, "https://motorhomewater.co.uk/");
});

test("tool pages do not invent JSON-LD", function () {
  ["gas.html", "tanks.html", "cassette.html"].forEach(function (file) {
    assert.ok(read(file).indexOf("application/ld+json") === -1, file + " should not add JSON-LD");
  });
});

comingSoonPages.forEach(function (file) {
  test(file + " keeps Coming soon noindex and no new indexable chrome", function () {
    var html = read(file);
    assert.ok(html.indexOf('<meta name="robots" content="noindex,follow">') !== -1);
    assert.ok(html.indexOf("application/ld+json") === -1, "do not add JSON-LD to placeholders");
  });
});

var logoVersion = "20260915logos";
var allPages = livePages.map(function (page) { return page.file; }).concat(comingSoonPages);
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

allPages.forEach(function (file) {
  test(file + " cache-busts hub mark and sub-tool glyphs", function () {
    var html = read(file);
    [
      "assets/favicon.svg",
      "assets/favicon-32.png",
      "assets/apple-touch-icon.png",
      "assets/icon-512.png",
      "assets/logo.svg",
      "assets/glyph-gas.svg",
      "assets/glyph-tanks.svg",
      "assets/glyph-cassette.svg"
    ].forEach(function (asset) {
      assert.ok(
        html.indexOf(asset + "?v=" + logoVersion) !== -1,
        file + " missing cache-bust for " + asset
      );
    });
    assert.ok(html.indexOf("20260911logo") === -1, file + " still uses the old logo cache-bust");
  });

  test(file + " keeps the locked Water / Gas / Tanks / Cassette nav", function () {
    var html = read(file);
    var nav = html.match(/<nav class="tool-nav no-print" aria-label="Main tools">([\s\S]*?)<\/nav>/);
    assert.ok(nav, file + " missing main tool nav");
    var hrefs = [];
    nav[1].replace(/href="([^"]+)"/g, function (_, href) {
      hrefs.push(href);
      return _;
    });
    assert.deepStrictEqual(hrefs, ["/", "gas.html", "tanks.html", "cassette.html"]);
    assert.ok(nav[1].indexOf("glyph-gas.svg?v=" + logoVersion) !== -1, "Gas nav needs the gas glyph");
    assert.ok(nav[1].indexOf("glyph-tanks.svg?v=" + logoVersion) !== -1, "Tanks nav needs the tanks glyph");
    assert.ok(nav[1].indexOf("glyph-cassette.svg?v=" + logoVersion) !== -1, "Cassette nav needs the cassette glyph");
    assert.ok(!/glyph-(?!gas|tanks|cassette)/.test(nav[1]), "do not invent extra tool glyphs");
  });
});

test("home hub chips show Gas, Tanks and Cassette glyphs only", function () {
  var html = read("index.html");
  var chips = html.match(/<section class="help-card next-tool no-print"[\s\S]*?<\/section>/);
  assert.ok(chips, "missing home hub chips");
  assert.ok(chips[0].indexOf("glyph-gas.svg?v=" + logoVersion) !== -1);
  assert.ok(chips[0].indexOf("glyph-tanks.svg?v=" + logoVersion) !== -1);
  assert.ok(chips[0].indexOf("glyph-cassette.svg?v=" + logoVersion) !== -1);
  assert.ok(chips[0].indexOf("Gas / LPG usage") !== -1);
  assert.ok(chips[0].indexOf("Holding tanks") !== -1);
  assert.ok(chips[0].indexOf("Cassette empties") !== -1);
});

if (failed) {
  process.exit(1);
}
