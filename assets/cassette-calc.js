/**
 * Pure cassette / black-tank empty maths.
 * Works in the browser and in Node tests.
 *
 * This planner is about empty stops. Daily waste is flush litres
 * (people × flushes × litres per flush) — a planning figure, not a
 * waste assay. Typical UK leisure vans use a 15–20 L Thetford-style
 * cassette; a fixed black tank is less common and usually larger.
 *
 * Days until empty use the room left from the starting fill.
 * Empties for the trip count every dump, including one at the end
 * if anything is in the tank.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./calc.js"), require("./tank-calc.js"));
  } else {
    root.CassetteCalc = factory(root.WaterCalc, root.TankCalc);
  }
})(typeof self !== "undefined" ? self : this, function (WaterCalc, TankCalc) {
  "use strict";

  var MAX_PEOPLE = WaterCalc.MAX_PEOPLE;
  var MIN_TRIP_DAYS = WaterCalc.MIN_TRIP_DAYS;
  var MAX_TRIP_DAYS = WaterCalc.MAX_TRIP_DAYS;
  var MAX_FLUSHES = WaterCalc.MAX_FLUSHES;
  var MAX_FLUSH_LITRES = WaterCalc.MAX_FLUSH_LITRES;
  var MAX_TANK_LITRES = WaterCalc.MAX_TANK_LITRES;
  var MIN_PERCENT = TankCalc.MIN_PERCENT;
  var MAX_PERCENT = TankCalc.MAX_PERCENT;
  var DEFAULT_CASSETTE_LITRES = TankCalc.DEFAULT_CASSETTE_LITRES;
  var DEFAULT_FIXED_BLACK_LITRES = TankCalc.DEFAULT_FIXED_BLACK_LITRES;
  var DEFAULT_FLUSHES = 5;
  var DEFAULT_LITRES_PER_FLUSH = 0.25;

  function toNumber(value, fallback) {
    return WaterCalc.toNumber(value, fallback);
  }

  function clamp(value, min, max) {
    return WaterCalc.clamp(value, min, max);
  }

  function roundPeople(value) {
    return Math.round(toNumber(value, 0));
  }

  function sanitiseBlackKind(value) {
    return TankCalc.sanitiseBlackKind(value);
  }

  function blackLabel(kind) {
    return TankCalc.blackLabel(kind);
  }

  function defaultBlackLitres(kind) {
    return TankCalc.defaultBlackLitres(kind);
  }

  function blackLitresForKind(kind, currentLitres) {
    return TankCalc.blackLitresForKind(kind, currentLitres);
  }

  function normalisePlan(raw, waterUsage, tankPlan) {
    var source = raw && typeof raw === "object" ? raw : {};
    var water = waterUsage && typeof waterUsage === "object" ? waterUsage : {};
    var tank = tankPlan && typeof tankPlan === "object" ? tankPlan : {};

    var hasOwnAdults = source.adults != null && source.adults !== "";
    var hasOwnChildren = source.children != null && source.children !== "";
    var hasOwnTrip = source.tripDays != null && source.tripDays !== "";
    var hasOwnFlushes = source.flushesPerPersonPerDay != null && source.flushesPerPersonPerDay !== "";
    var hasOwnFlushLitres = source.litresPerFlush != null && source.litresPerFlush !== "";
    var hasOwnKind = source.blackKind != null && source.blackKind !== "";
    var hasOwnSize = source.blackTankLitres != null && source.blackTankLitres !== "";
    var hasOwnStart = source.startPercent != null && source.startPercent !== "";

    var blackKind = sanitiseBlackKind(
      hasOwnKind ? source.blackKind : tank.blackKind != null ? tank.blackKind : "cassette"
    );
    var defaultSize = hasOwnSize
      ? source.blackTankLitres
      : tank.blackTankLitres != null && tank.blackTankLitres !== ""
        ? tank.blackTankLitres
        : defaultBlackLitres(blackKind);

    return {
      adults: clamp(
        roundPeople(hasOwnAdults ? source.adults : water.adults != null ? water.adults : 2),
        0,
        MAX_PEOPLE
      ),
      children: clamp(
        roundPeople(hasOwnChildren ? source.children : water.children != null ? water.children : 0),
        0,
        MAX_PEOPLE
      ),
      tripDays: clamp(
        toNumber(hasOwnTrip ? source.tripDays : water.tripDays != null ? water.tripDays : 2),
        MIN_TRIP_DAYS,
        MAX_TRIP_DAYS
      ),
      blackKind: blackKind,
      blackTankLitres: clamp(toNumber(defaultSize, defaultBlackLitres(blackKind)), 0, MAX_TANK_LITRES),
      flushesPerPersonPerDay: clamp(
        toNumber(
          hasOwnFlushes
            ? source.flushesPerPersonPerDay
            : water.cassetteFlushesPerPersonPerDay != null
              ? water.cassetteFlushesPerPersonPerDay
              : DEFAULT_FLUSHES
        ),
        0,
        MAX_FLUSHES
      ),
      litresPerFlush: clamp(
        toNumber(
          hasOwnFlushLitres
            ? source.litresPerFlush
            : water.cassetteLitresPerFlush != null
              ? water.cassetteLitresPerFlush
              : DEFAULT_LITRES_PER_FLUSH
        ),
        0,
        MAX_FLUSH_LITRES
      ),
      startPercent: clamp(
        toNumber(
          hasOwnStart
            ? source.startPercent
            : tank.blackStartPercent != null
              ? tank.blackStartPercent
              : 0
        ),
        MIN_PERCENT,
        MAX_PERCENT
      ),
      activePreset: source.activePreset ? String(source.activePreset) : "",
    };
  }

  function daysFromRate(usableLitres, dailyLitres) {
    if (usableLitres <= 0 || dailyLitres <= 0) return 0;
    return usableLitres / dailyLitres;
  }

  function extraStops(tripNeedLitres, usableLitres, tankLitres) {
    if (tankLitres <= 0 || tripNeedLitres <= 0) return 0;
    var shortfall = tripNeedLitres - usableLitres;
    if (shortfall <= 0) return 0;
    return Math.ceil(shortfall / tankLitres - 1e-9);
  }

  function tripEmpties(startLitres, wasteTrip, tankLitres) {
    if (tankLitres <= 0) return 0;
    var total = startLitres + wasteTrip;
    if (total <= 0) return 0;
    return Math.ceil(total / tankLitres - 1e-9);
  }

  function calcCassette(rawPlan, waterUsage, tankPlan) {
    var plan = normalisePlan(rawPlan, waterUsage, tankPlan);
    var heads = plan.adults + plan.children;
    var wasteDaily = heads * plan.flushesPerPersonPerDay * plan.litresPerFlush;
    var wasteTrip = wasteDaily * plan.tripDays;
    var startLitres = plan.blackTankLitres * (plan.startPercent / 100);
    var usable = plan.blackTankLitres * (1 - plan.startPercent / 100);
    var daysUntilEmpty = daysFromRate(usable, wasteDaily);
    var emptiesNeeded = tripEmpties(startLitres, wasteTrip, plan.blackTankLitres);
    var extraEmpties = extraStops(wasteTrip, usable, plan.blackTankLitres);

    return {
      plan: plan,
      heads: heads,
      flushesPerDay: heads * plan.flushesPerPersonPerDay,
      wasteDaily: wasteDaily,
      wasteTrip: wasteTrip,
      startLitres: startLitres,
      usable: usable,
      daysUntilEmpty: daysUntilEmpty,
      emptiesNeeded: emptiesNeeded,
      extraEmpties: extraEmpties,
      blackLabel: blackLabel(plan.blackKind),
    };
  }

  return {
    MAX_PEOPLE: MAX_PEOPLE,
    MIN_TRIP_DAYS: MIN_TRIP_DAYS,
    MAX_TRIP_DAYS: MAX_TRIP_DAYS,
    MAX_FLUSHES: MAX_FLUSHES,
    MAX_FLUSH_LITRES: MAX_FLUSH_LITRES,
    MAX_TANK_LITRES: MAX_TANK_LITRES,
    MIN_PERCENT: MIN_PERCENT,
    MAX_PERCENT: MAX_PERCENT,
    DEFAULT_CASSETTE_LITRES: DEFAULT_CASSETTE_LITRES,
    DEFAULT_FIXED_BLACK_LITRES: DEFAULT_FIXED_BLACK_LITRES,
    DEFAULT_FLUSHES: DEFAULT_FLUSHES,
    DEFAULT_LITRES_PER_FLUSH: DEFAULT_LITRES_PER_FLUSH,
    toNumber: toNumber,
    clamp: clamp,
    sanitiseBlackKind: sanitiseBlackKind,
    blackLabel: blackLabel,
    defaultBlackLitres: defaultBlackLitres,
    blackLitresForKind: blackLitresForKind,
    normalisePlan: normalisePlan,
    extraStops: extraStops,
    tripEmpties: tripEmpties,
    calcCassette: calcCassette,
  };
});
