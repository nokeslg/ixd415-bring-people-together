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
# You may be a member of more than one Cloudflare account (Madi's has the server,
# Loudon's has the sqku page). Find the right account for each step, so wrangler
# never puts something in the wrong place.
echo "  Checking your Cloudflare accounts..."
rm -f node_modules/.cache/wrangler/wrangler-account.json
scan() {
  WHO="$(npx wrangler whoami 2>/dev/null)"
  ACCOUNTS=$(echo "$WHO" | grep -Eo '[0-9a-f]{32}' | sort -u)
  PAGES_ACCT=""; SERVER_ACCT=""
  for A in $ACCOUNTS; do
    CLOUDFLARE_ACCOUNT_ID=$A npx wrangler pages project list 2>/dev/null | grep -qw "sqku" && PAGES_ACCT=$A
    CLOUDFLARE_ACCOUNT_ID=$A npx wrangler deployments list >/dev/null 2>&1 && SERVER_ACCT=$A
  done
  echo "  Cloudflare accounts you can use:"
  echo "$WHO" | grep -E '[0-9a-f]{32}' | sed 's/^/    /'
}
scan
# Joined an account after signing in here? The old sign-in doesn't know about it yet.
if [ -z "$PAGES_ACCT" ]; then
  echo ""
  echo "  None of these has the sqku project. If Loudon added you after you last signed in,"
  echo "  signing in again picks up his account."
  read -r -p "  Sign in to Cloudflare again now? (y/n) " YN
  if [ "$YN" = "y" ] || [ "$YN" = "Y" ]; then
    npx wrangler logout >/dev/null 2>&1
    echo "  Sign in in the browser window that opens. If it asks which accounts to allow, include Loudon's."
    npx wrangler login && scan
  fi
fi
if [ -n "$SERVER_ACCT" ]; then
  echo "  Step 1 of 2: publishing the live server..."
  CLOUDFLARE_ACCOUNT_ID=$SERVER_ACCT npx wrangler deploy || { echo ""; echo "  The server didn't publish. Copy the message above and send it to Claude."; read -n 1 -s -r -p "  Press any key to close."; exit 1; }
else
  echo "  Step 1 of 2: skipped. The server is in Madi's Cloudflare account, and you're not a member of it,"
  echo "  so only the page will update. (Madi can add you, or run this herself.)"
fi
echo ""
echo "  Step 2 of 2: publishing the page to https://sqku.pages.dev ..."
if [ -z "$PAGES_ACCT" ]; then
  echo ""
  echo "  The sqku project is in Loudon's Cloudflare account, and your login can't see it."
  echo "  Accept his invite email (logged in with the same email) and make sure your role"
  echo "  includes Pages, like Administrator. Or he runs this from the Side_Quest folder:   npm run deploy:page"
  echo ""; read -n 1 -s -r -p "  Press any key to close."; exit 1
fi
if CLOUDFLARE_ACCOUNT_ID=$PAGES_ACCT npx wrangler pages deploy public --project-name sqku --branch main --commit-dirty=true; then
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
  echo "  or he runs this from the Side_Quest folder:   npm run deploy:page"
fi
echo ""
read -n 1 -s -r -p "  Press any key to close."
