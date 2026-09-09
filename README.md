# Water Tools (mhwater)

A small, mobile-friendly hub of **motorhome water and gas calculators** for UK and EU users.

Later public home: **motorhomewater.co.uk** (water and gas together).

## Slice 1 — Water usage

Set people, trip length and habits to see:

- litres of **fresh water** per day and for the whole trip
- litres of **grey water** per day and for the trip
- a breakdown by showers, washing up, laundry, drinking/cooking, and cassette flushes
- a **water weight** line (1 litre ≈ 1 kg)
- a rough “days until the fresh tank is empty” note if you type a tank size

Presets: Weekend (2 people), Family week, Light full-time, and Reset to defaults.

## Later modules (nav stubs only)

Primary nav: **Water** | **Gas** | **Tanks**

Under **More tools**:

- Water weight — already on the Water page
- Cassette / toilet empty planner
- Gas bottle / cylinder picker
- Hot water (gas vs electric)
- Winterising volume
- Top-up / Aquaroll planner

Those pages say “coming soon”. They are not built yet.

The site is a static front-end: no backend, no accounts, and no APIs. It is meant to deploy on Render as a static site.

## How to use

1. Open Water usage and pick a preset, or keep the defaults.
2. Edit people, days, showers and kitchen habits.
3. Totals update as you type. Refresh: the numbers stay on this device.
4. Optional: type a fresh tank size to see a rough days-left note and the weight of a full tank.

Numbers are a **planning estimate only**.

On a phone, hold the screen upright. A sideways phone shows a rotate message instead of a landscape layout.

## Run locally

No build step and no npm install.

From the repo root:

```bash
python3 -m http.server 8080
```

Then open [http://127.0.0.1:8080/](http://127.0.0.1:8080/).

You can also open the HTML files directly in a browser. A local server is the more reliable option.

To check the water maths:

```bash
node tests/calc.test.js
```

## Deploy on Render (static site)

1. Push this repository to GitHub.
2. In the Render dashboard, choose **New → Static Site**.
3. Connect the repo and branch (`main` once merged).
4. Settings:
   - **Build Command:** leave empty
   - **Publish Directory:** `.`
5. Optional environment variable: `SKIP_INSTALL_DEPS=true` (there are no Node dependencies to install).
6. Deploy.

A `render.yaml` Blueprint is included with the same static publish path. After you have a live domain, add that host to `sitemap.xml` (`<loc>`) and optionally a `Sitemap:` line in `robots.txt`. Do not use a placeholder domain.

## Persistence

All Water Tools slices share one browser profile:

| Item | Value |
| --- | --- |
| **localStorage key** | `watertools.systemProfile` |
| **Current version** | `1` |

Water usage reads and writes `waterUsage`. Later slices should add sibling keys on the **same object** instead of creating new localStorage keys. Bump `version` only if a breaking migration is required. The loader already preserves unknown sibling keys.

```json
{
  "version": 1,
  "waterUsage": {
    "adults": 2,
    "children": 0,
    "tripDays": 2,
    "showersPerPersonPerDay": 0.5,
    "showerStyle": "short",
    "showerMinutes": 1.5,
    "showerLitres": 6,
    "washUpLitresPerDay": 5,
    "laundryEnabled": false,
    "laundryLitresPerLoad": 15,
    "laundryLoadsPerTrip": 0,
    "drinkCookLitresPerPersonPerDay": 2.5,
    "cassetteEnabled": true,
    "cassetteFlushesPerPersonPerDay": 5,
    "cassetteLitresPerFlush": 0.25,
    "freshTankLitres": 100,
    "activePreset": "defaults"
  }
}
```

## Out of scope (this slice)

Full LPG calculator, full tank planner, cassette empty planner, bottle picker, hot-water comparison, winterising, Aquaroll planner, accounts, and affiliates.

## Disclaimer

This calculator is a planning estimate only. It is not a design, a payload calculation, or a guarantee that your tanks will last. Check your van’s tank sizes and weight limits, and dispose of grey and cassette waste at proper points.
