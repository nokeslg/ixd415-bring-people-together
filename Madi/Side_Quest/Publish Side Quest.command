#!/bin/bash
# Double-click to put Side Quest online at https://sqku.pages.dev (the link Plausible tracks).
# Run it again any time you change the app; the link stays the same.
# Two steps: 1) the live server (groups, chat) goes to Madi's Cloudflare account,
# 2) the page goes to the "sqku" Pages project, which is in Loudon's account.
cd "$(dirname "$0")"
export WRANGLER_SEND_METRICS=false
echo ""
if ! command -v npm >/dev/null 2>&1; then
  echo "  Node.js isn't installed. Get the LTS version from https://nodejs.org, install it, then double-click this again."
  read -n 1 -s -r -p "  Press any key to close."; exit 1
fi
if [ ! -d node_modules ]; then
  echo "  First run: installing (takes about a minute)..."
  npm install --no-audit --no-fund || { read -n 1 -s -r -p "  Install failed. Press any key to close."; exit 1; }
fi
# Sign in to Cloudflare if needed (the same account as Tablemates). A browser window opens.
if ! npx wrangler whoami 2>/dev/null | grep -qi "associated with the email"; then
  echo "  Sign in to Cloudflare in the browser window that opens, then come back here."
  npx wrangler login || { read -n 1 -s -r -p "  Sign-in didn't finish. Press any key to close."; exit 1; }
fi
echo "  Step 1 of 2: publishing the live server..."
npx wrangler deploy || { echo ""; echo "  The server didn't publish. Copy the message above and send it to Claude."; read -n 1 -s -r -p "  Press any key to close."; exit 1; }
echo ""
echo "  Step 2 of 2: publishing the page to https://sqku.pages.dev ..."
if npx wrangler pages deploy public --project-name sqku --branch main --commit-dirty=true; then
  printf "%s" "https://sqku.pages.dev" | pbcopy
  echo ""
  echo "  ✅ Side Quest is online:"
  echo ""
  echo "     https://sqku.pages.dev"
  echo ""
  echo "  The link is copied. Paste it in a text, a QR code generator or your slides."
  echo "  Anyone who opens it joins the same live app, and Plausible counts the visit."
  open "https://sqku.pages.dev"
else
  echo ""
  echo "  The server is updated, but the page didn't publish."
  echo "  The sqku project is in Loudon's Cloudflare account. Either he adds you to it,"
  echo "  or he runs this from Madi/Side_Quest:   npm run deploy:page"
fi
echo ""
read -n 1 -s -r -p "  Press any key to close."
