#!/bin/bash
set -e

echo "=== Port Configuration Smoke Test ==="

npm run build

# Test 1: Default port (3636)
echo "[Test 1] Starting server on default port..."
node dist/index.js start --detach
sleep 2
if curl -sf http://localhost:3636/api/health > /dev/null; then
  echo "✓ Default port 3636 works"
else
  echo "✗ Default port 3636 failed"
  exit 1
fi
kill $(lsof -t -i:3636) 2>/dev/null || true
sleep 1

# Test 2: Env override
echo "[Test 2] Starting server with REAGENT_PORT=4000..."
REAGENT_PORT=4000 node dist/index.js start --detach
sleep 2
if curl -sf http://localhost:4000/api/health > /dev/null; then
  echo "✓ Env override 4000 works"
else
  echo "✗ Env override 4000 failed"
  exit 1
fi
kill $(lsof -t -i:4000) 2>/dev/null || true
sleep 1

# Test 3: CLI override
echo "[Test 3] Starting server with --port 5000..."
node dist/index.js start --detach --port 5000
sleep 2
if curl -sf http://localhost:5000/api/health > /dev/null; then
  echo "✓ CLI override 5000 works"
else
  echo "✗ CLI override 5000 failed"
  exit 1
fi

# Test 4: Review URL uses correct port (regression test)
echo "[Test 4] Verifying review URL uses correct port..."
REVIEW_OUTPUT=$(curl -sf -X POST http://localhost:5000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"source": "local", "files": ["package.json"]}')

if echo "$REVIEW_OUTPUT" | grep -q "localhost:5000"; then
  echo "✓ Review URL uses correct port 5000"
else
  echo "✗ Review URL does not use port 5000"
  echo "Got: $REVIEW_OUTPUT"
  kill $(lsof -t -i:5000) 2>/dev/null || true
  exit 1
fi

kill $(lsof -t -i:5000) 2>/dev/null || true

echo "=== All port tests passed! ==="
