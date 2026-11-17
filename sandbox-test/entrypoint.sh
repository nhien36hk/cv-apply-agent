#!/usr/bin/env bash
set -euo pipefail

mkdir -p /home/tester/workspace /home/tester/.gemini/antigravity-cli /home/tester/.config/antigravity

if [ -d /mnt/agy-seed/cli ]; then
  cp -f /mnt/agy-seed/cli/jetski_state.pbtxt /home/tester/.gemini/antigravity-cli/ 2>/dev/null || true
  cp -f /mnt/agy-seed/cli/settings.json /home/tester/.gemini/antigravity-cli/ 2>/dev/null || true
  cp -f /mnt/agy-seed/cli/installation_id /home/tester/.gemini/antigravity-cli/ 2>/dev/null || true
fi

if [ -d /mnt/agy-seed/config ]; then
  cp -rf /mnt/agy-seed/config/. /home/tester/.config/antigravity/ 2>/dev/null || true
fi

Xvfb :99 -screen 0 1280x800x24 >/tmp/xvfb.log 2>&1 &
exec tail -f /dev/null
