#!/usr/bin/env node
"use strict";

var assert = require("assert");
var path = require("path");
var waterDefaults = require(path.join(__dirname, "..", "assets", "defaults.js"));
var tankDefaults = require(path.join(__dirname, "..", "assets", "tank-defaults.js"));
var calc = require(path.join(__dirname, "..", "assets", "cassette-calc.js"));
var defaults = require(path.join(__dirname, "..", "assets", "cassette-defaults.js"));
var storage = require(path.join(__dirname, "..", "assets", "storage.js"));
var gasDefaults = require(path.join(__dirname, "..", "assets", "gas-defaults.js"));

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

function almostEqual(actual, expected, message) {
  var delta = Math.abs(actual - expected);
  assert.ok(delta < 0.001, message || actual + " should be close to " + expected);
}

test("defaults match a typical Thetford-style cassette", function () {
  assert.strictEqual(calc.DEFAULT_CASSETTE_LITRES, 18);
  assert.strictEqual(calc.DEFAULT_FIXED_BLACK_LITRES, 80);
  assert.strictEqual(calc.DEFAULT_FLUSHES, 5);
  assert.strictEqual(calc.DEFAULT_LITRES_PER_FLUSH, 0.25);
  assert.strictEqual(calc.blackLabel("cassette"), "Cassette");
  assert.strictEqual(calc.blackLabel("fixed"), "Fixed black tank");
});

test("missing plan inherits people, trip and flushes from water", function () {
  var plan = calc.normalisePlan(null, {
    adults: 3,
    children: 1,
    tripDays: 9,
    cassetteFlushesPerPersonPerDay: 6,
    cassetteLitresPerFlush: 0.3,
  });
  assert.strictEqual(plan.adults, 3);
  assert.strictEqual(plan.children, 1);
  assert.strictEqual(plan.tripDays, 9);
  assert.strictEqual(plan.flushesPerPersonPerDay, 6);
  assert.strictEqual(plan.litresPerFlush, 0.3);
  assert.strictEqual(plan.blackKind, "cassette");
  assert.strictEqual(plan.blackTankLitres, 18);
  assert.strictEqual(plan.startPercent, 0);
});

test("missing plan inherits cassette size and start fill from tanks", function () {
  var plan = calc.normalisePlan(
    null,
    { adults: 2, tripDays: 2 },
    { blackKind: "fixed", blackTankLitres: 60, blackStartPercent: 25 }
  );
  assert.strictEqual(plan.blackKind, "fixed");
  assert.strictEqual(plan.blackTankLitres, 60);
  assert.strictEqual(plan.startPercent, 25);
});

test("own cassette figures are not overwritten by water or tanks", function () {
  var plan = calc.normalisePlan(
    {
      adults: 1,
      tripDays: 4,
      flushesPerPersonPerDay: 3,
      litresPerFlush: 0.2,
      blackTankLitres: 20,
      startPercent: 10,
    },
    {
      adults: 4,
      tripDays: 9,
      cassetteFlushesPerPersonPerDay: 8,
      cassetteLitresPerFlush: 0.4,
    },
    { blackTankLitres: 80, blackStartPercent: 50 }
  );
  assert.strictEqual(plan.adults, 1);
  assert.strictEqual(plan.tripDays, 4);
  assert.strictEqual(plan.flushesPerPersonPerDay, 3);
  assert.strictEqual(plan.litresPerFlush, 0.2);
  assert.strictEqual(plan.blackTankLitres, 20);
  assert.strictEqual(plan.startPercent, 10);
});

test("weekend couple: days until empty and one empty at the end", function () {
  var result = calc.calcCassette(defaults.PRESETS.weekendCouple.usage);
  almostEqual(result.wasteDaily, 2 * 4 * 0.25);
  almostEqual(result.wasteTrip, 2 * 2);
  almostEqual(result.usable, 18);
  almostEqual(result.daysUntilEmpty, 18 / 2);
  assert.strictEqual(result.emptiesNeeded, 1);
  assert.strictEqual(result.extraEmpties, 0);
  assert.strictEqual(result.blackLabel, "Cassette");
});

