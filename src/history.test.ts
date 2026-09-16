import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadHistory } from "./history.js";

const tempRoots: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "git-history-lint-test-"));
  tempRoots.push(dir);
  execFileSync("git", ["init", "--quiet"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  return dir;
}

function commit(dir: string, message: string): void {
  execFileSync("git", ["commit", "--allow-empty", "--quiet", "-m", message], { cwd: dir });
}

after(() => {
  for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });
});

describe("loadHistory", () => {
  it("returns commits newest first with normalized trailing newlines", () => {
    const dir = makeRepo();
    commit(dir, "Add feature");
    commit(dir, "Fix bug\n\nBecause it crashed on empty input.");

    const commits = loadHistory(undefined, dir);
    assert.equal(commits.length, 2);
    assert.equal(commits[0].message, "Fix bug\n\nBecause it crashed on empty input.\n");
    assert.equal(commits[1].message, "Add feature\n");
  });

  it("reports full 40-character hashes", () => {
    const dir = makeRepo();
    commit(dir, "Add feature");

    const commits = loadHistory(undefined, dir);
    assert.match(commits[0].hash, /^[0-9a-f]{40}$/);
  });

  it("passes a rev range straight through to git log", () => {
    const dir = makeRepo();
    commit(dir, "First");
    commit(dir, "Second");
    commit(dir, "Third");

    const commits = loadHistory("HEAD~1..HEAD", dir);
    assert.equal(commits.length, 1);
    assert.equal(commits[0].message, "Third\n");
  });

  it("throws when the repo has no commits yet, same as a bare git log would", () => {
    const dir = makeRepo();
    assert.throws(() => loadHistory(undefined, dir));
  });
});
