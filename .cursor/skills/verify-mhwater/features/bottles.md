# Gas bottle picker

The gas bottle / cylinder picker is a coming-soon page. It does not calculate a bottle size. The live Gas calculator already estimates bottles; this page does not read that result.

## Sub-features

- `bottles-soon` shows the coming-soon heading and the not-built-yet paragraph.
- `bottles-redirect` on the mhwater host sends `/bottles.html` to the hub copy of this page.

## How to get to it (user POV)

- Open `https://motorhomewater.co.uk/bottles.html`, which redirects to `https://motorhometools.co.uk/water/bottles.html`.
- On any Water hub tool, open **More tools** and choose **Gas bottle / cylinder picker**.

## Driving it with mhwater-verify

Preconditions:

- Doctor has passed, so the UI port is serving the copied hub page.

- **Open the page.** Run `.cursor/skills/verify-mhwater/scripts/drive.mjs coming-soon`. The bottles entry requests `/bottles.html` on the UI port.

### INPUT

Open `/bottles.html`. There is no number to type. This repo has no `assets` module for this page.

### EXPECTED

There is no formula to derive a number from. The page body is hub HTML, copied at launch, not a calculator in this checkout. The visible copy on that HTML is:

- `h1`: Gas bottle / cylinder picker
- `h2`: Coming soon
- Paragraph: This page will help you pick a cylinder size from the gas usage estimate. It is not built yet.

### ACTUAL

`evidence/coming-soon.json` entry for `bottles.html`. `pass` is true when the status is 200 and those three strings are in the HTML.

Authoring run `2026-10-12T02-34-18-261Z` recorded `pass: true` for `bottles.html` (status 200, heading and paragraph present).

The redirect itself is the `/bottles.html` row in [redirects](./redirects.md).

## Gotchas

- The paragraph says the picker will sit next to Gas once that calculator is live. The Gas calculator is already on the hub. That sentence is the published placeholder. Do not treat a drive failure on this page as a Gas formula failure.
- Do not invent a recommended cylinder from `assets/gas-calc.js` and call it this page's result. Gas bottle count is the Gas feature.
