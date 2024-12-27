#!/bin/bash

# Git repository URL and token
GIT_REPO_URL="https://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@github.com/travellers-choice/api-server.git"

# PM2 process name
PM2_PROCESS_NAME="ecosystem.config.js"

# Perform Git pull
echo "Performing Git pull..."

git pull "$GIT_REPO_URL" main

# Restart PM2 process
echo "Restarting PM2 process..."
pm2 restart "$PM2_PROCESS_NAME"

echo "Git pull and PM2 restart complete."
