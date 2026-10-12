#!/usr/bin/env node
import { drive } from "./verify.mjs";

const feature = process.argv[2];
if (!feature) {
  console.error("Usage: drive.mjs <redirects|water|gas|tanks|cassette|coming-soon>");
  process.exit(2);
}

drive(feature).catch((err) => {
  if (!err.alreadyReported) console.error(err.stack || err.message);
  process.exit(1);
});
