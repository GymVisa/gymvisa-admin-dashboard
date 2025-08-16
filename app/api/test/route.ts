import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "API is working!",
    timestamp: new Date().toISOString(),
    env: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? "exists" : "missing",
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? "exists" : "missing"
    }
  });
}
