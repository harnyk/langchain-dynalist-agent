#!/bin/bash

# Script to remove all deployments except the latest one
# Usage: ./cleanup.sh

set -e

echo "🧹 Starting deployment cleanup..."

# Get all deployments in text format
echo "📋 Getting list of deployments..."
DEPLOYMENTS_RAW=$(npx vercel ls 2>/dev/null)

if [ -z "$DEPLOYMENTS_RAW" ]; then
    echo "❌ Could not get deployments list."
    exit 1
fi

# Extract deployment URLs from the table, preserving order (newest first)
DEPLOYMENT_URLS=$(echo "$DEPLOYMENTS_RAW" | grep -o 'https://[^[:space:]]*vercel\.app')

if [ -z "$DEPLOYMENT_URLS" ]; then
    echo "❌ No deployments found."
    exit 1
fi

# Count total deployments
TOTAL_COUNT=$(echo "$DEPLOYMENT_URLS" | wc -l)
echo "📊 Found $TOTAL_COUNT deployments"

if [ "$TOTAL_COUNT" -le 1 ]; then
    echo "✅ Only one deployment found, nothing to cleanup!"
    exit 0
fi

# Get the latest deployment (first line) - already includes https://
LATEST_URL=$(echo "$DEPLOYMENT_URLS" | head -1)
echo "🔒 Keeping latest deployment: $LATEST_URL"

# Get deployments to remove (all except the first one)
TO_REMOVE=$(echo "$DEPLOYMENT_URLS" | tail -n +2)
REMOVE_COUNT=$(echo "$TO_REMOVE" | wc -l)

echo "🗑️  Will remove $REMOVE_COUNT old deployments:"
echo "$TO_REMOVE" | while read -r url; do
    echo "   - $url"
done

echo ""
read -p "⚠️  Are you sure you want to remove these $REMOVE_COUNT deployments? [y/N]: " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

echo ""
echo "🔥 Starting removal process..."

# Remove each deployment
SUCCESS_COUNT=0
FAILED_COUNT=0

echo "$TO_REMOVE" | while read -r url; do
    if [ -n "$url" ]; then
        echo "🗑️  Removing: $url"
        if npx vercel rm "$url" --yes >/dev/null 2>&1; then
            echo "   ✅ Successfully removed"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo "   ❌ Failed to remove"
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Cleanup completed!"
echo "✅ Kept: $LATEST_URL"
echo "🗑️  Removed: $REMOVE_COUNT old deployments"
echo ""
echo "💡 Your latest deployment is still running and accessible."