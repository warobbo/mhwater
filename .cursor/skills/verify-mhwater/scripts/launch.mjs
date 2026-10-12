#!/usr/bin/env node
import { launch } from "./verify.mjs";

launch().catch((err) => {
  if (!err.alreadyReported) console.error(err.stack || err.message);
  process.exit(1);
});
