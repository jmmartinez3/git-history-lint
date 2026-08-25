import { execFileSync } from "node:child_process";

export interface Commit {
  hash: string;
  message: string;
}

// Control characters, not punctuation that could plausibly show up inside a
// commit message, so splitting on them can't be confused by the message body.
const FIELD_SEP = "\x1f";
const RECORD_SEP = "\x1e";

/**
 * Walks commit history via `git log`, oldest-filtering left to the caller
 * (git's own default order — newest first — is preserved). revRange is
 * passed straight through to `git log`, so anything git accepts there
 * (a branch name, `HEAD~20..HEAD`, `--all`, ...) works.
 */
export function loadHistory(revRange?: string): Commit[] {
  const format = `%H${FIELD_SEP}%B${RECORD_SEP}`;
  const args = ["log", `--format=${format}`];
  if (revRange) args.push(revRange);

  const output = execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  });

  return output
    .split(RECORD_SEP)
    .map((record) => record.replace(/^\n+/, ""))
    .filter((record) => record.length > 0)
    .map((record) => {
      const sepIndex = record.indexOf(FIELD_SEP);
      return {
        hash: record.slice(0, sepIndex),
        message: record.slice(sepIndex + 1),
      };
    });
}
