# 安全加固记录（P0 + P1 第一批）

| 项 | 内容 |
| --- | --- |
| 日期 | 2026-11-05 |
| 范围 | P0 启动可靠性 + P1-01/02/03/04/05/06/09/10/12 |
| 关联 | [隐私安全](12-privacy-security.md) · [验收测试](13-acceptance-test-plan.md) · [待办](14-todo-breakdown.md) |
| 结论 | 功能 7/7；安全基础可用；P1-08（审核后台）、P1-11（任务统一）、S3/CSP 仍待做 |

---

## 1. P0 运行可靠性

| 项 | 实现 | 文件 |
| --- | --- | --- |
| `pnpm start` 自动建库 | `start` 先执行 `ensure-db --migrate-only`，再启动 Next | `package.json`、`scripts/ensure-db.ts` |
| PGlite 单进程锁 | `dev`/`start` 由 `scripts/run-next.ts` 持有 `.data/.pglite.lock`，第二个实例给出可读提示 | `scripts/run-next.ts`、`src/server/pglite-lock.ts` |
| 迁移兼容 | 迁移遇到 duplicate column/table 时逐条重试；`0004/0005` 使用 `IF NOT EXISTS` | `scripts/ensure-db.ts`、`prisma/migrations/*` |
| 健康检查 | `GET /api/health` 检查 DB + 存储；`GET /api/config` 返回能力，不含密钥 | `src/app/api/health/route.ts`、`config/route.ts` |

## 2. 鉴权（P1-01）

- Auth.js 5 Credentials + bcrypt（cost 12），JWT 30 天，HttpOnly/SameSite=Lax。
- `src/server/auth.ts` 的 `getCurrentUser()` 从会话读取；`requireUser()` 统一 401；`requireAdmin()` 预留。
- 登录页 `/login`、注册页 `/register`、注册 API `POST /api/auth/register`（邮箱唯一、密码强度、限流）。
- `src/middleware.ts` 保护 `/outfit-studio`、`/ai-recommend`、`/community`、`/profile`、`/me`，未登录 307 到登录页。
- 注销/封禁：`session` 回调查 DB 状态，非 ACTIVE 返回空 id，接口立即 401。

演示账号：

- `demo@ootd.local` / `Demo1234!`
- `admin@ootd.local` / `Admin1234!`

## 3. 速率限制（P1-02）

| 场景 | 限制 |
| --- | --- |
| 注册 | 5/小时/IP；3/小时/邮箱 |
| 登录 | 5/15 分钟/邮箱 |
| 上传照片/衣服 | 30/小时/用户 |
| 试衣 | 10/小时/用户 |
| AI 推荐 | 20/天；换一套 20/天；重试图 20/小时 |
| 生成任务 | 10/小时/用户 |
| 发帖 | 10/天；评论 30/小时；举报 20/天 |
| 关注 | 60/小时 |
| 读接口 | 240/分钟/IP（中间件兜底） |

响应：429 + `Retry-After` / `X-RateLimit-*`。内存实现，多实例部署需换 Redis（P1）。

## 4. 照片授权（P1-03）

- `ConsentType` 新增 `FULL_BODY_PROCESSING`（迁移 `0005_body_consent`）。
- 上传 face/body 均要求 `consent=true`，否则 `403 CONSENT_REQUIRED`。
- 每张照片写 `Consent`（type、policyVersion、mediaAssetId）。
- `/me/privacy` 可查看授权、撤回并删除源图。
- 前端上传组件 body 也发送 consent，不再只传 face。

## 5. 删除 / 导出 / 撤回（P1-04）

| 能力 | API | 行为 |
| --- | --- | --- |
| 删除照片 | `DELETE /api/upload/user-photo/:id` | 软删 + 删文件 |
| 删除结果 | `DELETE /api/media/:id` | 仅 RESULT；清理 outfit/rec 引用 |
| 撤回授权 | `POST /api/me/consents/revoke` | 标记 revoked + 删除源图 |
| 导出数据 | `GET /api/me/export` | JSON 附件（资料/授权/方案/推荐/帖子/评论） |
| 注销账号 | `DELETE /api/me` | 密码确认 + `DELETE` 文本；删文件、匿名化资料、软删内容、失效会话 |

