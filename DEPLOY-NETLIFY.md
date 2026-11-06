# Netlify + Supabase + GitHub 部署指南

> 适用：课程作业 / 公网演示。架构为 **Netlify（Next.js Runtime）+ Supabase Postgres + Supabase Storage（私有 Bucket）+ GitHub**。  
> 当前代码已加入 Supabase 驱动、Netlify 同步任务、4MB 上传限制与 `netlify.toml`。

---

## 0. 这套架构的边界

| 项 | 当前选择 | 说明 |
| --- | --- | --- |
| 数据库 | Supabase Postgres | 替代本地 PGlite |
| 图片 | Supabase Storage 私有桶 | 替代 `.data/uploads` |
| 生成任务 | 请求内同步执行 | Netlify 函数返回后不能继续跑后台 `setTimeout` |
| 上传上限 | 4MB | Netlify 函数请求体约 6MB |
| AI | Mock | 不需要真实 Key |
| 实例 | 单实例逻辑 | 不接 Redis / BullMQ |

---

## 1. Supabase

### 1.1 建项目

- 区域选 **Singapore**（国内访问相对稳）。
- 免费项目 7 天无活动会暂停，老师要看前先打开 Supabase 控制台恢复。

### 1.2 拿连接串

Project Settings → Database → Connection string：

| 变量 | 用哪个 | 示例 |
| --- | --- | --- |
| `DATABASE_URL` | **Transaction pooler**（6543） | `postgresql://postgres.<ref>:<pwd>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | **Session pooler**（5432，IPv4，适合迁移） | `postgresql://postgres.<ref>:<pwd>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres` |

> 密码含特殊字符时先 URL 编码；连接串不要提交到 GitHub。

### 1.3 建 Storage Bucket

Storage → New bucket：

- 名称：`ootd-media`
- **Private**（不要 Public）
- 不需要手动建目录；代码按 `users/...`、`catalog/...` 写入。

### 1.4 复制 API 信息

Project Settings → API：

- `SUPABASE_URL`：`https://xxxx.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`：**只放 Netlify 环境变量，绝不进前端、绝不 `NEXT_PUBLIC_`**

---

## 2. 本地先跑一次（可选但推荐）

先确认迁移和 seed 能连上 Supabase：

```bash
# 1) 迁移（Session pooler 5432）
DATABASE_URL="<DIRECT_URL>" pnpm prisma migrate deploy

# 2) 建表后 seed（Runtime 连接池 6543）
DB_DRIVER=postgres \
DATABASE_URL="<DATABASE_URL>" \
STORAGE_DRIVER=supabase \
SUPABASE_URL="https://xxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="..." \
SUPABASE_BUCKET=ootd-media \
pnpm setup
```

成功后 Supabase：

- Table Editor 能看到 `users`、`garments`、`posts` 等表；
- Storage 的 `ootd-media` 里有 `catalog/`、`community/` 图片；
- 本地 `.env` 不要提交。

> Netlify 的 build 命令会自动做迁移 + seed；本地这一步只是提前排错。

---

## 3. GitHub

```bash
git init
git add .
git commit -m "OOTD Lab"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

确认 `.gitignore` 包含：

```text
node_modules
.next
.data
.env
.pnpm-home
*.log
```

---

## 4. Netlify

### 4.1 导入

- Add new site → Import an existing project → GitHub。
- 如果仓库根目录不是项目根，设置 **Base directory** 为 `ootd-lab`。
- Build command 与 publish 已由根目录 `netlify.toml` 提供，不用手填。

`netlify.toml` 的关键行为：

1. 安装 devDependencies（`tsx`/`prisma` 构建需要）；
2. 用 `DIRECT_URL` 执行 `prisma migrate deploy`；
3. `pnpm setup` 自动 seed（70 件写实商品 + 4 篇帖子 + demo/admin）；
4. `pnpm build`。

### 4.2 环境变量

Site configuration → Environment variables，逐条添加：

```dotenv
NODE_ENV=production

