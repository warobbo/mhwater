#!/usr/bin/env node
/**
 * mhwater-verify — launch, check, drive, and stop an isolated copy of this repo.
 *
 * This checkout is the Render static site `mhwater`. It does not publish the
 * calculator HTML. Page paths 301 to https://motorhometools.co.uk/water/.
 * Files that exist (assets, robots.txt, this skill) are served as HTTP 200.
 * Calculator drives copy the live hub HTML into a temp directory and serve it
 * with this checkout's assets/, so clicks run the JavaScript in this repo.
 *
 * Do not print secrets. This script has none.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "../../../..");
const EVIDENCE = path.join(ROOT, ".cursor/skills/verify-mhwater/evidence");
const STATE_DIR = path.join(os.tmpdir(), "mhwater-verify");
const STATE_PATH = path.join(STATE_DIR, "state.json");
const HUB = "https://motorhometools.co.uk/water/";
const CHROME = "/usr/bin/google-chrome";
const LIVE_ORIGIN = "https://motorhomewater.co.uk";
const ONRENDER_ORIGIN = "https://mhwater.onrender.com";

const HTML_PAGES = [
  "index.html",
  "gas.html",
  "tanks.html",
  "cassette.html",
  "bottles.html",
  "hotwater.html",
  "winterising.html",
  "topup.html",
];

const UI_PAGES = [
  { file: "index.html", url: HUB },
  { file: "gas.html", url: HUB + "gas.html" },
  { file: "tanks.html", url: HUB + "tanks.html" },
  { file: "cassette.html", url: HUB + "cassette.html" },
  { file: "bottles.html", url: HUB + "bottles.html" },
  { file: "hotwater.html", url: HUB + "hotwater.html" },
  { file: "winterising.html", url: HUB + "winterising.html" },
  { file: "topup.html", url: HUB + "topup.html" },
];

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const waterCalc = require(path.join(ROOT, "assets/calc.js"));
const waterDefaults = require(path.join(ROOT, "assets/defaults.js"));
const gasCalc = require(path.join(ROOT, "assets/gas-calc.js"));
const gasDefaults = require(path.join(ROOT, "assets/gas-defaults.js"));
const tankCalc = require(path.join(ROOT, "assets/tank-calc.js"));
const tankDefaults = require(path.join(ROOT, "assets/tank-defaults.js"));
const cassetteCalc = require(path.join(ROOT, "assets/cassette-calc.js"));
const cassetteDefaults = require(path.join(ROOT, "assets/cassette-defaults.js"));

function log(line) {
  const text = String(line);
  console.log(text);
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.appendFileSync(path.join(EVIDENCE, "run.log"), text + "\n");
}

function fail(message) {
  console.error(message);
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.appendFileSync(path.join(EVIDENCE, "run.log"), "FAIL " + message + "\n");
  const error = new Error(message);
  error.alreadyReported = true;
  throw error;
}

function readState() {
  if (!fs.existsSync(STATE_PATH)) return null;
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function writeState(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

function pidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false;
  }
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function formatNumber(value, digits) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: value < 10 && digits > 0 ? Math.min(digits, 1) : 0,
  }).format(value);
}

function formatLitresWater(value) {
  if (value >= 100) return formatNumber(value, 0);
  if (value >= 10) return formatNumber(value, 1);
  return formatNumber(value, 1);
}

function formatDaysWater(value) {
  if (value >= 10) return formatNumber(value, 0);
  return formatNumber(value, 1);
}

function formatKg(value) {
  if (value >= 100) return formatNumber(value, 0);
  if (value >= 10) return formatNumber(value, 1);
  return formatNumber(value, 2);
}

function formatDaysGas(value) {
  if (value >= 10) return formatNumber(value, 0);
  return formatNumber(value, 1);
}

function formatLitresTank(value) {
  if (value >= 100) return formatNumber(value, 0);
  if (value >= 10) return formatNumber(value, 1);
  return formatNumber(value, 1);
}

function formatDaysTank(value) {
  if (value >= 10) return formatNumber(value, 0);
  if (Math.abs(value - Math.round(value)) < 0.05) return formatNumber(Math.round(value), 0);
  return formatNumber(value, 1);
}

function formatLitresCassette(value) {
  if (value >= 100) return formatNumber(value, 0);
  if (value >= 1) return formatNumber(value, 1);
  return formatNumber(value, 2);
}

function formatDaysCassette(value) {
  if (value >= 10) return formatNumber(value, 0);
  if (Math.abs(value - Math.round(value)) < 0.05) return formatNumber(Math.round(value), 0);
  return formatNumber(value, 1);
}

function presetLabel(preset) {
  return preset.sublabel ? preset.label + " (" + preset.sublabel + ")" : preset.label;
}

function loadRedirectRules() {
  const text = fs.readFileSync(path.join(ROOT, "_redirects"), "utf8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const parts = line.split(/\s+/);
      return { source: parts[0], destination: parts[1], status: Number(parts[2] || 301) };
    });
}

function matchRedirect(pathname, rules) {
  for (const rule of rules) {
    if (rule.source === pathname) return rule;
  }
  return rules.find((rule) => rule.source === "/*") || null;
}

function safeFile(root, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (err) {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const rel = path.normalize(decoded).replace(/^([/\\])+/, "");
  const full = path.resolve(root, rel);
  const base = path.resolve(root);
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}

function startStaticServer(options) {
  const rules = options.mode === "redirect" ? loadRedirectRules() : [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const pathname = url.pathname;
    res.setHeader("X-Mhwater-Verify", options.runId);
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.end();
      return;
    }
    const full = safeFile(options.root, pathname);
    if (full && fs.existsSync(full) && fs.statSync(full).isFile()) {
      const body = fs.readFileSync(full);
      res.statusCode = 200;
      res.setHeader("Content-Type", MIME[path.extname(full).toLowerCase()] || "application/octet-stream");
      res.setHeader("Content-Length", body.length);
      res.end(req.method === "HEAD" ? undefined : body);
      return;
    }
    if (full && fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      const index = path.join(full, "index.html");
      if (fs.existsSync(index) && fs.statSync(index).isFile()) {
        const body = fs.readFileSync(index);
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Content-Length", body.length);
        res.end(req.method === "HEAD" ? undefined : body);
        return;
      }
    }
    if (options.mode === "redirect") {
      const rule = matchRedirect(pathname, rules);
      if (rule) {
        const location = rule.destination + url.search;
        res.statusCode = rule.status;
        res.setHeader("Location", location);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        const body = Buffer.from("Redirecting to " + location + "\n");
        res.setHeader("Content-Length", body.length);
        res.end(req.method === "HEAD" ? undefined : body);
        return;
      }
    }
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(req.method === "HEAD" ? undefined : "Not found\n");
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

async function materializeUi(runId) {
  const uiRoot = path.join(STATE_DIR, runId, "ui");
  fs.mkdirSync(uiRoot, { recursive: true });
  fs.cpSync(path.join(ROOT, "assets"), path.join(uiRoot, "assets"), { recursive: true });
  const fetched = [];
  for (const page of UI_PAGES) {
    const response = await fetch(page.url, { redirect: "follow" });
    if (!response.ok) {
      throw new Error("Could not copy " + page.url + " (" + response.status + ")");
    }
    const html = await response.text();
    if (!html.includes("<html")) {
      throw new Error(page.url + " did not return an HTML page");
    }
    fs.writeFileSync(path.join(uiRoot, page.file), html);
    fetched.push({ file: page.file, url: page.url, bytes: Buffer.byteLength(html) });
  }
  fs.writeFileSync(
    path.join(uiRoot, "SOURCE.txt"),
    [
      "Verification scratch only. Not part of the mhwater publish set.",
      "HTML copied at launch from the live Water hub so this checkout's assets/ can run in the real page shell.",
      "Delete this directory in cleanup. Do not commit it.",
      JSON.stringify(fetched, null, 2),
      "",
    ].join("\n")
  );
  return uiRoot;
}

function spawnServe(mode, root, runId, logName) {
  const logPath = path.join(STATE_DIR, logName);
  const out = fs.openSync(logPath, "a");
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "serve", mode, root, runId], {
    detached: true,
    stdio: ["ignore", "pipe", out],
    cwd: ROOT,
  });
  return new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(mode + " server did not print a port"));
    }, 8000);
    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      const match = buf.match(/PORT (\d+)/);
      if (!match) return;
      clearTimeout(timer);
      if (typeof child.stdout.unref === "function") child.stdout.unref();
      child.unref();
      resolve({ pid: child.pid, port: Number(match[1]), log: logPath });
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(mode + " server exited " + code + " before it was ready"));
    });
  });
}

async function serve(argv) {
  const mode = argv[0];
  const root = argv[1];
  const runId = argv[2];
  const started = await startStaticServer({ mode, root, runId });
  process.stdout.write("PORT " + started.port + "\n");
  await new Promise(() => {});
}

export async function launch() {
  const existing = readState();
  if (existing && (pidAlive(existing.publish && existing.publish.pid) || pidAlive(existing.ui && existing.ui.pid))) {
    fail(
      "A verification server is already running (run " +
        existing.runId +
        "). Run cleanup.mjs before launching another one. Refusing to share that instance."
    );
  }
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  log("launch run " + runId);
  const publish = await spawnServe("redirect", ROOT, runId, "publish.log");
  let uiRoot;
  let ui;
  try {
    uiRoot = await materializeUi(runId);
    ui = await spawnServe("static", uiRoot, runId, "ui.log");
  } catch (err) {
    if (pidAlive(publish.pid)) process.kill(publish.pid, "SIGTERM");
    fail("Launch stopped. The redirect server was shut down because the UI copy failed: " + err.message);
  }
  const state = {
    runId,
    startedAt: new Date().toISOString(),
    publish,
    ui,
    uiRoot,
    chromePid: null,
  };
  writeState(state);
  await waitForReady(state);
  log("publish http://127.0.0.1:" + publish.port + "/");
  log("ui http://127.0.0.1:" + ui.port + "/");
  log("state " + STATE_PATH);
}

async function waitForReady(state) {
  const deadline = Date.now() + 8000;
  let last = "not checked";
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:" + state.publish.port + "/robots.txt");
      if (response.status === 200 && (await response.text()).includes("Disallow")) return;
      last = "robots status " + response.status;
    } catch (err) {
      last = err.message;
    }
    await sleep(150);
  }
  fail("Publish server did not become ready: " + last);
}

export async function doctor() {
  const state = readState();
  if (!state) fail("No verification state at " + STATE_PATH + ". Run launch.mjs first.");
  const lines = [];
  function note(ok, text) {
    const line = (ok ? "ok  " : "FAIL ") + text;
    lines.push(line);
    log(line);
    return ok;
  }
  let good = true;
  good = note(pidAlive(state.publish.pid), "publish pid " + state.publish.pid + " is running") && good;
  good = note(pidAlive(state.ui.pid), "ui pid " + state.ui.pid + " is running") && good;
  const head = await fetch("http://127.0.0.1:" + state.publish.port + "/", { redirect: "manual" });
  good =
    note(
      head.status === 301 && head.headers.get("location") === HUB && head.headers.get("x-mhwater-verify") === state.runId,
      "GET / on publish is 301 to " + HUB + " from run " + state.runId
    ) && good;
  const gas = await fetch("http://127.0.0.1:" + state.publish.port + "/gas.html", { redirect: "manual" });
  good =
    note(
      gas.status === 301 && gas.headers.get("location") === HUB + "gas.html",
      "GET /gas.html on publish is 301 to " + HUB + "gas.html"
    ) && good;
  const calcUrl = "http://127.0.0.1:" + state.publish.port + "/assets/calc.js";
  const calcResponse = await fetch(calcUrl);
  const calcBody = await calcResponse.text();
  const disk = fs.readFileSync(path.join(ROOT, "assets/calc.js"), "utf8");
  good =
    note(
      calcResponse.status === 200 && calcBody === disk,
      "GET /assets/calc.js is 200 and matches this checkout (existing files skip the redirect)"
    ) && good;
  const missingHtml = HTML_PAGES.filter((file) => fs.existsSync(path.join(ROOT, file)));
  good = note(missingHtml.length === 0, "calculator HTML is absent from the publish root") && good;
  const uiPage = await fetch("http://127.0.0.1:" + state.ui.port + "/");
  const uiHtml = await uiPage.text();
  good =
    note(
      uiPage.status === 200 && uiHtml.includes("<h1>Fresh water usage calculator</h1>"),
      "UI server returns the Water page shell with heading Fresh water usage calculator"
    ) && good;
  const uiCalc = await fetch("http://127.0.0.1:" + state.ui.port + "/assets/calc.js");
  good =
    note(
      uiCalc.status === 200 && (await uiCalc.text()) === disk,
      "UI server calc.js matches this checkout, not a different copy"
    ) && good;
  const tests = ["tests/redirects.test.js", "tests/seo.test.js", "tests/calc.test.js"];
  for (const test of tests) {
    const result = spawnSync(process.execPath, [path.join(ROOT, test)], { cwd: ROOT, encoding: "utf8" });
    const passed = result.status === 0;
    good = note(passed, test + " exit " + result.status) && good;
    if (!passed) lines.push(result.stdout + result.stderr);
  }
  const report = {
    runId: state.runId,
    publish: "http://127.0.0.1:" + state.publish.port + "/",
    ui: "http://127.0.0.1:" + state.ui.port + "/",
    worthDriving: good,
    checks: lines,
  };
  fs.writeFileSync(path.join(EVIDENCE, "doctor.json"), JSON.stringify(report, null, 2) + "\n");
  if (!good) fail("Doctor failed. This instance is not worth driving. See evidence/doctor.json");
  log("doctor ok");
}

function waterCase() {
  const input = waterDefaults.PRESETS.weekend.usage;
  const units = waterCalc.peopleUnits(input.adults, input.children);
  const heads = input.adults + input.children;
  const showerDaily = units * input.showersPerPersonPerDay * input.showerLitres;
  const washDaily = input.washUpLitresPerDay;
  const laundryTrip = input.laundryEnabled ? input.laundryLitresPerLoad * input.laundryLoadsPerTrip : 0;
  const laundryDaily = input.tripDays > 0 ? laundryTrip / input.tripDays : 0;
  const drinkDaily = units * input.drinkCookLitresPerPersonPerDay;
  const cassetteDaily = input.cassetteEnabled ? heads * input.cassetteFlushesPerPersonPerDay * input.cassetteLitresPerFlush : 0;
  const freshDaily = showerDaily + washDaily + laundryDaily + drinkDaily + cassetteDaily;
  const freshTrip = freshDaily * input.tripDays;
  const greyDaily = Math.max(0, freshDaily - drinkDaily - cassetteDaily);
  const greyTrip = greyDaily * input.tripDays;
  const daysUntilEmpty = input.freshTankLitres > 0 && freshDaily > 0 ? input.freshTankLitres / freshDaily : 0;
  const result = waterCalc.calcWater(input);
  const display = {
    "#total-trip": formatLitresWater(freshTrip),
    "#total-daily": formatLitresWater(freshDaily),
    "#grey-trip": formatLitresWater(greyTrip),
    "#grey-daily": formatLitresWater(greyDaily),
    "#weight-note":
      "About " + formatLitresWater(freshTrip) + " kg if you carry the whole trip’s fresh water (1 litre = 1 kg).",
    "#tank-note":
      "A full " +
      formatLitresWater(input.freshTankLitres) +
      " L tank is about " +
      formatLitresWater(input.freshTankLitres) +
      " kg. At this rate it lasts about " +
      formatDaysWater(daysUntilEmpty) +
      " days before you need a top-up.",
  };
  return {
    id: "water-weekend",
    feature: "water",
    ariaLabel: presetLabel(waterDefaults.PRESETS.weekend),
    input,
    derivation: {
      peopleUnits: units,
      heads,
      showerDaily,
      washDaily,
      laundryDaily,
      drinkDaily,
      cassetteDaily,
      freshDaily,
      freshTrip,
      greyDaily,
      greyTrip,
      daysUntilEmpty,
      moduleAgrees: result.freshTrip === freshTrip && result.freshDaily === freshDaily && result.greyTrip === greyTrip,
    },
    display,
  };
}

function gasCase() {
  const input = gasDefaults.PRESETS.weekendSummer.usage;
  const units = gasCalc.peopleUnits(input.adults, input.children);
  const cookRate = gasCalc.COOK_STYLES[input.cookingStyle].kgPerPersonPerMeal;
  const cookDaily = units * input.mealsPerDay * cookRate;
  const heatDaily = input.heatingHours * gasCalc.HEATER_KG_PER_HOUR;
  const fridgeDaily = input.fridgeGasEnabled ? input.fridgeHoursPerDay * gasCalc.FRIDGE_KG_PER_HOUR : 0;
  const boilerDaily = input.boilerEnabled ? input.boilerHours * gasCalc.BOILER_KG_PER_HOUR : 0;
  const dailyKg = cookDaily + heatDaily + fridgeDaily + boilerDaily;
  const tripKg = dailyKg * input.tripDays;
  const bottleDays = input.bottleKg > 0 && dailyKg > 0 ? input.bottleKg / dailyKg : 0;
  const bottlesNeeded = input.bottleKg > 0 && tripKg > 0 ? Math.ceil(tripKg / input.bottleKg - 1e-9) : 0;
  const result = gasCalc.calcGas(input);
  const bottleName = gasCalc.BOTTLES[input.bottleId].label + " " + gasCalc.BOTTLES[input.bottleId].sublabel;
  return {
    id: "gas-weekend-summer",
    feature: "gas",
    ariaLabel: presetLabel(gasDefaults.PRESETS.weekendSummer),
    path: "/gas.html",
    input,
    derivation: {
      peopleUnits: units,
      cookRate,
      cookDaily,
      heatDaily,
      fridgeDaily,
      boilerDaily,
      dailyKg,
      tripKg,
      bottleDays,
      bottlesNeeded,
      moduleAgrees: result.tripKg === tripKg && result.dailyKg === dailyKg && result.bottlesNeeded === bottlesNeeded,
    },
    display: {
      "#total-trip": formatKg(tripKg),
      "#total-daily": formatKg(dailyKg),
      "#bottle-days": formatDaysGas(bottleDays),
      "#bottle-hint": "A " + bottleName + " lasts about " + formatDaysGas(bottleDays) + " days at this daily use.",
      "#bottles-needed": String(bottlesNeeded),
      "#bottles-unit": bottlesNeeded === 1 ? "bottle" : "bottles",
      "#bottles-hint": "One " + bottleName + " covers the trip (rounded up).",
    },
  };
}

function tankCase() {
  const water = waterDefaults.createDefaultUsage();
  const plan = tankDefaults.PRESETS.typicalUk.usage;
  const waterResult = waterCalc.calcWater(water);
  const freshDaily = waterResult.freshDaily;
  const greyDaily = waterResult.greyDaily;
  const blackDaily = waterResult.cassetteDaily;
  const daysFresh = plan.freshTankLitres / freshDaily;
  const daysGrey = plan.greyTankLitres / greyDaily;
  const daysBlack = plan.blackTankLitres / blackDaily;
  const result = tankCalc.calcTanks(plan, water);
  return {
    id: "tanks-typical-uk",
    feature: "tanks",
    ariaLabel: presetLabel(tankDefaults.PRESETS.typicalUk),
    path: "/tanks.html",
    precondition: "Fresh browser profile. Water habits are createDefaultUsage(), not the Weekend preset. Cassette flushes are 5, so cassette daily litres are 2.5.",
    input: { water, plan },
    derivation: {
      freshDaily,
      greyDaily,
      blackDaily,
      daysFresh,
      daysGrey,
      daysBlack,
      limiter: result.limiter && result.limiter.id,
      moduleAgrees:
        result.daysFresh === daysFresh && result.daysGrey === daysGrey && result.daysBlack === daysBlack && result.limiter.id === "fresh",
    },
    display: {
      "#stretch-days": formatDaysTank(daysFresh),
      "#fresh-days": formatDaysTank(daysFresh),
      "#grey-days": formatDaysTank(daysGrey),
      "#black-days": formatDaysTank(daysBlack),
      "#stretch-hint":
        "Fresh tank runs dry first, after about " + formatDaysTank(daysFresh) + " days. That is the limit of this stretch.",
      "#water-summary":
        "2 adults · " +
        formatLitresTank(freshDaily) +
        " L fresh a day · " +
        formatLitresTank(greyDaily) +
        " L grey a day · " +
        formatLitresTank(blackDaily) +
        " L into the cassette a day. Change showers and habits on the Water page.",
    },
  };
}

function cassetteCase() {
  const input = cassetteDefaults.PRESETS.weekendCouple.usage;
  const heads = input.adults + input.children;
  const wasteDaily = heads * input.flushesPerPersonPerDay * input.litresPerFlush;
  const wasteTrip = wasteDaily * input.tripDays;
  const usable = input.blackTankLitres * (1 - input.startPercent / 100);
  const daysUntilEmpty = usable / wasteDaily;
  const emptiesNeeded = Math.ceil((0 + wasteTrip) / input.blackTankLitres - 1e-9);
  const result = cassetteCalc.calcCassette(input, waterDefaults.createDefaultUsage(), tankDefaults.createDefaultPlan());
  return {
    id: "cassette-weekend-couple",
    feature: "cassette",
    ariaLabel: presetLabel(cassetteDefaults.PRESETS.weekendCouple),
    path: "/cassette.html",
    input,
    derivation: {
      heads,
      wasteDaily,
      wasteTrip,
      usable,
      daysUntilEmpty,
      emptiesNeeded,
      moduleAgrees: result.wasteDaily === wasteDaily && result.daysUntilEmpty === daysUntilEmpty && result.emptiesNeeded === emptiesNeeded,
    },
    display: {
      "#empty-days": formatDaysCassette(daysUntilEmpty),
      "#empty-hint": formatLitresCassette(usable) + " L of room · " + formatLitresCassette(wasteDaily) + " L / day.",
      "#waste-daily": formatLitresCassette(wasteDaily),
      "#waste-daily-hint":
        formatNumber(heads * input.flushesPerPersonPerDay, 0) +
        " flushes a day · " +
        formatLitresCassette(input.litresPerFlush) +
        " L each.",
      "#waste-trip": formatLitresCassette(wasteTrip),
      "#empties-needed": String(emptiesNeeded),
      "#empties-unit": "empty",
      "#empties-hint": "One empty covers the trip — usually at the end, or when you pass a service point.",
    },
  };
}

const CASES = {
  water: waterCase,
  gas: gasCase,
  tanks: tankCase,
  cassette: cassetteCase,
};

export function expectCase(name) {
  if (!CASES[name]) fail("Unknown calculator '" + name + "'. Use water, gas, tanks, or cassette.");
  const spec = CASES[name]();
  if (!spec.derivation.moduleAgrees) fail(name + " hand derivation does not match the module result");
  return spec;
}

export async function expect(name) {
  if (!name || name === "all") {
    const all = {};
    for (const key of Object.keys(CASES)) all[key] = expectCase(key);
    console.log(JSON.stringify(all, null, 2));
    return all;
  }
  const spec = expectCase(name);
  console.log(JSON.stringify(spec, null, 2));
  return spec;
}

async function headerCheck(url) {
  const response = await fetch(url, { redirect: "manual" });
  return {
    url,
    status: response.status,
    location: response.headers.get("location"),
  };
}

export async function drive(feature) {
  const state = readState();
  if (!state || !pidAlive(state.publish.pid) || !pidAlive(state.ui.pid)) {
    fail("Launch is not running. Run launch.mjs, then doctor.mjs, before drive.");
  }
  if (feature === "redirects") return driveRedirects(state);
  if (feature === "coming-soon") return driveComingSoon(state);
  if (!CASES[feature]) {
    fail("Unknown feature '" + feature + "'. Use redirects, water, gas, tanks, cassette, or coming-soon.");
  }
  return driveCalculator(state, feature);
}

async function driveRedirects(state) {
  const origin = "http://127.0.0.1:" + state.publish.port;
  const localPaths = ["/", "/index.html", "/gas.html", "/tanks.html", "/cassette.html", "/bottles.html", "/hotwater.html", "/winterising.html", "/topup.html", "/not-a-real-page-7fef"];
  const rules = loadRedirectRules();
  const local = [];
  for (const pathname of localPaths) {
    const hit = await headerCheck(origin + pathname);
    const rule = matchRedirect(pathname, rules);
    const expected = rule.destination;
    hit.expectedLocation = expected;
    hit.pass = hit.status === 301 && hit.location === expected;
    local.push(hit);
  }
  const asset = await headerCheck(origin + "/assets/calc.js");
  asset.pass = asset.status === 200 && !asset.location;
  const live = [];
  for (const base of [LIVE_ORIGIN, ONRENDER_ORIGIN]) {
    try {
      const hit = await headerCheck(base + "/");
      hit.expectedLocation = HUB;
      hit.pass = hit.status === 301 && hit.location === HUB;
      live.push(hit);
    } catch (err) {
      live.push({ url: base + "/", pass: false, error: err.message });
    }
  }
  try {
    const gas = await headerCheck(LIVE_ORIGIN + "/gas.html");
    gas.expectedLocation = HUB + "gas.html";
    gas.pass = gas.status === 301 && gas.location === HUB + "gas.html";
    live.push(gas);
    const query = await headerCheck(LIVE_ORIGIN + "/gas.html?adults=2");
    query.expectedLocation = HUB + "gas.html?adults=2";
    query.pass = query.status === 301 && query.location === HUB + "gas.html?adults=2";
    live.push(query);
    const unknown = await headerCheck(LIVE_ORIGIN + "/not-a-real-page-7fef?x=1");
    unknown.expectedLocation = HUB + "?x=1";
    unknown.pass = unknown.status === 301 && unknown.location === HUB + "?x=1";
    live.push(unknown);
    const file = await headerCheck(LIVE_ORIGIN + "/assets/calc.js");
    const liveBody = await (await fetch(LIVE_ORIGIN + "/assets/calc.js")).text();
    const disk = fs.readFileSync(path.join(ROOT, "assets/calc.js"), "utf8");
    file.pass = file.status === 200;
    file.matchesCheckout = liveBody === disk;
    live.push(file);
  } catch (err) {
    live.push({ url: LIVE_ORIGIN, pass: false, error: err.message });
  }
  const report = { feature: "redirects", local, asset, live };
  fs.writeFileSync(path.join(EVIDENCE, "redirects.json"), JSON.stringify(report, null, 2) + "\n");
  const failed = local.filter((hit) => !hit.pass).concat(live.filter((hit) => !hit.pass));
  if (!asset.pass || failed.length) {
    fail("Redirect drive failed. See evidence/redirects.json");
  }
  log("drive redirects ok");
}

const COMING_SOON = [
  {
    file: "bottles.html",
    h1: "Gas bottle / cylinder picker",
    paragraph: "This page will help you pick a cylinder size from the gas usage estimate. It is not built yet.",
  },
  {
    file: "hotwater.html",
    h1: "Hot water (gas vs electric)",
    paragraph: "This page will show a simple gas-versus-electric choice for showers and washing up. It is not built yet.",
  },
  {
    file: "winterising.html",
    h1: "Winterising volume",
    paragraph: "This page will help with a winter lay-up volume check. It is not built yet.",
  },
  {
    file: "topup.html",
    h1: "Top-up / Aquaroll planner",
    paragraph: "This page will turn daily fresh use into fill-ups of 40 L Aquarolls or other containers. It is not built yet.",
  },
];

async function driveComingSoon(state) {
  const pages = [];
  for (const page of COMING_SOON) {
    const response = await fetch("http://127.0.0.1:" + state.ui.port + "/" + page.file);
    const html = await response.text();
    const actual = {
      status: response.status,
      h1: (html.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "",
      comingSoon: html.includes("<h2>Coming soon</h2>"),
      paragraph: html.includes(page.paragraph),
    };
    pages.push({
      file: page.file,
      input: "Open /" + page.file + " on the UI server (hub shell copied at launch).",
      expected: { h1: page.h1, h2: "Coming soon", paragraph: page.paragraph },
      actual,
      pass: actual.status === 200 && actual.h1 === page.h1 && actual.comingSoon && actual.paragraph,
      whyNoFormula: "These pages have no calculator module in assets/. The visible copy is the hub HTML, not a number from a formula.",
    });
  }
  fs.writeFileSync(path.join(EVIDENCE, "coming-soon.json"), JSON.stringify({ feature: "coming-soon", pages }, null, 2) + "\n");
  if (pages.some((page) => !page.pass)) fail("Coming-soon drive failed. See evidence/coming-soon.json");
  log("drive coming-soon ok");
}

async function driveCalculator(state, feature) {
  const spec = expectCase(feature);
  const pagePath = spec.path || "/";
  const url = "http://127.0.0.1:" + state.ui.port + pagePath;
  const chrome = await launchChrome();
  state.chromePid = chrome.pid;
  writeState(state);
  try {
    const cdp = await connectPage(chrome.port);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url });
    await Promise.race([loaded, sleep(15000).then(() => Promise.reject(new Error("page load timeout " + url)))]);
    await waitUntil(cdp, "!!document.querySelector(" + JSON.stringify("[aria-label=\"" + spec.ariaLabel + "\"]") + ")");
    const gate = await evalValue(cdp, "document.querySelector('#rotate-gate')?.getAttribute('aria-hidden')");
    if (gate === "false") fail("Rotate gate is showing, so the calculator is inert. Use a 1280×900 viewport.");
    const beforeShot = await cdp.send("Page.captureScreenshot", { format: "png" });
    const beforeText = await evalValue(cdp, "document.querySelector('#calculator')?.innerText || ''");
    const clicked = await evalValue(
      cdp,
      "(() => { const el = document.querySelector(" +
        JSON.stringify("[aria-label=\"" + spec.ariaLabel + "\"]") +
        "); if (!el) return false; el.click(); return el.getAttribute('aria-pressed'); })()"
    );
    if (clicked !== "true") fail("Click on " + spec.ariaLabel + " did not leave aria-pressed=true (got " + clicked + ")");
    await sleep(100);
    const actual = {};
    for (const selector of Object.keys(spec.display)) {
      actual[selector] = await evalValue(cdp, "document.querySelector(" + JSON.stringify(selector) + ")?.textContent ?? null");
    }
    const afterShot = await cdp.send("Page.captureScreenshot", { format: "png" });
    const afterText = await evalValue(cdp, "document.querySelector('#calculator')?.innerText || ''");
    const title = await evalValue(cdp, "document.title");
    const mismatches = Object.keys(spec.display).filter((selector) => actual[selector] !== spec.display[selector]);
    const report = {
      feature,
      caseId: spec.id,
      url,
      title,
      action: "click button[aria-label=\"" + spec.ariaLabel + "\"]",
      input: spec.input,
      derivation: spec.derivation,
      expected: spec.display,
      actual,
      mismatches,
      pass: mismatches.length === 0,
    };
    fs.writeFileSync(path.join(EVIDENCE, feature + ".json"), JSON.stringify(report, null, 2) + "\n");
    fs.writeFileSync(path.join(EVIDENCE, feature + ".aria.txt"), "BEFORE CLICK\n" + beforeText + "\n\nAFTER CLICK\n" + afterText + "\n");
    fs.writeFileSync(path.join(EVIDENCE, feature + "-before.png"), Buffer.from(beforeShot.data, "base64"));
    fs.writeFileSync(path.join(EVIDENCE, feature + "-after.png"), Buffer.from(afterShot.data, "base64"));
    if (mismatches.length) {
      fail(feature + " display mismatch on " + mismatches.join(", ") + ". See evidence/" + feature + ".json");
    }
    log("drive " + feature + " ok title=" + title);
  } finally {
    chrome.kill("SIGTERM");
    state.chromePid = null;
    writeState(state);
  }
}

function launchChrome() {
  const userDataDir = path.join(STATE_DIR, "chrome-" + Date.now());
  fs.mkdirSync(userDataDir, { recursive: true });
  const child = spawn(
    CHROME,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--remote-debugging-port=0",
      "--user-data-dir=" + userDataDir,
      "--window-size=1280,900",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  return new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Chrome did not open a DevTools port"));
    }, 15000);
    child.stderr.on("data", (chunk) => {
      buf += chunk.toString();
      const match = buf.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve({ pid: child.pid, port: Number(match[1]), kill: (signal) => child.kill(signal) });
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("Chrome exited " + code + " before DevTools was ready"));
    });
  });
}

async function connectPage(port) {
  const deadline = Date.now() + 8000;
  let list = [];
  while (Date.now() < deadline) {
    list = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
    const page = list.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
    if (page) return connectCdp(page.webSocketDebuggerUrl);
    await sleep(100);
  }
  throw new Error("Chrome listed no page target");
}

function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 0;
  const pending = new Map();
  const events = [];
  const api = {
    send(method, params) {
      const id = ++nextId;
      return new Promise((resolveSend, rejectSend) => {
        pending.set(id, { resolve: resolveSend, reject: rejectSend });
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });
    },
    once(method) {
      return new Promise((resolveEvent) => {
        events.push({ method, resolve: resolveEvent });
      });
    },
  };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("CDP socket timeout")), 8000);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve(api);
    });
    ws.addEventListener("error", (err) => {
      clearTimeout(timer);
      reject(err.error || err);
    });
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const waiter = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) waiter.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else waiter.resolve(msg.result || {});
      } else if (msg.method) {
        const index = events.findIndex((waiter) => waiter.method === msg.method);
        if (index >= 0) {
          const waiter = events.splice(index, 1)[0];
          waiter.resolve(msg.params || {});
        }
      }
    });
  });
}

async function evalValue(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error("Runtime.evaluate failed: " + JSON.stringify(result.exceptionDetails));
  }
  return result.result ? result.result.value : undefined;
}

async function waitUntil(cdp, expression) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (await evalValue(cdp, expression)) return;
    await sleep(100);
  }
  throw new Error("Timed out waiting for " + expression);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function cleanup() {
  const state = readState();
  if (!state) {
    log("cleanup: no state file, nothing to stop");
    return;
  }
  for (const pid of [state.chromePid, state.ui && state.ui.pid, state.publish && state.publish.pid]) {
    if (!pidAlive(pid)) continue;
    try {
      process.kill(pid, "SIGTERM");
    } catch (err) {
      log("cleanup could not signal " + pid + ": " + err.message);
    }
  }
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    const alive = [state.chromePid, state.ui && state.ui.pid, state.publish && state.publish.pid].some(pidAlive);
    if (!alive) break;
    await sleep(100);
  }
  for (const pid of [state.chromePid, state.ui && state.ui.pid, state.publish && state.publish.pid]) {
    if (!pidAlive(pid)) continue;
    try {
      process.kill(pid, "SIGKILL");
    } catch (err) {
      log("cleanup could not kill " + pid);
    }
  }
  if (state.uiRoot && state.uiRoot.startsWith(STATE_DIR) && fs.existsSync(state.uiRoot)) {
    fs.rmSync(path.dirname(state.uiRoot), { recursive: true, force: true });
  }
  fs.rmSync(STATE_PATH, { force: true });
  const chromeDirs = fs.existsSync(STATE_DIR) ? fs.readdirSync(STATE_DIR).filter((name) => name.startsWith("chrome-")) : [];
  for (const name of chromeDirs) {
    fs.rmSync(path.join(STATE_DIR, name), { recursive: true, force: true });
  }
  log("cleanup stopped run " + state.runId + ". Evidence left in " + EVIDENCE);
}

async function main() {
  const command = process.argv[2];
  try {
    if (command === "serve") {
      await serve(process.argv.slice(3));
      return;
    }
    if (command === "launch") {
      await launch();
      return;
    }
    if (command === "doctor") {
      await doctor();
      return;
    }
    if (command === "drive") {
      await drive(process.argv[3]);
      return;
    }
    if (command === "cleanup") {
      await cleanup();
      return;
    }
    if (command === "expect") {
      await expect(process.argv[3]);
      return;
    }
    console.error("Usage: verify.mjs <launch|doctor|drive|cleanup|expect|serve>");
    process.exit(2);
  } catch (err) {
    if (!err.alreadyReported) console.error(err.stack || err.message);
    process.exit(1);
  }
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entry === fileURLToPath(import.meta.url)) {
  main();
}
