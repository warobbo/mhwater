#!/usr/bin/env node
import { cleanup } from "./verify.mjs";

cleanup().catch((err) => {
  if (!err.alreadyReported) console.error(err.stack || err.message);
  process.exit(1);
});
