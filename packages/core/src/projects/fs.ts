import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import type { IdentityFs } from "./identity.js";

export const realFs: IdentityFs = {
  exists(path) {
    return existsSync(path);
  },
  readText(path) {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return null;
    }
  },
  spawn(cmd, args, opts) {
    const result = spawnSync(cmd, args, { cwd: opts.cwd, encoding: "utf8", timeout: 1000 });
    return {
      stdout: typeof result.stdout === "string" ? result.stdout : "",
      exitCode: result.status ?? 1,
    };
  },
};
