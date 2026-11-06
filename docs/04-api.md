# API 接口清单

| 项 | 内容 |
| --- | --- |
| Base URL | `/api/v1`（系统级 `/api/health`、`/api/auth/*`、`/api/webhooks/*`、`/api/cron/*` 除外） |
| 协议 | HTTPS + JSON（`application/json; charset=utf-8`），上传走预签名直传 |
| 鉴权 | Auth.js 会话 Cookie（`ootd.session`，HttpOnly/Secure/SameSite=Lax） |
| 版本 | 路径版本 `/v1`；破坏性变更升 `/v2` |

---

## 1. 通用约定

### 1.1 响应包络

```jsonc
// 成功
{ "data": { /* ... */ }, "requestId": "req_01J..." }

// 列表
{ "data": { "items": [], "nextCursor": "c_...", "hasMore": true }, "requestId": "..." }

// 失败
{ "error": { "code": "CONSENT_REQUIRED", "message": "请先同意人脸信息处理", "details": { "field": "consent" } }, "requestId": "..." }
```

- 时间统一 ISO 8601 UTC（`2026-11-05T10:00:00.000Z`）；客户端本地化展示。
- 金额单位「分」（`priceCents: 39900` = ¥399）。
- ID 为 cuid 字符串，不以 `_` 前缀暴露业务含义（示例中的 `g_` 仅为可读性）。
- 所有写接口校验 `Origin`，不匹配返回 403。

### 1.2 分页

| 参数 | 说明 |
| --- | --- |
| `limit` | 1–50，默认 20 |
| `cursor` | 上一页返回的 `nextCursor`，不透明字符串（base64 of `sortKey|id`） |
| `sort` | 资源相关：`new` / `hot` / `popular` |

不做 offset 分页，避免深翻页性能问题；管理后台允许 `page`（数据量小）。

### 1.3 幂等

- 写接口支持 `Idempotency-Key` 头（UUID v4），服务端存 24h，命中返回首次结果。
- **强制**：`POST /outfits/:id/generate`、`POST /recommendations`、`POST /recommendations/:id/reroll`、`POST /posts`。
- 数据库唯一约束兜底（如 `GenerationTask(userId, idempotencyKey)`）。

### 1.4 限流

| 维度 | 限制 | 超限 |
| --- | --- | --- |
| 登录 | 5 次 / 15 分钟 / (邮箱+IP) | 429 `TOO_MANY_ATTEMPTS` |
| 上传 | 30 次 / 小时 | 429 |
| 生成 | 10 次 / 小时/用户；全站 60 次/分钟 | 429 `QUOTA_EXCEEDED` |
| 推荐 | 20 次 / 天/用户；换一套 5 次/天 | 429 |
| 发帖 | 10 次 / 天；间隔 30s | 429 |
| 评论 | 30 次 / 小时 | 429 |
| 举报 | 20 次 / 天 | 429 |

响应头：`X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset`、`Retry-After`。

### 1.5 错误码

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Zod 校验失败，`details.fields` 给出字段错误 |
| 401 | `UNAUTHENTICATED` | 未登录或会话过期 |
| 403 | `FORBIDDEN` | 无权限（非 owner / 非管理员） |
| 403 | `CONSENT_REQUIRED` | 上传/生成人脸图但未授权 |
| 403 | `CONSENT_REVOKED` | 授权已撤回 |
| 404 | `NOT_FOUND` | 资源不存在或无权查看（统一 404 防枚举） |
| 409 | `EMAIL_TAKEN` | 邮箱已注册 |
| 409 | `CONFLICT` | 状态冲突（如任务已完成仍取消） |
| 413 | `FILE_TOO_LARGE` | 超过 10MB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | magic bytes 非图片 |
| 422 | `CONTENT_BLOCKED` | 命中敏感词/审核拒绝，`details.matches` |
| 422 | `INVALID_OUTFIT` | 单品组合非法（连衣裙+上下装、超 8 件、空方案） |
| 422 | `OUTFIT_NOT_SHAREABLE` | 关联的方案不可分享（非本人且非公开） |
| 429 | `QUOTA_EXCEEDED` | 生成/推荐额度用尽，`details.resetAt` |
| 429 | `TOO_MANY_ATTEMPTS` | 登录失败过多 |
| 502 | `PROVIDER_ERROR` | 供应商失败且降级失败 |
| 503 | `SERVICE_DEGRADED` | 队列/存储不可用 |
| 504 | `PROVIDER_TIMEOUT` | 生成超时 |

