import type { Finding } from "./linter.js";

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

function paint(useColor: boolean, code: string, text: string): string {
  return useColor ? `${code}${text}${RESET}` : text;
}

/**
 * Renders one finding as a small code frame: the offending source line
 * plus a caret underline at the exact column, in the spirit of compiler
 * error output. That underline is the whole point of tracking columns
 * instead of just line numbers.
 */
export function formatFinding(finding: Finding, source: string, lines: string[], useColor: boolean): string {
  const codeLine = lines[finding.line - 1] ?? "";
  const gutter = String(finding.line);
  const indent = " ".repeat(gutter.length);
  const pointer = " ".repeat(Math.max(finding.column - 1, 0)) + "^".repeat(Math.max(finding.length, 1));

  const severityColor = finding.severity === "error" ? RED : YELLOW;
  const header = paint(useColor, BOLD, `${source}:${finding.line}:${finding.column}`);
  const codeRow = `  ${gutter} | ${codeLine}`;
  const pointerRow = `  ${indent} | ${paint(useColor, severityColor, pointer)}`;
  const summary = `  ${paint(useColor, severityColor, finding.severity)}  ${finding.message}  ${paint(
    useColor,
    DIM,
    `[${finding.ruleId}]`,
  )}`;

  return [header, codeRow, pointerRow, summary].join("\n");
}

export function formatFindings(findings: Finding[], source: string, text: string, useColor: boolean): string {
  if (findings.length === 0) return "";
  const lines = text.split(/\r\n|\r|\n/);
  return findings.map((finding) => formatFinding(finding, source, lines, useColor)).join("\n\n");
}
