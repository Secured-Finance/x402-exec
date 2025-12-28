#!/bin/bash
# Quick local test script for showcase

set -e

echo "🧪 Testing Showcase Local Setup"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "examples/showcase" ]; then
    echo -e "${RED}❌ Error: Run this script from the repository root${NC}"
    exit 1
fi

echo "📦 Step 1: Building showcase..."
echo ""

# Build showcase
if pnpm run build:showcase 2>&1 | tee /tmp/showcase-build.log; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed. Check /tmp/showcase-build.log${NC}"
    exit 1
fi

echo ""
echo "🔍 Step 2: Checking build outputs..."
echo ""

# Check client dist
if [ -f "examples/showcase/client/dist/index.html" ]; then
    echo -e "${GREEN}✅ Client dist exists${NC}"
else
    echo -e "${RED}❌ Client dist not found${NC}"
    exit 1
fi

# Check server dist
if [ -f "examples/showcase/server/dist/index.js" ]; then
    echo -e "${GREEN}✅ Server dist exists${NC}"
else
    echo -e "${RED}❌ Server dist not found${NC}"
    exit 1
fi

echo ""
echo "⚙️  Step 3: Checking environment..."
echo ""

# Check if .env exists
if [ -f "examples/showcase/server/.env" ]; then
    echo -e "${GREEN}✅ Server .env file exists${NC}"
    if grep -q "FACILITATOR_URL" examples/showcase/server/.env; then
        echo -e "${GREEN}✅ FACILITATOR_URL is set${NC}"
    else
        echo -e "${YELLOW}⚠️  FACILITATOR_URL not found in .env${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No .env file found. Create examples/showcase/server/.env${NC}"
    echo "   Required variables:"
    echo "   - FACILITATOR_URL"
    echo "   - DEFAULT_NETWORK"
    echo "   - RESOURCE_SERVER_ADDRESS"
    echo "   - RESOURCE_SERVER_PRIVATE_KEY"
fi

echo ""
echo "🚀 Step 4: Ready to start server!"
echo ""
echo "To start the server, run:"
echo "  cd examples/showcase/server"
echo "  pnpm start"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
echo "Test endpoints:"
echo "  - http://localhost:3000/              (Client React app)"
echo "  - http://localhost:3000/api/health    (API health check)"
echo "  - http://localhost:3000/api/scenarios (API scenarios list)"
echo ""


