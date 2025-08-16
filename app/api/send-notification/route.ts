import { NextRequest, NextResponse } from "next/server"
import admin from "@/lib/firebaseAdmin"

interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
  imageUrl?: string
}

interface RequestBody {
  tokens: string[]
  notification: NotificationPayload
}

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase Admin is properly initialized
    if (!admin.apps.length) {
      console.error("Firebase Admin not initialized")
      return NextResponse.json(
        { error: "Firebase Admin not initialized" },
        { status: 500 }
      )
    }

    const { tokens, notification }: RequestBody = await request.json()

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        { error: "FCM tokens array is required" },
        { status: 400 }
      )
    }

    if (!notification || !notification.title || !notification.body) {
      return NextResponse.json(
        { error: "Notification title and body are required" },
        { status: 400 }
      )
    }

    console.log(`Sending notification to ${tokens.length} users`)
    console.log("Notification:", notification)

    // Prepare the message payload
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { image: notification.imageUrl })
      },
      data: {
        ...notification.data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // For Flutter apps
        sound: 'default'
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
          channel_id: 'gymvisa_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    }

    // Send to each token
    const results = []
    const errors = []

    for (const token of tokens) {
      try {
        const response = await admin.messaging().send({
          token,
          ...message
        })
        
        results.push({
          token,
          messageId: response,
          success: true
        })
        
        console.log(`Successfully sent to token: ${token.substring(0, 20)}...`)
      } catch (error: any) {
        console.error(`Failed to send to token ${token.substring(0, 20)}...:`, error)
        
        // Handle specific FCM errors
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
          // Token is invalid or expired - should be removed from user's record
          console.log(`Invalid/expired token detected: ${token.substring(0, 20)}...`)
          
          // TODO: You can implement cleanup of invalid tokens here
          // This would involve finding users with this token and removing it
          // await cleanupInvalidToken(token)
        }
        
        errors.push({
          token: token.substring(0, 20) + '...',
          error: error.message,
          code: error.code
        })
      }
    }

    const successCount = results.length
    const errorCount = errors.length

    console.log(`Notification delivery complete: ${successCount} successful, ${errorCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${successCount} users`,
      results: {
        successful: successCount,
        failed: errorCount,
        details: {
          successful: results,
          errors: errors
        }
      }
    })

  } catch (error: any) {
    console.error("Error in send-notification API:", error)
    return NextResponse.json(
      { 
        error: "Failed to send notifications",
        details: error.message 
      },
      { status: 500 }
    )
  }
}
