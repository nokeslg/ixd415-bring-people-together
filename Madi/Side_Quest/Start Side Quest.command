#!/bin/bash
# Double-click to run Side Quest on this Mac.
# Close this window to stop it.
cd "$(dirname "$0")"
export WRANGLER_SEND_METRICS=false
if ! command -v npm >/dev/null 2>&1; then
  echo ""
  echo "  Node.js isn't installed. Get the LTS version from https://nodejs.org, install it, then double-click this again."
  echo ""
  read -n 1 -s -r -p "  Press any key to close."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "  First run: installing (takes about a minute)..."
  npm install --no-audit --no-fund || { read -n 1 -s -r -p "  Install failed. Press any key to close."; exit 1; }
fi
IP=$(ipconfig getifaddr en0 2>/dev/null)
echo ""
echo "  SIDE QUEST is starting."
echo "  On this laptop:            http://localhost:8788"
[ -n "$IP" ] && echo "  Phones on the same Wi-Fi:  http://$IP:8788"
echo "  Tip: each browser tab is a different person."
echo "  Leave this window open while you test. Close it to stop."
echo ""
( sleep 6; open "http://localhost:8788" ) &
npx wrangler dev --ip 0.0.0.0 --port 8788
