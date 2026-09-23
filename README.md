# motorhomewater.co.uk

This repository is the Render static site `mhwater`.

`https://motorhomewater.co.uk` and `https://mhwater.onrender.com` do not publish calculator pages. Those pages live on the Water hub at [https://motorhometools.co.uk/water/](https://motorhometools.co.uk/water/).

Render serves an existing file with HTTP 200 and skips a redirect rule for that path. The HTML pages for the paths below are not in this repo, so a saved Dashboard redirect can return HTTP 301. A path with no file and no saved rule still returns 404.

The same map is documented in [`_redirects`](_redirects) and [`render.yaml`](render.yaml). This repo does not change DNS and does not change `motorhometools.co.uk`.

| Request path | Hub URL |
| --- | --- |
| `/` and `/index.html` | `https://motorhometools.co.uk/water/` |
| `/gas.html` | `https://motorhometools.co.uk/water/gas.html` |
| `/tanks.html` | `https://motorhometools.co.uk/water/tanks.html` |
| `/cassette.html` | `https://motorhometools.co.uk/water/cassette.html` |
| `/bottles.html` | `https://motorhometools.co.uk/water/bottles.html` |
| `/hotwater.html` | `https://motorhometools.co.uk/water/hotwater.html` |
| `/winterising.html` | `https://motorhometools.co.uk/water/winterising.html` |
| `/topup.html` | `https://motorhometools.co.uk/water/topup.html` |
| any other path (`/*`) | `https://motorhometools.co.uk/water/` |

Do not add those HTML files back. A file at the path answers 200 and blocks the redirect.

## Deploy

The existing `mhwater` static site auto-deploys from `main`.

- **Build Command:** empty
- **Publish Directory:** `.`
- Environment variable: `SKIP_INSTALL_DEPS=true`

`robots.txt` is `Disallow: /`. `sitemap.xml` lists no URLs.

After deploy, these paths should not return an HTML body from this host:

```bash
curl -sI https://motorhomewater.co.uk/
curl -sI https://motorhomewater.co.uk/gas.html
curl -sI https://motorhomewater.co.uk/cassette.html
```
