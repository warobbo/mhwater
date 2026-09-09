#!/usr/bin/env node
"use strict";

var assert = require("assert");
var path = require("path");
var calc = require(path.join(__dirname, "..", "assets", "gas-calc.js"));
var defaults = require(path.join(__dirname, "..", "assets", "gas-defaults.js"));
var storage = require(path.join(__dirname, "..", "assets", "storage.js"));
var waterDefaults = require(path.join(__dirname, "..", "assets", "defaults.js"));

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

test("UK rates are the documented planning figures", function () {
  almostEqual(calc.HEATER_KG_PER_HOUR, 0.18);
  almostEqual(calc.FRIDGE_KG_PER_HOUR, 0.016);
  almostEqual(calc.BOILER_KG_PER_HOUR, 0.12);
  almostEqual(calc.COOK_STYLES.light.kgPerPersonPerMeal, 0.025);
  almostEqual(calc.COOK_STYLES.normal.kgPerPersonPerMeal, 0.04);
  almostEqual(calc.COOK_STYLES.heavy.kgPerPersonPerMeal, 0.07);
  assert.strictEqual(calc.BOTTLES.butane45.kg, 4.5);
  assert.strictEqual(calc.BOTTLES.butane7.kg, 7);
  assert.strictEqual(calc.BOTTLES.butane15.kg, 15);
  assert.strictEqual(calc.BOTTLES.propane39.kg, 3.9);
  assert.strictEqual(calc.BOTTLES.propane6.kg, 6);
  assert.strictEqual(calc.BOTTLES.propane13.kg, 13);
});

test("weekend summer is cooking only for two people", function () {
  var result = calc.calcGas(defaults.PRESETS.weekendSummer.usage);
  var cookDaily = 2 * 2 * 0.04;
  almostEqual(result.cookDaily, cookDaily);
  almostEqual(result.heatDaily, 0);
  almostEqual(result.fridgeDaily, 0);
  almostEqual(result.boilerDaily, 0);
  almostEqual(result.dailyKg, cookDaily);
  almostEqual(result.tripKg, cookDaily * 2);
  assert.strictEqual(result.usage.gasType, "butane");
  assert.strictEqual(result.usage.bottleKg, 4.5);
  almostEqual(result.bottleDays, 4.5 / cookDaily);
  assert.strictEqual(result.bottlesNeeded, 1);
});

test("winter week uses far more gas than weekend summer", function () {
  var winter = calc.calcGas(defaults.PRESETS.winterWeek.usage);
  var summer = calc.calcGas(defaults.PRESETS.weekendSummer.usage);
  var cookDaily = 2 * 2 * 0.04;
  var heatDaily = 12 * 0.18;
  var fridgeDaily = 24 * 0.016;
  var boilerDaily = 1.5 * 0.12;
  almostEqual(winter.cookDaily, cookDaily);
  almostEqual(winter.heatDaily, heatDaily);
  almostEqual(winter.fridgeDaily, fridgeDaily);
  almostEqual(winter.boilerDaily, boilerDaily);
  almostEqual(winter.dailyKg, cookDaily + heatDaily + fridgeDaily + boilerDaily);
  almostEqual(winter.tripKg, winter.dailyKg * 7);
  assert.ok(winter.dailyKg > 2);
  assert.ok(winter.dailyKg > summer.dailyKg * 10);
  assert.strictEqual(winter.usage.gasType, "propane");
  assert.strictEqual(winter.usage.bottleKg, 13);
  almostEqual(winter.bottleDays, 13 / winter.dailyKg);
  assert.strictEqual(winter.bottlesNeeded, Math.ceil(winter.tripKg / 13 - 1e-9));
  assert.ok(winter.bottlesNeeded >= 2);
});

test("full-time light is a careful week", function () {
  var result = calc.calcGas(defaults.PRESETS.fulltimeLight.usage);
  var cookDaily = 2 * 2 * 0.025;
  var heatDaily = 2 * 0.18;
  var boilerDaily = 0.5 * 0.12;
  almostEqual(result.cookDaily, cookDaily);
  almostEqual(result.heatDaily, heatDaily);
  almostEqual(result.fridgeDaily, 0);
  almostEqual(result.boilerDaily, boilerDaily);
  almostEqual(result.dailyKg, cookDaily + heatDaily + boilerDaily);
  assert.ok(result.dailyKg < 1);
  assert.strictEqual(result.bottlesNeeded, 1);
});

test("fridge off uses no fridge gas even if hours are set", function () {
  var result = calc.calcGas({
    adults: 2,
    tripDays: 1,
    mealsPerDay: 0,
    heatingHours: 0,
    heatingLevel: "off",
    fridgeGasEnabled: false,
    fridgeHoursPerDay: 24,
    boilerEnabled: false,
  });
  almostEqual(result.fridgeDaily, 0);
  almostEqual(result.dailyKg, 0);
  assert.strictEqual(result.bottlesNeeded, 0);
  almostEqual(result.bottleDays, 0);
});

test("bottles needed rounds up", function () {
  var result = calc.calcGas({
    adults: 2,
    tripDays: 10,
    mealsPerDay: 0,
    heatingLevel: "custom",
    heatingHours: 8,
    fridgeGasEnabled: false,
    boilerEnabled: false,
    gasType: "propane",
    bottleId: "propane13",
    bottleKg: 13,
  });
  almostEqual(result.dailyKg, 8 * 0.18);
  almostEqual(result.tripKg, 14.4);
  assert.strictEqual(result.bottlesNeeded, 2);
});

