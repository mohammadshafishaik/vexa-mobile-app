#!/bin/bash

# VEXA Production Deployment Helper Script
# This script helps you deploy VEXA to production

set -e

echo "🚀 VEXA Production Deployment Helper"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if google-services.json exists
echo "Checking Firebase configuration..."
if [ -f "vexa/android/app/google-services.json" ]; then
    print_success "google-services.json found"
else
    print_error "google-services.json not found!"
    echo "Please place google-services.json in vexa/android/app/"
    exit 1
fi

# Ask for backend URL
echo ""
echo "Enter your Render.com backend URL (without /api):"
echo "Example: https://vexa-backend-xxxxx.onrender.com"
read -p "Backend URL: " BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    print_error "Backend URL is required!"
    exit 1
fi

# Update frontend API configuration
echo ""
echo "Updating frontend API configuration..."
API_FILE="vexa/src/services/api.ts"

# Create backup
cp "$API_FILE" "$API_FILE.backup"

# Update the file
sed -i.tmp "s|const PRODUCTION_URL = '.*';|const PRODUCTION_URL = '${BACKEND_URL}/api';|g" "$API_FILE"
sed -i.tmp "s|const USE_PRODUCTION = false;|const USE_PRODUCTION = true;|g" "$API_FILE"
rm "$API_FILE.tmp"

print_success "Frontend configured for production"

# Install dependencies
echo ""
echo "Installing dependencies..."
cd vexa
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Build APK
echo ""
echo "Building debug APK..."
cd android
./gradlew clean
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    print_success "APK built successfully!"
    echo ""
    echo "📱 Your APK is ready at:"
    echo "   vexa/android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "📲 Install on your phone:"
    echo "   1. Copy APK to your phone"
    echo "   2. Enable 'Install from Unknown Sources'"
    echo "   3. Tap the APK to install"
    echo ""
    echo "🎉 Deployment complete!"
else
    print_error "APK build failed!"
    echo "Check the error messages above"
    exit 1
fi
