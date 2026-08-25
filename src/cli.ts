#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { lint } from "./linter.js";
import { formatFindings } from "./format.js";
import { loadHistory } from "./history.js";

function lintMessageFile(path: string): void {
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

function lintHistory(revRange?: string): void {
  let commits;
  try {
    commits = loadHistory(revRange);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stderr.write(`git-history-lint: could not read git history: ${reason}\n`);
    process.exitCode = 2;
    return;
  }

  const useColor = process.stdout.isTTY === true;
  const reports: string[] = [];
  let hasError = false;

  for (const commit of commits) {
    const findings = lint(commit.message);
    if (findings.length === 0) continue;
    if (findings.some((finding) => finding.severity === "error")) hasError = true;
    reports.push(formatFindings(findings, commit.hash.slice(0, 7), commit.message, useColor));
  }

  if (reports.length > 0) {
    process.stdout.write(reports.join("\n\n") + "\n");
  }
  process.exitCode = hasError ? 1 : 0;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args[0] === "--history") {
    lintHistory(args[1]);
    return;
  }

  lintMessageFile(args[0] ?? ".git/COMMIT_EDITMSG");
}

main();
