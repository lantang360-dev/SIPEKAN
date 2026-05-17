// ============================================
// SIPEKAN - Vercel Postinstall Script
// ============================================
// This script runs automatically on Vercel after npm install
// It generates the Prisma client for serverless environment

const { execSync } = require('child_process')

console.log('🔍 Generating Prisma Client...')
try {
  execSync('npx prisma generate', { stdio: 'inherit' })
  console.log('✅ Prisma Client generated successfully')
} catch (error) {
  console.error('❌ Failed to generate Prisma Client:', error.message)
  process.exit(1)
}
