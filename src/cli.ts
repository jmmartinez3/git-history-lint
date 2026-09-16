#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { lint } from "./linter.js";
import { formatFindings } from "./format.js";
import { loadHistory } from "./history.js";
import { loadConfig, type Config } from "./config.js";
import { applyFixes } from "./fix.js";

function lintMessageFile(path: string, config: Config, fix: boolean): void {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stderr.write(`git-history-lint: could not read ${path}: ${reason}\n`);
    process.exitCode = 2;
    return;
  }

  if (fix) {
    const fixed = applyFixes(text);
    if (fixed.changed) {
      writeFileSync(path, fixed.text, "utf8");
      text = fixed.text;
    }
  }

  const findings = lint(text, config);
  const useColor = process.stdout.isTTY === true;
  const output = formatFindings(findings, path, text, useColor);
  if (output) {
    process.stdout.write(output + "\n");
  }

  process.exitCode = findings.some((finding) => finding.severity === "error") ? 1 : 0;
}

export type ParsedArgs =
  | { mode: "history"; revRange: string | undefined }
  | { mode: "lint"; path: string; fix: boolean };

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv[0] === "--history") {
    return { mode: "history", revRange: argv[1] };
  }

  const fix = argv.includes("--fix");
  const path = argv.find((arg) => arg !== "--fix") ?? ".git/COMMIT_EDITMSG";
  return { mode: "lint", path, fix };
}

function lintHistory(revRange: string | undefined, config: Config): void {
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
    const findings = lint(commit.message, config);
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
  let config: Config;
  try {
    config = loadConfig();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stderr.write(`git-history-lint: could not load config: ${reason}\n`);
    process.exitCode = 2;
    return;
  }

  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.mode === "history") {
    lintHistory(parsed.revRange, config);
    return;
  }

  lintMessageFile(parsed.path, config, parsed.fix);
}

// Guarded so importing this module (e.g. from tests) doesn't run the CLI.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
