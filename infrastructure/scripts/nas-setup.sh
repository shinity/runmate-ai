#!/bin/bash
# RunMate AI - Synology NAS 초기 배포 설정 스크립트
# 시놀로지 SSH에서 한 번만 실행하면 됩니다.
set -e

echo "🚀 RunMate AI NAS 초기 설정 시작"

# ─── 1. Docker 확인 ───────────────────────────────────────────
if ! command -v docker &> /dev/null; then
  echo "❌ Docker가 설치되어 있지 않습니다."
  echo "   Synology Package Center에서 'Container Manager'를 먼저 설치해주세요."
  exit 1
fi
echo "✅ Docker 확인 완료"

# ─── 2. 프로젝트 클론 ─────────────────────────────────────────
PROJECT_DIR="${NAS_PROJECT_PATH:-/volume1/docker/runmate-ai}"
if [ ! -d "$PROJECT_DIR" ]; then
  echo "📂 프로젝트 클론: $PROJECT_DIR"
  git clone https://github.com/${GITHUB_REPO:-your-username/runmate-ai}.git "$PROJECT_DIR"
else
  echo "✅ 프로젝트 디렉토리 이미 존재: $PROJECT_DIR"
fi
cd "$PROJECT_DIR"

# ─── 3. .env 파일 생성 ────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "📝 .env 파일 생성 중..."
  cat > .env << 'ENVEOF'
# ── 필수 ─────────────────────────────────────────────────────
POSTGRES_USER=runmate
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_DB=runmate
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD
JWT_SECRET=CHANGE_ME_JWT_SECRET_MIN_32_CHARS
AI_PIPELINE_SECRET=CHANGE_ME_PIPELINE_SECRET

# ── GHCR (GitHub Container Registry) ────────────────────────
GHCR_OWNER=your-github-username

# ── AI 서비스 ────────────────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=
PINECONE_API_KEY=
ENVEOF
  echo "⚠️  .env 파일을 편집해서 실제 값을 채워주세요: nano $PROJECT_DIR/.env"
else
  echo "✅ .env 파일 이미 존재"
fi

# ─── 4. SSH 키 생성 (GitHub Actions용) ───────────────────────
SSH_KEY_PATH="$HOME/.ssh/runmate_deploy"
if [ ! -f "$SSH_KEY_PATH" ]; then
  echo "🔑 배포용 SSH 키 생성 중..."
  ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "runmate-deploy"
  cat "$SSH_KEY_PATH.pub" >> "$HOME/.ssh/authorized_keys"
  chmod 600 "$HOME/.ssh/authorized_keys"
  echo ""
  echo "✅ SSH 키 생성 완료!"
  echo "────────────────────────────────────────────────────────"
  echo "아래 개인키를 GitHub Secret 'NAS_SSH_KEY'에 등록하세요:"
  echo "────────────────────────────────────────────────────────"
  cat "$SSH_KEY_PATH"
  echo "────────────────────────────────────────────────────────"
else
  echo "✅ SSH 키 이미 존재: $SSH_KEY_PATH"
fi

# ─── 5. GHCR 로그인 ───────────────────────────────────────────
echo ""
echo "📦 GHCR 로그인 설정"
echo "   아래 명령어로 로그인하세요 (GitHub Personal Access Token 필요):"
echo "   echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin"

# ─── 6. 초기 배포 ─────────────────────────────────────────────
echo ""
echo "🎯 초기 배포 실행..."
docker compose -f infrastructure/docker/docker-compose.prod.yml pull
docker compose -f infrastructure/docker/docker-compose.prod.yml up -d

echo ""
echo "✅ 초기 설정 완료!"
echo ""
echo "다음 단계:"
echo "1. .env 파일 값 채우기: nano $PROJECT_DIR/.env"
echo "2. GitHub Secrets 등록 (아래 목록 참고)"
echo "3. Tailscale 설치: https://tailscale.com/download"
echo ""
echo "── GitHub Secrets 등록 목록 ─────────────────────────────"
echo "NAS_TAILSCALE_IP      : Tailscale에서 확인한 NAS IP (100.x.x.x)"
echo "NAS_SSH_USER          : 시놀로지 SSH 사용자명"
echo "NAS_SSH_KEY           : 위에서 생성한 개인키"
echo "NAS_PROJECT_PATH      : $PROJECT_DIR"
echo "TAILSCALE_OAUTH_CLIENT_ID : Tailscale OAuth 클라이언트 ID"
echo "TAILSCALE_OAUTH_SECRET    : Tailscale OAuth 시크릿"
echo "GEMINI_API_KEY        : Gemini API 키"
