import { spawnSync } from "node:child_process";

const commands = [
  [process.execPath, ["scripts/typecheck-lite.mjs"]],
  [process.execPath, ["scripts/lint.mjs"]],
  [process.execPath, [
    "--experimental-strip-types",
    "scripts/run-tests.mjs",
    "tests/job-parser.test.ts",
    "tests/resume-parser.test.ts",
    "tests/match-engine.test.ts",
    "tests/rewrite-outreach.test.ts"
  ]],
  [process.execPath, ["--experimental-strip-types", "scripts/run-tests.mjs", "tests/e2e/api-flow.test.ts"]]
];

for (const [cmd, args] of commands) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("\nReferralForge validation passed");
