#!/bin/bash

# VEXA Setup Script
# This script automates the initial setup process

set -e  # Exit on error

echo "🚀 VEXA Setup Script"
echo "===================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if Node.js is installed
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js >= 22.11.0"
    exit 1
fi
print_success "Node.js $(node -v) found"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL not found. Please install PostgreSQL."
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql"
    exit 1
fi
print_success "PostgreSQL found"

# Check if database exists
echo ""
echo "Checking database..."
if psql -lqt | cut -d \| -f 1 | grep -qw vexa_db; then
    print_success "Database 'vexa_db' exists"
else
    print_warning "Database 'vexa_db' not found. Creating..."
    createdb vexa_db
    print_success "Database 'vexa_db' created"
fi

# Backend setup
echo ""
echo "Setting up backend..."
cd vexa-backend

# Install dependencies
if [ ! -d "node_modules" ]; then
    print_info "Installing backend dependencies..."
    npm install
    print_success "Backend dependencies installed"
else
    print_success "Backend dependencies already installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from .env.example..."
    cp .env.example .env
    print_warning "Please edit vexa-backend/.env with your credentials"
else
    print_success ".env file exists"
fi

# Run migrations
print_info "Running database migrations..."
npx prisma migrate dev --name initial_setup
print_success "Database migrations completed"

# Generate Prisma client
print_info "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Frontend setup
echo ""
echo "Setting up frontend..."
cd ../vexa

# Install dependencies
if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    npm install
    print_success "Frontend dependencies installed"
else
    print_success "Frontend dependencies already installed"
fi

# Check for google-services.json
if [ ! -f "android/app/google-services.json" ]; then
    print_warning "google-services.json not found"
    print_info "Google Sign-In and Push Notifications will not work without this file"
    print_info "See SETUP_GUIDE.md for instructions"
else
    print_success "google-services.json found"
fi

# Summary
echo ""
echo "======================================"
echo "✨ Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure environment variables:"
echo "   Edit vexa-backend/.env with your credentials"
echo ""
echo "2. Start the backend server:"
echo "   cd vexa-backend"
echo "   npm run dev"
echo ""
echo "3. Start the frontend (in a new terminal):"
echo "   cd vexa"
echo "   npm start"
echo ""
echo "4. Run on Android (in another terminal):"
echo "   cd vexa"
echo "   npm run android"
echo ""
echo "📚 Documentation:"
echo "   - QUICK_START.md - Quick start guide"
echo "   - SETUP_GUIDE.md - Complete setup instructions"
echo "   - IMPLEMENTATION_SUMMARY.md - Feature status"
echo ""
echo "🆘 Need help? Check QUICK_START.md for troubleshooting"
echo ""
