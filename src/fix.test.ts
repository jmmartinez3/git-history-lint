import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyFixes, FIXABLE_RULE_IDS } from "./fix.js";

describe("applyFixes", () => {
  it("strips trailing whitespace from any line", () => {
    const result = applyFixes("Fix bug  \n\nBody line\t");
    assert.equal(result.changed, true);
    assert.equal(result.text, "Fix bug\n\nBody line");
  });

  it("strips a trailing period from the subject", () => {
    const result = applyFixes("Fix the bug.");
    assert.equal(result.changed, true);
    assert.equal(result.text, "Fix the bug");
  });

  it("leaves a trailing period on body lines alone", () => {
    const result = applyFixes("Fix the bug\n\nBecause it was broken.");
    assert.equal(result.changed, false);
    assert.equal(result.text, "Fix the bug\n\nBecause it was broken.");
  });

  it("strips trailing whitespace before checking for a trailing period", () => {
    const result = applyFixes("Fix the bug. \t");
    assert.equal(result.changed, true);
    assert.equal(result.text, "Fix the bug");
  });

  it("does not touch comment lines", () => {
    const result = applyFixes("Fix bug\n# trailing space here   \n");
    assert.equal(result.changed, false);
    assert.equal(result.text, "Fix bug\n# trailing space here   \n");
  });

  it("reports changed: false and returns the original text unchanged", () => {
    const original = "Fix bug\n\nAlready clean";
    const result = applyFixes(original);
    assert.equal(result.changed, false);
    assert.equal(result.text, original);
  });

  it("normalizes CRLF line endings to \\n whenever a fix is applied", () => {
    const result = applyFixes("Fix bug \r\n\r\nBody line");
    assert.equal(result.changed, true);
    assert.equal(result.text, "Fix bug\n\nBody line");
  });

  it("only fixes the two rules that have unambiguous corrections", () => {
    assert.deepEqual(FIXABLE_RULE_IDS, ["trailing-whitespace", "subject-trailing-period"]);
  });
});
