# 目录结构与工程规范

| 项 | 内容 |
| --- | --- |
| 形态 | 单仓单应用（Next.js）+ 独立 Worker 入口 |
| 包管理 | pnpm（`packageManager: pnpm@11`） |
| 路径别名 | `@/* → src/*`、`@/server/*`、`@/features/*` |

---

## 1. 目录树

```
ootd-lab/
├─ docs/                            # 产品/架构/API/页面/路线图（本目录）
├─ prisma/
│  ├─ schema.prisma                 # 数据模型（M0 已交付）
│  ├─ migrations/                   # 迁移 + 手写 GIN/部分索引 SQL
│  ├─ seed.ts                       # 种子：用户/品牌/48 单品/6 方案/8 帖子
│  └─ seed-assets/                  # 本地生成的占位图（无版权风险）
├─ public/
│  ├─ images/                       # 首页示例、空态插画
│  └─ favicon.svg
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                 # 根布局：字体、Providers、Toaster
│  │  ├─ globals.css                # Tailwind + 设计令牌
│  │  ├─ page.tsx                   # 首页
│  │  ├─ (auth)/
│  │  │  ├─ login/page.tsx
│  │  │  ├─ register/page.tsx
│  │  │  └─ onboarding/page.tsx
│  │  ├─ (app)/
│  │  │  ├─ layout.tsx              # 顶部导航 + 底部 Tab
│  │  │  ├─ studio/
│  │  │  │  ├─ page.tsx             # 新建搭配
│  │  │  │  └─ [id]/page.tsx        # 方案详情/编辑
│  │  │  ├─ recommend/
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ [id]/page.tsx
│  │  │  ├─ feed/page.tsx
│  │  │  ├─ posts/
│  │  │  │  ├─ new/page.tsx
│  │  │  │  └─ [id]/page.tsx
│  │  │  ├─ tags/[slug]/page.tsx
│  │  │  ├─ u/[handle]/page.tsx
│  │  │  └─ me/
│  │  │     ├─ layout.tsx
│  │  │     ├─ page.tsx
│  │  │     ├─ outfits/page.tsx
│  │  │     ├─ favorites/page.tsx
│  │  │     ├─ posts/page.tsx
│  │  │     ├─ privacy/page.tsx
│  │  │     └─ settings/page.tsx
│  │  ├─ admin/
│  │  │  ├─ layout.tsx              # requireAdmin
│  │  │  ├─ page.tsx
│  │  │  ├─ reports/page.tsx
│  │  │  ├─ posts/page.tsx
│  │  │  ├─ garments/page.tsx
│  │  │  └─ tasks/page.tsx
│  │  ├─ legal/[slug]/page.tsx
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/route.ts
│  │  │  ├─ auth/register/route.ts
│  │  │  ├─ health/route.ts
│  │  │  ├─ webhooks/ai/[provider]/route.ts
│  │  │  ├─ cron/{cleanup,hot-score}/route.ts
│  │  │  └─ v1/
│  │  │     ├─ me/route.ts
│  │  │     ├─ me/{consents,export,bookmarks,posts}/route.ts
│  │  │     ├─ consents/[id]/route.ts
│  │  │     ├─ uploads/presign/route.ts
│  │  │     ├─ uploads/[assetId]/complete/route.ts
│  │  │     ├─ media/[id]/{url,route.ts}
│  │  │     ├─ garments/route.ts
│  │  │     ├─ garments/{facets,mine}/route.ts
│  │  │     ├─ garments/[id]/route.ts
│  │  │     ├─ outfits/route.ts
│  │  │     ├─ outfits/[id]/{route.ts,items/route.ts,generate/route.ts,favorite/route.ts,share/route.ts}
│  │  │     ├─ tasks/[id]/{route.ts,retry/route.ts,cancel/route.ts,stream/route.ts}
│  │  │     ├─ tasks/route.ts
│  │  │     ├─ recommendations/route.ts
│  │  │     ├─ recommendations/[id]/{route.ts,reroll/route.ts,favorite/route.ts}
│  │  │     ├─ posts/route.ts
│  │  │     ├─ posts/[id]/{route.ts,like/route.ts,bookmark/route.ts,comments/route.ts}
│  │  │     ├─ comments/[id]/{route.ts,like/route.ts}
│  │  │     ├─ users/[handle]/{route.ts,follow/route.ts}
│  │  │     ├─ tags/{route.ts,[slug]/route.ts}
│  │  │     ├─ search/route.ts
│  │  │     ├─ reports/route.ts
│  │  │     ├─ notifications/{route.ts,read/route.ts}
│  │  │     ├─ config/route.ts
│  │  │     └─ admin/…              # stats/reports/posts/garments/tasks/terms
│  │  ├─ error.tsx
│  │  └─ not-found.tsx
│  ├─ components/
│  │  ├─ ui/                        # shadcn 生成，勿手改（除主题扩展）
│  │  ├─ layout/                    # Header/BottomTab/Footer/PageHeader
│  │  └─ shared/                    # EmptyState/ImageWithFallback/LoadingButton/ConfirmDialog
│  ├─ features/
│  │  ├─ auth/                      # 登录/注册/会话 hooks + schemas
│  │  ├─ wardrobe/                  # 衣橱筛选、GarmentCard、useGarments
│  │  ├─ studio/                    # 画布、上传裁剪、图层、生成面板
│  │  ├─ recommend/                 # 场景表单、结果流、单品 Drawer
│  │  ├─ community/                 # 信息流、帖子、评论、举报
│  │  ├─ profile/                   # 个人主页、隐私中心
│  │  └─ admin/                     # 表格与处理动作
│  │     └─ 每个 feature: components/ hooks/ api.ts schema.ts types.ts
│  ├─ server/
│  │  ├─ db.ts                      # PrismaClient 单例
│  │  ├─ auth.ts                    # NextAuth 配置（providers/callbacks）
│  │  ├─ session.ts                 # getSession/requireUser/requireAdmin
│  │  ├─ http/
│  │  │  ├─ handler.ts              # withApi()：错误映射/requestId/日志
│  │  │  ├─ responses.ts            # ok/created/paginated/fail
│  │  │  ├─ errors.ts               # AppError + 错误码
│  │  │  ├─ rate-limit.ts           # Redis/内存滑窗
│  │  │  └─ idempotency.ts
│  │  ├─ services/
│  │  │  ├─ auth.service.ts
│  │  │  ├─ media.service.ts
│  │  │  ├─ garment.service.ts
│  │  │  ├─ outfit.service.ts
│  │  │  ├─ generation.service.ts   # 建任务/状态机/重试/降级
│  │  │  ├─ task-runner.ts          # 执行流水线（Worker 与 inline 共用）
│  │  │  ├─ recommendation.service.ts
│  │  │  ├─ stylist/rule-based.ts   # LLM 不可用时的规则推荐
│  │  │  ├─ post.service.ts
│  │  │  ├─ comment.service.ts
│  │  │  ├─ moderation.service.ts
│  │  │  ├─ notification.service.ts
│  │  │  ├─ quota.service.ts
│  │  │  └─ audit.service.ts
│  │  ├─ ai/
│  │  │  ├─ types.ts                # TryOnInput/ProviderResult/接口
│  │  │  ├─ registry.ts             # 供应商注册 + 降级链
│  │  │  ├─ prompt.ts               # 场景解析/选品提示词
│  │  │  ├─ llm.ts                  # LLM 适配（mock/openai/deepseek）
│  │  │  └─ providers/
│  │  │     ├─ mock.ts              # sharp 拼贴（零 Key）
│  │  │     ├─ fashn.ts
│  │  │     ├─ replicate.ts
│  │  │     └─ comfyui.ts
│  │  ├─ queue/
│  │  │  ├─ index.ts                # 按 env 导出 driver
│  │  │  ├─ bullmq.ts
│  │  │  ├─ inline.ts
│  │  │  ├─ names.ts
│  │  │  └─ worker.ts               # BullMQ Worker 注册（给 worker.ts 调用）
│  │  ├─ storage/
│  │  │  ├─ index.ts                # Storage 接口 + 驱动选择
│  │  │  ├─ s3.ts
│  │  │  ├─ local.ts
│  │  │  └─ keys.ts                 # key 生成规则（UUID）
│  │  ├─ imaging/
│  │  │  ├─ normalize.ts            # 解码/转正/限尺寸/去 EXIF
│  │  │  ├─ thumbnail.ts
│  │  │  ├─ cutout.ts               # 抠图（provider 或简单阈值降级）
│  │  │  └─ composite.ts            # 拼贴降级算法
│  │  └─ security/
│  │     ├─ encryption.ts           # AES-256-GCM 信封
│  │     ├─ sensitive-words.ts      # Aho-Corasick 匹配
│  │     ├─ image-audit.ts
│  │     └─ hash.ts
│  ├─ lib/
│  │  ├─ env.ts                     # Zod 校验环境变量（启动即失败）
│  │  ├─ utils.ts                   # cn/formatPrice/formatRelativeTime
│  │  ├─ constants.ts               # 枚举中文映射、槽位规则、示例 chips
│  │  ├─ query-client.ts
│  │  └─ fetcher.ts                 # 统一 fetch + 错误抛出
│  ├─ data/
│  │  ├─ mock/garments.ts           # 兜底 Mock（DB 未就绪时 UI 可跑）
│  │  ├─ mock/posts.ts
│  │  └─ mock/recommendations.ts
│  ├─ types/
│  │  ├─ api.ts                     # 响应/分页/错误类型
│  │  └─ domain.ts
│  └─ styles/
├─ worker.ts                        # 独立 Worker 进程入口（tsx worker.ts）
├─ scripts/
│  ├─ generate-seed-assets.ts       # sharp 生成 48 张占位图
│  └─ check-env.ts
├─ tests/
│  ├─ unit/                         # vitest：services/ai/security
│  └─ e2e/                          # playwright：登录→搭配→生成→发帖
├─ docker-compose.yml               # postgres + redis + minio
├─ Dockerfile                       # web
├─ Dockerfile.worker
├─ .env.example
├─ components.json                  # shadcn 配置
├─ next.config.ts
├─ tailwind.config.ts               # v4 用 CSS-first，可省略
├─ eslint.config.mjs
├─ tsconfig.json
├─ vitest.config.ts
├─ playwright.config.ts
└─ package.json
```

