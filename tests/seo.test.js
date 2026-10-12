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
  test(page.file + " is not published, so it cannot return HTTP 200", function () {
    assert.ok(
      !fs.existsSync(path.join(root, page.file)),
      page.file + " would be served as 200 and block the redirect"
    );
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

test("publish directory is the public allowlist and contains no HTML redirect stubs", function () {
  assert.ok(yaml.indexOf("staticPublishPath: public") !== -1, "publish directory must be public");
  assert.ok(yaml.indexOf("staticPublishPath: .") === -1, "do not publish the repo root");
  assert.ok(yaml.indexOf("buildCommand: bash scripts/publish-public.sh") !== -1);
  assert.ok(!/rm -rf/.test(yaml), "do not hide pages with a build-time delete");
  pages.forEach(function (page) {
    assert.ok(!fs.existsSync(path.join(root, page.file)), page.file + " must stay deleted");
  });
});

test("publish script copies only the allowlist and no hidden paths", function () {
  var spawn = require("child_process").spawnSync;
  var pub = path.join(root, "public");
  fs.rmSync(pub, { recursive: true, force: true });
  var result = spawn("bash", ["scripts/publish-public.sh"], { cwd: root, encoding: "utf8" });
  assert.strictEqual(result.status, 0, (result.stderr || "") + (result.stdout || ""));
  var list = fs
    .readFileSync(path.join(root, "scripts", "published-files.txt"), "utf8")
    .split(/\n/)
    .map(function (line) {
      return line.trim();
    })
    .filter(function (line) {
      return line && line.charAt(0) !== "#";
    });
  function walk(dir, acc) {
    fs.readdirSync(dir).forEach(function (name) {
      assert.ok(name.charAt(0) !== ".", "hidden path in publish tree: " + name);
      var full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full, acc);
      else acc.push(path.relative(pub, full).split(path.sep).join("/"));
    });
  }
  var found = [];
  walk(pub, found);
  found.sort();
  var expect = list.slice().sort();
  assert.deepStrictEqual(found, expect);
  list.forEach(function (rel) {
    assert.ok(rel.charAt(0) !== ".", rel + " is hidden");
    assert.ok(rel.indexOf("/.") === -1, rel + " has a hidden segment");
    assert.ok(
      fs.readFileSync(path.join(pub, rel)).equals(fs.readFileSync(path.join(root, rel))),
      rel + " in public/ does not match the source"
    );
  });
  ["robots.txt", "sitemap.xml", "assets/calc.js"].forEach(function (rel) {
    assert.ok(list.indexOf(rel) !== -1, "allowlist missing " + rel);
  });
  ["README.md", "render.yaml", "_redirects", ".gitignore", "tests/seo.test.js", "scripts/publish-public.sh"].forEach(function (rel) {
    assert.ok(list.indexOf(rel) === -1, rel + " must not be published");
    assert.ok(!fs.existsSync(path.join(pub, rel)), rel + " was published");
  });
  assert.ok(!fs.existsSync(path.join(pub, ".gitignore")), ".gitignore was published");
  assert.ok(!fs.existsSync(path.join(pub, ".cursor")), ".cursor was published");
  var email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  found.forEach(function (rel) {
    var text = fs.readFileSync(path.join(pub, rel));
    assert.ok(!email.test(text.toString("utf8")), rel + " contains an email address");
  });
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
