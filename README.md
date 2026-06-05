# README

一个使用 Next.js、TypeScript、Tailwind CSS 和本地 Markdown 搭建的极简个人博客。整体风格偏温暖、克制、留白充足，适合记录技术、设计和日常思考。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Markdown 本地文章
- gray-matter 解析 frontmatter
- remark 渲染 Markdown
- @dnd-kit 拖拽排序（后台）
- `next/og` 动态生成 favicon

## 快速开始

第一次使用先安装依赖：

```powershell
npm install
```

在项目根目录创建 `.env.local` 用于后台登录（后台功能必填）：

```text
ADMIN_PASSWORD=你的强密码
SESSION_SECRET=至少 32 位的随机字符串
```

生成一个安全的 `SESSION_SECRET`：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

启动开发服务器：

```powershell
npm run dev
```

然后在浏览器打开：

```text
http://localhost:3000        # 博客主站
http://localhost:3000/login  # 后台登录
```

构建生产版本：

```powershell
npm run build
```

运行代码检查：

```powershell
npm run lint
```

## 目录结构

```text
content/
  posts/                 # Markdown 博客文章
  categories.json        # 分类清单（首次启动自动从文章生成）
data/
  admin.json             # 管理员账号（SHA-256+salt 哈希，首次启动自动生成）
  banned-ips.json        # IP 封禁记录（登录失败 5 次永久封禁）
src/
  middleware.ts          # 保护 /admin 与 /api/admin 的会话校验
  app/
    page.tsx             # 首页
    icon.tsx             # 动态生成的站点 favicon（暖色 R 标）
    categories/[category]/page.tsx
    posts/[slug]/page.tsx
    globals.css          # 全局样式和 Markdown 排版
    login/               # 后台登录页 + server action
    admin/               # 后台 UI（仪表盘、分类、文章、上传、排序）
    api/admin/           # 后台 API（categories、posts/upload、posts/reorder、posts/[slug] 删除）
  components/
    admin/               # 后台专属组件（登出、删除按钮）
    ...                  # 其余前台组件
  lib/
    posts.ts             # 文章读取、分类和日期格式化
    search.ts            # 搜索类型和通用搜索过滤
    markdown.ts          # Markdown 渲染和目录生成
    auth.ts              # 会话签名/校验
    adminStore.ts        # 管理员账号读写与验证（SHA-256+salt）
    banStore.ts          # IP 封禁记录读写（内存缓存+文件持久化）
    categories.ts        # categories.json 读写
    postWriter.ts        # 写文件、删除文件、frontmatter 重写、order 分配与重排
    paths.ts             # 路径安全拼接、slug/分类名清洗
```

## 如何写一篇新文章

有两种方式：直接编辑文件，或使用后台上传。

### 方式一：直接编辑文件

文章都放在：

```text
content/posts/
```

新建一个 `.md` 文件即可，例如：

```text
content/posts/my-new-note.md
```

文件名会成为文章访问地址的一部分。例如 `my-new-note.md` 的地址是：

```text
/posts/my-new-note
```

### 方式二：通过后台上传

打开 `/admin/posts/upload`，选择本地的 `.md` 文件、选择目标分类，提交即可。

- 文件原有 frontmatter 会保留，但 `category` 字段会被覆盖为后台选择的分类
- `order` 会自动分配为该分类下的最末位
- `date` 缺失时填今天
- 标签为可选项；多个标签用英文逗号分隔，不填则不添加标签
- 分类新增、删除或排序后，上传页会重新读取最新分类
- 文件名（去掉 `.md`）作为默认 slug，可在表单里自定义；同名 slug 默认拒绝，勾选「覆盖」可强制写入

文章格式如下：

```md
---
title: "文章标题"
summary: "这是一段简短摘要，会显示在文章列表和文章详情页顶部。"
date: "2026-05-21"
category: "技术"
tags: ["Next.js", "Markdown"]
---

这里开始写正文。

## 一级小节

正文支持普通 Markdown。

### 二级小节

- 列表
- 链接
- 引用
- 代码块

```ts
const message = "Hello blog";
```
```

