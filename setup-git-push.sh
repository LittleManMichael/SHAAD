#!/bin/bash

# Git Push Setup Script for SHAAD Development

echo "=== Git Push Setup for SHAAD ==="
echo

# Check if we're in the right directory
if [ ! -d ".git" ]; then
    echo "Error: Not in a git repository!"
    exit 1
fi

# Function to setup HTTPS with token
setup_https() {
    echo "Setting up HTTPS with Personal Access Token..."
    
    # Enable credential storage
    git config credential.helper store
    
    echo "Please enter your GitHub username:"
    read -r github_username
    
    echo "Please enter your GitHub Personal Access Token:"
    read -rs github_token
    echo
    
    # Set the remote URL with embedded credentials
    git remote set-url origin "https://${github_username}:${github_token}@github.com/LittleManMichael/SHAAD.git"
    
    echo "✓ HTTPS credentials configured"
}

# Function to setup SSH
setup_ssh() {
    echo "Setting up SSH..."
    
    # Check if SSH key exists
    if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
        echo "No SSH key found. Would you like to generate one? (y/n)"
        read -r generate_key
        
        if [ "$generate_key" = "y" ]; then
            ssh-keygen -t ed25519 -C "SHAAD-development"
            echo
            echo "Add this public key to your GitHub account:"
            cat ~/.ssh/id_ed25519.pub
            echo
            echo "Press Enter after adding the key to GitHub..."
            read -r
        fi
    fi
    
    # Set SSH remote
    git remote set-url origin git@github.com:LittleManMichael/SHAAD.git
    
    echo "✓ SSH configured"
}

# Function to setup GitHub CLI
setup_gh_cli() {
    echo "Setting up GitHub CLI..."
    
    # Check if gh is installed
    if ! command -v gh &> /dev/null; then
        echo "GitHub CLI not installed. Install it with:"
        echo "  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg"
        echo "  echo 'deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main' | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null"
        echo "  sudo apt update && sudo apt install gh"
        exit 1
    fi
    
    gh auth login
    
    echo "✓ GitHub CLI configured"
}

# Main menu
echo "Choose your authentication method:"
echo "1) HTTPS with Personal Access Token (recommended)"
echo "2) SSH Key"
echo "3) GitHub CLI"
echo
read -r -p "Enter choice (1-3): " choice

case $choice in
    1) setup_https ;;
    2) setup_ssh ;;
    3) setup_gh_cli ;;
    *) echo "Invalid choice"; exit 1 ;;
esac

# Set global git config
echo
echo "Setting up git user configuration..."
git config --global user.name "LittleManMichael"
read -r -p "Enter your email for git commits: " git_email
git config --global user.email "$git_email"

# Create push helper script
cat > push-changes.sh << 'EOF'
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
EOF

chmod +x push-changes.sh

echo
echo "✓ Setup complete!"
echo
echo "You can now:"
echo "1. Push manually: git push origin main"
echo "2. Use the helper: ./push-changes.sh"
echo
echo "First push will require --force flag to overwrite the repository:"
echo "  git push origin main --force"