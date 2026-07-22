#!/bin/bash
set -e
echo "=== Building frontend ==="
pnpm --filter mockup-sandbox run build
echo "=== Frontend build done ==="
echo "=== Building backend ==="
pnpm exec tsc -p artifacts/api-server/tsconfig.vercel.json
echo "=== Backend build done ==="
