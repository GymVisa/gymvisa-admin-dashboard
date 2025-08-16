
import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

export const firebaseConfig = {
  apiKey: "AIzaSyDS5k29udIpFP02nuJAcPXYVd5WtDWCVeI",
  authDomain: "gymvisa-d2c4a.firebaseapp.com",
  projectId: "gymvisa-d2c4a",
  storageBucket: "gymvisa-d2c4a.appspot.com",
  messagingSenderId: "1057011839530",
  appId: "1:1057011839530:web:d1ba5e78770bb49e778953",
  measurementId: "G-GZF7QT1B2Z",
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
