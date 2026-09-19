# git-history-lint

A linter for git commit messages. It checks the message you're about to
commit against a handful of style rules and reports problems the way a
compiler would: file, line, column, the offending source line, and a caret
pointing at the exact character.

Every commit message ends up in `git log` forever, and most of the damage
(unreadable `--oneline` output, subjects that wrap in review tools, missing
body separators) happens at write time. Catching it in the `commit-msg` hook,
before the commit exists, is cheaper than fixing it later with `rebase -i`.

No dependencies. No lockfile. Standard library only.

## Rules (so far)

- `empty-commit-message` — the message is blank once comment lines are stripped
- `subject-max-length` — subject line over 72 characters
- `subject-trailing-period` — subject ends with `.`
- `blank-line-after-subject` — body present but no blank line separating it from the subject
- `trailing-whitespace` — trailing spaces or tabs on any non-comment line
- `imperative-mood` — subject's first word looks past-tense or gerund ("Added", "Fixing")
  instead of a command ("Add", "Fix"). This is a suffix check, not a dictionary, so it can
  miss real conjugations and occasionally flag a word that's already imperative but happens
  to end in `-ed` or `-ing` (like "Bring").
- `issue-reference` — subject line contains something like `#123`; put it in the body instead
  so it doesn't eat into the subject length limit

## Building

There's nothing to install. Point any TypeScript compiler at `src/`:

```sh
tsc
```

This produces `dist/cli.js`, runnable directly with node.

## Usage

Lint a message file directly:

```sh
node dist/cli.js path/to/message.txt
```

With no argument it reads `.git/COMMIT_EDITMSG`, which is exactly what a
`commit-msg` hook receives. Given this message:

```
Added new feature.
This explains why it was needed.
```

it reports:

```
.git/COMMIT_EDITMSG:1:19
  1 | Added new feature.
    |                   ^
  warning  subject line ends with a period — conventional git style omits it  [subject-trailing-period]

.git/COMMIT_EDITMSG:2:1
  2 | This explains why it was needed.
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  error  missing blank line between subject and body — git and most tools treat everything before the first blank line as the subject  [blank-line-after-subject]
```

Exit code is 1 if any finding is an error, 0 otherwise (warnings alone don't
fail the hook).

### Auto-fixing

Two rules have an unambiguous correction: `trailing-whitespace` and
`subject-trailing-period`. Pass `--fix` to strip trailing whitespace and a
trailing subject period before linting, rewriting the message file in place:

```sh
node dist/cli.js --fix path/to/message.txt
```

Everything else — a missing blank line, a subject that isn't imperative, an
issue reference in the wrong place — needs a human to decide what the text
should say, so those still just get reported.

To wire it in as a hook:

```sh
#!/bin/sh
# .git/hooks/commit-msg
node dist/cli.js "$1"
```

Git passes the path to the message file as the hook's first argument, which
lines up with what the CLI expects.

## Configuration

Every rule is on by default. To turn one off, or to change whether it fails
the hook, put a `.git-history-lint.json` next to your repo's `.git`
directory (or anywhere above the message file being linted — it walks
upward the same way git looks for `.git`):

```json
{
  "rules": {
    "subject-max-length": "off",
    "issue-reference": "error"
  }
}
```

Each entry under `rules` is a rule id (see the list above) mapped to
`"off"`, `"warning"`, or `"error"`. `"off"` drops the rule's findings
entirely; `"warning"` and `"error"` keep the rule running but replace its
built-in severity, which is what decides the process exit code. Rules left
out of the file keep their default severity. No config file at all is the
same as an empty one — every rule runs at its default.

## Scanning history

To check messages that are already in `git log`, instead of a single
pending one:

```sh
node dist/cli.js --history
```

This shells out to `git log` for every commit reachable from `HEAD` and
lints each message on its own, printing one code frame per commit that has
a finding, labeled with its short hash instead of a file path. An optional
second argument is passed straight through to `git log` as the rev range,
so you can scope it:

```sh
node dist/cli.js --history main..feature-branch
node dist/cli.js --history HEAD~50..
```

Exit code follows the same rule as single-message mode: 1 if any commit in
the range has an error-level finding, 0 otherwise.

## Testing

```sh
npm test
```

This compiles with `tsc` and runs everything under `dist/` through node's
built-in test runner (`node --test`), so there's nothing extra to install.
Each source file with behavior worth pinning down has a matching
`*.test.ts` next to it: `rules.test.ts` checks every rule's finding
(position, length, and the false-positive cases each one has to avoid),
`config.test.ts` covers config discovery, upward directory walking, and the
malformed-file error messages, `cli.test.ts` covers argument parsing, and
`fix.test.ts` covers the `--fix` rewrite. `history.test.ts` actually shells
out to `git` against a temp repo created with `mkdtempSync` — real commits,
not fixtures — so it also serves as an integration check that `loadHistory`
parses whatever format `git log` happens to produce.

There's no coverage tooling wired in; the tests are meant to document
behavior and catch regressions in the position math, not to hit a number.

## Library use

`lint(text: string): Finding[]` in `src/linter.ts` is the whole API surface.
Each `Finding` carries `ruleId`, `severity`, `message`, `line`, `column`, and
`length` (how many characters to underline). `formatFindings` in
`src/format.ts` turns a list of findings into the printable code-frame form
shown above, if you want the report without the CLI wrapper. `loadHistory`
in `src/history.ts` returns `{ hash, message }` for each commit in a rev
range, if you want to drive the walk yourself instead of going through the
CLI's `--history` flag. `loadConfig` in `src/config.ts` finds and parses
`.git-history-lint.json`, returning the `Config` object `lint` accepts as
its optional second argument.
