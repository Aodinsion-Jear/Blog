#!/usr/bin/env bash
#
# blog-updater.sh — 博客「后台一键更新」的主机守护脚本（A 方案：信号文件）
#
# 工作方式：
#   盯着 $REPO_DIR/data/update.request 信号文件。博客后台点「更新」时只会写这个文件，
#   内含目标 commit SHA。本脚本读到后执行 git pull → docker compose build → up -d，
#   每一步把进度写回 data/update.status.json，博客后台轮询这个文件显示进度。
#
# 安全：
#   - 博客容器只能「写一个文件」，本脚本只 git pull 固定仓库、只跑固定命令，
#     不接受信号文件里的任何命令/分支/路径，杜绝注入。
#   - 默认以 root 运行（肯定有 git+docker 权限）。
#     若想换成 docker 组的普通用户：把 systemd 单元里的 User 改掉，
#     并确保该用户对 $REPO_DIR 有写权限、且在 docker 组内。
#
set -uo pipefail

REPO_DIR="${BLOG_REPO_DIR:-/opt/blog}"
BRANCH="${BLOG_BRANCH:-main}"
DATA_DIR="$REPO_DIR/data"
REQUEST_FILE="$DATA_DIR/update.request"
STATUS_FILE="$DATA_DIR/update.status.json"
LOCK_FILE="$DATA_DIR/update.lock"
POLL_INTERVAL="${BLOG_POLL_INTERVAL:-5}"

# 累积日志行，写状态时一并落盘。
LOG_LINES=()

# 用 jq 安全生成 status.json（避免日志里的引号/换行破坏 JSON）。
write_status() {
  local state="$1"
  local message="${2:-}"
  local sha="${3:-}"
  local started="${4:-}"
  local finished="${5:-}"

  local log_json="[]"
  if [ "${#LOG_LINES[@]}" -gt 0 ]; then
    log_json=$(printf '%s\n' "${LOG_LINES[@]}" | jq -R . | jq -s .)
  fi

  jq -n \
    --arg state "$state" \
    --arg message "$message" \
    --arg sha "$sha" \
    --arg startedAt "$started" \
    --arg finishedAt "$finished" \
    --argjson log "$log_json" \
    '{state:$state, message:$message, sha:$sha, startedAt:$startedAt, finishedAt:$finishedAt, log:$log}
     | with_entries(select(.value != ""))' \
    > "$STATUS_FILE.tmp" && mv "$STATUS_FILE.tmp" "$STATUS_FILE"
}

log() {
  local line="$1"
  echo "$line"
  LOG_LINES+=("$line")
}

# 执行一条命令，stdout/stderr 都收进日志。
run_step() {
  local line
  while IFS= read -r line; do
    LOG_LINES+=("$line")
    echo "$line"
  done < <("$@" 2>&1)
}

do_update() {
  LOG_LINES=()
  local started
  started=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  cd "$REPO_DIR" || {
    write_status "error" "找不到仓库目录 $REPO_DIR" "" "$started" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    return 1
  }

  # 1) 拉取代码
  write_status "pulling" "正在拉取最新代码…" "" "$started"
  log "+ git fetch --prune origin"
  run_step git fetch --prune origin
  log "+ git pull --ff-only origin $BRANCH"
  if ! run_step git pull --ff-only origin "$BRANCH"; then
    write_status "error" "git pull 失败（可能有本地改动或冲突，请手动处理）" "" "$started" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    return 1
  fi

  local new_sha
  new_sha=$(git rev-parse HEAD)

  # 2) 重新构建（把 commit 刻进镜像）
  write_status "building" "正在重新构建镜像…" "$new_sha" "$started"
  log "+ GIT_COMMIT=$new_sha docker compose build"
  if ! GIT_COMMIT="$new_sha" run_step docker compose build; then
    write_status "error" "docker compose build 失败" "$new_sha" "$started" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    return 1
  fi

  # 3) 重启容器
  write_status "restarting" "正在重启服务…" "$new_sha" "$started"
  log "+ GIT_COMMIT=$new_sha docker compose up -d"
  if ! GIT_COMMIT="$new_sha" run_step docker compose up -d; then
    write_status "error" "docker compose up 失败" "$new_sha" "$started" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    return 1
  fi

  log "更新完成，已部署版本 ${new_sha:0:7}"
  write_status "done" "更新完成" "$new_sha" "$started" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  return 0
}

main() {
  command -v jq >/dev/null 2>&1 || { echo "需要 jq，请先安装：apt-get install -y jq" >&2; exit 1; }
  mkdir -p "$DATA_DIR"

  echo "[blog-updater] watching $REQUEST_FILE (repo=$REPO_DIR branch=$BRANCH)"

  while true; do
    if [ -f "$REQUEST_FILE" ]; then
      # flock 防并发：同一时刻只允许一个更新流程。
      (
        if flock -n 9; then
          echo "[blog-updater] request detected, starting update"
          do_update || echo "[blog-updater] update failed"
          rm -f "$REQUEST_FILE"
        else
          echo "[blog-updater] another update is running, skip"
        fi
      ) 9>"$LOCK_FILE"
    fi
    sleep "$POLL_INTERVAL"
  done
}

main "$@"
