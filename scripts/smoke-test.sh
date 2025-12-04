#!/bin/bash
set -e

# Build the project
echo "Building project..."
npm run build

# Start server in background
echo "Starting server..."
# We use the built JS file
node dist/index.js start --detach

# Wait for server to start
sleep 2

# Create a review
echo "Creating review..."
# We use the built JS file
REVIEW_OUTPUT=$(node dist/index.js review package.json --no-open --source local)
echo "$REVIEW_OUTPUT"

# Extract session ID (assuming output contains URL with ID)
# URL format: http://localhost:3636/review/<uuid>
SESSION_ID=$(echo "$REVIEW_OUTPUT" | grep -oE '[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}')

if [ -z "$SESSION_ID" ]; then
  echo "Failed to extract session ID"
  exit 1
fi

echo "Session ID: $SESSION_ID"

# List sessions
echo "Listing sessions..."
node dist/index.js list

# Get review status
echo "Getting review status..."
node dist/index.js get "$SESSION_ID" --json

# Kill server (find process by port or just pkill node? pkill node is dangerous)
# We can use lsof to find the PID on port 3636
PID=$(lsof -t -i:3636)
if [ -n "$PID" ]; then
  echo "Killing server (PID: $PID)..."
  kill "$PID"
else
  echo "Server not found on port 3636"
fi

echo "Smoke test passed!"
