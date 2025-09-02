import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

export async function DELETE(request: NextRequest) {
  try {
    const { organizationName } = await request.json();

    if (!organizationName) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    console.log(`Starting deletion of organization: ${organizationName}`);

    // Get all users in this organization
    const usersSnapshot = await admin.firestore()
      .collection("User")
      .where("Organization", "==", organizationName)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json(
        { error: "No users found for this organization" },
        { status: 404 }
      );
    }

    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${users.length} users to delete`);

    const deletedUsers = [];
    const errors = [];

    // Delete each user from Firebase Auth and Firestore
    for (const user of users) {
      try {
        // Delete from Firebase Auth
        await admin.auth().deleteUser(user.id);
        console.log(`Deleted user from Auth: ${user.Email}`);

        // Delete from Firestore
        await admin.firestore().collection("User").doc(user.id).delete();
        console.log(`Deleted user from Firestore: ${user.Email}`);

        deletedUsers.push({
          email: user.Email,
          name: user.Name
        });
      } catch (userError: any) {
        console.error(`Error deleting user ${user.Email}:`, userError);
        errors.push(`Failed to delete user ${user.Email}: ${userError.message}`);
      }
    }

    if (deletedUsers.length === 0) {
      return NextResponse.json(
        { error: "No users were deleted", errors },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted ${deletedUsers.length} users from organization: ${organizationName}`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted organization "${organizationName}" and ${deletedUsers.length} associated users`,
      deletedUsers,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete organization" },
      { status: 500 }
    );
  }
}
