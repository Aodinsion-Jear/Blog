# 部署指南

本项目推荐部署到 Linux VPS，并使用 **Docker Compose + Nginx + HTTPS** 运行。博客后台会写入本地文件，因此不要部署到纯静态托管平台。

当前目标服务器：`45.8.22.149`

当前目标域名：`blog.gzlyyds.cn`

## 架构

```text
Internet
  -> blog.gzlyyds.cn
    -> Nginx :443 / Let's Encrypt
      -> http://127.0.0.1:3001
        -> Docker Compose blog container :3000
          -> ./content:/app/content
          -> ./data:/app/data
```

`content/` 和 `data/` 是生产环境的可变数据目录，容器重建后仍应保留。

## 1. 服务器准备

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

## 2. 上传或拉取项目

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
- `public/`
- `content/`
- `data/`

## 3. 生产环境变量

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

## 4. 数据目录权限

Dockerfile 中应用进程使用 uid `1001`，所以服务器上的持久化目录需要给它写权限：

```bash
cd /opt/blog
mkdir -p content/posts data
chown -R 1001:1001 content data
```

## 5. Docker Compose 启动

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

## 6. Nginx 反向代理

创建 `/etc/nginx/sites-available/blog`：

```nginx
server {
    listen 80;
    server_name blog.gzlyyds.cn;

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

## 7. HTTPS

确保 DNS 已经指向服务器：

```bash
dig +short blog.gzlyyds.cn
```

应返回：

```text
45.8.22.149
```

签发证书：

```bash
certbot --nginx -d blog.gzlyyds.cn
```

> 后台 Cookie 在生产环境下应通过 HTTPS 使用；后台登录请访问 `https://blog.gzlyyds.cn`。

## 8. 日常更新

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

## 9. 内容同步策略

后台上传/删除会直接修改服务器的 `content/posts/*.md`、`content/categories.json` 以及 `data/*.json`。这些文件不会自动 git commit。

推荐：

- 生产内容以服务器 `content/` 为准。
- 本地主要改代码。
- 需要把文章回流仓库时，手动审查并同步 `content/`。
- 不要把包含后台状态或敏感信息的 `data/` 盲目提交到公开仓库。

## 10. 备份

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

## 11. 验证清单

部署后检查：

```bash
cd /opt/blog
docker compose ps
curl -I http://127.0.0.1:3001
nginx -t
curl -I https://blog.gzlyyds.cn
```

浏览器检查：

- 首页可通过 `https://blog.gzlyyds.cn` 访问。
- `/login` 可通过 HTTPS 登录。
- 后台上传、排序、删除文章正常。
- `docker compose restart blog` 后文章仍存在。
- `docker compose up -d --build` 后文章仍存在。
- 外网不能直接访问 `http://45.8.22.149:3001`。

## 12. 常见问题

**域名证书签发失败**

先确认 DNS A 记录已经指向 `45.8.22.149`，并且服务器 80 端口能从公网访问。

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