---

## 2. 模块边界（ESLint 强制）

```js
// eslint.config.mjs（节选）
'no-restricted-imports': ['error', {
  patterns: [
    { group: ['@/server/*'], message: '客户端组件禁止直接引用服务端模块，请走 API 或 features/*/api.ts' },
    { group: ['@/app/*'], message: 'features 不得反向依赖路由层' },
  ],
}]
```

- `src/app/**` 可以引用 `features/*` 与 `components/*`。
- `features/*` 只能引用 `lib/*`、`types/*`、`components/*`，不能引用 `server/*`。
- `server/*` 不得引用 `app/*`、`features/*`、`components/*`。
- `server/ai/*` 不得引用 `db`，保持纯函数便于测试。

---

## 3. 命名与代码规范

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| 文件（组件） | PascalCase | `OutfitCanvas.tsx` |
| 文件（模块/工具） | kebab-case | `rate-limit.ts` |
| Hook | `use` 前缀 | `useGarments.ts` |
| Zod schema | `XxxSchema` | `CreateOutfitSchema` |
| Service 方法 | 动词开头 | `createOutfit`, `enqueueTryOn` |
| 枚举字面量 | UPPER_SNAKE | `VIRTUAL_TRYON` |
| CSS 变量 | `--kebab` | `--brand-soft` |
| API 路由目录 | kebab | `recommendations/[id]/reroll` |

