// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: false },

  experimental: {
    viteEnvironmentApi: false,
    /** 避免 dev 时 Vite 无法解析 #app-manifest（Nuxt 3.21 + Vite 7） */
    appManifest: false,
  },

  modules: ["@element-plus/nuxt", "@pinia/nuxt"],

  elementPlus: {
    importStyle: "css",
  },

  runtimeConfig: {
    mysqlHost: process.env.MYSQL_HOST || "127.0.0.1",
    mysqlPort: Number(process.env.MYSQL_PORT || 3306),
    mysqlUser: process.env.MYSQL_USER || "root",
    mysqlPassword: process.env.MYSQL_PASSWORD || "",
    mysqlDatabase: process.env.MYSQL_DATABASE || "",
    authJwtPrivateKeyPath:
      process.env.AUTH_JWT_PRIVATE_KEY_PATH || ".keys/jwt-private.pem",
    authJwtPublicKeyPath:
      process.env.AUTH_JWT_PUBLIC_KEY_PATH || ".keys/jwt-public.pem",
    authRsaPrivateKeyPath:
      process.env.AUTH_RSA_PRIVATE_KEY_PATH || ".keys/rsa-private.pem",
    authRsaPublicKeyPath:
      process.env.AUTH_RSA_PUBLIC_KEY_PATH || ".keys/rsa-public.pem",
    authCookieName: process.env.AUTH_COOKIE_NAME || "blog_auth",
    authJwtExpiresIn: process.env.AUTH_JWT_EXPIRES_IN || "7d",
    authBootstrapUsername: process.env.AUTH_BOOTSTRAP_USERNAME || "admin",
    authBootstrapPassword: process.env.AUTH_BOOTSTRAP_PASSWORD || "admin123",
    authLoginRateLimitPerMin: Number(process.env.AUTH_LOGIN_RATE_LIMIT_PER_MIN || 10),
    authCookieSecure: process.env.AUTH_COOKIE_SECURE !== "false",
    authAllowPlainPassword: process.env.AUTH_ALLOW_PLAIN_PASSWORD === "true",
    /** 公开展示 wikilink 链接前缀 */
    publicWikilinkBasePath: process.env.PUBLIC_WIKILINK_BASE_PATH || "/blog",
    /** 后台 wikilink 链接前缀 */
    adminWikilinkBasePath: process.env.ADMIN_WIKILINK_BASE_PATH || "/admin/posts",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    ollamaChatModel: process.env.OLLAMA_CHAT_MODEL || "qwen3.5:0.8b",
    ollamaEmbedModel: process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text",
    aiEnabled: process.env.AI_ENABLED !== "false",
    aiMaxContextChunks: Number(process.env.AI_MAX_CONTEXT_CHUNKS || 4),
    aiWikilinkMaxSuggestions: Number(process.env.AI_WIKILINK_MAX_SUGGESTIONS || 6),
    aiRequestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS || 120000),
    aiPublicRateLimitPerMin: Number(process.env.AI_PUBLIC_RATE_LIMIT_PER_MIN || 10),
    public: {
      aiEnabled: process.env.AI_ENABLED !== "false",
    },
  },

  nitro: {
    compressPublicAssets: true,
  },

  routeRules: {
    "/": { redirect: "/blog" },
    "/knowledge-graph": { ssr: false },
    "/admin/graph": { ssr: false },
    "/admin/library": { redirect: "/admin/posts/directories" },
    /** 公开 API 由服务端 defineCachedEventHandler + 数据版本号失效，避免 SWR 导致刷新仍读到旧数据 */
    "/api/public/**": { cache: false },
  },

  css: [
    "modern-normalize/modern-normalize.css",
    "~/assets/less/_tokens.less",
    "~/assets/styles/global.less",
    "~/assets/styles/markdown-body.less",
    "~/assets/styles/markdown-callouts.less",
    "~/assets/styles/markdown-shiki.less",
    "~/assets/less/main.less",
    "~/assets/public/less/public-shell.less",
    "~/assets/public/less/public-loading.less",
    "element-plus/theme-chalk/dark/css-vars.css",
  ],

  imports: {
    dirs: ["stores"],
  },

  /** public/shared 子目录组件保持 AppTopNav、BlogMainHeader 等原名（无 Public 前缀） */
  components: [
    {
      path: "~/components",
      ignore: ["public/**", "shared/**"],
    },
    {
      path: "~/components/public",
      pathPrefix: false,
    },
    {
      path: "~/components/shared",
      pathPrefix: false,
    },
    {
      path: "~/components/library",
      pathPrefix: false,
    },
  ],

  app: {
    head: {
      title: "个人博客",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
    pageTransition: false,
    layoutTransition: false,
  },

  vite: {
    css: {
      preprocessorOptions: {
        less: {
          math: "always",
        },
      },
    },
  },
})
