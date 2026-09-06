import { splitLines } from "./linter.js";

/**
 * Rules with fixes here. The rest (missing blank line, imperative mood,
 * issue references, ...) need a human to decide what the text should say,
 * so there's nothing safe to auto-apply for them.
 */
export const FIXABLE_RULE_IDS = ["trailing-whitespace", "subject-trailing-period"] as const;

function isComment(line: string): boolean {
  return line.startsWith("#");
}

/**
 * Strips trailing whitespace from every non-comment line and a trailing
 * period from the subject. Re-joins with "\n" regardless of the source line
 * ending, since splitLines already normalized \r\n and \r on the way in —
 * fine for a commit message, which git treats as plain text either way.
 */
export function applyFixes(text: string): { text: string; changed: boolean } {
  const lines = splitLines(text);
  const fixedLines = lines.map((line, index) => {
    if (isComment(line)) return line;
    let fixed = line.replace(/[ \t]+$/, "");
    if (index === 0 && fixed.endsWith(".")) {
      fixed = fixed.slice(0, -1);
    }
    return fixed;
  });

  const changed = fixedLines.some((line, index) => line !== lines[index]);
  if (!changed) return { text, changed: false };
  return { text: fixedLines.join("\n"), changed: true };
}
