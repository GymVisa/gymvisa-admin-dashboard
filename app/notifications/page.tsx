"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { useRouter } from "next/navigation"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"
import { useFirebase } from "@/hooks/useFirebase"
import Sidebar from "@/components/Sidebar"
import type { User } from "@/lib/types"
import { Send, Users, UserIcon, Bell, Target, Globe, CheckCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
  imageUrl?: string
}

export default function Notifications() {
  const { user, loading: authLoading, initialized } = useAuth()
  const { firebase } = useFirebase()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [notificationType, setNotificationType] = useState<'all' | 'selected'>('all')
  const [showForm, setShowForm] = useState(false)
  const [lastSentNotification, setLastSentNotification] = useState<NotificationPayload | null>(null)

  useEffect(() => {
    if (initialized && !authLoading && !user) {
      router.push("/login")
    }
  }, [user, initialized, authLoading, router])

  useEffect(() => {
    if (user && firebase?.db) {
      fetchUsers()
    }
  }, [user, firebase])

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(firebase!.db, "User"))
      const usersData = usersSnapshot.docs.map((doc) => ({
        UserID: doc.id,
        ...doc.data(),
      })) as User[]
      
      // Filter users who have FCM tokens (can receive notifications)
      const usersWithFCM = usersData.filter(user => user.FCMToken && user.FCMToken.trim() !== '')
      setUsers(usersWithFCM)
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map((user) => user.UserID))
    }
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const sendFCMNotification = async (fcmTokens: string[], payload: NotificationPayload) => {
    if (!fcmTokens.length) return

    try {
      // Send to Firebase Cloud Messaging
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokens: fcmTokens,
          notification: payload
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error sending FCM notification:', error)
      throw error
    }
  }

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      alert("Please fill in both title and message")
      return
    }

    if (notificationType === 'selected' && selectedUsers.length === 0) {
      alert("Please select at least one user")
      return
    }

    setSending(true)
    try {
      const payload: NotificationPayload = {
        title: title.trim(),
        body: message.trim(),
        data: {
          type: 'admin_notification',
          timestamp: new Date().toISOString(),
          sender: user?.email || 'Admin'
        }
      }

      let fcmTokens: string[] = []
      
      if (notificationType === 'all') {
        // Send to all users with FCM tokens
        fcmTokens = users.map(user => user.FCMToken).filter(token => token && token.trim() !== '')
      } else {
        // Send to selected users
        fcmTokens = users
          .filter(user => selectedUsers.includes(user.UserID))
          .map(user => user.FCMToken)
          .filter(token => token && token.trim() !== '')
      }

      if (fcmTokens.length === 0) {
        alert("No users have FCM tokens. They need to open the app to receive notifications.")
        return
      }

      // Send the notification
      await sendFCMNotification(fcmTokens, payload)

      // Update last sent notification
      setLastSentNotification(payload)
      
      // Show success message
      alert(`Notification sent successfully to ${fcmTokens.length} users!`)
      
      // Reset form
      setTitle("")
      setMessage("")
      setSelectedUsers([])
      setShowForm(false)
      
    } catch (error) {
      console.error("Error sending notifications:", error)
      alert("Failed to send notifications. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const getUsersWithFCMCount = () => {
    return users.filter(user => user.FCMToken && user.FCMToken.trim() !== '').length
  }

  if (!user) {
    return null
  }

  // Skeletons for user list
  const userSkeletons = Array.from({ length: 8 }).map((_, i) => (
    <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-4">
      <Skeleton className="h-6 w-1/3 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-2" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  ))

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Send Notifications</h1>
            <p className="text-gray-400">Push notifications to app users via Firebase Cloud Messaging</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#B3FF13] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#B3FF13]/90 transition-colors flex items-center space-x-2"
          >
            <Bell size={20} />
            <span>{showForm ? 'Hide Form' : 'Send Notification'}</span>
          </button>
        </div>

        {/* Notification Form */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Create Notification</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-white text-sm font-medium mb-2">Notification Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter notification title"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                  maxLength={100}
                />
              </div>
              
              <div>
                <label className="block text-white text-sm font-medium mb-2">Target Users</label>
                <div className="flex space-x-3">
                  <label className="flex items-center space-x-2 text-white text-sm">
                    <input
                      type="radio"
                      value="all"
                      checked={notificationType === 'all'}
                      onChange={(e) => setNotificationType(e.target.value as 'all' | 'selected')}
                      className="text-[#B3FF13] focus:ring-[#B3FF13]"
                    />
                    <Globe size={16} />
                    <span>All Users ({getUsersWithFCMCount()})</span>
                  </label>
                  <label className="flex items-center space-x-2 text-white text-sm">
                    <input
                      type="radio"
                      value="selected"
                      checked={notificationType === 'selected'}
                      onChange={(e) => setNotificationType(e.target.value as 'all' | 'selected')}
                      className="text-[#B3FF13] focus:ring-[#B3FF13]"
                    />
                    <Target size={16} />
                    <span>Selected Users ({selectedUsers.length})</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-white text-sm font-medium mb-2">Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter notification message"
                rows={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                maxLength={500}
              />
              <div className="text-xs text-gray-400 mt-1">
                {message.length}/500 characters
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                {notificationType === 'all' ? (
                  <span>Will send to all {getUsersWithFCMCount()} users with FCM tokens</span>
                ) : (
                  <span>Will send to {selectedUsers.length} selected users</span>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={async () => {
                    // Send test notification to first user with FCM token
                    const testUser = users.find(u => u.FCMToken && u.FCMToken.trim() !== '')
                    if (!testUser) {
                      alert("No users with FCM tokens found for testing")
                      return
                    }
                    
                    try {
                      await sendFCMNotification([testUser.FCMToken], {
                        title: "Test Notification",
                        body: "This is a test notification from the admin dashboard",
                        data: {
                          type: 'test_notification',
                          timestamp: new Date().toISOString()
                        }
                      })
                      alert(`Test notification sent to ${testUser.Name}`)
                    } catch (error) {
                      alert("Failed to send test notification")
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Bell size={16} />
                  <span>Test</span>
                </button>
                
                <button
                  onClick={handleSendNotification}
                  disabled={sending || !title.trim() || !message.trim() || (notificationType === 'selected' && selectedUsers.length === 0)}
                  className="bg-[#B3FF13] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#B3FF13]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Send Notification</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Last Sent Notification */}
        {lastSentNotification && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-green-400 mb-2">
              <CheckCircle size={20} />
              <span className="font-semibold">Last Notification Sent</span>
            </div>
            <div className="text-white">
              <div className="font-medium">{lastSentNotification.title}</div>
              <div className="text-gray-300 text-sm">{lastSentNotification.body}</div>
            </div>
          </div>
        )}

        {/* User Selection (only show when targeting selected users) */}
        {notificationType === 'selected' && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Select Users to Notify</h3>
              <button
                onClick={handleSelectAll}
                className="text-[#B3FF13] hover:text-[#B3FF13]/80 text-sm font-medium"
              >
                {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {users.map((user) => (
                <div
                  key={user.UserID}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUsers.includes(user.UserID)
                      ? "bg-[#B3FF13]/20 border border-[#B3FF13]"
                      : "bg-gray-800 hover:bg-gray-700"
                  }`}
                  onClick={() => handleUserSelect(user.UserID)}
                >
                  <div className="w-10 h-10 bg-[#B3FF13] rounded-full flex items-center justify-center text-black font-semibold mr-3">
                    {user.Name?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{user.Name}</p>
                    <p className="text-gray-400 text-sm">{user.Email}</p>
                    <p className="text-xs text-green-400">FCM Token Available</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded border-2 ${
                      selectedUsers.includes(user.UserID) ? "bg-[#B3FF13] border-[#B3FF13]" : "border-gray-600"
                    }`}
                  >
                    {selectedUsers.includes(user.UserID) && (
                      <svg className="w-3 h-3 text-black mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Statistics */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">User Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-[#B3FF13]">{users.length}</div>
              <div className="text-gray-400 text-sm">Total Users</div>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{getUsersWithFCMCount()}</div>
              <div className="text-gray-400 text-sm">Can Receive Notifications</div>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-orange-400">{users.length - getUsersWithFCMCount()}</div>
              <div className="text-gray-400 text-sm">No FCM Token</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Users need to open the app at least once to generate FCM tokens for push notifications.
          </p>
        </div>
      </div>
    </div>
  )
}
