#!/bin/bash

# 🔍 Yeşer Local Validation Script
# This script mimics the CI/CD environment for local debugging

set -e  # Exit on any error

echo "🚀 Yeşer Local Validation Script"
echo "=================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Environment check
print_status "Checking environment setup..."

# Check Node.js version
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check npm version  
NPM_VERSION=$(npm --version)
print_status "NPM version: $NPM_VERSION"

# Check if EAS CLI is installed
if command -v eas &> /dev/null; then
    EAS_VERSION=$(eas --version)
    print_success "EAS CLI version: $EAS_VERSION"
else
    print_error "EAS CLI not found. Install it with: npm install -g @expo/eas-cli"
    exit 1
fi

# Check environment variables
print_status "Checking environment variables..."

if [ -f ".env" ]; then
    print_success ".env file found"
    source .env
else
    print_warning ".env file not found - using system environment variables"
fi

# Validate required environment variables
REQUIRED_VARS=(
    "EXPO_PUBLIC_SUPABASE_URL"
    "EXPO_PUBLIC_SUPABASE_ANON_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Missing required environment variable: $var"
        exit 1
    else
        print_success "$var is set"
    fi
done

# Clean install dependencies
print_status "Cleaning and installing dependencies..."
rm -rf node_modules package-lock.json || true
npm install --package-lock-only
npm ci --prefer-offline --no-audit --verbose

print_success "Dependencies installed successfully"

# Run validation scripts
print_status "Running environment validation..."

# Development environment
print_status "Validating development environment..."
npm run validate-env:dev
print_success "Development environment validation passed"

# Preview environment  
print_status "Validating preview environment..."
export EXPO_PUBLIC_ENV=preview
npm run validate-env:preview
print_success "Preview environment validation passed"

# Production environment
print_status "Validating production environment..."
export EXPO_PUBLIC_ENV=production
npm run validate-env:prod
print_success "Production environment validation passed"

# TypeScript check
print_status "Running TypeScript check..."
npm run type-check
print_success "TypeScript check passed"

# ESLint check
print_status "Running ESLint check..."
npm run lint:check
print_success "ESLint check passed"

# Prettier check
print_status "Running Prettier format check..."
npx prettier --check "src/**/*.{ts,tsx,js,jsx,json}"
print_success "Prettier format check passed"

# EAS build validation (dry run)
print_status "Validating EAS build configuration..."
eas build --platform all --profile preview --dry-run
print_success "EAS build configuration is valid"

# Final summary
echo ""
echo "🎉 All local validations passed!"
echo "================================"
print_success "✅ Environment variables configured"
print_success "✅ Dependencies installed cleanly"
print_success "✅ TypeScript compilation successful"
print_success "✅ ESLint analysis passed"
print_success "✅ Code formatting correct"
print_success "✅ EAS build configuration valid"
echo ""
print_status "Your local environment matches CI/CD requirements"
print_status "You can safely push changes to trigger the pipeline" 