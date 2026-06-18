# 博客

> 基于 **Next.js + TypeScript + Tailwind CSS + 本地 Markdown** 的极简个人博客。

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [目录结构](#目录结构)
- [写文章](#写文章)
- [分类管理](#分类管理)
- [后台管理](#后台管理)
- [前台浏览与搜索](#前台浏览与搜索)
- [开发命令](#开发命令)
- [部署](#部署)
- [内容与代码同步](#内容与代码同步)

## 功能特性

- 📝 本地 Markdown 文章，`gray-matter` 解析 frontmatter，`remark` 渲染（支持 GFM、待办列表）
- ✍️ 后台可视化 Markdown 编辑器：所见即所得、源码切换、实时预览，也可上传 `.md` 或直接编辑文件
- 🗂️ 分类管理，文章可跨分类拖拽排序
- 🔎 全文搜索（标题 / 摘要 / 正文 / 分类 / 标签），带模糊背景的搜索浮层
- 📑 文章详情页自动按 `##` / `###` 生成目录
- 🔐 带登录鉴权的后台：上传、删除、排序、分类维护
- 🛡️ 安全设计：HMAC 签名会话、密码哈希存储、登录失败 IP 封禁、CSRF 同源校验
- 🐳 Docker Compose + Nginx + HTTPS 生产部署

## 技术栈

| 分类 | 选型 |
|------|------|
| 框架 | Next.js（App Router） |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| 内容 | 本地 Markdown，`gray-matter` 解析 frontmatter，`remark` + `remark-gfm` + `remark-html` 渲染，`mdast-util-to-string` + `github-slugger` 生成目录锚点 |
| 交互 | `@mdxeditor/editor` 可视化 Markdown 编辑、`@dnd-kit` 拖拽排序（均为后台） |
| 其它 | `next/og` 动态生成 favicon |

## 快速开始

1. 安装依赖：

   ```powershell
   npm install
   ```

2. 在项目根目录创建 `.env.local`（后台功能必填）：

   ```text
   ADMIN_PASSWORD=你的强密码
   SESSION_SECRET=至少 32 位的随机字符串
   ```

   生成安全的 `SESSION_SECRET`：

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. 启动开发服务器：

   ```powershell
   npm run dev
   ```

4. 打开浏览器：

   ```text
   http://localhost:3000        # 博客主站
   http://localhost:3000/login  # 后台登录
   ```

## 目录结构

```text
content/
  posts/                 # Markdown 博客文章
  categories.json        # 分类清单（首次启动自动从文章生成）
data/
  admin.json             # 管理员账号（SHA-256 + salt 哈希，首次启动自动生成）
  banned-ips.json        # IP 封禁记录（登录失败 5 次永久封禁）
src/
  middleware.ts          # 保护 /admin 与 /api/admin 的会话校验
  app/
    page.tsx             # 首页
    icon.tsx             # 动态生成的站点 favicon
    categories/[category]/page.tsx
    posts/[slug]/page.tsx
    globals.css          # 全局样式与 Markdown 排版
    login/               # 登录页 + server action
    admin/               # 后台 UI
      posts/             # 文章列表、新建（new/）、编辑（[slug]/edit/）、上传、排序
                         #   PostEditorForm + RichMarkdownEditor（可视化编辑器）
                         #   PostCategoryBoard（跨分类拖拽）
      categories/        # 分类管理
      update/            # 系统更新面板
    api/admin/           # 后台 API
                         #   posts（POST 新建 / PATCH 编辑 / DELETE 删除）、posts/upload、posts/reorder
                         #   categories、markdown/preview（编辑器预览）、update
  components/
    admin/               # 后台专属组件
    ...                  # 其余前台组件
  lib/
    posts.ts             # 文章读取、分类与日期格式化
    search.ts            # 搜索类型与过滤
    markdown.ts          # Markdown 渲染与目录生成
    auth.ts              # 会话签名 / 校验
    adminStore.ts        # 管理员账号读写与验证
    banStore.ts          # IP 封禁记录读写
    categories.ts        # categories.json 读写
    postWriter.ts        # 写 / 删文件、frontmatter 重写、order 分配与重排
    postEditor.ts        # 新建 / 编辑文章的校验与规范化
    updater.ts           # GitHub 版本检测与一键更新协调
    paths.ts             # 路径安全拼接、slug / 分类名清洗
```

## 写文章

文章存放在 `content/posts/`，每个 `.md` 文件就是一篇文章，文件名（去掉 `.md`）即访问路径。例如 `content/posts/my-note.md` 对应 `/posts/my-note`。

文章用 frontmatter 描述元信息：

```md
---
title: "文章标题"
summary: "显示在列表和详情页顶部的简短摘要。"
date: "2026-05-21"
category: "技术"
tags: ["Next.js", "Markdown"]
---

这里开始写正文，支持标准 Markdown 与 GFM。

## 二级标题
### 三级标题
```

| 字段 | 必填 | 说明 |
|------|:---:|------|
| `title` | 是 | 文章标题 |
| `summary` | 是 | 文章摘要 |
| `date` | 建议 | 发布日期，建议 `YYYY-MM-DD`；缺失时上传会填当天 |
| `category` | 是 | 文章分类，如 `技术` / `设计` / `随笔` |
| `tags` | 否 | 标签，可多个，也可留空 |
| `order` | 否 | 整数，后台排序使用；首页默认按日期倒序，不依赖它 |

新建文章有三种方式：

- **后台可视化编辑（推荐）**：打开 `/admin/posts/new`，填写 slug、标题、摘要、日期、分类、标签后，在编辑器里写正文——支持所见即所得、Markdown 快捷语法，也可用工具栏切到源码。保存后跳转到 `/admin/posts/<slug>/edit` 可继续修改。编辑已有文章同样走该页面，slug 只读。
- **后台上传 .md**：打开 `/admin/posts/upload`，选择本地 `.md` 和目标分类提交。上传时 `category` 会被覆盖为所选分类，`order` 自动排到该分类末位，文件名作为默认 slug（可自定义；同名默认拒绝，勾选「覆盖」可强制写入）。
- **直接编辑文件**：在 `content/posts/` 新建 `.md` 即可。

保存时后台会校验：标题 ≤ 120 字、摘要 ≤ 300 字、单个标签 ≤ 30 字、正文 ≤ 1MB，日期须为合法 `YYYY-MM-DD`，分类必须已存在。

> 文章详情页会自动按 `##` 和 `###` 标题生成目录；没有这两级标题则不显示目录。

## 分类管理

分类清单存放在 `content/categories.json`，首次启动时从现有文章自动生成。两种维护方式：

- **后台**：打开 `/admin/categories`，输入名称即可新增空分类（无需先有文章）。分类下仍有文章时删除按钮会被禁用，需先把文章移走。
- **frontmatter**：直接在文章里写 `category: "技术"`。若分类不在 `categories.json` 中，会被识别为「未登记的旧分类」附在列表末尾，不会丢失。

网站会自动为每个分类生成页面，如 `/categories/技术`。

## 后台管理

后台地址 `/admin`，未登录会跳转到 `/login`。功能入口：

| 页面 | 路径 | 说明 |
|------|------|------|
| 分类管理 | `/admin/categories` | 增删分类、拖拽排序，禁止删除非空分类 |
| 文章列表 | `/admin/posts` | 按分类分组展示，可跨分类拖拽移动、删除（需输入密码确认） |
| 新建文章 | `/admin/posts/new` | 可视化 Markdown 编辑器，填写元信息并写正文 |
| 编辑文章 | `/admin/posts/[slug]/edit` | 修改元信息与正文（slug 不可改） |
| 上传文章 | `/admin/posts/upload` | 上传 `.md` 到指定分类 |
| 拖拽排序 | `/admin/posts/reorder/[category]` | 拖拽调整顺序，写回每篇文章的 `order` |
| 系统更新 | `/admin/update` | 检测 GitHub 新版本、查看更新日志、一键拉取更新（需密码确认） |

### 登录凭证

- 账户：`gzlyyds`
- 密码：`.env.local` 中 `ADMIN_PASSWORD` 的值

首次启动时系统会从环境变量生成 `data/admin.json`（SHA-256 + salt 哈希存储），之后登录验证从该文件读取。

### 安全机制

- 账户 + 密码双重验证，密码以 SHA-256 + 随机 salt 哈希存储，不保存明文
- 同一 IP 登录失败 5 次后永久封禁，持久化到 `data/banned-ips.json`，重启不丢失
- 删除文章需再次输入管理员密码确认
- 会话基于 HMAC-SHA256 签名，HttpOnly cookie，8 小时过期
- 所有 `/api/admin/*` 路由含 CSRF 同源校验

> **部署到 VPS 时务必：** ① 设置强 `ADMIN_PASSWORD`；② 用随机 32 字节生成 `SESSION_SECRET`；③ 启用 HTTPS（cookie 标记 `Secure`，仅在 HTTPS 下生效）；④ 反向代理正确传递 `X-Forwarded-For` 或 `X-Real-IP`（IP 封禁依赖此头获取真实客户端 IP）。

## 前台浏览与搜索

首页默认按发布时间倒序展示文章，每页最多 10 篇，超出则分页。翻页链接保留当前搜索关键词，第 1 页省略 `page` 参数让 URL 更简洁。

右上角导航提供三个入口：**首页**、**分类**（二级菜单含「全部」和所有分类）、**搜索**（居中浮层，带背景遮罩和高斯模糊）。

搜索覆盖标题、摘要、正文、分类、标签。输入时下方实时显示匹配结果但不刷新背景；按 Enter 或点「搜索」才进入完整结果页。搜索为空显示全部，无结果显示简洁提示。分类页同样支持搜索，结果限定在当前分类内。

## 开发命令

```powershell
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run start    # 启动生产服务（需先 build）
npm run lint     # 运行 ESLint 检查
```

## 部署

推荐部署到 Linux VPS，使用 **Docker Compose + Nginx + HTTPS**。后台会写入本地文件，因此不要部署到纯静态托管平台。

> ⚠️ 不要把真实服务器 IP、域名、后台密码、`SESSION_SECRET` 或 `.env` 内容提交到公开仓库。下文用 `<YOUR_SERVER_IP>` 和 `<YOUR_DOMAIN>` 表示你的服务器和域名。

架构概览：

```text
Internet → <YOUR_DOMAIN>
  → Nginx :443 (Let's Encrypt)
    → http://127.0.0.1:3001
      → Docker 容器 :3000
        → ./content:/app/content
        → ./data:/app/data
```

`content/` 和 `data/` 是生产环境的可变数据目录，容器重建后仍会保留。

### 1. 服务器准备（Debian / Ubuntu）

```bash
apt-get update
apt-get install -y ca-certificates curl gnupg git nginx certbot python3-certbot-nginx

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2. 获取项目

```bash
cd /opt
git clone <仓库地址> blog
cd /opt/blog
```

从本地上传时，确保服务器目录包含：`Dockerfile`、`docker-compose.yml`、`package.json`、`package-lock.json`、`src/`、`content/`、`data/`。

### 3. 生产环境变量

不要复用本地 `.env.local` 的开发密码。在 `/opt/blog/.env` 创建生产配置：

```bash
cd /opt/blog
openssl rand -hex 32   # 复制输出作为 SESSION_SECRET

cat > .env <<'EOF'
ADMIN_PASSWORD=<生产后台密码>
SESSION_SECRET=<上一步生成的 64 位 hex>
EOF

chmod 600 .env
```

### 4. 数据目录权限

容器内应用以 uid `1001` 运行，持久化目录需给它写权限：

```bash
cd /opt/blog
mkdir -p content/posts data
chown -R 1001:1001 content data
```

### 5. 启动容器

`docker-compose.yml` 只监听本机端口，避免外部绕过 Nginx：

```yaml
ports:
  - "127.0.0.1:3001:3000"
```

```bash
cd /opt/blog
docker compose up -d --build

# 检查
docker compose ps
docker compose logs --tail=100 blog
curl -I http://127.0.0.1:3001
```

### 6. Nginx 反向代理

创建 `/etc/nginx/sites-available/blog`：

```nginx
server {
    listen 80;
    server_name <YOUR_DOMAIN>;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
nginx -t
systemctl reload nginx
```

### 7. HTTPS

确认 DNS A 记录已指向服务器（`dig +short <YOUR_DOMAIN>` 应返回 `<YOUR_SERVER_IP>`），然后签发证书：

```bash
certbot --nginx -d <YOUR_DOMAIN>
```

> 生产环境后台 cookie 需通过 HTTPS 使用，登录请访问 `https://<YOUR_DOMAIN>`。

### 8. 日常更新

```bash
cd /opt/blog
git pull
docker compose up -d --build
docker compose logs --tail=100 blog
```

后台上传 / 删除文章会直接修改服务器的 `content/` 和 `data/`，无需重建容器。

### 9. 后台一键更新（可选）

配置后即可在后台 `/admin/update` 检测新版本并一键拉取更新，省去手动登录服务器。

**安全模型**：博客容器无法更新自己，后台按钮**只会往 `data/update.request` 写一个信号文件**（仅含目标 commit SHA），由主机上的守护脚本读取并执行 `git pull → docker compose build → up -d`。容器始终拿不到 Docker 控制权，也无法执行任意命令，即使后台被攻破，最多触发一次「从本仓库重新部署」。

安装守护脚本（需 `jq`，以 root 运行）：

```bash
cd /opt/blog
apt-get install -y jq
cp deploy/blog-updater.sh /usr/local/bin/blog-updater.sh
chmod +x /usr/local/bin/blog-updater.sh
cp deploy/blog-updater.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now blog-updater
```

验证与排查：

```bash
systemctl status blog-updater      # 是否常驻运行
journalctl -u blog-updater -f      # 实时日志
```

> 红点提示依赖镜像里刻入的版本号。用 `docker compose build` 构建时会自动写入当前 commit；守护脚本执行更新时也会带上。手动构建若未传 `GIT_COMMIT`，版本显示为 `unknown`，不影响其他功能。

### 10. 备份

定期备份 `content/`、`data/`、`.env`，并下载到其他存储：

```bash
cd /opt/blog
tar -czf /root/blog-backup-$(date +%F).tar.gz content data .env
```

### 常见问题

<details>
<summary>域名证书签发失败</summary>

确认 DNS A 记录已指向 `<YOUR_SERVER_IP>`，且服务器 80 端口可从公网访问。
</details>

<details>
<summary>后台无法登录</summary>

确认生产环境存在 `.env`，且设置了 `ADMIN_PASSWORD` 和足够长的 `SESSION_SECRET`，并通过 HTTPS 访问。
</details>

<details>
<summary>文章上传后重建丢失</summary>

确认 `docker-compose.yml` 挂载了 `./content:/app/content` 和 `./data:/app/data`，且服务器上 `content/`、`data/` 权限可写。
</details>

## 内容与代码同步

后台的新建 / 编辑 / 上传 / 删除会直接修改服务器的 `content/posts/*.md`、`content/categories.json` 和 `data/*.json`，这些**不会自动 commit**。`.gitignore` 已忽略 `node_modules/`、`.next/`、`.env*`、`.claude/` 以及生产可变内容等。

建议的协作方式：

- **代码改本地**：在本地开发、`npm run lint` + `npm run build` 通过后再提交推送，服务器 `git pull` 更新。
- **内容以服务器为准**：生产文章通过后台维护；需要回流仓库时手动审查并同步 `content/`。
- **不要盲目提交 `data/`**：其中含后台状态和敏感信息。

本地写作流程示例：

```powershell
npm run dev                          # 本地预览
# 确认文章、分类、目录、搜索正常
npm run lint
npm run build
git add content/posts/my-note.md
git commit -m "Add note"
git push
```

远程后台流程：登录 `/login` → 在 `/admin/posts/new` 写作（或 `/admin/posts/upload` 上传 `.md`）→ 在 `/admin/posts/<slug>/edit` 修改 → 在 `/admin/posts` 拖拽排序、删除多余文章。写入后通过 `revalidatePath` 立即生效，无需重新构建。
