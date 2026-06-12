# blog-com

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

基于 **Nuxt 3** 的个人博客与知识图谱全栈项目：公开展示 + 后台管理 + Wikilink 双链 + 可选本地 AI 问答。

---

## 特性

| 模块 | 说明 |
| --- | --- |
| 公开展示 | 博客首页、目录浏览、文章详情、公开知识图谱 |
| 后台管理 | 文章编写 / 导入、目录管理、仪表盘、个人资料 |
| Markdown | 服务端 `marked` + `Shiki` 高亮，编辑器预览与线上 HTML 一致 |
| Wikilink | `[[slug]]` 双链解析、图谱可视化（D3） |
| 认证 | JWT + HttpOnly Cookie；HTTPS 下 RSA 加密登录，HTTP 可配置明文回退 |
| AI（可选） | 对接本地 [Ollama](https://ollama.com/)，RAG 检索 + 公开页 AI 对话 |

---

## 技术栈

- **框架**：Nuxt 3、Vue 3、TypeScript
- **UI**：Element Plus、Less
- **数据**：MySQL 8（`mysql2`）
- **编辑器**：CodeMirror 6、Vditor
- **可视化**：D3、ECharts
- **部署**：GitHub Actions、PM2、Nginx

---

## 环境要求

- Node.js **20+**
- MySQL **8.0+**
- （可选）Ollama，用于 AI 功能

---

## 快速开始

### 1. 克隆与安装

```bash
git clone https://github.com/NidhoggAXL/BLOG.git
cd BLOG

cp .env.example .env
# 编辑 .env，至少填写 MYSQL_* 与 AUTH_BOOTSTRAP_*
npm install
```

### 2. 生成密钥

```bash
npm run auth:keys
```

会在 `.keys/` 目录生成 JWT / RSA 密钥对（已在 `.gitignore` 中，勿提交）。

### 3. 准备数据库

**方式 A：一键初始化（推荐）**

在项目根目录执行（库名默认 `blog`，可在 `db/01-create-database.sql` 中修改）：

```bash
mysql -u root -p < db/00-init-all.sql
```

**方式 B：按编号分步执行**

```bash
mysql -u root -p < db/01-create-database.sql
mysql -u root -p < db/02-schema-directories.sql
mysql -u root -p < db/03-schema-posts.sql
mysql -u root -p < db/04-schema-post-aliases.sql
mysql -u root -p < db/05-schema-post-wikilinks.sql
mysql -u root -p < db/08-schema-users.sql
mysql -u root -p < db/09-schema-post-embeddings.sql
```

| 脚本 | 表 |
| --- | --- |
| `01-create-database.sql` | 创建 `blog` 库 |
| `02-schema-directories.sql` | `directories` 目录树 |
| `03-schema-posts.sql` | `posts` 文章 |
| `04-schema-post-aliases.sql` | `post_aliases` Wikilink 别名 |
| `05-schema-post-wikilinks.sql` | `post_wikilinks` 双链边表 |
| `08-schema-users.sql` | `users` 后台用户 |
| `09-schema-post-embeddings.sql` | `post_embeddings` AI 向量索引 |

验证连接：

```bash
npm run db:test
```

首次启动应用时，若 `users` 表为空，会按 `AUTH_BOOTSTRAP_USERNAME` / `AUTH_BOOTSTRAP_PASSWORD` 自动创建初始管理员。也可手动初始化用户表：

```bash
npm run db:init-auth
```

### 4. 本地开发

```bash
npm run dev
```

默认访问 [http://localhost:3000](http://localhost:3000)（根路径会重定向到 `/blog`）。

| 地址 | 说明 |
| --- | --- |
| `/blog` | 公开博客 |
| `/knowledge-graph` | 公开知识图谱 |
| `/login` | 后台登录 |
| `/admin` | 后台管理（需登录） |

---

## 环境变量

复制 `.env.example` 为 `.env` 后按需修改。常用项：

| 变量 | 说明 |
| --- | --- |
| `MYSQL_*` | 本地 / 开发数据库连接 |
| `NUXT_MYSQL_*` | **生产环境**运行时覆盖（与 `MYSQL_*` 保持一致） |
| `AUTH_*` | 密钥路径、Cookie 名、JWT 过期、初始管理员账号 |
| `AUTH_COOKIE_SECURE` | `true`（HTTPS）/ `false`（纯 HTTP） |
| `AUTH_ALLOW_PLAIN_PASSWORD` | HTTP + IP 部署时可设为 `true` |
| `PUBLIC_WIKILINK_BASE_PATH` | 公开展示 wikilink 前缀，默认 `/blog` |
| `ADMIN_WIKILINK_BASE_PATH` | 后台 wikilink 前缀，默认 `/admin/posts` |
| `OLLAMA_*` / `AI_*` | 本地 AI 模型与 RAG 参数 |

完整说明见 [`.env.example`](.env.example)。

---

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发模式 |
| `npm run build` | 生产构建（输出 `.output/`） |
| `npm run preview` | 本地预览生产构建 |
| `npm run auth:keys` | 生成 JWT / RSA 密钥 |
| `npm run auth:test-login` | 终端测试登录接口 |
| `npm run db:init-auth` | 初始化 `users` 表 |
| `npm run db:test` | 测试 MySQL 连接 |
| `npm run test:ai` | AI 功能冒烟测试 |

---

## 项目结构

```text
blog-com/
├── .github/workflows/deploy.yml   # GitHub Actions 自动部署
├── components/                    # Vue 组件
├── composables/                   # 组合式函数
├── deploy/nginx/                  # Nginx 配置示例
├── pages/                         # 路由页面
│   ├── blog/                      # 公开展示
│   ├── admin/                     # 后台管理
│   └── login.vue
├── server/                        # Nitro API 与工具
│   ├── api/                       # REST 接口
│   └── utils/                     # 业务逻辑
├── db/                            # MySQL 建库与表结构 SQL
├── scripts/                       # 密钥、数据库、测试脚本
├── ecosystem.config.cjs           # PM2 配置
├── nuxt.config.ts
└── .env.example
```

---

## 架构说明

### 路由与 API

| 区域 | 页面路由 | API |
| --- | --- | --- |
| 公开展示 | `/`, `/blog/**`, `/knowledge-graph` | `GET /api/public/*` |
| 后台管理 | `/login`, `/admin/**` | `GET/POST/PUT/DELETE /api/*`（需登录） |

公开接口只读并带缓存策略；写操作走 `/api/*`，由 `server/middleware/auth.ts` 校验 JWT。

### Wikilink

- 公开展示链接前缀：`PUBLIC_WIKILINK_BASE_PATH`（默认 `/blog`）
- 后台编辑链接前缀：`ADMIN_WIKILINK_BASE_PATH`（默认 `/admin/posts`）

---

## 生产部署

本项目采用 **GitHub Actions 云端构建 + PM2 运行 + Nginx 反代** 的 SSR 部署方式。

### 部署流程概览

```text
git push main → Actions: npm ci + build → SCP .output 到服务器 → pm2 restart
用户访问 → Nginx :80 → Node :3000（.output/server/index.mjs）
```

### 服务器准备

1. 安装 Node 20、PM2、Nginx、MySQL
2. 创建部署目录（如 `/root/blog` 或 `/var/www/blog`）
3. 在服务器上放置 **仅存在于服务器** 的 `.env`（含 `NUXT_MYSQL_*` 等，勿提交 Git）
4. 执行 `npm run auth:keys`，将 `.keys/` 保留在服务器部署目录
5. 首次：`pm2 start ecosystem.config.cjs` 并 `pm2 save`

### GitHub Secrets

在仓库 **Settings → Secrets and variables → Actions** 中配置：

| Secret | 说明 |
| --- | --- |
| `SSH_PRIVATE_KEY` | 部署用 SSH 私钥 |
| `SERVER_HOST` | 服务器 IP 或域名 |
| `SERVER_USER` | SSH 用户名 |
| `SERVER_PORT` | SSH 端口（默认 22） |
| `DEPLOY_PATH` | 部署目录绝对路径 |

工作流文件：[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

### Nginx

参考 [`deploy/nginx/blog.conf.example`](deploy/nginx/blog.conf.example)，将 `server_name` 改为你的 IP 或域名，反代到 `127.0.0.1:3000`。

### HTTP 部署说明

纯 IP + HTTP（无 HTTPS）时，需在服务器 `.env` 中设置：

```env
AUTH_COOKIE_SECURE=false
AUTH_ALLOW_PLAIN_PASSWORD=true
NUXT_AUTH_COOKIE_SECURE=false
NUXT_AUTH_ALLOW_PLAIN_PASSWORD=true
NITRO_TRUST_PROXY=true
```

生产环境有域名后，建议配置 HTTPS 并关闭明文密码登录。

---

## 安全提示

- **切勿**将 `.env`、`.keys/` 提交到 GitHub
- 首次部署后立即修改 `AUTH_BOOTSTRAP_PASSWORD` 默认密码
- 云服务器安全组放行 80（及 22 SSH），数据库端口不要对公网开放
- 生产环境优先使用 HTTPS + Secure Cookie

---

## 开发说明

- 构建产物目录：`.output/`（已在 `.gitignore`）
- 修改 `package.json` 依赖后，生产服务器会触发 `npm ci --omit=dev`（见 deploy workflow）
- 知识图谱页（`/knowledge-graph`、`/admin/graph`）为客户端渲染（`ssr: false`）

---

## License

本项目采用 [MIT License](LICENSE) 开源。
