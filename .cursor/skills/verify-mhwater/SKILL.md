---
name: verify-mhwater
description: Launch, check, drive, and debug the mhwater static site and its Water, Gas, Tanks, and Cassette calculators the way a visitor does. Use when reviewing this repo, proving a formula or redirect change, or when a PR reviewer needs a real click-path. This checkout publishes HTTP 301 redirects plus legacy assets; the live calculator pages are on https://motorhometools.co.uk/water/.
---

# Verify mhwater

This checkout is the Render static site `mhwater`. It is **not** the live Water calculator, and it is **not** only a leftover copy with no public role.

## What this checkout serves

- Hosts: `https://motorhomewater.co.uk` and `https://mhwater.onrender.com`. Render service name `mhwater`. Publish directory is the repo root. Build command is empty. `SKIP_INSTALL_DEPS=true`.
- Page paths 301 to the Water hub. The map is `_redirects` and `render.yaml`. `/` and `/index.html` go to `https://motorhometools.co.uk/water/`. `/gas.html`, `/tanks.html`, `/cassette.html`, `/bottles.html`, `/hotwater.html`, `/winterising.html`, and `/topup.html` go to the same file name under that hub. Any other path with no file goes to `https://motorhometools.co.uk/water/`.
- A file that exists is HTTP 200 and the redirect rule is skipped. `assets/calc.js` and the other legacy calculator modules, CSS, and icons are still published that way. `robots.txt` is `Disallow: /`. `sitemap.xml` lists no URLs.
- The HTML calculators are not in this repo. `index.html`, `gas.html`, `tanks.html`, `cassette.html`, `bottles.html`, `hotwater.html`, `winterising.html`, and `topup.html` were removed so they cannot answer 200 and block the 301. Do not add them back at the publish root.
- The pages a visitor actually uses are the hub: [https://motorhometools.co.uk/water/](https://motorhometools.co.uk/water/). That UI lives in the `motorhometools` repo under `water/`. The hub publishes minified `water/assets/*.js`. Those files are not byte-for-byte copies of this repo. On 12 Oct 2026, `calcWater`, `calcGas`, `calcTanks`, and `calcCassette` on the hub returned the same raw results as this checkout for the Weekend, Weekend summer, Typical UK van, and Weekend couple presets. A later edit here does not change the hub until that repo is updated. `drive` copies the hub HTML into a temp directory and serves it with **this checkout's** `assets/`, so a click runs the JavaScript under review.

Update this feature map in the same PR whenever a build changes pages or tools.

A weekly maintain pass runs on Mondays, as part of Freddie the Font2's routine. It edits only `.cursor/skills/verify-mhwater/`, opens at most one PR through the review loop, and stays quiet unless blocked.

## Launch

From the repo root:

```bash
.cursor/skills/verify-mhwater/scripts/launch.mjs
```

Launch refuses to start if a verification server from this skill is already running. Stop it with `cleanup.mjs` first. Two drives must not share one instance.

What it starts, bound to `127.0.0.1` on a free port (printed when ready):

1. A publish server for this repo. It serves an existing file as 200 and otherwise applies `_redirects` (301, query string kept, catch-all `/*` drops the path). This is the local stand-in for Render. It is not the production host.
2. A UI server whose root is a temp copy: live hub HTML fetched into `/tmp/mhwater-verify/<run-id>/ui/`, plus this checkout's `assets/`. That directory is scratch. It is not committed and it is not the publish root.

Ready means both ports answer and `GET /robots.txt` on the publish port returns 200 with `Disallow`. State is `/tmp/mhwater-verify/state.json` (`runId`, pids, ports). Launch needs network once, to copy the hub HTML. `expect.mjs` does not.

The live hosts are shared production. Launch does not start them and does not deploy.

## Doctor

```bash
.cursor/skills/verify-mhwater/scripts/doctor.mjs
```

Run this before driving, and again whenever a click looks wrong. It is read-only. It checks:

- The publish and UI pids from the state file are still the processes launch started.
- `GET /` on the publish port is 301 to `https://motorhometools.co.uk/water/` and the response header `X-Mhwater-Verify` is this run id.
- `GET /gas.html` is 301 to `https://motorhometools.co.uk/water/gas.html`.
- `GET /assets/calc.js` is 200 and the body matches `assets/calc.js` on disk.
- The eight HTML page names above are absent from the repo root.
- `GET /` on the UI port is 200 and contains `<h1>Fresh water usage calculator</h1>`, and its `assets/calc.js` matches this checkout.
- `node tests/redirects.test.js`, `node tests/seo.test.js`, and `node tests/calc.test.js` exit 0.

A failure means this instance is not worth driving. The report is `evidence/doctor.json`. Doctor does not kill a bad server; run cleanup yourself.

## Drive

The harness is Chrome (`/usr/bin/google-chrome`, headless) on a throwaway user-data directory, talking to the DevTools port Chrome prints. The viewport is 1280×900 so the rotate gate stays hidden. Preset buttons are clicked by their `aria-label`, which `assets/app.js`, `assets/gas-app.js`, `assets/tank-app.js`, and `assets/cassette-app.js` build as `label (sublabel)` from the matching defaults module.

```bash
.cursor/skills/verify-mhwater/scripts/drive.mjs redirects
.cursor/skills/verify-mhwater/scripts/drive.mjs water
.cursor/skills/verify-mhwater/scripts/drive.mjs gas
.cursor/skills/verify-mhwater/scripts/drive.mjs tanks
.cursor/skills/verify-mhwater/scripts/drive.mjs cassette
.cursor/skills/verify-mhwater/scripts/drive.mjs coming-soon
```

Read `features/README.md` and the feature file first. One passing entry point does not cover the others.

`drive redirects` checks the local publish server and then read-only responses from `https://motorhomewater.co.uk` and `https://mhwater.onrender.com`. It does not submit forms to production.

Calculator drives open the UI server, not the hub origin, so the script tags load this checkout. Each drive uses a new Chrome profile. The shared `localStorage` key is `watertools.systemProfile` (`assets/storage.js`). A profile left over from Water will change Tanks and Cassette.

`drive coming-soon` reads the four placeholder pages on the UI server. They have no formula in this repo.

Display strings are compared exactly to `expect.mjs`. Raw results and the en-GB formatting in each `*-app.js` are both required. A rounded-looking screen value is still a derived value; the derivation is in the feature file.

## Evidence

Proof goes in `.cursor/skills/verify-mhwater/evidence/`. Cleanup must leave that directory in place.

| File | What it proves |
| --- | --- |
| `run.txt` | Commands and pass/fail lines. Named `.txt` because the repo gitignore ignores `*.log`. |
| `doctor.json` | Whether the instance was worth driving |
| `redirects.json` | Local and live status plus `Location` |
| `water.json`, `gas.json`, `tanks.json`, `cassette.json` | INPUT, derivation, EXPECTED display, ACTUAL text, mismatches |
| `water.aria.txt` (and the same for gas, tanks, cassette) | Calculator text before the click and after it |
| `water-before.png`, `water-after.png` (and the same for the other calculators) | The screen before the action and the resulting state |
| `coming-soon.json` | Headings and the "not built yet" paragraph |

Exercise the click or the HTTP response a visitor gets. Do not treat `expect.mjs` or `tests/*.test.js` as a substitute for that. The calculators do not write a server row; the side effect to confirm is the result text, and for Water the `Saved on this device` line (`assets/app.js` writes `localStorage` only inside the throwaway profile).

`expect.mjs` does not open a browser and does not touch the network. Use it to see the derived EXPECTED strings:

```bash
.cursor/skills/verify-mhwater/scripts/expect.mjs water
.cursor/skills/verify-mhwater/scripts/expect.mjs gas
.cursor/skills/verify-mhwater/scripts/expect.mjs tanks
.cursor/skills/verify-mhwater/scripts/expect.mjs cassette
```

## Cleanup

```bash
.cursor/skills/verify-mhwater/scripts/cleanup.mjs
```

This sends `SIGTERM`, then `SIGKILL` if needed, to the publish pid, the UI pid, and any Chrome pid recorded in `/tmp/mhwater-verify/state.json`. It deletes that state file, that run's temp UI directory, `publish.log`, `ui.log`, and the throwaway Chrome profiles under `/tmp/mhwater-verify/`. It does not kill Chrome or Node by name. It does not delete `.cursor/skills/verify-mhwater/evidence/`.

Run cleanup after a failed launch too, so a half-started server is not left on a port. Launch already stops the publish server if the hub HTML copy fails.

## Helpers

Each helper is executable. Run them from the repo root.

| Helper | Command |
| --- | --- |
| Launch both local servers | `.cursor/skills/verify-mhwater/scripts/launch.mjs` |
| Doctor | `.cursor/skills/verify-mhwater/scripts/doctor.mjs` |
| Drive one feature | `.cursor/skills/verify-mhwater/scripts/drive.mjs <redirects\|water\|gas\|tanks\|cassette\|coming-soon>` |
| Cleanup | `.cursor/skills/verify-mhwater/scripts/cleanup.mjs` |
| Print derived EXPECTED cases | `.cursor/skills/verify-mhwater/scripts/expect.mjs <water\|gas\|tanks\|cassette>` |
| Dispatcher used by the wrappers, including the server process launch spawns | `.cursor/skills/verify-mhwater/scripts/verify.mjs <launch\|doctor\|drive\|cleanup\|expect>` |

`launch.mjs` starts the servers by spawning:

```bash
node .cursor/skills/verify-mhwater/scripts/verify.mjs serve <redirect|static> <root> <runId>
```

Do not run `serve` yourself. `launch.mjs` owns those processes and records their pids.

The same commands exist as `node .cursor/skills/verify-mhwater/scripts/<helper>.mjs` if the executable bit is lost.