---

## 2. 鉴权与账号

| Method | Path | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 邮箱注册（`email`, `password`, `name?`, `acceptTerms`） | 公开 |
| GET/POST | `/api/auth/[...nextauth]` | Auth.js：登录、登出、OAuth 回调、CSRF | 公开 |
| POST | `/api/v1/auth/password/forgot` | 发送重置邮件（限流） | 公开 |
| POST | `/api/v1/auth/password/reset` | `token` + `password` | 公开 |
| GET | `/api/v1/me` | 当前用户 + Profile + 额度 | 登录 |
| PATCH | `/api/v1/me` | 更新昵称/头像/Profile 字段 | 登录 |
| DELETE | `/api/v1/me` | 注销（二次确认 `confirmEmail`），软删 30 天 | 登录 |
| GET | `/api/v1/me/export` | 触发数据导出任务（`DATA_EXPORT`） | 登录 |
| GET | `/api/v1/me/consents` | 授权记录列表 | 登录 |
| POST | `/api/v1/consents` | 记录授权（`type`, `policyVersion`, `mediaAssetId?`） | 登录 |
| DELETE | `/api/v1/consents/:id` | 撤回授权（人脸 → 级联删图） | 登录 |

**POST /api/auth/register**

```jsonc
// req
{ "email": "a@b.com", "password": "Passw0rd!", "name": "小美", "acceptTerms": true }
// 201
{ "data": { "user": { "id": "...", "email": "a@b.com", "handle": "u_7f3a91c2", "role": "USER" } } }
```

**GET /api/v1/me**

```jsonc
{
  "data": {
    "id": "...", "email": "demo@ootd.local", "handle": "u_demo0001", "name": "小美",
    "image": "https://cdn/.../avatar.webp", "role": "USER",
    "profile": { "gender": "FEMALE", "heightCm": 165, "weightKg": 52, "stylePrefs": ["FRENCH"], "avoidedColors": ["BLACK"], "city": "上海", "isPublic": true },
    "consents": { "faceImageProcessing": true, "policyVersion": "2026-11-01" },
    "quota": { "tryonUsed": 2, "tryonLimit": 10, "rerollUsed": 1, "rerollLimit": 5, "resetAt": "2026-11-06T00:00:00.000Z" }
  }
}
```

---

## 3. 上传与媒体

