/**
 * Shared Water Tools system profile in localStorage.
 * Later slices should reuse STORAGE_KEY and add sibling keys beside
 * `waterUsage` rather than creating new keys.
 * Gas usage lives on `gasUsage` (same object, same key).
 * Holding-tank plan lives on `tankPlan` (same object, same key).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    var gasCalc;
    var gasDefaults;
    var tankCalc;
    var tankDefaults;
    try {
      gasCalc = require("./gas-calc.js");
      gasDefaults = require("./gas-defaults.js");
    } catch (err) {
      gasCalc = null;
      gasDefaults = null;
    }
    try {
      tankCalc = require("./tank-calc.js");
      tankDefaults = require("./tank-defaults.js");
    } catch (err) {
      tankCalc = null;
      tankDefaults = null;
    }
    module.exports = factory(
      require("./calc.js"),
      require("./defaults.js"),
      gasCalc,
      gasDefaults,
      tankCalc,
      tankDefaults
    );
  } else {
    root.WaterStorage = factory(
      root.WaterCalc,
      root.WaterDefaults,
      root.GasCalc,
      root.GasDefaults,
      root.TankCalc,
      root.TankDefaults
    );
  }
})(typeof self !== "undefined" ? self : this, function (
  WaterCalc,
  WaterDefaults,
  GasCalc,
  GasDefaults,
  TankCalc,
  TankDefaults
) {
  "use strict";

  var STORAGE_KEY = "watertools.systemProfile";
  var PROFILE_VERSION = 1;

  function sanitiseActivePreset(value) {
    return value && WaterDefaults.PRESETS[value] ? value : "";
  }

  function sanitiseGasActivePreset(value) {
    return GasDefaults && value && GasDefaults.PRESETS[value] ? value : "";
  }

  function sanitiseTankActivePreset(value) {
    return TankDefaults && value && TankDefaults.PRESETS[value] ? value : "";
  }

  function sanitiseWaterUsage(raw) {
    var next = WaterCalc.normaliseUsage(raw);
    next.activePreset = sanitiseActivePreset(raw && raw.activePreset);
    return next;
  }

  function sanitiseGasUsage(raw, waterUsage) {
    if (!GasCalc) {
      return raw && typeof raw === "object" ? raw : undefined;
    }
    var source = raw;
    if (!source || typeof source !== "object") {
      source = GasDefaults ? GasDefaults.createDefaultUsage(waterUsage) : {};
    }
    var next = GasCalc.normaliseUsage(source, waterUsage);
    next.activePreset = sanitiseGasActivePreset(source && source.activePreset);
    return next;
  }

  function sanitiseTankPlan(raw, waterUsage) {
    if (!TankCalc) {
      return raw && typeof raw === "object" ? raw : undefined;
    }
    var source = raw;
    if (!source || typeof source !== "object") {
      source = TankDefaults ? TankDefaults.createDefaultPlan(waterUsage) : {};
    }
    var next = TankCalc.normalisePlan(source, waterUsage);
    next.activePreset = sanitiseTankActivePreset(source && source.activePreset);
    return next;
  }

  function sanitiseProfile(raw) {
    var waterUsage = sanitiseWaterUsage(raw && raw.waterUsage);
    var profile = {
      version: PROFILE_VERSION,
      waterUsage: waterUsage,
    };

    if (GasCalc) {
      profile.gasUsage = sanitiseGasUsage(raw && raw.gasUsage, waterUsage);
    }

    if (TankCalc) {
      profile.tankPlan = sanitiseTankPlan(raw && raw.tankPlan, waterUsage);
    }

    if (raw && typeof raw === "object") {
      Object.keys(raw).forEach(function (key) {
        if (key === "version" || key === "waterUsage") return;
        if (key === "gasUsage" && GasCalc) return;
        if (key === "tankPlan" && TankCalc) return;
        profile[key] = raw[key];
      });
    }

    return profile;
  }

  function loadProfile() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return sanitiseProfile(WaterDefaults.createDefaultProfile());
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return sanitiseProfile(WaterDefaults.createDefaultProfile());
      }
      return sanitiseProfile(parsed);
    } catch (err) {
      return sanitiseProfile(WaterDefaults.createDefaultProfile());
    }
  }

  function saveProfile(profile) {
    var clean = sanitiseProfile(profile);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  }

  function applyPreset(profile, presetId) {
    var preset = WaterDefaults.PRESETS[presetId];
    if (!preset) return profile;

    var next = sanitiseProfile(profile);
    next.waterUsage = sanitiseWaterUsage(preset.usage);
    next.waterUsage.activePreset = presetId;
    return next;
  }

  function applyGasPreset(profile, presetId) {
    if (!GasCalc || !GasDefaults) return profile;
    var preset = GasDefaults.PRESETS[presetId];
    if (!preset) return profile;

    var next = sanitiseProfile(profile);
    var usage =
      presetId === "defaults"
        ? GasDefaults.createDefaultUsage(next.waterUsage)
        : preset.usage;
    next.gasUsage = sanitiseGasUsage(usage, next.waterUsage);
    next.gasUsage.activePreset = presetId;
    return next;
  }

  function applyTankPreset(profile, presetId) {
    if (!TankCalc || !TankDefaults) return profile;
    var preset = TankDefaults.PRESETS[presetId];
    if (!preset) return profile;

    var next = sanitiseProfile(profile);
    var plan =
      presetId === "defaults"
        ? TankDefaults.createDefaultPlan(next.waterUsage)
        : preset.usage;
    next.tankPlan = sanitiseTankPlan(plan, next.waterUsage);
    next.tankPlan.activePreset = presetId;
    next.waterUsage.freshTankLitres = next.tankPlan.freshTankLitres;
    next.waterUsage = sanitiseWaterUsage(next.waterUsage);
    return next;
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    PROFILE_VERSION: PROFILE_VERSION,
    loadProfile: loadProfile,
    saveProfile: saveProfile,
    sanitiseProfile: sanitiseProfile,
    sanitiseWaterUsage: sanitiseWaterUsage,
    sanitiseGasUsage: sanitiseGasUsage,
    sanitiseTankPlan: sanitiseTankPlan,
    applyPreset: applyPreset,
    applyGasPreset: applyGasPreset,
    applyTankPreset: applyTankPreset,
  };
});
