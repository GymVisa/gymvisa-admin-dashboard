import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { orgName, users } = await request.json();

    if (!orgName || !users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: "Organization name and users array are required" },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const user of users) {
      try {
        if (!user.email || !user.name) {
          errors.push(`User missing email or name: ${user.email || 'unknown'}`);
          continue;
        }

        // Generate password for organization users
        const password = `${orgName.replace(/\s+/g, "").toLowerCase()}${Math.floor(100 + Math.random() * 900)}`;

        // Create the Firebase Auth user
        const userRecord = await admin.auth().createUser({
          email: user.email,
          password,
          displayName: user.name,
        });

        // Create the Firestore document
        const userData = {
          UserID: userRecord.uid,
          Name: user.name,
          Email: user.email,
          PhoneNo: user.phoneNo || "",
          Gender: user.gender || "",
          Subscription: "None",
          SubscriptionStartDate: admin.firestore.Timestamp.now(),
          SubscriptionEndDate: admin.firestore.Timestamp.now(),
          FCMToken: "",
          Verified: true,
          Organization: orgName,
          CreatedAt: admin.firestore.Timestamp.now(),
          UpdatedAt: admin.firestore.Timestamp.now(),
        };

        await admin.firestore().collection("User").doc(userRecord.uid).set(userData);

        results.push({
          email: user.email,
          password,
          uid: userRecord.uid,
        });
      } catch (userError: any) {
        console.error(`Error creating user ${user.email}:`, userError);
        errors.push(`Failed to create user ${user.email}: ${userError.message}`);
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: "No users were created", errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.length} users successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error creating organization users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create organization users" },
      { status: 500 }
    );
  }
}