| Method | Path | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/v1/uploads/presign` | 申请直传 URL，创建 `MediaAsset(PENDING)` | 登录 |
| POST | `/api/v1/uploads/:assetId/complete` | 完成上传，服务端校验/重编码/加密 | 登录 |
| GET | `/api/v1/media/:id/url` | 获取签名 URL（`purpose=display\|download\|face-preview`） | 登录/公开图 |
| DELETE | `/api/v1/media/:id` | 删除（软删 + 异步清对象） | owner |
| POST | `/api/v1/media/:id/cutout` | 对衣服原图发起抠图任务 | owner |

**POST /uploads/presign**

```jsonc
// req
{
  "kind": "FACE",                  // FACE | FULL_BODY | GARMENT_RAW | POST_IMAGE
  "mimeType": "image/jpeg",
  "bytes": 2411520,
  "checksum": "sha256:9f2c...",     // 可选
  "consent": { "faceProcessing": true, "policyVersion": "2026-11-01" }  // kind=FACE 时必填
}
// 201
{
  "data": {
    "assetId": "cm3x...", "method": "PUT",
    "uploadUrl": "https://bucket/...&X-Amz-Signature=...",
    "headers": { "Content-Type": "image/jpeg" },
    "expiresAt": "2026-11-05T10:10:00.000Z"
  }
}
```

**POST /uploads/:assetId/complete**

```jsonc
// req
{ "width": 1080, "height": 1440 }
// 200
{ "data": { "assetId": "...", "status": "READY", "kind": "FACE", "isSensitive": true, "encryption": "AES_256_GCM", "url": "/api/v1/media/.../url?purpose=face-preview" } }
```

**GET /media/:id/url?purpose=download**

```jsonc
{ "data": { "url": "https://cdn/...signature", "expiresAt": "2026-11-05T10:05:00.000Z", "filename": "ootd-cm3x.png" } }
```

> `face-preview`：TTL 60s，仅 owner，`Cache-Control: private, no-store`；其余 `display` TTL 300s。

---

## 4. 衣橱（Garments）

| Method | Path | 说明 | 鉴权 |
| --- | --- | --- | --- |
| GET | `/api/v1/garments` | 站内单品列表 + 筛选 | 公开 |
| GET | `/api/v1/garments/facets` | 分面计数（配合当前筛选） | 公开 |
| GET | `/api/v1/garments/:id` | 单品详情 | 公开（用户自有需 owner） |
| POST | `/api/v1/garments` | 上传自有衣服（创建 DRAFT + 抠图任务） | 登录 |
| PATCH | `/api/v1/garments/:id` | 修改自有单品（名称/类别/颜色…） | owner |
| DELETE | `/api/v1/garments/:id` | 删除自有单品 | owner |
| GET | `/api/v1/garments/mine` | 我的衣服（含处理中状态） | 登录 |

**GET /garments**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `category` | enum[] | `TOP,BOTTOM,DRESS,OUTERWEAR,SHOES,BAG,ACCESSORY` |
| `colors` | enum[] | `ColorTag` |
| `styles` | enum[] | `StyleTag` |
| `seasons` | enum[] | `Season`（`ALL_SEASON` 视为匹配任意季节） |
| `gender` | enum | `WOMEN/MEN/UNISEX` |
| `q` | string | 名称/品牌/材质模糊搜索 |
| `minPrice`/`maxPrice` | int | 分 |
| `owner` | `me` | 仅我的衣服 |
| `limit`/`cursor` | | 分页 |

```jsonc
// 200
{
  "data": {
    "items": [{
      "id": "cm...", "name": "亚麻收腰连衣裙", "category": "DRESS", "subCategory": "dress",
      "gender": "WOMEN", "colors": ["WHITE"], "primaryColorHex": "#F2EDE4",
      "styles": ["ROMANTIC", "FRENCH"], "seasons": ["SUMMER"], "materials": ["亚麻 55%", "棉 45%"],
      "fit": "regular", "brand": { "id": "...", "name": "COS" },
      "priceCents": 69000, "currency": "CNY", "purchaseUrl": "https://...",
      "imageUrl": "https://cdn/.../main.webp", "cutoutUrl": "https://cdn/.../cutout.png",
      "source": "PLATFORM", "status": "PUBLISHED"
    }],
    "nextCursor": "eyJ...", "hasMore": true
  }
}
```

**GET /garments/facets?category=TOP**

```jsonc
{ "data": { "category": { "TOP": 18, "BOTTOM": 12 }, "colors": { "BLACK": 9 }, "styles": { "MINIMAL": 7 }, "seasons": { "SUMMER": 11 }, "total": 48 } }
```

**POST /garments（自有衣服）**

```jsonc
// req：先上传 GARMENT_RAW 得到 mediaId
{ "name": "我的白衬衫", "category": "TOP", "rawMediaId": "cm...", "colors": ["WHITE"], "styles": ["MINIMAL"], "seasons": ["ALL_SEASON"] }
// 201
{ "data": { "garment": { "id": "...", "status": "PROCESSING", "imageUrl": "..." }, "taskId": "cm...", "type": "BG_REMOVAL" } }
```

---

## 5. 搭配方案（Outfits）

| Method | Path | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/v1/outfits` | 创建方案（含 items） | 登录 |
| GET | `/api/v1/outfits` | 我的/公开方案列表 | 登录/公开 |
| GET | `/api/v1/outfits/:id` | 详情（含 items + 结果图） | owner 或公开 |
| PATCH | `/api/v1/outfits/:id` | 改标题/可见性/底图 | owner |
| PUT | `/api/v1/outfits/:id/items` | 整体替换 items（编辑器保存） | owner |
| DELETE | `/api/v1/outfits/:id` | 软删方案 | owner |
| POST | `/api/v1/outfits/:id/generate` | 创建生成任务 | owner |
| POST | `/api/v1/outfits/:id/favorite` | 收藏/取消（toggle） | 登录 |
| POST | `/api/v1/outfits/:id/share` | 生成分享草稿帖 | owner |

**POST /outfits**

