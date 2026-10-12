# Top-up / Aquaroll

The top-up planner is a coming-soon page. It does not turn daily litres into Aquaroll fills.

## Sub-features

- `topup-soon` shows the coming-soon heading and the not-built-yet paragraph.
- `topup-redirect` on the mhwater host sends `/topup.html` to the hub copy.

## How to get to it (user POV)

- Open `https://motorhomewater.co.uk/topup.html`, which redirects to `https://motorhometools.co.uk/water/topup.html`.
- On a Water hub tool, open **More tools** and choose **Top-up / Aquaroll planner**.

## Driving it with mhwater-verify

Preconditions:

- Doctor has passed.

- **Open the page.** Run `.cursor/skills/verify-mhwater/scripts/drive.mjs coming-soon`. The top-up entry requests `/topup.html` on the UI port.

### INPUT

Open `/topup.html`. No fields. No module in `assets/`.

### EXPECTED

No formula in this repo, so there is no derived fill count. The hub HTML mentions 40 L containers as the future behaviour of the page, and says the page is not built. The strings to check are:

- `h1`: Top-up / Aquaroll planner
- `h2`: Coming soon
- Paragraph: This page will turn daily fresh use into fill-ups of 40 L Aquarolls or other containers. It is not built yet.

The 40 in that sentence is published copy, not a result from `assets/calc.js`. Do not multiply Water's daily litres by it and call the product this page's EXPECTED.

### ACTUAL

`evidence/coming-soon.json` entry for `topup.html`.

The redirect is the `/topup.html` row in [redirects](./redirects.md).

## Gotchas

- Water's tank-days line ("lasts about N days") is the Water feature. It is not an Aquaroll count.
- A future version of this page would need its own formula. Until that module exists, a drive that only checks the coming-soon paragraph is the whole proof.
