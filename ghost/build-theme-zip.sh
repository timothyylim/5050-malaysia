#!/bin/bash
# Package the Ghost theme for upload (Settings → Design → Upload theme).
set -e
cd "$(dirname "$0")"
OUT="fiftyfifty.zip"
rm -f "$OUT"
cd theme
zip -r -X "../$OUT" . \
  -x ".*" -x "*/.*" -x "__MACOSX*" >/dev/null
cd ..
echo "Built ghost/$OUT ($(du -h "$OUT" | cut -f1))"
unzip -l "$OUT" | tail -n +2 | head -30
