#!/bin/bash
# ============================================
# SIPEKAN - Setup Script (Local Development)
# ============================================
# Run this script after cloning the repository

set -e

echo "============================================"
echo "  SIPEKAN - Setup Script"
echo "  Sistem Informasi Pelayanan Besukan Lapas"
echo "============================================"
echo ""

# Check Node.js
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check npm/bun
echo "📦 Checking package manager..."
if command -v bun &> /dev/null; then
    echo "✅ Using bun"
    PKG="bun"
elif command -v npm &> /dev/null; then
    echo "✅ Using npm"
    PKG="npm"
else
    echo "❌ No package manager found"
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
$PKG install

# Setup environment
echo ""
echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env from .env.example"
else
    echo "✅ .env already exists"
fi

# Ensure db directory exists
mkdir -p db

# Setup database
echo ""
echo "🗄️  Setting up database..."
npx prisma db push --skip-generate
npx prisma generate

# Seed database
echo ""
echo "🌱 Seeding database..."
$PKG run prisma db seed

# Ensure public/upload has index.html
echo ""
echo "📄 Setting up public/upload..."
if [ ! -f public/upload/index.html ]; then
    mkdir -p public/upload
    if [ -f upload/index.html ]; then
        cp upload/index.html public/upload/index.html
        echo "✅ Copied upload/index.html to public/upload/"
    fi
fi

echo ""
echo "============================================"
echo "  ✅ Setup Complete!"
echo "============================================"
echo ""
echo "  🔑 Login Credentials:"
echo "     Admin:    admin / admin123"
echo "     Petugas:  petugas1 / petugas123"
echo ""
echo "  🚀 Start development server:"
echo "     $PKG run dev"
echo ""
echo "  🌐 Open: http://localhost:3000"
echo ""
echo "  📱 Build for production:"
echo "     $PKG run build"
echo "     $PKG run start"
echo ""
