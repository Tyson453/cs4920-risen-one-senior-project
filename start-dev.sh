#!/bin/bash

echo "🚀 Starting Local Development Environment"
echo "========================================"
echo ""

# Check if backend is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Backend already running on port 3000"
else
    echo "📦 Starting backend..."
    cd backend
    DYNAMODB_ENDPOINT=http://localhost:8000 npx serverless offline start > /tmp/serverless-offline.log 2>&1 &
    BACKEND_PID=$!
    echo "   Backend PID: $BACKEND_PID"
    
    # Wait for backend to start
    echo "   Waiting for backend to initialize..."
    sleep 8
    
    # Import test data
    echo "   Importing test data..."
    curl -s -X POST http://localhost:3000/dev/import-data | grep -q "successfully" && echo "   ✅ Test data imported" || echo "   ❌ Failed to import test data"
    
    cd ..
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Quick Info:"
echo "   - Backend: http://localhost:3000"
echo "   - DynamoDB Local: http://localhost:8000"
echo "   - Backend logs: tail -f /tmp/serverless-offline.log"
echo ""
echo "🔐 Test Credentials:"
echo "   Username: johndoe"
echo "   Password: Password123!"
echo ""
echo "▶️  Start Frontend:"
echo "   cd frontend && ng serve"
echo ""
echo "🛑 Stop Backend:"
echo "   pkill -f 'serverless offline'"
echo ""
