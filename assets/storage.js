/**
 * Shared Water Tools system profile in localStorage.
 * Later slices should reuse STORAGE_KEY and add sibling keys beside
 * `waterUsage` rather than creating new keys.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./calc.js"), require("./defaults.js"));
  } else {
    root.WaterStorage = factory(root.WaterCalc, root.WaterDefaults);
  }
})(typeof self !== "undefined" ? self : this, function (WaterCalc, WaterDefaults) {
  "use strict";

  var STORAGE_KEY = "watertools.systemProfile";
  var PROFILE_VERSION = 1;

  function sanitiseActivePreset(value) {
    return value && WaterDefaults.PRESETS[value] ? value : "";
  }

  function sanitiseWaterUsage(raw) {
    var next = WaterCalc.normaliseUsage(raw);
    next.activePreset = sanitiseActivePreset(raw && raw.activePreset);
    return next;
  }

  function sanitiseProfile(raw) {
    var profile = {
      version: PROFILE_VERSION,
      waterUsage: sanitiseWaterUsage(raw && raw.waterUsage),
    };

    if (raw && typeof raw === "object") {
      Object.keys(raw).forEach(function (key) {
        if (key !== "version" && key !== "waterUsage") {
          profile[key] = raw[key];
        }
      });
    }

    return profile;
  }

  function loadProfile() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return WaterDefaults.createDefaultProfile();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return WaterDefaults.createDefaultProfile();
      }
      return sanitiseProfile(parsed);
    } catch (err) {
      return WaterDefaults.createDefaultProfile();
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

  return {
    STORAGE_KEY: STORAGE_KEY,
    PROFILE_VERSION: PROFILE_VERSION,
    loadProfile: loadProfile,
    saveProfile: saveProfile,
    sanitiseProfile: sanitiseProfile,
    sanitiseWaterUsage: sanitiseWaterUsage,
    applyPreset: applyPreset,
  };
});
