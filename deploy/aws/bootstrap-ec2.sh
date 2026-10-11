#!/usr/bin/env bash
# One-time setup of the application server. Ubuntu 24.04 LTS on EC2.
#
#   sudo REPO_URL=https://github.com/you/supporthub.git ./bootstrap-ec2.sh
#
# Run it through Session Manager (no SSH port needed). Safe to run again.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Run as root: sudo $0" >&2; exit 1; }

APP_DIR="${APP_DIR:-/opt/supporthub}"
REPO_URL="${REPO_URL:?Set REPO_URL to the git address of this repository}"
BRANCH="${BRANCH:-main}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git jq unzip docker.io docker-compose-v2

# AWS CLI v2 (used to read secrets from SSM Parameter Store with the server's IAM role).
if ! command -v aws >/dev/null 2>&1; then
    snap install aws-cli --classic
fi

systemctl enable --now docker

mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/app/.git" ]; then
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR/app"
fi
chmod 755 "$APP_DIR"

cat <<MSG

Server is ready.

Next:
  1. Put the secrets in SSM Parameter Store under /supporthub/prod/ (see docs/aws-deployment.md).
  2. Run the first deploy:        sudo $APP_DIR/app/deploy/aws/deploy-api.sh
  3. Create the first admin:      sudo $APP_DIR/app/deploy/aws/first-run.sh
MSG
