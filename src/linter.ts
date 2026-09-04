import type { Config } from "./config.js";
import { rules } from "./rules.js";

export interface Finding {
  ruleId: string;
  severity: "error" | "warning";
  message: string;
  /** 1-based */
  line: number;
  /** 1-based */
  column: number;
  /** how many characters the underline should span, minimum 1 */
  length: number;
}

export interface Rule {
  id: string;
  check(lines: string[]): Finding[];
}

/**
 * Splits on any line ending so a message copied from a Windows editor
 * still gets correct line numbers instead of one giant first line.
 */
export function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}

export function lint(text: string, config: Config = { rules: {} }): Finding[] {
  const lines = splitLines(text);
  const findings = rules.flatMap((rule) => {
    const override = config.rules[rule.id];
    if (override === "off") return [];
    const results = rule.check(lines);
    if (override === "warning" || override === "error") {
      return results.map((finding) => ({ ...finding, severity: override }));
    }
    return results;
  });
  findings.sort((a, b) => a.line - b.line || a.column - b.column);
  return findings;
}
