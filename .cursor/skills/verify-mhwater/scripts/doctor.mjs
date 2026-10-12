#!/usr/bin/env node
import { doctor } from "./verify.mjs";

doctor().catch((err) => {
  if (!err.alreadyReported) console.error(err.stack || err.message);
  process.exit(1);
});
