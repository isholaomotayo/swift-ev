#!/bin/bash
# Fix fnm configuration and switch to Node.js 22

echo "🔧 Fixing fnm configuration..."

# Reload shell config
source ~/.zshrc

# Set fnm default to Node.js 22
echo "📌 Setting Node.js 22 as default..."
fnm default 22

# Verify fnm is working
echo "✅ Verifying fnm setup..."
eval "$(fnm env --use-on-cd --shell zsh)"

# Check Node version
NODE_VERSION=$(node -v)
echo "📦 Current Node.js version: $NODE_VERSION"

if [[ "$NODE_VERSION" == v22* ]]; then
    echo "✅ Successfully switched to Node.js 22!"
    echo ""
    echo "Next steps:"
    echo "1. Close and reopen your terminal (or run: source ~/.zshrc)"
    echo "2. Run: cd /Users/omotayoishola/dev/swiftEv"
    echo "3. Run: rm -rf node_modules pnpm-lock.yaml && pnpm install"
    echo "4. Run: rm -rf project.inlang/cache src/paraglide && pnpm paraglide:compile"
else
    echo "⚠️  Still showing $NODE_VERSION instead of v22.x.x"
    echo "Please close and reopen your terminal, then run: fnm use 22"
fi
