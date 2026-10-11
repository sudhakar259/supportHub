#!/usr/bin/env bash
# Writes the server's environment file from AWS Systems Manager Parameter Store.
#
# Every parameter under /supporthub/prod/ becomes one KEY='value' line, e.g. the parameter
# /supporthub/prod/DB_PASSWORD becomes DB_PASSWORD='…'. The server's IAM role needs
# ssm:GetParametersByPath on that path (deploy/aws/iam-instance-policy.json). The file is
# readable by root only and is never committed.
set -euo pipefail

PARAM_PATH="${PARAM_PATH:-/supporthub/prod/}"
OUT="${ENV_FILE:-/opt/supporthub/.env.production}"

# Region: explicit setting, else ask the instance metadata service (IMDSv2).
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"
if [ -z "$REGION" ]; then
    TOKEN="$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')"
    REGION="$(curl -fsS -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)"
fi

# Single quotes keep $, spaces and # in a value literal. A value that itself contains a single
# quote cannot be written that way, so refuse it loudly instead of corrupting the file.
read -r -d '' JQ_PROGRAM <<'JQ' || true
.[] | (.[0] | ltrimstr($path)) as $key | .[1] as $value
| if ($value | contains("'")) then error("Parameter \($key) contains a single quote; use a value without one")
  else "\($key)='\($value)'" end
JQ

umask 077
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

aws ssm get-parameters-by-path \
    --path "$PARAM_PATH" --recursive --with-decryption --region "$REGION" \
    --query 'Parameters[].[Name,Value]' --output json \
    | jq -r --arg path "$PARAM_PATH" "$JQ_PROGRAM" > "$TMP"

# Fail now, not at 3am: these must exist for the application to run at all.
for required in APP_KEY DB_PASSWORD REDIS_PASSWORD APP_URL; do
    grep -q "^${required}=" "$TMP" || { echo "Missing required parameter ${PARAM_PATH}${required}" >&2; exit 1; }
done

install -m 600 "$TMP" "$OUT"
echo "Wrote $(grep -c . "$OUT") settings to $OUT"