注意：

- `title`：文章标题
- `summary`：文章摘要
- `date`：发布日期，建议使用 `YYYY-MM-DD`
- `category`：文章分类，例如 `技术`、`设计`、`随笔`
- `tags`：文章标签，可写多个，也可以留空
- `order`：可选，整数。后台文章管理和分类内拖拽排序会使用该字段；首页展示不依赖它，而是默认按发布时间倒序排列

## 文章目录如何生成

文章详情页会自动读取 Markdown 里的标题生成目录。

会进入目录的标题层级：

```md
## 二级标题
### 三级标题
```

如果一篇文章没有 `##` 或 `###` 标题，就不会显示目录。

## 如何管理分类

分类清单存放在 `content/categories.json`，首次启动会从现有文章自动生成。两种维护方式：

### 通过后台

打开 `/admin/categories`：

- 输入名称、点「创建」即可新增空分类（不需要先有文章）
- 删除按钮在分类下还有文章时会被禁用——先把文章移到其他分类（重新上传或修改 frontmatter）再删除

### 直接在 frontmatter 写

文章 frontmatter 里：

```md
category: "技术"
```

如果写了一个不存在于 `categories.json` 的分类，它会被识别为「未登记的旧分类」并附在分类列表末尾，不会丢失。

网站会自动生成分类页：

```text
/categories/技术
/categories/设计
/categories/随笔
```

## 后台管理

后台地址：`/admin`，未登录会跳转到 `/login`。提供：

- **分类管理** `/admin/categories`：增删分类、拖拽排序，禁止删除非空分类
- **文章列表** `/admin/posts`：按分类分组展示所有文章，每篇文章右侧带「删除」按钮（需输入管理员密码确认）
- **上传文章** `/admin/posts/upload`：上传 `.md` 到指定分类
- **拖拽排序** `/admin/posts/reorder/[category]`：拖拽调整顺序，保存后写回每篇文章的 `order` 字段

### 登录凭证

- 账户：`gzlyyds`
- 密码：`.env.local` 中 `ADMIN_PASSWORD` 的值

首次启动时系统自动从环境变量生成 `data/admin.json`（SHA-256 + salt 哈希存储），之后登录验证从文件读取。

### 安全机制

- 登录需账户 + 密码双重验证
- 密码使用 SHA-256 + 随机 salt 哈希存储，不保存明文
- 同一 IP 登录失败 5 次后永久封禁（持久化到 `data/banned-ips.json`，重启不丢失）
- 删除文章需再次输入管理员密码确认
- Session 基于 HMAC-SHA256 签名，HttpOnly cookie，8 小时过期
- 所有 `/api/admin/*` 路由含 CSRF 同源校验

部署到 VPS 时务必：

1. 设置强密码 `ADMIN_PASSWORD`
2. 用随机 32 字节生成 `SESSION_SECRET`
3. 用 HTTPS（cookie 标记了 `Secure`，生产环境只在 HTTPS 下生效）
4. 确保反向代理正确传递 `X-Forwarded-For` 或 `X-Real-IP` 头（IP 封禁依赖此头获取真实客户端 IP）

## 前台浏览、分类和搜索

首页正文区域保持简洁，默认按发布时间倒序展示文章，每页最多显示 10 篇；超过 10 篇时通过分页浏览。翻页链接会保留当前搜索关键词，第 1 页默认省略 `page` 参数，让 URL 更简洁。

右上角导航提供三个入口：

- **首页**：回到文章列表首页
- **分类**：打开二级菜单，包含「全部」和所有分类
- **搜索**：打开居中的搜索浮层

搜索浮层带有背景遮罩和高斯模糊。输入关键词时，页面背景不会实时刷新；搜索框下方会直接显示匹配文章。按 Enter 或点击「搜索」按钮后，才会提交搜索并进入完整结果页。

