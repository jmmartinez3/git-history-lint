import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type RuleOverride = "off" | "warning" | "error";

export interface Config {
  rules: Record<string, RuleOverride>;
}

const CONFIG_FILENAME = ".git-history-lint.json";

const defaultConfig: Config = { rules: {} };

function isRuleOverride(value: unknown): value is RuleOverride {
  return value === "off" || value === "warning" || value === "error";
}

function parseConfig(raw: string, path: string): Config {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${path}: invalid JSON (${reason})`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${path}: expected a JSON object`);
  }

  const rulesValue = (parsed as Record<string, unknown>).rules;
  if (rulesValue === undefined) return { rules: {} };
  if (typeof rulesValue !== "object" || rulesValue === null || Array.isArray(rulesValue)) {
    throw new Error(`${path}: "rules" must be an object`);
  }

  const rules: Record<string, RuleOverride> = {};
  for (const [ruleId, value] of Object.entries(rulesValue as Record<string, unknown>)) {
    if (!isRuleOverride(value)) {
      throw new Error(
        `${path}: rule "${ruleId}" has invalid setting ${JSON.stringify(value)} — expected "off", "warning", or "error"`,
      );
    }
    rules[ruleId] = value;
  }
  return { rules };
}

/**
 * Walks upward from startDir looking for .git-history-lint.json, the same
 * way git walks up looking for .git. Returns the all-defaults config if
 * none is found, so callers don't need to special-case "no config file".
 */
export function loadConfig(startDir: string = process.cwd()): Config {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, CONFIG_FILENAME);
    try {
      const raw = readFileSync(candidate, "utf8");
      return parseConfig(raw, candidate);
    } catch (error) {
      const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") throw error;
    }

    const parent = dirname(dir);
    if (parent === dir) return defaultConfig;
    dir = parent;
  }
}
