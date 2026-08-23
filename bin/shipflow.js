#!/usr/bin/env node
import { main } from "../src/cli.js";

const exitCode = await main();
process.exitCode = exitCode;
