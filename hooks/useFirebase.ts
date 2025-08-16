"use client"

import { auth, db, storage, default as app } from "@/lib/firebase"

export const useFirebase = () => {
  // Directly return the firebase instances, no async needed
  return {
    firebase: { auth, db, storage, app },
    loading: false,
    error: null,
  }
}