**通用约束**

- TypeScript `strict: true`，禁用 `any`（`unknown` + 收窄）；对外 DTO 用 `z.infer` 导出。
- 每个 Route Handler 必须：`withApi()` 包裹 → Zod 校验 → 鉴权 → service → `ok()`。
- 每个 service 抛 `AppError(code, message, status)`，由 `withApi` 统一映射。
- 组件必须处理 `loading / error / empty / success` 四态；列表必须有骨架。
- 图片一律 `next/image`（远程域白名单），或带 `width/height` 的 `<img>`。

---

## 4. 脚本

```jsonc
{
  "scripts": {
    "dev": "next dev --turbo",
    "dev:worker": "tsx watch worker.ts",
    "build": "prisma generate && next build",
    "start": "next start",
    "worker": "tsx worker.ts",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset --force",
    "assets:seed": "tsx scripts/generate-seed-assets.ts",
    "openapi": "tsx scripts/export-openapi.ts"
  }
}
```

---

## 5. 环境变量

| 变量 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | — | PostgreSQL 连接串 |
| `NEXTAUTH_SECRET` | ✅ | — | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | 回调基址 |
| `APP_URL` | | `http://localhost:3000` | 分享链接/邮件 |
| `QUEUE_DRIVER` | | `inline` | `inline` \| `bullmq` |
| `REDIS_URL` | bullmq 时✅ | — | `redis://localhost:6379` |
| `STORAGE_DRIVER` | | `local` | `local` \| `s3` |
| `S3_ENDPOINT` `S3_REGION` `S3_BUCKET` | s3 时✅ | — | 兼容 R2/MinIO |
| `S3_ACCESS_KEY_ID` `S3_SECRET_ACCESS_KEY` | s3 时✅ | — | 服务端专用 |
| `S3_PUBLIC_BASE_URL` | | — | CDN 域名 |
| `MEDIA_KEK` | ✅ | 开发用固定值 | base64 32 字节，加密人脸图 |
| `AI_PROVIDER` | | `MOCK` | 主供应商 |
| `AI_PROVIDER_CHAIN` | | `mock` | 降级顺序，逗号分隔 |
| `FASHN_API_KEY` `REPLICATE_API_TOKEN` `COMFYUI_BASE_URL` | | — | 按需 |
| `LLM_PROVIDER` | | `mock` | `mock` \| `openai` \| `deepseek` |
| `OPENAI_API_KEY` `DEEPSEEK_API_KEY` | | — | 按需 |
| `CRON_SECRET` | | 开发固定 | Cron 路由鉴权 |
| `WEBHOOK_SECRET` | | 开发固定 | 供应商回调 HMAC |
| `NEXT_PUBLIC_APP_NAME` | | `OOTD Lab` | 展示名 |

