import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./config.js";

const tempRoots: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "git-history-lint-test-"));
  tempRoots.push(dir);
  return dir;
}

after(() => {
  for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("returns an empty-rules config when no file is found up the tree", () => {
    const root = makeTempDir();
    const nested = join(root, "a", "b");
    mkdirSync(nested, { recursive: true });
    assert.deepEqual(loadConfig(nested), { rules: {} });
  });

  it("parses a config file in the start directory", () => {
    const root = makeTempDir();
    writeFileSync(
      join(root, ".git-history-lint.json"),
      JSON.stringify({ rules: { "subject-max-length": "off" } }),
    );
    assert.deepEqual(loadConfig(root), { rules: { "subject-max-length": "off" } });
  });

  it("walks upward to find a config file in an ancestor directory", () => {
    const root = makeTempDir();
    const nested = join(root, "a", "b");
    mkdirSync(nested, { recursive: true });
    writeFileSync(
      join(root, ".git-history-lint.json"),
      JSON.stringify({ rules: { "issue-reference": "error" } }),
    );
    assert.deepEqual(loadConfig(nested), { rules: { "issue-reference": "error" } });
  });

  it("stops at the nearest config file instead of merging with ancestors", () => {
    const root = makeTempDir();
    const nested = join(root, "a");
    mkdirSync(nested, { recursive: true });
    writeFileSync(
      join(root, ".git-history-lint.json"),
      JSON.stringify({ rules: { "subject-max-length": "off" } }),
    );
    writeFileSync(join(nested, ".git-history-lint.json"), JSON.stringify({ rules: {} }));
    assert.deepEqual(loadConfig(nested), { rules: {} });
  });

  it("treats a missing rules key as an empty-rules config", () => {
    const root = makeTempDir();
    writeFileSync(join(root, ".git-history-lint.json"), JSON.stringify({}));
    assert.deepEqual(loadConfig(root), { rules: {} });
  });

  it("throws with the file path on invalid JSON", () => {
    const root = makeTempDir();
    const path = join(root, ".git-history-lint.json");
    writeFileSync(path, "{ not json");
    assert.throws(() => loadConfig(root), new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  it("throws when the top-level value isn't an object", () => {
    const root = makeTempDir();
    writeFileSync(join(root, ".git-history-lint.json"), JSON.stringify(["nope"]));
    assert.throws(() => loadConfig(root), /expected a JSON object/);
  });

  it("throws when rules isn't an object", () => {
    const root = makeTempDir();
    writeFileSync(join(root, ".git-history-lint.json"), JSON.stringify({ rules: "off" }));
    assert.throws(() => loadConfig(root), /"rules" must be an object/);
  });

  it("throws on an unrecognized rule setting, naming the rule and the bad value", () => {
    const root = makeTempDir();
    writeFileSync(
      join(root, ".git-history-lint.json"),
      JSON.stringify({ rules: { "subject-max-length": "disabled" } }),
    );
    assert.throws(() => loadConfig(root), /"subject-max-length".*"disabled"/s);
  });
});
