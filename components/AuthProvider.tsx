"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useFirebase } from "@/hooks/useFirebase"

interface AuthContextType {
  user: any | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialized: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  initialized: false,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { firebase, loading: firebaseLoading, error: firebaseError } = useFirebase()
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (firebaseLoading) return

    if (firebaseError || !firebase?.auth) {
      console.error("Firebase not available:", firebaseError)
      setLoading(false)
      return
    }

    const setupAuth = async () => {
      try {
        const { onAuthStateChanged } = await import("firebase/auth")

        const unsubscribe = onAuthStateChanged(firebase.auth, (user) => {
          setUser(user)
          setLoading(false)
          setInitialized(true)
        })

        return unsubscribe
      } catch (error) {
        console.error("Auth setup error:", error)
        setLoading(false)
      }
    }

    const unsubscribePromise = setupAuth()

    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) unsubscribe()
      })
    }
  }, [firebase, firebaseLoading, firebaseError])

  const signIn = async (email: string, password: string) => {
    if (!firebase?.auth) {
      throw new Error("Firebase auth not available")
    }

    const { signInWithEmailAndPassword } = await import("firebase/auth")
    await signInWithEmailAndPassword(firebase.auth, email, password)
  }

  const signOut = async () => {
    if (!firebase?.auth) return

    const { signOut: firebaseSignOut } = await import("firebase/auth")
    await firebaseSignOut(firebase.auth)
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut, initialized }}>{children}</AuthContext.Provider>
}
