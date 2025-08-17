"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { useFirebase } from "@/hooks/useFirebase"
import { useRouter } from "next/navigation"
import { collection, getDocs, doc, updateDoc, query, orderBy, onSnapshot } from "firebase/firestore"
import Sidebar from "@/components/Sidebar"
import { CheckCircle, XCircle, Clock, DollarSign, Building2, Mail, Calendar, AlertCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"

interface GymsPayoutRequest {
  id: string
  createdAt: any
  gymEmail: string
  gymID: string
  gymName: string
  requestDate: string
  status: "pending" | "approved" | "rejected"
  withdrawalAmount: number
}

export default function GymsWithdrawals() {
  const { user, loading: authLoading, initialized } = useAuth()
  const { firebase, loading: firebaseLoading } = useFirebase()
  const router = useRouter()
  const [withdrawalRequests, setWithdrawalRequests] = useState<GymsPayoutRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (!initialized || authLoading || firebaseLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      query(collection(firebase.db, "GymsPayoutRequests"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GymsPayoutRequest[]
        
        setWithdrawalRequests(requests)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching withdrawal requests:", error)
        setLoading(false)
        toast({
          title: "Error",
          description: "Failed to fetch withdrawal requests",
          variant: "destructive",
        })
      }
    )

    return () => unsubscribe()
  }, [user, initialized, authLoading, firebaseLoading, firebase.db, router])

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId)
    try {
      const requestRef = doc(firebase.db, "GymsPayoutRequests", requestId)
      await updateDoc(requestRef, {
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: user?.uid
      })
      
      toast({
        title: "Success",
        description: "Withdrawal request approved successfully",
      })
    } catch (error) {
      console.error("Error approving request:", error)
      toast({
        title: "Error",
        description: "Failed to approve withdrawal request",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId)
    try {
      const requestRef = doc(firebase.db, "GymsPayoutRequests", requestId)
      await updateDoc(requestRef, {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.uid
      })
      
      toast({
        title: "Success",
        description: "Withdrawal request rejected",
      })
    } catch (error) {
      console.error("Error rejecting request:", error)
      toast({
        title: "Error",
        description: "Failed to reject withdrawal request",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR"
    }).format(amount)
  }

  const pendingRequests = withdrawalRequests.filter(req => req.status === "pending")
  const approvedRequests = withdrawalRequests.filter(req => req.status === "approved")
  const rejectedRequests = withdrawalRequests.filter(req => req.status === "rejected")

  if (authLoading || firebaseLoading || !initialized) {
    return (
      <div className="min-h-screen bg-black flex">
        <Sidebar />
        <div className="flex-1 p-8 overflow-hidden">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64 bg-gray-800" />
            <Skeleton className="h-4 w-96 bg-gray-800" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 bg-gray-800" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar />
      <div className="flex-1 p-8 overflow-hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Gyms Withdrawals</h1>
          <p className="text-gray-400">Manage gym payout requests and withdrawals</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Requests</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{pendingRequests.length}</p>
                <p className="text-gray-500 text-xs mt-1">Awaiting approval</p>
              </div>
              <div className="text-yellow-400">
                <Clock className="h-8 w-8" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Approved Requests</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{approvedRequests.length}</p>
                <p className="text-gray-500 text-xs mt-1">Successfully processed</p>
              </div>
              <div className="text-green-400">
                <CheckCircle className="h-8 w-8" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Amount</p>
                <p className="text-2xl font-bold text-[#B3FF13] mt-1">
                  {formatAmount(pendingRequests.reduce((sum, req) => sum + req.withdrawalAmount, 0))}
                </p>
                <p className="text-gray-500 text-xs mt-1">Pending withdrawals</p>
              </div>
              <div className="text-[#B3FF13]">
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 border border-gray-700">
            <TabsTrigger value="pending" className="flex items-center gap-2 text-gray-300 data-[state=active]:bg-[#B3FF13] data-[state=active]:text-black data-[state=active]:font-semibold">
              <Clock className="h-4 w-4" />
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2 text-gray-300 data-[state=active]:bg-[#B3FF13] data-[state=active]:text-black data-[state=active]:font-semibold">
              <CheckCircle className="h-4 w-4" />
              Approved ({approvedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2 text-gray-300 data-[state=active]:bg-[#B3FF13] data-[state=active]:text-black data-[state=active]:font-semibold">
              <XCircle className="h-4 w-4" />
              Rejected ({rejectedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-48 bg-gray-800" />
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12">
                <div className="flex flex-col items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Pending Requests</h3>
                  <p className="text-gray-400 text-center">All withdrawal requests have been processed</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="bg-gray-900 border border-gray-800 rounded-lg p-6 border-l-4 border-l-yellow-400">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{request.gymName}</h3>
                        <div className="flex items-center gap-2 mt-1 text-gray-400">
                          <Building2 className="h-4 w-4" />
                          <span className="text-sm">{request.gymID}</span>
                        </div>
                      </div>
                      <span className="bg-yellow-900 text-yellow-400 text-xs font-semibold px-2 py-1 rounded-full border border-yellow-700">
                        Pending
                      </span>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-[#B3FF13]" />
                        <span className="font-semibold text-lg text-[#B3FF13]">
                          {formatAmount(request.withdrawalAmount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{request.gymEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">{formatDate(request.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id}
                        className="flex-1 bg-[#B3FF13] text-black px-3 py-2 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        {processingId === request.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                        className="flex-1 bg-gray-700 text-red-400 px-3 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50 border border-red-500/30 flex items-center justify-center"
                      >
                        {processingId === request.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedRequests.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12">
                <div className="flex flex-col items-center justify-center">
                  <AlertCircle className="h-12 w-12 text-blue-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Approved Requests</h3>
                  <p className="text-gray-400 text-center">Approved requests will appear here</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedRequests.map((request) => (
                  <div key={request.id} className="bg-gray-900 border border-gray-800 rounded-lg p-6 border-l-4 border-l-green-400">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{request.gymName}</h3>
                        <div className="flex items-center gap-2 mt-1 text-gray-400">
                          <Building2 className="h-4 w-4" />
                          <span className="text-sm">{request.gymID}</span>
                        </div>
                      </div>
                      <span className="bg-green-900 text-green-400 text-xs font-semibold px-2 py-1 rounded-full border border-green-700">
                        Approved
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-400" />
                        <span className="font-semibold text-lg text-green-400">
                          {formatAmount(request.withdrawalAmount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{request.gymEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">{formatDate(request.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedRequests.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12">
                <div className="flex flex-col items-center justify-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Rejected Requests</h3>
                  <p className="text-gray-400 text-center">Rejected requests will appear here</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rejectedRequests.map((request) => (
                  <div key={request.id} className="bg-gray-900 border border-gray-800 rounded-lg p-6 border-l-4 border-l-red-400">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{request.gymName}</h3>
                        <div className="flex items-center gap-2 mt-1 text-gray-400">
                          <Building2 className="h-4 w-4" />
                          <span className="text-sm">{request.gymID}</span>
                        </div>
                      </div>
                      <span className="bg-red-900 text-red-400 text-xs font-semibold px-2 py-1 rounded-full border border-red-700">
                        Rejected
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold text-lg text-gray-400">
                          {formatAmount(request.withdrawalAmount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{request.gymEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">{formatDate(request.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
