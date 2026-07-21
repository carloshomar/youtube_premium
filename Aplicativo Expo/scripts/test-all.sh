#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Unit + integration + JS E2E (Jest)"
npm test -- --coverage --watchAll=false

echo "==> JS E2E subset"
npm run test:e2e

if command -v maestro >/dev/null 2>&1; then
  echo "==> Device E2E (Maestro)"
  if ! maestro test e2e/maestro; then
    echo "Maestro failed — ensure the app is installed: npx expo run:ios"
    exit 1
  fi
else
  echo "==> Maestro CLI not found; device flows in e2e/maestro/ are ready after:"
  echo "    curl -Ls 'https://get.maestro.mobile.dev' | bash"
  echo "    npx expo run:ios && npm run test:e2e:maestro"
fi

echo "==> All automated checks passed"
