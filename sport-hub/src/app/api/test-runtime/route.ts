import { NextResponse } from 'next/server'

// Simple test endpoint to verify server-side rendering is working
export async function GET() {
  const timestamp = new Date().toISOString()

  return NextResponse.json({
    message: 'Server is running',
    timestamp,
    runtime: process.env.NEXT_RUNTIME || 'unknown',
    nodeEnv: process.env.NODE_ENV || 'unknown',
    // Check if ANY environment variables exist
    totalEnvVars: Object.keys(process.env).length,
    // ALL env var keys to see what's actually available
    allEnvKeys: Object.keys(process.env).sort(),
  })
}
