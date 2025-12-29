import * as fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

type PackageMetadata = {
  version?: string;
};

export function getReagentVersion(): string {
  try {
    const packagePath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json",
    );
    const content = fs.readFileSync(packagePath, "utf-8");
    const parsed = JSON.parse(content) as PackageMetadata;

    if (parsed.version) {
      return parsed.version;
    }
  } catch (error: unknown) {
    console.error("[Reagent] Failed to read package version:", error);
  }

  return "unknown";
}