搜索范围包括：

- 标题
- 摘要
- 正文
- 分类
- 标签

搜索为空时会显示全部文章；没有结果时会显示简洁提示。分类页同样支持搜索，并且搜索结果会限定在当前分类内。

## 常用开发命令

```powershell
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run start    # 启动生产服务，需要先 build
npm run lint     # 运行 ESLint 检查
```

## 服务器部署（Docker Compose + Nginx + HTTPS）

本项目推荐部署到 Linux VPS，并使用 **Docker Compose + Nginx + HTTPS** 运行。博客后台会写入本地文件，因此不要部署到纯静态托管平台。

> 不要把真实服务器 IP、域名、后台密码、`SESSION_SECRET` 或 `.env` 内容提交到公开仓库。

下面用占位符表示你的服务器和域名：

```text
<YOUR_SERVER_IP>  # 你的服务器 IP
<YOUR_DOMAIN>     # 你的域名，例如 example.com
```

### 部署架构

```text
Internet
  -> <YOUR_DOMAIN>
    -> Nginx :443 / Let's Encrypt
      -> http://127.0.0.1:3001
        -> Docker Compose blog container :3000
          -> ./content:/app/content
          -> ./data:/app/data
```

`content/` 和 `data/` 是生产环境的可变数据目录，容器重建后仍应保留。

### 1. 服务器准备

以下以 Debian 12 / Ubuntu 类 VPS 为例。

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

### 2. 上传或拉取项目

推荐放到：

```bash
/opt/blog
```

如果使用 git：

```bash
cd /opt
git clone <仓库地址> blog
cd /opt/blog
```

如果是从本地上传，确保上传后服务器目录包含：

- `Dockerfile`
- `docker-compose.yml`
- `package.json`
- `package-lock.json`
- `src/`
- `content/`
- `data/`

### 3. 生产环境变量

不要使用本地 `.env.local` 的开发密码。

在服务器 `/opt/blog/.env` 创建生产配置：

```bash
cd /opt/blog
openssl rand -hex 32

cat > .env <<'EOF'
ADMIN_PASSWORD=<换成生产后台密码>
SESSION_SECRET=<粘贴上一步生成的 64 位 hex>
EOF

chmod 600 .env
```

### 4. 数据目录权限

Dockerfile 中应用进程使用 uid `1001`，所以服务器上的持久化目录需要给它写权限：

```bash
cd /opt/blog
mkdir -p content/posts data
chown -R 1001:1001 content data
```

### 5. Docker Compose 启动

`docker-compose.yml` 应只监听本机端口，避免外部绕过 Nginx 访问：

```yaml
ports:
  - "127.0.0.1:3001:3000"
```

启动：

```bash
cd /opt/blog
docker compose up -d --build
```

查看状态：

```bash
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

启用：

```bash
ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
nginx -t
systemctl reload nginx
```

### 7. HTTPS

确保 DNS 已经指向服务器：

```bash
dig +short <YOUR_DOMAIN>
```

应返回：

```text
<YOUR_SERVER_IP>
```

签发证书：

```bash
certbot --nginx -d <YOUR_DOMAIN>
```

> 后台 Cookie 在生产环境下应通过 HTTPS 使用；后台登录请访问 `https://<YOUR_DOMAIN>`。

### 8. 日常更新

代码更新：

```bash
cd /opt/blog
git pull
docker compose up -d --build
docker compose logs --tail=100 blog
```

如果是本地上传代码，则重新上传后执行：

```bash
cd /opt/blog
docker compose up -d --build
```

后台上传/删除文章会直接修改服务器的 `content/` 和 `data/`，不需要重建容器。

### 9. 内容同步策略

后台上传/删除会直接修改服务器的 `content/posts/*.md`、`content/categories.json` 以及 `data/*.json`。这些文件不会自动 git commit。

推荐：

- 生产内容以服务器 `content/` 为准。
- 本地主要改代码。
- 需要把文章回流仓库时，手动审查并同步 `content/`。
- 不要把包含后台状态或敏感信息的 `data/` 盲目提交到公开仓库。

