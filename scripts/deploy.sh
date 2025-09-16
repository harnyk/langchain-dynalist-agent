#!/bin/bash

# Deploy and setup Telegram webhook script

echo "🚀 Deploying to Vercel..."

# Deploy and capture the output
DEPLOY_OUTPUT=$(npx vercel --prod --yes 2>&1)
DEPLOY_STATUS=$?

echo "📋 Deployment output:"
echo "$DEPLOY_OUTPUT"
echo "End of deployment output"
echo ""
echo ""

if [ $DEPLOY_STATUS -ne 0 ]; then
    echo "❌ Deployment failed!"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "✅ Deployment successful!"

# Extract the production URL from deployment output
PRODUCTION_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE "Production: https://[^[:space:]]+" | sed 's/Production: //' | head -1)

if [ -z "$PRODUCTION_URL" ]; then
    echo "❌ Could not extract production URL from deployment output"
    echo "Deployment output:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "📡 Production URL: $PRODUCTION_URL"

# Construct webhook URL
WEBHOOK_URL="${PRODUCTION_URL}/api/webhook"
echo "🔗 Webhook URL: $WEBHOOK_URL"

# Get environment variables from Vercel
echo "🔑 Getting environment variables from Vercel..."
npx vercel env pull --yes .env.local

# Source environment variables
if [ -f ".env.local" ]; then
    source .env.local
else
    echo "❌ Failed to pull environment variables"
    exit 1
fi

# Check if TELEGRAM_BOT_TOKEN is set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN not found in Vercel environment variables"
    echo "Please add it with: npx vercel env add TELEGRAM_BOT_TOKEN"
    exit 1
fi

echo "🤖 Setting up Telegram webhook..."

# Set webhook using Telegram Bot API
WEBHOOK_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$WEBHOOK_URL\"}")

# Check if webhook was set successfully
if echo "$WEBHOOK_RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Webhook set successfully!"
    echo "📋 Response: $WEBHOOK_RESPONSE"
else
    echo "❌ Failed to set webhook"
    echo "📋 Response: $WEBHOOK_RESPONSE"
    exit 1
fi

echo ""
echo "🎉 Deployment and webhook setup complete!"
echo "🔗 Your bot webhook is now: $WEBHOOK_URL"
echo ""
echo "💡 Test your bot by sending /start to your Telegram bot!"