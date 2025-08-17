"use client"

import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { useFirebase } from "./useFirebase"

export const useWithdrawalCount = () => {
  const { firebase } = useFirebase()
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebase?.db) return

    const unsubscribe = onSnapshot(
      query(
        collection(firebase.db, "GymsPayoutRequests"),
        where("status", "==", "pending")
      ),
      (snapshot) => {
        setPendingCount(snapshot.size)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching pending withdrawal count:", error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [firebase?.db])

  return { pendingCount, loading }
}
