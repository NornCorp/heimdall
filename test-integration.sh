#!/bin/bash
set -e

echo "Building binaries..."
cd /Users/erik/code/instruqt/norncorp

# Build heimdall
cd heimdall
go build -o /tmp/heimdall ./cmd/heimdall
cd ..

# Build loki
cd loki
go build -o /tmp/loki ./cmd/loki
cd ..

echo "Starting Heimdall..."
/tmp/heimdall server -c heimdall/examples/heimdall.hcl &
HEIMDALL_PID=$!

# Give Heimdall time to start
sleep 2

echo "Testing empty topology..."
RESPONSE=$(curl -s -X POST http://localhost:9000/observer.v1.ObserverService/GetTopology \
  -H "Content-Type: application/json" \
  -d '{}')
echo "Empty topology: $RESPONSE"

echo "Starting Loki with Heimdall integration..."
/tmp/loki server -c loki/examples/with-heimdall.hcl &
LOKI_PID=$!

# Give Loki time to join the mesh
sleep 3

echo "Testing topology with Loki..."
RESPONSE=$(curl -s -X POST http://localhost:9000/observer.v1.ObserverService/GetTopology \
  -H "Content-Type: application/json" \
  -d '{}')
echo "Topology with Loki: $RESPONSE"

# Check if response contains the service
if echo "$RESPONSE" | grep -q "api"; then
  echo "✓ Loki service 'api' found in topology"
else
  echo "✗ Loki service 'api' not found in topology"
  kill $LOKI_PID $HEIMDALL_PID 2>/dev/null || true
  exit 1
fi

# Check if response contains service type
if echo "$RESPONSE" | grep -q "http"; then
  echo "✓ Service type 'http' found in topology"
else
  echo "✗ Service type 'http' not found in topology"
  kill $LOKI_PID $HEIMDALL_PID 2>/dev/null || true
  exit 1
fi

echo "Cleaning up..."
kill $LOKI_PID 2>/dev/null || true
kill $HEIMDALL_PID 2>/dev/null || true

# Give processes time to clean up
sleep 2

echo "✓ Integration test completed successfully"
