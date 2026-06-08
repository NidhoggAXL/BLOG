import { ensureAuthBootstrap } from '../utils/auth/bootstrap'

export default defineNitroPlugin(async () => {
  try {
    await ensureAuthBootstrap()
  } catch (err) {
    console.error('[auth] bootstrap 失败:', err)
  }
})
