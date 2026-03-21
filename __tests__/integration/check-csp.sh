#!/usr/bin/env bash
# CSP ヘッダー検証スクリプト
# 前提: npm run dev がポート 3000 で起動済みであること
set -e

TARGET="http://localhost:3000"
PASS=0
FAIL=0

check() {
  local label="$1"
  local pattern="$2"
  if echo "$HEADERS" | grep -q "$pattern"; then
    echo "  PASS: $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $label  (pattern: $pattern)"
    FAIL=$((FAIL+1))
  fi
}

echo "=== CSP Header Check ==="
echo "Target: $TARGET"
echo ""

HEADERS=$(curl -s -I "$TARGET" 2>&1)

if [ -z "$HEADERS" ]; then
  echo "ERROR: サーバーに接続できません。npm run dev が起動しているか確認してください。"
  exit 1
fi

CSP=$(echo "$HEADERS" | grep -i 'content-security-policy' | sed 's/[Cc]ontent-[Ss]ecurity-[Pp]olicy: //i' | tr -d '\r')

if [ -z "$CSP" ]; then
  echo "ERROR: Content-Security-Policy ヘッダーが見つかりません。"
  echo "Raw headers:"
  echo "$HEADERS"
  exit 1
fi

echo "CSP (先頭200文字):"
echo "${CSP:0:200}..."
echo ""

echo "--- script-src ---"
check "self"                              "'self'"
check "'unsafe-inline'"                  "unsafe-inline"
check "'unsafe-eval' (GTM必須)"          "unsafe-eval"
check "*.googletagmanager.com"           "googletagmanager.com"
check "*.google-analytics.com"           "google-analytics.com"
check "*.googlesyndication.com (AdSense)" "googlesyndication.com"
check "*.googleadservices.com"           "googleadservices.com"
check "*.adtrafficquality.google"        "adtrafficquality.google"

echo ""
echo "--- frame-src ---"
check "*.google.com (OAuth)"             "google.com"
check "*.doubleclick.net (広告iframe)"   "doubleclick.net"
check "*.googlesyndication.com"          "googlesyndication.com"

echo ""
echo "--- connect-src ---"
check "Supabase URL"                     "tgqfnsmrwvpycmhmfpyv.supabase.co"
check "*.google-analytics.com"           "google-analytics.com"
check "*.adtrafficquality.google"        "adtrafficquality.google"

echo ""
echo "--- セキュリティ設定 ---"
check "frame-ancestors 'none'"           "frame-ancestors"

XFO=$(echo "$HEADERS" | grep -i 'x-frame-options' | tr -d '\r')
if echo "$XFO" | grep -qi "DENY"; then
  echo "  PASS: X-Frame-Options: DENY"
  PASS=$((PASS+1))
else
  echo "  FAIL: X-Frame-Options: DENY が見つかりません (got: $XFO)"
  FAIL=$((FAIL+1))
fi

XCTO=$(echo "$HEADERS" | grep -i 'x-content-type-options' | tr -d '\r')
if echo "$XCTO" | grep -qi "nosniff"; then
  echo "  PASS: X-Content-Type-Options: nosniff"
  PASS=$((PASS+1))
else
  echo "  FAIL: X-Content-Type-Options: nosniff が見つかりません"
  FAIL=$((FAIL+1))
fi

echo ""
echo "================================"
echo "Result: PASS=$PASS  FAIL=$FAIL"
echo "================================"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
