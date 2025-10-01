#!/bin/bash

# NBA Agent Deployment Script
echo "🏀 Deploying NBA Agent to Cloudflare..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please login to Cloudflare:"
    wrangler login
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Deploy the application
echo "🚀 Deploying NBA Agent..."
wrangler deploy

echo "✅ NBA Agent deployed successfully!"
echo "🌐 Your agent is now live on Cloudflare Workers"
echo "💬 Open your browser to start chatting with your NBA agent"
