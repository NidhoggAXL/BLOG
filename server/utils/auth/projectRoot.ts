import fs from "node:fs";
import path from "node:path";

/**
 * 解析存放 `.keys` 的根目录。
 * dev 时 cwd 为项目根；`nuxt preview` / 部分部署方式 cwd 为 `.output`。
 */
export function resolveAuthKeysRoot(): string {
  const envRoot = process.env.AUTH_KEYS_ROOT || process.env.NUXT_PROJECT_ROOT;
  if (envRoot) return path.resolve(envRoot);

  const cwd = process.cwd();

  if (fs.existsSync(path.join(cwd, ".output", "server", "index.mjs"))) {
    return cwd;
  }

  if (fs.existsSync(path.join(cwd, "server", "index.mjs"))) {
    return cwd;
  }

  return cwd;
}
