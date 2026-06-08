# blog-com

个人博客 + 知识图谱统一 Nuxt 3 全栈项目（公开展示 + 后台管理）。

## 功能

- **公开展示**：`/`、`/blog/**`、`/knowledge-graph`
- **后台管理**：`/login`、`/admin/**`（JWT 认证）
- **统一 Markdown**：marked + Shiki 服务端渲染，编辑器预览与线上展示 HTML 一致
- **共享 API 层**：`/api/public/*`（只读 + 缓存）与 `/api/*`（需登录）共用 `server/utils`

## 快速开始

```bash
cp .env.example .env
# 编辑 .env，配置 MYSQL_DATABASE 等

npm install
npm run auth:keys   # 首次生成 JWT/RSA 密钥
npm run db:init-auth # 初始化用户表（可选）

npm run dev
```

## 数据库

SQL 迁移脚本位于 `db/` 目录，按编号顺序执行。

## 架构说明

| 区域 | 路由 | API |
|------|------|-----|
| 公开展示 | `/`, `/blog/**`, `/knowledge-graph` | `GET /api/public/*` |
| 后台 | `/admin/**` | `GET/POST/PUT/DELETE /api/*` |

Wikilink 链接前缀：
- 公开展示：`PUBLIC_WIKILINK_BASE_PATH=/blog`
- 后台：`ADMIN_WIKILINK_BASE_PATH=/admin/posts`