DB_DRIVER=postgres
DATABASE_URL=postgresql://...pooler...:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://...:5432/postgres

AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://<site>.netlify.app
APP_URL=https://<site>.netlify.app

MEDIA_KEK=<openssl rand -base64 32>
MEDIA_URL_SECRET=<openssl rand -base64 32>

STORAGE_DRIVER=supabase
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_BUCKET=ootd-media

MAX_UPLOAD_BYTES=4194304
INLINE_TASK_MODE=sync

LLM_PROVIDER=mock
LLM_API_KEY=
IMAGE_PROVIDER_CHAIN=mock
IMAGE_MAX_ATTEMPTS=3
IMAGE_WEBHOOK_SECRET=
```

> `AUTH_URL` 必须与最终访问域名完全一致（不带尾斜杠）。  
> 如果先用 Deploy Preview 域名，登录会跳回生产域名；只测 Production。

### 4.3 部署

Deploy site → 等待 build。首次会：

- 连接 Supabase 执行 0001–0005；
- 上传 70 件写实商品图（男/女各 35）+ 4 张社区图到 Supabase Storage；
- 构建 Next。

---

## 5. 验收

打开：

```text
https://<site>.netlify.app/login
```

账号：

```text
demo@ootd.local / Demo1234!
admin@ootd.local / Admin1234!
```

依次测试：

1. 登录 → 自由搭配 → 上传全身照（≤4MB）→ 同意 → 生成 → 保存。
2. AI 推荐 → 输入场景 → 结果 + 效果图。
3. 讨论区 → 发帖（图片 ≤4MB）→ 评论 → 点赞。
4. 刷新页面 / 再打开，图片仍在（说明 Supabase Storage 生效）。
5. `/api/health` 返回 200（DB + storage）。

---

## 6. 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 登录 500 / `MissingSecret` | 没配 `AUTH_SECRET` | Netlify 加环境变量后重新 deploy |
| 登录后跳回登录 | `AUTH_URL` 与域名不一致 | 改成最终 `https://...netlify.app` |
| 图片 404 | 没开 Supabase Storage 或 bucket 名不对 | `STORAGE_DRIVER=supabase`、bucket `ootd-media` |
| 生成一直转圈 | 仍是 async 模式 | `INLINE_TASK_MODE=sync` |
| 上传 413 | 图片 > 4MB | 压缩后再传；确认 `MAX_UPLOAD_BYTES=4194304` |
| build 失败在 migrate | `DIRECT_URL` 错 / DB 暂停 | 控制台恢复 Supabase；重填连接串 |
| build 失败在 `pnpm setup` | Storage bucket 不存在/Key 错 | 建私有 bucket，重填 service role |
| 老师几天后打不开数据 | Supabase Free 7 天暂停 | Supabase 控制台 Restore |

---

## 7. 不要做的事

- 不要把 `SUPABASE_SERVICE_ROLE_KEY` 写到 `NEXT_PUBLIC_*` 或前端。
- 不要在 Netlify 上跑 `pnpm start`（Netlify 用自己的 Next Runtime）。
- 不要用 PGlite（函数无持久磁盘）。
- 不要把 Bucket 设成 Public。
- 不要开多个 Netlify 实例共享同一套同步任务；当前只适合演示。
- 不要把 `.env`、`.data` 提交到 GitHub。

---

## 8. 如果 build 自动注释 seed

默认 build 每次都会 `pnpm setup`，对课程演示最省事。若不想每次部署都 seed：

1. 把 `netlify.toml` 里的 `&& pnpm setup` 删掉；
2. 本地执行一次第 2 节的迁移 + seed；
3. 重新 deploy。

---

## 9. 时间

- Supabase + bucket：10 分钟
- GitHub：5 分钟
- Netlify 配置 + 首次 build：15 分钟
- 验收：10 分钟

总计约 **40 分钟**（不含排队/网络问题）。
