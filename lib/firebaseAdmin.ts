import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join } from "path";

if (!admin.apps.length) {
  try {
    const serviceAccountPath = join(process.cwd(), 'gymvisa-d2c4a-firebase-adminsdk-lrk55-8125b82877.json');
    
    if (process.env.NODE_ENV === 'development') {
      // In development, try to use the JSON file
      try {
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        console.log("Using service account JSON file directly");
        console.log("Project ID:", serviceAccount.project_id);
        console.log("Client Email:", serviceAccount.client_email);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        console.log("Firebase Admin initialized successfully with JSON file");
      } catch (jsonError) {
        console.log("Could not read JSON file, falling back to environment variables");
        throw jsonError; // This will trigger the fallback below
      }
    } else {
      // In production, use environment variables
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      if (!privateKey) {
        throw new Error("FIREBASE_PRIVATE_KEY environment variable is not set");
      }
      
      // Replace literal \n with actual newlines
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
      
      console.log("Firebase Admin initialization with env vars:");
      console.log("Project ID:", process.env.FIREBASE_PROJECT_ID);
      console.log("Client Email:", process.env.FIREBASE_CLIENT_EMAIL);
      console.log("Private Key length:", privateKey.length);
      console.log("Formatted Private Key length:", formattedPrivateKey.length);
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || "gymvisa-d2c4a",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: formattedPrivateKey,
        }),
      });
      
      console.log("Firebase Admin initialized successfully with env vars");
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw error;
  }
}

export default admin;
