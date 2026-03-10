#!/usr/bin/env bash
# Setup Google Search Console credentials for Vercel deployment.
#
# Usage:
#   ./scripts/setup-gsc-credentials.sh /path/to/service-account-key.json
#
# This script:
#   1. Validates the JSON file
#   2. Base64 encodes the entire file
#   3. Sets GOOGLE_CREDENTIALS_BASE64 in Vercel (production)
#   4. Sets GOOGLE_SEARCH_CONSOLE_SITE_URL in Vercel (production)
#   5. Tests the credentials locally
#   6. Deploys to production

set -euo pipefail

JSON_FILE="${1:-}"
SITE_URL="https://persona-consultant.com"

if [[ -z "$JSON_FILE" ]]; then
  echo "Usage: $0 /path/to/service-account-key.json"
  exit 1
fi

if [[ ! -f "$JSON_FILE" ]]; then
  echo "Error: File not found: $JSON_FILE"
  exit 1
fi

# Validate JSON
if ! python3 -c "import json; json.load(open('$JSON_FILE'))" 2>/dev/null; then
  echo "Error: Invalid JSON file"
  exit 1
fi

EMAIL=$(python3 -c "import json; print(json.load(open('$JSON_FILE'))['client_email'])")
echo "✓ Service account email: $EMAIL"

# Base64 encode (single line, no wrapping)
B64=$(base64 < "$JSON_FILE" | tr -d '\n')
echo "✓ Base64 encoded (length: ${#B64})"

# Local test first
echo ""
echo "── Testing credentials locally... ──"
GOOGLE_CREDENTIALS_BASE64="$B64" \
GOOGLE_SEARCH_CONSOLE_SITE_URL="$SITE_URL" \
node -e "
const { google } = require('googleapis');
const creds = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString());
const auth = new google.auth.JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const sc = google.searchconsole({ version: 'v1', auth });
const end = new Date().toISOString().split('T')[0];
const start = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
sc.searchanalytics.query({
  siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL,
  requestBody: { startDate: start, endDate: end, dimensions: ['query'], rowLimit: 3 },
}).then(r => {
  const rows = r.data.rows || [];
  console.log('✓ API test passed! Rows returned:', rows.length);
  if (rows.length > 0) console.log('  Sample:', rows[0].keys?.[0]);
}).catch(e => {
  console.error('✗ API test failed:', e.message);
  process.exit(1);
});
" || { echo ""; echo "✗ Local test failed. Aborting."; exit 1; }

echo ""
echo "── Setting Vercel environment variables... ──"

# Remove old vars if they exist (ignore errors)
echo "y" | vercel env rm GOOGLE_CREDENTIALS_BASE64 production 2>/dev/null || true
echo "y" | vercel env rm GOOGLE_SEARCH_CONSOLE_SITE_URL production 2>/dev/null || true
echo "y" | vercel env rm GOOGLE_SERVICE_ACCOUNT_EMAIL production 2>/dev/null || true
echo "y" | vercel env rm GOOGLE_SERVICE_ACCOUNT_KEY production 2>/dev/null || true

# Set new vars
printf '%s' "$B64" | vercel env add GOOGLE_CREDENTIALS_BASE64 production
printf '%s' "$SITE_URL" | vercel env add GOOGLE_SEARCH_CONSOLE_SITE_URL production

echo "✓ Vercel env vars set"

echo ""
echo "── Deploying to production... ──"
vercel --prod

echo ""
echo "✅ Done! Try clicking '今すぐ同期' on the SEO admin page."
echo ""
echo "⚠️  Don't forget to delete the JSON key file:"
echo "    rm $JSON_FILE"
