#!/bin/bash
set -e

echo "Building Heimdall..."
go build -o /tmp/heimdall ./cmd/heimdall

echo "Starting Heimdall..."
/tmp/heimdall server -c examples/heimdall.hcl &
HEIMDALL_PID=$!

# Give Heimdall time to start
sleep 2

echo "Testing GetTopology API..."
RESPONSE=$(curl -s -X POST http://localhost:9000/observer.v1.ObserverService/GetTopology \
  -H "Content-Type: application/json" \
  -d '{}')

echo "Response: $RESPONSE"

# Check if response contains "topology"
if echo "$RESPONSE" | grep -q "topology"; then
  echo "✓ GetTopology returned topology data"
else
  echo "✗ GetTopology did not return expected data"
  exit 1
fi

echo "Cleaning up..."
kill $HEIMDALL_PID 2>/dev/null || true

# Give process time to clean up
sleep 1

echo "✓ API test completed successfully"
