#!/bin/bash

# Script to show logs for the latest deployment
# Usage: ./logs.sh

set -e

echo "🔍 Getting latest deployment URL..."

# Get the latest deployment URL from vercel
LATEST_URL=$(npx vercel ls --json 2>/dev/null | jq -r '.[0].url' 2>/dev/null || echo "")

if [ -z "$LATEST_URL" ] || [ "$LATEST_URL" = "null" ]; then
    echo "❌ Could not get latest deployment URL. Trying alternative method..."

    # Alternative: get from vercel inspect output
    LATEST_URL=$(npx vercel ls 2>/dev/null | head -2 | tail -1 | awk '{print $2}' || echo "")

    if [ -z "$LATEST_URL" ]; then
        echo "❌ Failed to get deployment URL. Please check if you're logged into Vercel."
        exit 1
    fi
fi

echo "📡 Latest deployment: https://$LATEST_URL"
echo "📋 Starting to watch logs..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show logs for the latest deployment
npx vercel logs "https://$LATEST_URL"