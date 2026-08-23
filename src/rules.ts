import type { Finding, Rule } from "./linter.js";

const SUBJECT_MAX_LENGTH = 72;

// git strips lines starting with the comment char (default "#") before
// recording the message, so a commit-msg hook sees them too and has to
// ignore them the same way git will.
function isComment(line: string): boolean {
  return line.startsWith("#");
}

const emptyMessage: Rule = {
  id: "empty-commit-message",
  check(lines) {
    const hasContent = lines.some((line) => !isComment(line) && line.trim().length > 0);
    if (hasContent) return [];
    return [
      {
        ruleId: "empty-commit-message",
        severity: "error",
        message: "commit message has no content (only comments or blank lines)",
        line: 1,
        column: 1,
        length: 1,
      },
    ];
  },
};

const subjectMaxLength: Rule = {
  id: "subject-max-length",
  check(lines) {
    const subject = lines[0] ?? "";
    if (isComment(subject) || subject.length <= SUBJECT_MAX_LENGTH) return [];
    const overBy = subject.length - SUBJECT_MAX_LENGTH;
    return [
      {
        ruleId: "subject-max-length",
        severity: "warning",
        message: `subject line is ${subject.length} characters, ${overBy} over the ${SUBJECT_MAX_LENGTH}-character limit — it will wrap in \`git log\` and get truncated in most UIs`,
        line: 1,
        column: SUBJECT_MAX_LENGTH + 1,
        length: overBy,
      },
    ];
  },
};

const subjectTrailingPeriod: Rule = {
  id: "subject-trailing-period",
  check(lines) {
    const subject = lines[0] ?? "";
    if (isComment(subject) || !subject.endsWith(".")) return [];
    return [
      {
        ruleId: "subject-trailing-period",
        severity: "warning",
        message: "subject line ends with a period — conventional git style omits it",
        line: 1,
        column: subject.length,
        length: 1,
      },
    ];
  },
};

const blankLineAfterSubject: Rule = {
  id: "blank-line-after-subject",
  check(lines) {
    const subject = lines[0] ?? "";
    if (isComment(subject) || subject.trim().length === 0) return [];

    const bodyLines = lines.slice(1).filter((line) => !isComment(line));
    const hasBody = bodyLines.some((line) => line.trim().length > 0);
    if (!hasBody) return [];

    const second = lines[1] ?? "";
    if (second.trim().length === 0) return [];

    return [
      {
        ruleId: "blank-line-after-subject",
        severity: "error",
        message:
          "missing blank line between subject and body — git and most tools treat everything before the first blank line as the subject",
        line: 2,
        column: 1,
        length: Math.max(second.length, 1),
      },
    ];
  },
};

const trailingWhitespace: Rule = {
  id: "trailing-whitespace",
  check(lines) {
    const findings: Finding[] = [];
    lines.forEach((line, index) => {
      if (isComment(line)) return;
      const match = /[ \t]+$/.exec(line);
      if (!match) return;
      findings.push({
        ruleId: "trailing-whitespace",
        severity: "warning",
        message: "trailing whitespace",
        line: index + 1,
        column: match.index + 1,
        length: match[0].length,
      });
    });
    return findings;
  },
};

export const rules: Rule[] = [
  emptyMessage,
  subjectMaxLength,
  subjectTrailingPeriod,
  blankLineAfterSubject,
  trailingWhitespace,
];
