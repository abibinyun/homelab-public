#!/bin/bash

# Auto-deploy script untuk CI/CD
# Webhook handler untuk auto-deploy dari Git

set -e

PROJECT_NAME=$1
GIT_REPO=$2

if [ -z "$PROJECT_NAME" ] || [ -z "$GIT_REPO" ]; then
    echo "Usage: ./auto-deploy.sh <project-name> <git-repo-url>"
    echo "Example: ./auto-deploy.sh myapp https://github.com/user/repo.git"
    exit 1
fi

PROJECT_DIR="./projects/$PROJECT_NAME"

echo "🚀 Auto-deploying $PROJECT_NAME..."

# Clone atau pull
if [ -d "$PROJECT_DIR" ]; then
    echo "📥 Pulling latest changes..."
    cd "$PROJECT_DIR"
    git pull
    cd ../..
else
    echo "📥 Cloning repository..."
    git clone "$GIT_REPO" "$PROJECT_DIR"
fi

# Build dan deploy
echo "🔨 Building..."
docker compose build "$PROJECT_NAME"

echo "🚀 Deploying..."
docker compose up -d "$PROJECT_NAME"

echo "✅ Deploy selesai!"
echo "📋 Logs:"
docker compose logs --tail 20 "$PROJECT_NAME"
