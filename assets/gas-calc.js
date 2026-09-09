/**
 * Pure motorhome LPG / propane maths.
 * Works in the browser and in Node tests.
 *
 * Rates are typical UK leisure-vehicle planning figures on propane
 * (Calor / Flogas / refillable). They are not manufacturer ratings
 * and are not a safety certificate. Users should edit hours to match
 * their van.
 *
 *   Heater  0.18 kg/h   blown-air / Truma-style space heater on a
 *                       moderate setting (2–3 kW heaters are often
 *                       quoted around 0.15–0.25 kg/h).
 *   Cook    0.025 / 0.04 / 0.07 kg per person-unit per meal
 *                       light = kettle + one-pan; normal = typical hob
 *                       meal; heavy = oven, grill or a long simmer.
 *                       Children count as 0.7 of an adult, same idea
 *                       as the water calculator.
 *   Fridge  0.016 kg/h  3-way absorption fridge on gas
 *                       (~0.38 kg/day if left on for 24 hours).
 *   Boiler  0.12 kg/h   stored or Combi hot-water burner.
 *                       Light 0.5 h ≈ one heat-up; normal 1.5 h;
 *                       heavy 3 h.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GasCalc = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CHILD_FACTOR = 0.7;
  var HEATER_KG_PER_HOUR = 0.18;
  var FRIDGE_KG_PER_HOUR = 0.016;
  var BOILER_KG_PER_HOUR = 0.12;
  var MAX_PEOPLE = 20;
  var MIN_TRIP_DAYS = 0.5;
  var MAX_TRIP_DAYS = 90;
  var MAX_MEALS_PER_DAY = 6;
  var MAX_HEATING_HOURS = 24;
  var MAX_FRIDGE_HOURS = 24;
  var MAX_BOILER_HOURS = 12;
  var MIN_BOTTLE_KG = 1;
  var MAX_BOTTLE_KG = 47;

  var COOK_STYLES = {
    light: { id: "light", label: "Light", kgPerPersonPerMeal: 0.025 },
    normal: { id: "normal", label: "Normal", kgPerPersonPerMeal: 0.04 },
    heavy: { id: "heavy", label: "Heavy", kgPerPersonPerMeal: 0.07 },
  };

  var HEATING_LEVELS = {
    off: { id: "off", label: "Off", hours: 0 },
    low: { id: "low", label: "Low", hours: 2 },
    medium: { id: "medium", label: "Medium", hours: 6 },
    high: { id: "high", label: "High", hours: 12 },
  };

  var BOILER_LEVELS = {
    light: { id: "light", label: "Light", hours: 0.5 },
    normal: { id: "normal", label: "Normal", hours: 1.5 },
    heavy: { id: "heavy", label: "Heavy", hours: 3 },
  };

  var SEASONS = {
    summer: { id: "summer", label: "Summer", heatingLevel: "off" },
    mild: { id: "mild", label: "Mild", heatingLevel: "low" },
    winter: { id: "winter", label: "Winter", heatingLevel: "high" },
  };

  var BOTTLES = {
    calor6: { id: "calor6", kg: 6, label: "6 kg", sublabel: "Calor / Flogas" },
    calor13: { id: "calor13", kg: 13, label: "13 kg", sublabel: "Calor / Flogas" },
    calor19: { id: "calor19", kg: 19, label: "19 kg", sublabel: "larger Calor" },
    refill11: { id: "refill11", kg: 11, label: "11 kg", sublabel: "refillable / Gaslow" },
    refill14: { id: "refill14", kg: 14, label: "14 kg", sublabel: "Alugas / Conti-style" },
  };

  var BOTTLE_ORDER = ["calor6", "calor13", "calor19", "refill11", "refill14"];

  function toNumber(value, fallback) {
    var n = typeof value === "number" ? value : parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundPeople(value) {
    return Math.round(toNumber(value, 0));
  }

  function peopleUnits(adults, children) {
    return Math.max(0, adults) + Math.max(0, children) * CHILD_FACTOR;
  }

  function sanitiseCookingStyle(value) {
    return COOK_STYLES[value] ? value : "normal";
  }

  function sanitiseHeatingLevel(value) {
    if (value === "custom") return "custom";
    return HEATING_LEVELS[value] ? value : "off";
  }

  function sanitiseBoilerLevel(value) {
    if (value === "custom") return "custom";
    return BOILER_LEVELS[value] ? value : "normal";
  }

  function sanitiseSeason(value) {
    return SEASONS[value] ? value : "summer";
  }

  function sanitiseBottleId(value) {
    if (value === "custom") return "custom";
    return BOTTLES[value] ? value : "calor13";
  }

  function matchHeatingLevel(hours) {
    var ids = Object.keys(HEATING_LEVELS);
    for (var i = 0; i < ids.length; i += 1) {
      var level = HEATING_LEVELS[ids[i]];
      if (Math.abs(level.hours - hours) < 0.05) return level.id;
    }
    return "custom";
  }

  function matchBoilerLevel(hours) {
    var ids = Object.keys(BOILER_LEVELS);
    for (var i = 0; i < ids.length; i += 1) {
      var level = BOILER_LEVELS[ids[i]];
      if (Math.abs(level.hours - hours) < 0.05) return level.id;
    }
    return "custom";
  }

  function matchBottleId(kg) {
    var ids = Object.keys(BOTTLES);
    for (var i = 0; i < ids.length; i += 1) {
      var bottle = BOTTLES[ids[i]];
      if (Math.abs(bottle.kg - kg) < 0.05) return bottle.id;
    }
    return "custom";
  }

  function heatingHoursForSeason(season) {
    var spec = SEASONS[sanitiseSeason(season)];
    return HEATING_LEVELS[spec.heatingLevel].hours;
  }

  function normaliseUsage(raw, waterUsage) {
    var source = raw && typeof raw === "object" ? raw : {};
    var water = waterUsage && typeof waterUsage === "object" ? waterUsage : {};
    var hasOwnTrip = source.tripDays != null && source.tripDays !== "";
    var hasOwnAdults = source.adults != null && source.adults !== "";
    var hasOwnChildren = source.children != null && source.children !== "";

    var adults = clamp(
      roundPeople(hasOwnAdults ? source.adults : water.adults != null ? water.adults : 2),
      0,
      MAX_PEOPLE
    );
    var children = clamp(
      roundPeople(hasOwnChildren ? source.children : water.children != null ? water.children : 0),
      0,
      MAX_PEOPLE
    );
    var tripDays = clamp(
      toNumber(hasOwnTrip ? source.tripDays : water.tripDays != null ? water.tripDays : 2),
      MIN_TRIP_DAYS,
      MAX_TRIP_DAYS
    );

    var cookingStyle = sanitiseCookingStyle(source.cookingStyle);
    var heatingLevel = sanitiseHeatingLevel(source.heatingLevel);
    var heatingHours = clamp(toNumber(source.heatingHours, 0), 0, MAX_HEATING_HOURS);
    if (heatingLevel !== "custom" && HEATING_LEVELS[heatingLevel]) {
      heatingHours = HEATING_LEVELS[heatingLevel].hours;
    }

    var boilerLevel = sanitiseBoilerLevel(source.boilerLevel);
    var boilerHours = clamp(toNumber(source.boilerHours, 1.5), 0, MAX_BOILER_HOURS);
    if (boilerLevel !== "custom" && BOILER_LEVELS[boilerLevel]) {
      boilerHours = BOILER_LEVELS[boilerLevel].hours;
    }

    var bottleId = sanitiseBottleId(source.bottleId);
    var bottleKg = clamp(toNumber(source.bottleKg, 13), MIN_BOTTLE_KG, MAX_BOTTLE_KG);
    if (bottleId !== "custom" && BOTTLES[bottleId]) {
      bottleKg = BOTTLES[bottleId].kg;
    }

    var fridgeHoursDefault = source.fridgeGasEnabled ? 24 : 24;

    return {
      adults: adults,
      children: children,
      tripDays: tripDays,
      season: sanitiseSeason(source.season),
      mealsPerDay: clamp(toNumber(source.mealsPerDay, 2), 0, MAX_MEALS_PER_DAY),
      cookingStyle: cookingStyle,
      heatingLevel: heatingLevel,
      heatingHours: heatingHours,
      fridgeGasEnabled: !!source.fridgeGasEnabled,
      fridgeHoursPerDay: clamp(
        toNumber(source.fridgeHoursPerDay, fridgeHoursDefault),
        0,
        MAX_FRIDGE_HOURS
      ),
      boilerEnabled: !!source.boilerEnabled,
      boilerLevel: boilerLevel,
      boilerHours: boilerHours,
      bottleId: bottleId,
      bottleKg: bottleKg,
      activePreset: source.activePreset ? String(source.activePreset) : "",
    };
  }

  function calcGas(raw, waterUsage) {
    var usage = normaliseUsage(raw, waterUsage);
    var units = peopleUnits(usage.adults, usage.children);
    var cookRate = COOK_STYLES[usage.cookingStyle].kgPerPersonPerMeal;
    var cookDaily = units * usage.mealsPerDay * cookRate;
    var heatDaily = usage.heatingHours * HEATER_KG_PER_HOUR;
    var fridgeDaily = usage.fridgeGasEnabled
      ? usage.fridgeHoursPerDay * FRIDGE_KG_PER_HOUR
      : 0;
    var boilerDaily = usage.boilerEnabled ? usage.boilerHours * BOILER_KG_PER_HOUR : 0;

    var items = [
      { id: "cooking", name: "Cooking", kgPerDay: cookDaily },
      { id: "heating", name: "Heating", kgPerDay: heatDaily },
      { id: "fridge", name: "Fridge on gas", kgPerDay: fridgeDaily },
      { id: "boiler", name: "Hot water", kgPerDay: boilerDaily },
    ];

    var dailyKg = items.reduce(function (sum, item) {
      return sum + item.kgPerDay;
    }, 0);
    var tripKg = dailyKg * usage.tripDays;
    var hasBottle = usage.bottleKg > 0;
    var bottleDays = hasBottle && dailyKg > 0 ? usage.bottleKg / dailyKg : 0;
    var bottlesNeeded =
      hasBottle && tripKg > 0 ? Math.ceil(tripKg / usage.bottleKg - 1e-9) : 0;

    return {
      usage: usage,
      peopleUnits: units,
      items: items.map(function (item) {
        return {
          id: item.id,
          name: item.name,
          kgPerDay: item.kgPerDay,
          kgTrip: item.kgPerDay * usage.tripDays,
        };
      }),
      dailyKg: dailyKg,
      tripKg: tripKg,
      cookDaily: cookDaily,
      heatDaily: heatDaily,
      fridgeDaily: fridgeDaily,
      boilerDaily: boilerDaily,
      hasBottle: hasBottle,
      bottleDays: bottleDays,
      bottlesNeeded: bottlesNeeded,
      heaterKgPerHour: HEATER_KG_PER_HOUR,
      fridgeKgPerHour: FRIDGE_KG_PER_HOUR,
      boilerKgPerHour: BOILER_KG_PER_HOUR,
    };
  }

  return {
    CHILD_FACTOR: CHILD_FACTOR,
    HEATER_KG_PER_HOUR: HEATER_KG_PER_HOUR,
    FRIDGE_KG_PER_HOUR: FRIDGE_KG_PER_HOUR,
    BOILER_KG_PER_HOUR: BOILER_KG_PER_HOUR,
    MAX_PEOPLE: MAX_PEOPLE,
    MIN_TRIP_DAYS: MIN_TRIP_DAYS,
    MAX_TRIP_DAYS: MAX_TRIP_DAYS,
    MAX_MEALS_PER_DAY: MAX_MEALS_PER_DAY,
    MAX_HEATING_HOURS: MAX_HEATING_HOURS,
    MAX_FRIDGE_HOURS: MAX_FRIDGE_HOURS,
    MAX_BOILER_HOURS: MAX_BOILER_HOURS,
    MIN_BOTTLE_KG: MIN_BOTTLE_KG,
    MAX_BOTTLE_KG: MAX_BOTTLE_KG,
    COOK_STYLES: COOK_STYLES,
    HEATING_LEVELS: HEATING_LEVELS,
    BOILER_LEVELS: BOILER_LEVELS,
    SEASONS: SEASONS,
    BOTTLES: BOTTLES,
    BOTTLE_ORDER: BOTTLE_ORDER,
    toNumber: toNumber,
    clamp: clamp,
    peopleUnits: peopleUnits,
    sanitiseCookingStyle: sanitiseCookingStyle,
    sanitiseHeatingLevel: sanitiseHeatingLevel,
    sanitiseBoilerLevel: sanitiseBoilerLevel,
    sanitiseSeason: sanitiseSeason,
    sanitiseBottleId: sanitiseBottleId,
    matchHeatingLevel: matchHeatingLevel,
    matchBoilerLevel: matchBoilerLevel,
    matchBottleId: matchBottleId,
    heatingHoursForSeason: heatingHoursForSeason,
    normaliseUsage: normaliseUsage,
    calcGas: calcGas,
  };
});
