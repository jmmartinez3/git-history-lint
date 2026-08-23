#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { lint } from "./linter.js";
import { formatFindings } from "./format.js";

function main(): void {
  const path = process.argv[2] ?? ".git/COMMIT_EDITMSG";

  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stderr.write(`git-history-lint: could not read ${path}: ${reason}\n`);
    process.exitCode = 2;
    return;
  }

  const findings = lint(text);
  const useColor = process.stdout.isTTY === true;
  const output = formatFindings(findings, path, text, useColor);
  if (output) {
    process.stdout.write(output + "\n");
  }

  process.exitCode = findings.some((finding) => finding.severity === "error") ? 1 : 0;
}

main();