UI：`/me/privacy`（授权列表、导出、注销）。

## 6. 签名 URL 与分享副本（P1-05/06）

- 私有媒体：`signedMediaUrl(id, 600)`，HMAC-SHA256，10 分钟；`GET /api/media/:id?exp=&sig=` 无会话也可读，篡改返回 401。
- 新增 `GET /api/media/:id/url`（仅 owner）返回短期签名 URL。
- 图像生成抽象层的结果图/缩略图默认返回签名 URL（15 分钟）。
- 分享方案/推荐到社区时，`copyMediaToPublic()` 把私有结果复制为公开 `POST_IMAGE`；帖子不引用源照片，其他用户可正常查看。

## 7. Origin / SSRF / 审计（P1-09/10）

- 写接口（除 Auth.js）校验 `Origin` 与 `Host`，不符 403 `INVALID_ORIGIN`。
- 图片 URL 白名单拒绝 `localhost`、`127/8`、`10/8`、`172.16/12`、`192.168/16`、`169.254/16`、`::1`、`.local`。
- 审计：登录、分享、删结果、撤回授权、导出、注销写 `AuditLog`；管理员下架原有审计保留。

## 8. 验证记录

| 用例 | 结果 |
| --- | --- |
| 未登录 `/outfit-studio` | 307 → `/login?next=...` |
| 未登录 `/api/clothing` | 401 |
| 演示账号登录 | 302 + session cookie；`/api/auth/session` 返回 id/role |
| 注册第 6 次同 IP | 429 `RATE_LIMITED` |
| body 无 consent 上传 | 403 `CONSENT_REQUIRED` |
| body 有 consent 上传 | 201 + Consent 记录 |
| 私有结果删除 | 200；再次 GET 404 |
| 撤回 body 授权 | `{revoked:1,mediaDeleted:1}`；Consent revoked |
| 数据导出 | 200 `attachment; filename=ootd-export-*.json` |
| 注销临时账号 | 200；session 变“已注销用户”；业务 API 401 |
| 分享 AI 推荐 | 生成公开副本；另一账号读取封面 200 |
| 签名 URL 匿名访问 | 200；篡改签名 401 |
| 伪造 Origin 发帖 | 403 `INVALID_ORIGIN` |
| `pnpm setup` 在 dev 运行时 | 友好锁提示，退出 1 |
| `pnpm start` 全新数据目录 | 自动 migrate-only，health 200 |
| `pnpm typecheck` / `pnpm test` / `pnpm build` | 0 / 9 passed / 0 |

## 9. 新增环境变量

```dotenv
AUTH_SECRET=          # openssl rand -base64 32
AUTH_URL=http://localhost:3000
MEDIA_URL_SECRET=     # 可留空，回退 AUTH_SECRET
```

## 10. 仍待完成

| 项 | 原因 |
| --- | --- |
| 图片审核真实 Provider | `IMAGE_MODERATION_PROVIDER` 仍是 mock；需接内容安全服务 |
| 管理后台 UI | 举报队列/下架只有 API，无 `/admin` 页面 |
| 任务编排统一 | 自由搭配、AI 推荐、抽象层仍是三套 `GenerationTask` 编排 |
| S3/私有 Bucket | 当前本地磁盘 + HMAC URL；生产需 S3 驱动 + 预签名 |
| CSP/HSTS | 安全响应头未统一加 |
| 训练 opt-out 合同化 | 仅文档声明，provider 请求未带字段 |
| Redis 限流 | 进程内 Map，多实例不共享 |

## 11. 已知限制

- `pnpm start` 的 postgres 分支只提示执行 `prisma migrate deploy`，不自动迁移。
- PGlite 单进程；生产用真实 PostgreSQL。
- 内存限流重启清零；登录限流在 Auth.js `authorize` 内，错误信息统一为“邮箱或密码错误”。
- 签名 URL 具备 bearer 能力，泄露即可在 TTL 内访问；TTL 最长 1 小时，默认 10–15 分钟。
- 账号注销为软删 + 文件删除；备份中的副本需按保留期任务清理（P1）。
