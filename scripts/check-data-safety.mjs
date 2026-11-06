#!/usr/bin/env node
/**
 * Fails CI when a change introduces destructive database operations.
 * This is intentionally conservative: production data must be preserved.
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function changedFiles() {
  const eventBefore = process.env.GITHUB_EVENT_BEFORE;
  const baseRef = process.env.GITHUB_BASE_REF;
  let range;

  if (baseRef) {
    git(["fetch", "--no-tags", "origin", baseRef]);
    range = `origin/${baseRef}...HEAD`;
  } else if (eventBefore && !/^0+$/.test(eventBefore)) {
    range = `${eventBefore}...HEAD`;
  } else {
    range = "HEAD^...HEAD";
  }

  try {
    return git(["diff", "--name-only", "--diff-filter=ACDMRTUXB", range])
      .split("\n")
      .filter(Boolean);
  } catch {
    return git(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"])
      .split("\n")
      .filter(Boolean);
  }
}

const protectedTables =
  "(?:profiles|barbershops|appointments|clients|customers|sales|external_sales|expenses|products|commissions|subscriptions|subscription_orders|payments|barbers|services)";
const checks = [
  { label: "DROP DATABASE/SCHEMA/TABLE/TYPE/DOMAIN/SEQUENCE", pattern: /\bDROP\s+(?:DATABASE|SCHEMA|TABLE|TYPE|DOMAIN|SEQUENCE)\b/i },
  { label: "TRUNCATE", pattern: /\bTRUNCATE\s+(?:TABLE\s+)?[\w".]+/i },
  { label: "client-side delete on protected tenant tables", pattern: /\.from\(\s*["'](?:profiles|barbershops|appointments|clients|customers|sales|external_sales|expenses|products|commissions|subscriptions|subscription_orders|payments|barbers|services)["']\s*\)\s*\.delete\s*\(/i },
  { label: "ALTER TABLE ... DROP COLUMN", pattern: /\bALTER\s+TABLE\b[\s\S]{0,500}?\bDROP\s+COLUMN\b/i },
  { label: "ON DELETE CASCADE", pattern: /\bON\s+DELETE\s+CASCADE\b/i },
  { label: "Supabase admin user deletion", pattern: /\bauth\.admin\.deleteUser\s*\(/i },
  { label: "client-side delete on protected tenant tables", pattern: new RegExp(`\\.from\\(\\s*["'`](${protectedTables})["'`]\\s*\\)\\s*\\.delete\\s*\\(`, "i") },
];

const files = changedFiles();
const violations = [];

for (const path of files) {
  if (!/^(supabase\/migrations\/.*\.sql|src\/.*\.(?:[cm]?[jt]sx?))$/i.test(path)) continue;
  let content;
  try {
    content = await readFile(path, "utf8");
  } catch {
    continue;
  }

  // Ignore SQL and JS comments to avoid blocking explanatory examples.
  const normalized = content
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

  for (const check of checks) {
    if (check.pattern.test(normalized)) {
      violations.push(`${path}: ${check.label}`);
    }
  }
}

if (violations.length) {
  console.error("\nDATA SAFETY BLOCK: potentially destructive changes are not allowed.");
  for (const violation of violations) console.error(` - ${violation}`);
  console.error("\nStop. Do not bypass this check. Follow DATA_PROTECTION_POLICY.md, obtain two explicit owner confirmations, and prove a restorable backup before any exceptional destructive operation.");
  process.exit(1);
}

console.log(`Data safety check passed. Reviewed ${files.length} changed file(s); no protected destructive operation detected.`);
