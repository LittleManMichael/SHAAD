#!/bin/bash

echo "=== Git History Cleaner for SHAAD ==="
echo
echo "This script will remove sensitive files from git history."
echo "IMPORTANT: This will rewrite git history!"
echo
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Files to remove from history
FILES_TO_REMOVE=(
    ".env"
    ".env.backup"
    "backend/.env"
    "frontend/.env"
    "discord-bot/.env"
)

echo "Removing sensitive files from git history..."

# Use git filter-branch to remove files
for file in "${FILES_TO_REMOVE[@]}"; do
    echo "Removing $file from history..."
    git filter-branch --force --index-filter \
        "git rm --cached --ignore-unmatch $file" \
        --prune-empty --tag-name-filter cat -- --all
done

echo
echo "Cleaning up..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo
echo "Done! Now force push to update the remote repository:"
echo "  git push origin main --force"
echo
echo "WARNING: All collaborators will need to re-clone the repository!"