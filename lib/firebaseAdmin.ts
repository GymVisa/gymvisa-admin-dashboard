import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join } from "path";

if (!admin.apps.length) {
  try {
    let serviceAccount;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Use environment variable (production) - contains the complete JSON
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log("Firebase Admin initialization with env var:");
        console.log("Project ID:", serviceAccount.project_id);
        console.log("Client Email:", serviceAccount.client_email);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        console.log("Firebase Admin initialized successfully with environment variable");
      } catch (jsonError) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", jsonError);
        throw jsonError;
      }
    } else {
      // Fallback to local file (development)
      const serviceAccountPath = join(process.cwd(), 'gymvisa-d2c4a-firebase-adminsdk-lrk55-8125b82877.json');
      
      try {
        serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        console.log("Using service account JSON file directly");
        console.log("Project ID:", serviceAccount.project_id);
        console.log("Client Email:", serviceAccount.client_email);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        console.log("Firebase Admin initialized successfully with JSON file");
      } catch (fileError) {
        console.error("Could not read JSON file:", fileError);
        throw new Error("Neither FIREBASE_SERVICE_ACCOUNT environment variable nor local JSON file is available");
      }
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw error;
  }
}

export default admin;