> `src/lib/env.ts` 在启动时用 Zod 解析，缺失/格式错误直接抛错并打印修复提示；`NEXT_PUBLIC_*` 中禁止出现任何密钥（CI 有 grep 检查）。

---

## 6. 本地开发

```bash
# 1. 依赖
pnpm install

# 2. 基础设施（Postgres + Redis + MinIO）
docker compose up -d

# 3. 环境
cp .env.example .env

# 4. 数据库
pnpm db:push
pnpm assets:seed && pnpm db:seed

# 5. 启动
pnpm dev            # http://localhost:3000
# 可选：真实队列
QUEUE_DRIVER=bullmq REDIS_URL=redis://localhost:6379 pnpm dev:worker
```

**演示账号**：`demo@ootd.local / Demo1234`、`admin@ootd.local / Admin1234`。

**零 Key 模式**：`AI_PROVIDER=MOCK` + `QUEUE_DRIVER=inline` + `STORAGE_DRIVER=local`，无需任何第三方账号。

---

## 7. 测试策略

| 层 | 工具 | 覆盖 |
| --- | --- | --- |
| 单元 | Vitest | 槽位校验、额度计算、敏感词、加密往返、Mock 合成、Provider 路由/降级链 |
| 集成 | Vitest + 测试库 | service + 真实 Postgres（testcontainers 或 docker compose） |
| E2E | Playwright | 注册→上传→搭配→生成→保存→发帖→点赞 |
| 契约 | Zod + OpenAPI 快照 | 路由入参/出参 schema 变更可见 |
| 可访问性 | axe-core（playwright） | 关键页无 critical 违规 |

CI 顺序：`lint → typecheck → unit → build → e2e（可选）`。

---

## 8. 提交与评审

- Conventional Commits：`feat(studio): drag layers`、`fix(api): idempotency key collision`。
- 每个模块一个 PR 粒度（本地即一次交付），PR 描述附：截图/GIF、验收清单、风险点。
- 不提交 `.env`、`.cache`、`.data`、`node_modules`、生成的 seed 图片（可复现）。

`.gitignore` 关键项：

```
node_modules
.next
.env
.env.local
.data
.cache
.tools
coverage
playwright-report
```
