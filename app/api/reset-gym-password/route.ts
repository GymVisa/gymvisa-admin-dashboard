import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Generate a new random password
    const newPassword = generateRandomPassword()
    
    // First get the user by email, then update their password
    const userRecord = await admin.auth().getUserByEmail(email)
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword
    })

    return NextResponse.json({ 
      success: true, 
      password: newPassword,
      message: 'Password reset successfully'
    })

  } catch (error: any) {
    console.error('Error resetting password:', error)
    
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to reset password',
      details: error.message 
    }, { status: 500 })
  }
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
