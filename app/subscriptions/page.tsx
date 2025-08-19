"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import { useFirebase } from "@/hooks/useFirebase"
import Sidebar from "@/components/Sidebar"
import { CreditCard, Edit, Save, X, DollarSign, Calendar } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Subscription {
  SubscriptionID: string
  name: string
  price: string
  SubscriptionDays: string
}

export default function Subscriptions() {
  const { user, loading: authLoading, initialized } = useAuth()
  const { firebase } = useFirebase()
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ price: string; SubscriptionDays: string }>({
    price: "",
    SubscriptionDays: ""
  })
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (initialized && !user) {
      router.push("/login")
    }
  }, [user, initialized, router])

  const fetchSubscriptions = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      if (!firebase?.db) {
        throw new Error("Database not available")
      }

      const { collection, getDocs } = await import("firebase/firestore")
      const subscriptionsSnapshot = await getDocs(collection(firebase.db, "Subscriptions"))
      
      const subscriptionsData = subscriptionsSnapshot.docs.map((doc) => ({
        SubscriptionID: doc.id,
        ...doc.data()
      })) as Subscription[]

      setSubscriptions(subscriptionsData)
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
      setError("Failed to load subscriptions. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [firebase?.db])

  useEffect(() => {
    if (user && firebase?.db) {
      fetchSubscriptions()
    }
  }, [user, firebase?.db, fetchSubscriptions])

  const handleEdit = useCallback((subscription: Subscription) => {
    setEditingId(subscription.SubscriptionID)
    setEditForm({
      price: subscription.price,
      SubscriptionDays: subscription.SubscriptionDays
    })
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditForm({ price: "", SubscriptionDays: "" })
  }, [])

  const handleSave = useCallback(async (subscriptionId: string) => {
    try {
      setIsUpdating(true)
      if (!firebase?.db) {
        throw new Error("Database not available")
      }

      const { doc, updateDoc } = await import("firebase/firestore")
      
      await updateDoc(doc(firebase.db, "Subscriptions", subscriptionId), {
        price: editForm.price,
        SubscriptionDays: editForm.SubscriptionDays
      })

      // Update local state
      setSubscriptions(prev => prev.map(sub => 
        sub.SubscriptionID === subscriptionId 
          ? { ...sub, price: editForm.price, SubscriptionDays: editForm.SubscriptionDays }
          : sub
      ))

      setEditingId(null)
      setEditForm({ price: "", SubscriptionDays: "" })
    } catch (error) {
      console.error("Error updating subscription:", error)
      setError("Failed to update subscription. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }, [firebase?.db, editForm.price, editForm.SubscriptionDays])

  // Memoize the subscription cards to prevent unnecessary re-renders
  const subscriptionCards = useMemo(() => {
    return subscriptions.map((subscription) => {
      const isEditing = editingId === subscription.SubscriptionID
      
      return (
        <div key={subscription.SubscriptionID} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">{subscription.name}</h3>
            {isEditing ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSave(subscription.SubscriptionID)}
                  disabled={isUpdating}
                  className="bg-[#B3FF13] text-black p-2 rounded-lg hover:bg-[#9FE611] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save changes"
                >
                  {isUpdating ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="bg-gray-700 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors"
                  title="Cancel edit"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit(subscription)}
                className="bg-gray-700 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors"
                title="Edit subscription"
              >
                <Edit size={16} />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {isEditing ? (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-[#B3FF13] text-lg font-semibold">₨</span>
                  <input
                    type="text"
                    value={editForm.price}
                    onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-[#B3FF13] focus:outline-none text-sm"
                    placeholder="Enter price"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar size={16} className="text-[#B3FF13]" />
                  <input
                    type="text"
                    value={editForm.SubscriptionDays}
                    onChange={(e) => setEditForm(prev => ({ ...prev, SubscriptionDays: e.target.value }))}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-[#B3FF13] focus:outline-none text-sm"
                    placeholder="Enter days"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-[#B3FF13] text-lg font-semibold">₨</span>
                  <span className="text-gray-300">{subscription.price}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar size={16} className="text-[#B3FF13]" />
                  <span className="text-gray-300">{subscription.SubscriptionDays} days</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Subscription ID</span>
              <span className="text-gray-500 text-xs font-mono">{subscription.SubscriptionID}</span>
            </div>
          </div>
        </div>
      )
    })
  }, [subscriptions, editingId, editForm, isUpdating, handleSave, handleEdit, handleCancelEdit])

  // Memoize skeletons to prevent recreation
  const subscriptionSkeletons = useMemo(() => {
    return Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-[#B3FF13] text-lg font-semibold">₨</span>
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-[#B3FF13]" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    ))
  }, [])

  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={() => {
              setError(null)
              fetchSubscriptions()
            }}
            className="bg-[#B3FF13] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Subscriptions</h1>
          <p className="text-gray-400">Manage subscription plans and pricing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            subscriptionSkeletons
          ) : subscriptions.length > 0 ? (
            subscriptionCards
          ) : (
            <div className="col-span-full text-center py-12">
              <CreditCard size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">No subscriptions found</p>
              <p className="text-gray-500 text-sm">Subscriptions will appear here once they are added to the system.</p>
            </div>
          )}
        </div>

        {!loading && subscriptions.length > 0 && (
          <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Quick Actions</h3>
            <p className="text-gray-400 text-sm">
              Click the edit button on any subscription card to modify the price or subscription duration. 
              Changes are saved immediately to the database.
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 