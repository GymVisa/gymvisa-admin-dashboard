import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { sendBulkCredentialsEmails } from "@/lib/emailService";

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
        
        // Handle specific Firebase Auth errors
        if (userError.code === 'auth/email-already-exists') {
          errors.push(`User ${user.email} already exists in the system`);
        } else if (userError.code === 'auth/invalid-email') {
          errors.push(`Invalid email address: ${user.email}`);
        } else if (userError.code === 'auth/weak-password') {
          errors.push(`Password too weak for user: ${user.email}`);
        } else {
          errors.push(`Failed to create user ${user.email}: ${userError.message}`);
        }
      }
    }

    // Always return 200 with results, even if some users failed
    // This allows the UI to show both successful creations and errors

    // Send emails to all successfully created users (if any)
    let emailResults = { sent: 0, failed: 0, errors: [] };
    
    if (results.length > 0) {
      console.log(`Sending emails to ${results.length} users for organization: ${orgName}`);
      emailResults = await sendBulkCredentialsEmails(
        results.map(r => ({
          email: r.email,
          password: r.password,
          name: users.find(u => u.email === r.email)?.name || 'User'
        })),
        orgName
      );
      console.log(`Email sending results:`, emailResults);
    }

    // Determine success message based on results
    let successMessage = '';
    if (results.length === 0) {
      successMessage = 'No new users were created';
    } else if (errors.length === 0) {
      successMessage = `Created ${results.length} users successfully`;
    } else {
      successMessage = `Created ${results.length} users successfully, ${errors.length} failed`;
    }

    return NextResponse.json({
      success: results.length > 0,
      message: successMessage,
      results,
      errors: errors.length > 0 ? errors : undefined,
      emailResults: {
        emailsSent: emailResults.sent,
        emailsFailed: emailResults.failed,
        emailErrors: emailResults.errors.length > 0 ? emailResults.errors : undefined,
      },
    });
  } catch (error: any) {
    console.error("Error creating organization users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create organization users" },
      { status: 500 }
    );
  }
}