```jsonc
// req
{
  "title": "海边约会 · 白裙",
  "basePhotoId": "cm_body...",
  "facePhotoId": "cm_face...",
  "visibility": "PRIVATE",
  "items": [
    { "garmentId": "cm_g1", "slot": "DRESS", "zIndex": 2, "transform": { "x": 0.5, "y": 0.38, "scale": 0.42, "rotation": 0 } },
    { "garmentId": "cm_g2", "slot": "SHOES", "zIndex": 1, "transform": { "x": 0.48, "y": 0.88, "scale": 0.16, "rotation": 0 } }
  ]
}
// 201
{ "data": { "id": "cm_of...", "title": "海边约会 · 白裙", "status": "DRAFT", "items": [/* ... */], "createdAt": "..." } }
```

**PUT /outfits/:id/items**：`{ "items": [ ... ] }` → 200 返回完整方案；校验规则见 [PRD 4.2.4](01-PRD.md#424-搭配画布)。

**POST /outfits/:id/generate**

```jsonc
// headers: Idempotency-Key: 9b2f...
// req（均可选）
{ "preserveFace": true, "background": "original", "aspectRatio": "3:4", "seed": 12345, "degradedFallback": true }
// 202
{ "data": { "taskId": "cm_task...", "status": "QUEUED", "pollAfterMs": 2000, "estimatedSeconds": 25 } }
```

**POST /outfits/:id/share**

```jsonc
// req
{ "title": "海边这套真的绝", "tags": ["海边", "法式"], "visibility": "PUBLIC" }
// 201
{ "data": { "postId": "cm_post...", "status": "DRAFT", "editUrl": "/posts/cm_post.../edit" } }
```

---

## 6. 任务（Tasks）

| Method | Path | 说明 | 鉴权 |
| --- | --- | --- | --- |
| GET | `/api/v1/tasks/:id` | 任务状态 + 结果 | owner |
| GET | `/api/v1/tasks` | 我的任务（`status=active` 过滤） | 登录 |
| POST | `/api/v1/tasks/:id/retry` | 重试失败任务 | owner |
| POST | `/api/v1/tasks/:id/cancel` | 取消排队中任务 | owner |
| GET | `/api/v1/tasks/:id/stream` | SSE 推送状态（`text/event-stream`） | owner |

**GET /tasks/:id**

```jsonc
{
  "data": {
    "id": "cm_task...", "type": "VIRTUAL_TRYON", "status": "SUCCEEDED", "progress": 100,
    "provider": "MOCK", "attempts": 1, "costCents": 0,
    "createdAt": "2026-11-05T10:00:00.000Z", "startedAt": "...", "finishedAt": "2026-11-05T10:00:02.000Z",
    "output": {
      "imageId": "cm_result...", "imageUrl": "https://cdn/.../result.webp",
      "width": 1024, "height": 1365, "degraded": false, "latencyMs": 1820
    },
    "error": null
  }
}
```

**失败态**

```jsonc
{ "data": { "status": "FAILED", "attempts": 3, "error": { "code": "PROVIDER_TIMEOUT", "message": "生成超时，请重试", "retryable": true } } }
```

**SSE**

```
event: status
data: {"status":"RUNNING","progress":45}

event: done
data: {"status":"SUCCEEDED","output":{"imageUrl":"..."}}
```

**Webhook（供应商 → 服务端）**

```
POST /api/webhooks/ai/:provider
X-Signature: sha256=<hmac(secret, rawBody)>
```
```jsonc
{ "jobId": "job_abc", "status": "succeeded", "output": ["https://provider/result.jpg"], "error": null }
```
- 校验签名 + 时间戳防重放（±5 分钟）；以 `providerJobId` 定位任务；终态不可覆盖；始终 200（避免供应商重试风暴），内部记录异常。

---

## 7. AI 推荐

| Method | Path | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/v1/recommendations` | 创建推荐（同步出文字 + 异步出图） | 登录 |
| GET | `/api/v1/recommendations` | 历史列表 | 登录 |
| GET | `/api/v1/recommendations/:id` | 详情 | owner |
| POST | `/api/v1/recommendations/:id/reroll` | 换一套 | owner |
| POST | `/api/v1/recommendations/:id/favorite` | 收藏对应方案 | 登录 |

**POST /recommendations**

```jsonc
// req
{
  "scene": "明天去海边约会",
  "options": {
    "gender": "FEMALE", "heightCm": 165, "weightKg": 52,
    "styles": ["ROMANTIC", "FRENCH"], "budgetMax": 800,
    "city": "厦门", "weather": { "condition": "SUNNY", "tempC": 28 },
    "avoidColors": ["BLACK"], "mustBePurchasable": false
  }
}
// 201
{
  "data": {
    "recommendationId": "cm_rec...", "outfitId": "cm_of...", "taskId": "cm_task...",
    "styleTitle": "海风法式：亚麻白裙 + 草编包",
    "parsed": { "occasion": "DATE", "formality": 2, "season": "SUMMER", "keywords": ["海边", "约会"], "riskFlags": ["wind", "sun"] },
    "rationale": "海边风大、日照强，选择垂坠感好的亚麻长裙避免走光，浅色系在强光下更显干净……",
    "items": [{
      "garmentId": "cm_g1", "slot": "DRESS", "name": "亚麻收腰连衣裙",
      "category": "DRESS", "colors": ["WHITE"], "primaryColorHex": "#F2EDE4",
      "materials": ["亚麻"], "seasons": ["SUMMER"], "styles": ["ROMANTIC"],
      "priceCents": 69000, "currency": "CNY", "brand": "COS",
      "purchaseUrl": "https://...", "imageUrl": "https://cdn/...", "isAiGenerated": false,
      "reason": "收腰 + 及踝长度，抗风且显比例"
    }],
    "tips": ["配草编包和细带凉鞋", "头发半扎更抗海风"],
    "avoidTips": ["避免大面积黑色吸热"],
    "quota": { "rerollRemaining": 4 }
  }
}
```

**POST /recommendations/:id/reroll** → `202 { taskId, recommendationId, pollAfterMs }`；服务端排除上一套 `garmentIds`，写入 `parentId`。

**AI 输出校验协议（服务端 Zod）**

```ts
const RecommendationDraft = z.object({
  styleTitle: z.string().min(4).max(40),
  rationale: z.string().min(20).max(400),
  items: z.array(z.object({
    garmentId: z.string(),                 // 必须命中召回白名单
    slot: z.enum(['TOP','BOTTOM','DRESS','OUTERWEAR','SHOES','BAG','ACCESSORY']),
    reason: z.string().min(4).max(120),
  })).min(2).max(6),
  tips: z.array(z.string().max(80)).max(4),
  avoidTips: z.array(z.string().max(80)).max(3),
});
```

> LLM 输出失败重试 1 次；仍失败走 `RuleBasedStylist`，接口不报错，`data.degraded=true`。

---

## 8. 讨论区

| Method | Path | 说明 | 鉴权 |
| --- | --- | --- | --- |
| GET | `/api/v1/posts` | 信息流（`sort=hot\|new\|following`，`tag`，`q`） | 公开（following 需登录） |
| POST | `/api/v1/posts` | 发帖 | 登录 |
| GET | `/api/v1/posts/:id` | 详情（含作者、图片、标签、关联方案、互动状态） | 公开 |
| PATCH | `/api/v1/posts/:id` | 编辑（仅 DRAFT/REJECTED） | 作者 |
| DELETE | `/api/v1/posts/:id` | 删除 | 作者/管理员 |
| POST | `/api/v1/posts/:id/like` | 点赞 toggle | 登录 |
| POST | `/api/v1/posts/:id/bookmark` | 收藏 toggle | 登录 |
| GET | `/api/v1/posts/:id/comments` | 评论列表（一级 + 前 3 条回复） | 公开 |
| POST | `/api/v1/posts/:id/comments` | 发表评论/回复（`parentId`） | 登录 |
| DELETE | `/api/v1/comments/:id` | 删除评论 | 作者/楼主/管理员 |
| POST | `/api/v1/comments/:id/like` | 评论点赞 toggle | 登录 |
| POST | `/api/v1/users/:handle/follow` | 关注 toggle | 登录 |
| GET | `/api/v1/users/:handle` | 公开主页（帖子/方案/统计） | 公开 |
| GET | `/api/v1/me/posts` | 我的帖子 | 登录 |
| GET | `/api/v1/me/bookmarks` | 我的收藏（`type=post\|outfit`） | 登录 |
| GET | `/api/v1/tags` | 热门标签（`kind`） | 公开 |
| GET | `/api/v1/tags/:slug` | 标签详情 + 帖子流 | 公开 |
| GET | `/api/v1/search` | 聚合搜索（`q`，`type=post\|user\|garment`） | 公开 |
| POST | `/api/v1/reports` | 举报 | 登录 |
| GET | `/api/v1/notifications` | 通知列表（未读数） | 登录 |
| POST | `/api/v1/notifications/read` | 批量已读（`ids` 或 `all`） | 登录 |

**POST /posts**

```jsonc
// req
{
  "title": "互联网公司面试穿这套稳了",
  "body": "上衣选挺括的衬衫，下装深色直筒裤……",
  "imageIds": ["cm_p1", "cm_p2"],
  "tagIds": ["cm_tag1"],
  "newTags": [{ "name": "面试穿搭", "kind": "SCENE" }],
  "outfitId": "cm_of...",
  "visibility": "PUBLIC"
}
// 201
{ "data": { "id": "cm_post...", "status": "PENDING_REVIEW", "moderation": { "decision": "REVIEW", "labels": ["scene_check"] }, "createdAt": "..." } }
```

**GET /posts?sort=hot**

```jsonc
{
  "data": {
    "items": [{
      "id": "cm_post...", "title": "海边这套真的绝", "coverUrl": "https://cdn/...",
      "author": { "handle": "u_demo0001", "name": "小美", "image": "..." },
      "tags": [{ "slug": "french", "name": "法式", "kind": "STYLE" }],
      "likeCount": 42, "commentCount": 8, "bookmarkCount": 12,
      "hasOutfit": true, "liked": false, "bookmarked": false,
      "publishedAt": "2026-11-05T09:00:00.000Z"
    }],
    "nextCursor": "...", "hasMore": true
  }
}
```

**GET /posts/:id** 额外返回：`body`、`images[]`、`outfit`（含 items 单品数据，仅当可见）、`commentsPreview[]`、`isAuthor`、`followedAuthor`。

**举报**

```jsonc
// POST /reports
{ "targetType": "POST", "targetId": "cm_post...", "reason": "SPAM", "detail": "评论区引流" }
// 201
{ "data": { "id": "cm_rep...", "status": "OPEN" } }
```

---

## 9. 管理后台

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/v1/admin/stats` | 概览（用户/方案/生成成功率/待处理举报） |
| GET | `/api/v1/admin/reports` | 举报队列（`status`, `reason`, `targetType`） |
| PATCH | `/api/v1/admin/reports/:id` | 处理（`action=resolve\|reject`, `resolution`） |
| POST | `/api/v1/admin/posts/:id/moderate` | 下架/恢复（`action=remove\|restore`, `reason`） |
| GET | `/api/v1/admin/garments` | 商品列表（含 DRAFT/ARCHIVED） |
| POST | `/api/v1/admin/garments` | 新建商品 |
| PATCH | `/api/v1/admin/garments/:id` | 编辑/上下架 |
| POST | `/api/v1/admin/garments/import` | CSV 导入（`multipart/form-data`） |
| GET | `/api/v1/admin/tasks` | 任务监控（`status`, `provider`, 时间范围） |
| POST | `/api/v1/admin/tasks/:id/retry` | 重放失败任务 |
| GET | `/api/v1/admin/terms` | 敏感词列表 |
| POST | `/api/v1/admin/terms` | 新增/更新敏感词 |
| POST | `/api/v1/admin/users/:id/suspend` | 封禁/解封（`days`） |

所有管理端接口：`requireAdmin()` + 写 `AuditLog`（action、target、ipHash、meta）。

---

## 10. 系统

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/health` | `{ db, storage, queue, provider }` 健康状态（不做鉴权，限流） |
| GET | `/api/v1/config` | 前端运行时配置：`{ features, provider, mockMode, limits, policyVersion }` |
| POST | `/api/cron/cleanup` | 清理过期上传/通知/软删账号（`Authorization: Bearer $CRON_SECRET`） |
| POST | `/api/cron/hot-score` | 重算帖子热度 |

**GET /api/v1/config**

```jsonc
{
  "data": {
    "mockMode": true, "provider": "MOCK", "policyVersion": "2026-11-01",
    "features": { "wechatLogin": false, "googleLogin": false, "community": true, "aiReroll": true },
    "limits": { "uploadBytes": 10485760, "outfitItems": 8, "postImages": 9, "tryonPerDay": 10 }
  }
}
```

---

## 11. OpenAPI

- 使用 `zod-to-openapi` 由 Zod schema 生成 `docs/openapi.json`，`pnpm openapi` 输出，供 Apifox/Postman 导入。
- CI 校验：新增路由必须出现在 OpenAPI 且带响应 schema。