test("family week needs more than one empty", function () {
  var result = calc.calcCassette(defaults.PRESETS.familyWeek.usage);
  almostEqual(result.heads, 4);
  almostEqual(result.wasteDaily, 4 * 5 * 0.25);
  almostEqual(result.wasteTrip, 5 * 7);
  almostEqual(result.daysUntilEmpty, 19 / 5);
  assert.strictEqual(result.emptiesNeeded, 2);
  assert.strictEqual(result.extraEmpties, 1);
});

test("solo wild camp covers a short stretch", function () {
  var result = calc.calcCassette(defaults.PRESETS.soloWild.usage);
  almostEqual(result.wasteDaily, 1);
  almostEqual(result.wasteTrip, 3);
  almostEqual(result.daysUntilEmpty, 17);
  assert.strictEqual(result.emptiesNeeded, 1);
  assert.strictEqual(result.extraEmpties, 0);
});

test("zero people means no waste and no invented days", function () {
  var result = calc.calcCassette({
    adults: 0,
    children: 0,
    tripDays: 4,
    blackTankLitres: 18,
    flushesPerPersonPerDay: 5,
    litresPerFlush: 0.25,
    startPercent: 0,
  });
  almostEqual(result.heads, 0);
  almostEqual(result.wasteDaily, 0);
  almostEqual(result.wasteTrip, 0);
  almostEqual(result.daysUntilEmpty, 0);
  assert.strictEqual(result.emptiesNeeded, 0);
  assert.strictEqual(result.extraEmpties, 0);
});

test("zero flushes means no waste and no invented days", function () {
  var result = calc.calcCassette({
    adults: 2,
    children: 0,
    tripDays: 4,
    blackTankLitres: 18,
    flushesPerPersonPerDay: 0,
    litresPerFlush: 0.25,
    startPercent: 0,
  });
  almostEqual(result.wasteDaily, 0);
  almostEqual(result.daysUntilEmpty, 0);
  assert.strictEqual(result.emptiesNeeded, 0);
});

test("full start percent needs emptying now", function () {
  var result = calc.calcCassette({
    adults: 2,
    tripDays: 2,
    blackTankLitres: 18,
    flushesPerPersonPerDay: 4,
    litresPerFlush: 0.25,
    startPercent: 100,
  });
  almostEqual(result.usable, 0);
  almostEqual(result.startLitres, 18);
  almostEqual(result.daysUntilEmpty, 0);
  almostEqual(result.wasteTrip, 4);
  assert.strictEqual(result.emptiesNeeded, 2);
  assert.strictEqual(result.extraEmpties, 1);
});

test("tiny cassette needs many empties", function () {
  var result = calc.calcCassette({
    adults: 2,
    children: 0,
    tripDays: 4,
    blackTankLitres: 2,
    flushesPerPersonPerDay: 5,
    litresPerFlush: 0.25,
    startPercent: 0,
  });
  almostEqual(result.wasteDaily, 2.5);
  almostEqual(result.wasteTrip, 10);
  almostEqual(result.daysUntilEmpty, 2 / 2.5);
  assert.strictEqual(result.emptiesNeeded, 5);
  assert.strictEqual(result.extraEmpties, 4);
});

test("part-full start reduces days until empty", function () {
  var result = calc.calcCassette({
    adults: 2,
    tripDays: 3,
    blackTankLitres: 20,
    flushesPerPersonPerDay: 4,
    litresPerFlush: 0.5,
    startPercent: 25,
  });
  almostEqual(result.wasteDaily, 4);
  almostEqual(result.startLitres, 5);
  almostEqual(result.usable, 15);
  almostEqual(result.daysUntilEmpty, 15 / 4);
  almostEqual(result.wasteTrip, 12);
  assert.strictEqual(result.emptiesNeeded, 1);
  assert.strictEqual(result.extraEmpties, 0);
});