### 10. 备份

至少备份：

- `/opt/blog/content/`
- `/opt/blog/data/`
- `/opt/blog/.env`

手动备份示例：

```bash
cd /opt/blog
tar -czf /root/blog-backup-$(date +%F).tar.gz content data .env
```

建议把备份下载到本地或其他存储，不要只留在同一台服务器。

### 11. 验证清单

部署后检查：

```bash
cd /opt/blog
docker compose ps
curl -I http://127.0.0.1:3001
nginx -t
curl -I https://<YOUR_DOMAIN>
```

浏览器检查：

- 首页可通过 `https://<YOUR_DOMAIN>` 访问。
- `/login` 可通过 HTTPS 登录。
- 后台上传、排序、删除文章正常。
- `docker compose restart blog` 后文章仍存在。
- `docker compose up -d --build` 后文章仍存在。
- 外网不能直接访问 `http://<YOUR_SERVER_IP>:3001`。

### 12. 常见问题

**域名证书签发失败**

先确认 DNS A 记录已经指向 `<YOUR_SERVER_IP>`，并且服务器 80 端口能从公网访问。

**后台无法登录**

确认生产环境存在 `.env`，并且设置了 `ADMIN_PASSWORD` 和足够长的 `SESSION_SECRET`。生产环境请使用 HTTPS 访问。

**文章上传后重建丢失**

确认 `docker-compose.yml` 挂载了：

```yaml
volumes:
  - ./content:/app/content
  - ./data:/app/data
```

并确认服务器上的 `content/`、`data/` 权限可写。

## 使用 Git 管理项目

本项目已经初始化为 Git 仓库，并包含 `.gitignore`。

已忽略的常见目录和文件包括：

- `node_modules/`
- `.next/`
- `out/`
- `build/`
- `.env*`
- `.claude/`
- 日志文件和缓存文件

### 查看当前状态

```powershell
git status
```

### 第一次提交

```powershell
git add .
git commit -m "Initial blog project"
```

### 日常修改后的提交流程

每次新增文章、修改样式或改代码后，可以按这个流程提交：

```powershell
git status
git add .
git commit -m "Add new blog post"
```

建议提交前先运行：

```powershell
npm run lint
npm run build
```

确保项目没有明显错误。

### 查看提交历史

```powershell
git log --oneline
```

### 查看具体改了什么

```powershell
git diff
```

如果文件已经 `git add` 到暂存区，可以查看暂存区差异：

```powershell
git diff --staged
```

### 连接远程仓库

如果你在 GitHub、Gitee 或其他平台创建了远程仓库，可以执行：

```powershell
git remote add origin <你的远程仓库地址>
git branch -M main
git push -u origin main
```

之后日常推送：

```powershell
git push
```

拉取远程更新：

```powershell
git pull
```

## 推荐写作流程

### 本地写作

1. 在 `content/posts/` 新建或修改 `.md` 文件。
2. 运行 `npm run dev` 本地预览。
3. 确认文章、分类、目录和搜索都正常。
4. 运行 `npm run lint` 和 `npm run build`。
5. 使用 Git 提交修改。

示例：

```powershell
npm run dev
git status
git add content/posts/my-new-note.md
git commit -m "Add note about writing rhythm"
```

### 远程后台

部署到服务器后，可以直接通过浏览器：

1. 打开 `/login` 输入账户和密码登录
2. 在 `/admin/posts/upload` 上传写好的 `.md`
3. 在 `/admin/posts/reorder/<分类>` 拖拽调整顺序
4. 在 `/admin/posts` 直接点「删除」清理不需要的文章（二次确认，删除后自动重排序号）

服务器写入后会通过 `revalidatePath` 让首页和分类页立即看到更新，不需要重新构建。生成的 `.md` 文件和 `categories.json` 仍然保留在仓库中，事后可以照常 `git pull` 同步到本地。
