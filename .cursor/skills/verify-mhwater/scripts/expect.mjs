#!/usr/bin/env node
import { expect } from "./verify.mjs";

expect(process.argv[2]).catch((err) => {
  if (!err.alreadyReported) console.error(err.stack || err.message);
  process.exit(1);
});