test("switching to a fixed black tank lifts a cassette-sized value", function () {
  assert.strictEqual(calc.blackLitresForKind("fixed", 18), 80);
  assert.strictEqual(calc.blackLitresForKind("cassette", 80), 18);
  assert.strictEqual(calc.blackLitresForKind("fixed", 60), 60);
});

test("clamps people, days, flushes, size and percent", function () {
  var plan = calc.normalisePlan({
    adults: -2,
    children: 40,
    tripDays: 0,
    blackTankLitres: 900,
    flushesPerPersonPerDay: 80,
    litresPerFlush: 12,
    startPercent: 140,
    blackKind: "mystery",
  });
  assert.strictEqual(plan.adults, 0);
  assert.strictEqual(plan.children, 20);
  assert.strictEqual(plan.tripDays, 0.5);
  assert.strictEqual(plan.blackTankLitres, 500);
  assert.strictEqual(plan.flushesPerPersonPerDay, 20);
  assert.strictEqual(plan.litresPerFlush, 5);
  assert.strictEqual(plan.startPercent, 100);
  assert.strictEqual(plan.blackKind, "cassette");
});

test("storage writes cassettePlan beside water, gas and tanks", function () {
  var clean = storage.sanitiseProfile({
    version: 1,
    waterUsage: waterDefaults.createDefaultUsage(),
    gasUsage: gasDefaults.PRESETS.weekendSummer.usage,
    tankPlan: tankDefaults.PRESETS.weekendWild.usage,
    cassettePlan: defaults.PRESETS.weekendCouple.usage,
  });
  assert.strictEqual(clean.version, 1);
  assert.ok(clean.waterUsage);
  assert.ok(clean.gasUsage);
  assert.ok(clean.tankPlan);
  assert.ok(clean.cassettePlan);
  assert.strictEqual(clean.cassettePlan.activePreset, "weekendCouple");
  assert.strictEqual(clean.cassettePlan.blackTankLitres, 18);
  assert.strictEqual(clean.cassettePlan.flushesPerPersonPerDay, 4);
});

test("applyCassettePreset leaves water, gas and tanks alone", function () {
  var profile = storage.applyPreset(waterDefaults.createDefaultProfile(), "family");
  profile = storage.applyGasPreset(profile, "winterWeek");
  profile = storage.applyTankPreset(profile, "weekendWild");
  profile = storage.applyCassettePreset(profile, "soloWild");
  assert.strictEqual(profile.waterUsage.activePreset, "family");
  assert.strictEqual(profile.waterUsage.children, 2);
  assert.strictEqual(profile.gasUsage.activePreset, "winterWeek");
  assert.strictEqual(profile.tankPlan.activePreset, "weekendWild");
  assert.strictEqual(profile.tankPlan.freshTankLitres, 80);
  assert.strictEqual(profile.cassettePlan.activePreset, "soloWild");
  assert.strictEqual(profile.cassettePlan.adults, 1);
  assert.strictEqual(profile.cassettePlan.blackTankLitres, 17);
});

test("defaults cassette preset inherits water people and tank size", function () {
  var profile = storage.applyPreset(waterDefaults.createDefaultProfile(), "family");
  profile = storage.applyTankPreset(profile, "typicalUk");
  profile = storage.applyCassettePreset(profile, "defaults");
  assert.strictEqual(profile.cassettePlan.adults, 2);
  assert.strictEqual(profile.cassettePlan.children, 2);
  assert.strictEqual(profile.cassettePlan.tripDays, 7);
  assert.strictEqual(profile.cassettePlan.blackTankLitres, 19);
  assert.strictEqual(profile.cassettePlan.flushesPerPersonPerDay, 5);
  assert.strictEqual(profile.cassettePlan.activePreset, "defaults");
});

test("storage key stays watertools.systemProfile", function () {
  assert.strictEqual(storage.STORAGE_KEY, "watertools.systemProfile");
});

if (failed) {
  console.error("\n" + failed + " failed");
  process.exit(1);
}

console.log("\nall tests passed");
