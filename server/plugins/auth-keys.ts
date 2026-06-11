import { ensureAuthKeys } from "../utils/auth/ensureAuthKeys";

export default defineNitroPlugin(() => {
  const { created } = ensureAuthKeys();
  if (created.length) {
    console.info("[auth] 已自动生成密钥:", created.join(", "));
  }
});
