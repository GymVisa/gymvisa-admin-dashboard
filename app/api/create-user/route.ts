import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    console.log("Environment check:");
    console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
    console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
    console.log("FIREBASE_PRIVATE_KEY exists:", !!process.env.FIREBASE_PRIVATE_KEY);
    
    // Check if Firebase Admin is properly initialized
    if (!admin.apps.length) {
      console.error("Firebase Admin not initialized");
      return NextResponse.json(
        { error: "Firebase Admin not initialized" },
        { status: 500 }
      );
    }
    
    console.log("Firebase Admin initialized successfully");
    
    const { email, password, name, phoneNo, gender, organization } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    console.log("Creating user:", { email, name });

    // Create the Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    console.log("Firebase Auth user created:", userRecord.uid);

    // Create the Firestore document
    const userData = {
      UserID: userRecord.uid,
      Name: name,
      Email: email,
      PhoneNo: phoneNo || "",
      Gender: gender || "",
      Subscription: "None",
      SubscriptionStartDate: admin.firestore.Timestamp.now(),
      SubscriptionEndDate: admin.firestore.Timestamp.now(),
      FCMToken: "",
      Verified: true,
      CreatedAt: admin.firestore.Timestamp.now(),
      UpdatedAt: admin.firestore.Timestamp.now(),
      ...(organization && { Organization: organization }),
    };

    await admin.firestore().collection("User").doc(userRecord.uid).set(userData);

    console.log("Firestore document created successfully");

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      message: "User created successfully",
      userData,
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    console.error("Error stack:", error.stack);
    
    let errorMessage = "Failed to create user";
    let statusCode = 500;

    if (error.code === "auth/email-already-exists") {
      errorMessage = "Email already exists";
      statusCode = 400;
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email format";
      statusCode = 400;
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak";
      statusCode = 400;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