test("missing gas usage inherits trip days and people from water", function () {
  var usage = calc.normaliseUsage(null, {
    adults: 3,
    children: 1,
    tripDays: 9,
  });
  assert.strictEqual(usage.adults, 3);
  assert.strictEqual(usage.children, 1);
  assert.strictEqual(usage.tripDays, 9);
  assert.strictEqual(usage.gasType, "butane");
  assert.strictEqual(usage.bottleKg, 7);
});

test("own gas trip days are not overwritten by water", function () {
  var usage = calc.normaliseUsage({ tripDays: 4, adults: 1 }, { tripDays: 9, adults: 3 });
  assert.strictEqual(usage.tripDays, 4);
  assert.strictEqual(usage.adults, 1);
});

test("clamps people, days, hours, and bottle size", function () {
  var usage = calc.normaliseUsage({
    adults: 99,
    children: -2,
    tripDays: 0,
    mealsPerDay: 20,
    heatingLevel: "custom",
    heatingHours: 40,
    fridgeHoursPerDay: 40,
    boilerLevel: "custom",
    boilerHours: 20,
    bottleId: "custom",
    bottleKg: 80,
  });
  assert.strictEqual(usage.adults, 20);
  assert.strictEqual(usage.children, 0);
  assert.strictEqual(usage.tripDays, 0.5);
  assert.strictEqual(usage.mealsPerDay, 6);
  assert.strictEqual(usage.heatingHours, 24);
  assert.strictEqual(usage.fridgeHoursPerDay, 24);
  assert.strictEqual(usage.boilerHours, 12);
  assert.strictEqual(usage.bottleKg, 47);
});

test("season maps to typical heating hours", function () {
  assert.strictEqual(calc.heatingHoursForSeason("summer"), 0);
  assert.strictEqual(calc.heatingHoursForSeason("mild"), 2);
  assert.strictEqual(calc.heatingHoursForSeason("winter"), 12);
});

test("storage writes gasUsage beside waterUsage", function () {
  var clean = storage.sanitiseProfile({
    version: 1,
    waterUsage: waterDefaults.createDefaultUsage(),
    gasUsage: defaults.PRESETS.winterWeek.usage,
  });
  assert.strictEqual(clean.version, 1);
  assert.ok(clean.waterUsage);
  assert.ok(clean.gasUsage);
  assert.strictEqual(clean.gasUsage.activePreset, "winterWeek");
  assert.strictEqual(clean.gasUsage.heatingLevel, "high");
  assert.strictEqual(clean.waterUsage.tripDays, 2);
});

test("applyGasPreset leaves water usage alone", function () {
  var profile = storage.applyPreset(waterDefaults.createDefaultProfile(), "family");
  profile = storage.applyGasPreset(profile, "winterWeek");
  assert.strictEqual(profile.waterUsage.activePreset, "family");
  assert.strictEqual(profile.waterUsage.children, 2);
  assert.strictEqual(profile.gasUsage.activePreset, "winterWeek");
  assert.strictEqual(profile.gasUsage.tripDays, 7);
});

test("defaults gas preset inherits water trip days", function () {
  var profile = storage.applyPreset(waterDefaults.createDefaultProfile(), "family");
  profile = storage.applyGasPreset(profile, "defaults");
  assert.strictEqual(profile.gasUsage.tripDays, 7);
  assert.strictEqual(profile.gasUsage.adults, 2);
  assert.strictEqual(profile.gasUsage.children, 2);
  assert.strictEqual(profile.gasUsage.activePreset, "defaults");
});

test("defaults to butane and Calor butane sizes", function () {
  var usage = calc.normaliseUsage({});
  assert.strictEqual(usage.gasType, "butane");
  assert.strictEqual(usage.bottleId, "butane7");
  assert.deepStrictEqual(
    calc.bottlesForGas("butane").map(function (b) {
      return b.kg;
    }),
    [4.5, 7, 15]
  );
  assert.deepStrictEqual(
    calc.bottlesForGas("propane").map(function (b) {
      return b.kg;
    }),
    [3.9, 6, 13]
  );
});

test("switching gas type picks the closest Calor size", function () {
  assert.strictEqual(calc.closestBottleId(7, "propane"), "propane6");
  assert.strictEqual(calc.closestBottleId(4.5, "propane"), "propane39");
  assert.strictEqual(calc.closestBottleId(15, "propane"), "propane13");
  assert.strictEqual(calc.closestBottleId(13, "butane"), "butane15");
  assert.strictEqual(calc.closestBottleId(6, "butane"), "butane7");
});

test("legacy propane bottle ids still load", function () {
  var usage = calc.normaliseUsage({ bottleId: "calor13" });
  assert.strictEqual(usage.gasType, "propane");
  assert.strictEqual(usage.bottleId, "propane13");
  assert.strictEqual(usage.bottleKg, 13);
});

test("storage key stays watertools.systemProfile", function () {
  assert.strictEqual(storage.STORAGE_KEY, "watertools.systemProfile");
});

if (failed) {
  console.error("\n" + failed + " failed");
  process.exit(1);
}

console.log("\nall tests passed");
