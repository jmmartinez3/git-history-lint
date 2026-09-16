import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "./cli.js";

describe("parseArgs", () => {
  it("defaults to linting .git/COMMIT_EDITMSG with fix off", () => {
    assert.deepEqual(parseArgs([]), { mode: "lint", path: ".git/COMMIT_EDITMSG", fix: false });
  });

  it("lints an explicit path", () => {
    assert.deepEqual(parseArgs(["msg.txt"]), { mode: "lint", path: "msg.txt", fix: false });
  });

  it("turns on fix mode without disturbing the default path", () => {
    assert.deepEqual(parseArgs(["--fix"]), { mode: "lint", path: ".git/COMMIT_EDITMSG", fix: true });
  });

  it("accepts --fix alongside an explicit path in either order", () => {
    assert.deepEqual(parseArgs(["msg.txt", "--fix"]), { mode: "lint", path: "msg.txt", fix: true });
    assert.deepEqual(parseArgs(["--fix", "msg.txt"]), { mode: "lint", path: "msg.txt", fix: true });
  });

  it("switches to history mode on --history", () => {
    assert.deepEqual(parseArgs(["--history"]), { mode: "history", revRange: undefined });
  });

  it("passes the rev range through to history mode", () => {
    assert.deepEqual(parseArgs(["--history", "HEAD~20..HEAD"]), {
      mode: "history",
      revRange: "HEAD~20..HEAD",
    });
  });

  it("ignores --fix in history mode since it only applies to lint mode", () => {
    assert.deepEqual(parseArgs(["--history", "--fix"]), { mode: "history", revRange: "--fix" });
  });
});
