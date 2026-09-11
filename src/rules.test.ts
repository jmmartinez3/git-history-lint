import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lint } from "./linter.js";

function findingFor(ruleId: string, text: string) {
  return lint(text).find((finding) => finding.ruleId === ruleId);
}

describe("empty-commit-message", () => {
  it("flags an empty string at 1:1", () => {
    const finding = findingFor("empty-commit-message", "");
    assert.deepEqual(finding && { line: finding.line, column: finding.column, length: finding.length }, {
      line: 1,
      column: 1,
      length: 1,
    });
  });

  it("flags whitespace and comment-only content", () => {
    const finding = findingFor("empty-commit-message", "  \n# comment\n\t\n");
    assert.ok(finding);
  });

  it("does not flag a message with real content", () => {
    assert.equal(findingFor("empty-commit-message", "Fix bug"), undefined);
  });
});

describe("subject-max-length", () => {
  it("does not flag a subject at exactly the limit", () => {
    const subject = "x".repeat(72);
    assert.equal(findingFor("subject-max-length", subject), undefined);
  });

  it("flags a subject one character over by exactly 1", () => {
    const subject = "x".repeat(73);
    const finding = findingFor("subject-max-length", subject);
    assert.deepEqual(finding && { column: finding.column, length: finding.length }, { column: 73, length: 1 });
  });

  it("computes length as the overage, not the subject length", () => {
    const subject = "x".repeat(100);
    const finding = findingFor("subject-max-length", subject);
    assert.deepEqual(finding && { column: finding.column, length: finding.length }, { column: 73, length: 28 });
  });
});

describe("subject-trailing-period", () => {
  it("points at the period itself", () => {
    const subject = "Fix bug.";
    const finding = findingFor("subject-trailing-period", subject);
    assert.deepEqual(finding && { column: finding.column, length: finding.length }, {
      column: subject.length,
      length: 1,
    });
  });

  it("does not flag a subject without a trailing period", () => {
    assert.equal(findingFor("subject-trailing-period", "Fix bug"), undefined);
  });
});

describe("blank-line-after-subject", () => {
  it("points at the whole second line when it's missing the blank separator", () => {
    const body = "Body text here";
    const finding = findingFor("blank-line-after-subject", `Subject line\n${body}`);
    assert.deepEqual(finding && { line: finding.line, column: finding.column, length: finding.length }, {
      line: 2,
      column: 1,
      length: body.length,
    });
  });

  it("does not flag a message with a blank line before the body", () => {
    assert.equal(findingFor("blank-line-after-subject", "Subject line\n\nBody text here"), undefined);
  });

  it("does not flag a subject with no body at all", () => {
    assert.equal(findingFor("blank-line-after-subject", "Subject line"), undefined);
  });
});

describe("trailing-whitespace", () => {
  it("points at the start of the trailing run and spans its length", () => {
    const finding = findingFor("trailing-whitespace", "Fix bug   ");
    assert.deepEqual(finding && { line: finding.line, column: finding.column, length: finding.length }, {
      line: 1,
      column: 8,
      length: 3,
    });
  });

  it("handles a trailing tab on a later line", () => {
    const finding = findingFor("trailing-whitespace", "Fix bug\n\nAnother line\t");
    assert.deepEqual(finding && { line: finding.line, column: finding.column, length: finding.length }, {
      line: 3,
      column: 13,
      length: 1,
    });
  });

  it("reports one finding per offending line", () => {
    const findings = lint("Fix bug \n\nfirst  \nsecond\t\t").filter((f) => f.ruleId === "trailing-whitespace");
    assert.deepEqual(
      findings.map((f) => f.line),
      [1, 3, 4],
    );
  });

  it("does not flag a message with no trailing whitespace", () => {
    assert.equal(findingFor("trailing-whitespace", "Fix bug\n\nBody text"), undefined);
  });
});

describe("imperative-mood", () => {
  it("flags an -ed word at or above the minimum length", () => {
    const finding = findingFor("imperative-mood", "Added feature");
    assert.deepEqual(finding && { column: finding.column, length: finding.length }, { column: 1, length: 5 });
  });

  it("flags an -ing word at or above the minimum length", () => {
    const finding = findingFor("imperative-mood", "Fixing bug");
    assert.deepEqual(finding && { column: finding.column, length: finding.length }, { column: 1, length: 6 });
  });

  it("does not flag a short -ing word below the minimum length", () => {
    assert.equal(findingFor("imperative-mood", "Bring popcorn"), undefined);
  });

  it("does not flag a word that isn't past-tense or gerund", () => {
    assert.equal(findingFor("imperative-mood", "Fix bug"), undefined);
  });
});

describe("issue-reference", () => {
  it("points at the reference and spans it exactly", () => {
    const finding = findingFor("issue-reference", "Fix bug #123");
    assert.deepEqual(finding && { column: finding.column, length: finding.length }, { column: 9, length: 4 });
  });

  it("does not flag a subject without an issue reference", () => {
    assert.equal(findingFor("issue-reference", "Fix bug entirely"), undefined);
  });
});
