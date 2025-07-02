#!/bin/bash
# Quick push script for SHAAD development

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== SHAAD Development Push ===${NC}"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "You have uncommitted changes. Commit them first? (y/n)"
    read -r commit_changes
    
    if [ "$commit_changes" = "y" ]; then
        git add -A
        echo "Enter commit message:"
        read -r commit_msg
        git commit -m "$commit_msg"
    else
        echo "Aborting push due to uncommitted changes."
        exit 1
    fi
fi

# Push to main branch
echo -e "${YELLOW}Pushing to GitHub...${NC}"
if git push origin main; then
    echo -e "${GREEN}✓ Successfully pushed to GitHub!${NC}"
    echo "View at: https://github.com/LittleManMichael/SHAAD"
else
    echo "Push failed. Check your credentials and try again."
    exit 1
fi
