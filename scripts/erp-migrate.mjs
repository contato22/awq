#!/usr/bin/env node
import { runCli } from "./erp-migrate-lib.mjs";

process.exit(runCli(process.argv.slice(2)));
