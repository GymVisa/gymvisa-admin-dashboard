"use client"

import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/components/AuthProvider"
import { useFirebase } from "@/hooks/useFirebase"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where } from "firebase/firestore"
import Sidebar from "@/components/Sidebar"
import type { User } from "@/lib/types"
import { Building2, Users, Mail, Phone, Calendar, Download, Search, Filter, Trash2, AlertTriangle } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

interface OrganizationData {
  name: string
  users: User[]
  totalUsers: number
  activeUsers: number
  frozenUsers: number
}

export default function Organizations() {
  const { user, loading: authLoading, initialized } = useAuth()
  const { firebase, loading: firebaseLoading } = useFirebase()
  const router = useRouter()
  const [organizations, setOrganizations] = useState<OrganizationData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrg, setSelectedOrg] = useState<OrganizationData | null>(null)
  const [orgDetailsOpen, setOrgDetailsOpen] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [orgToDelete, setOrgToDelete] = useState<OrganizationData | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState("")

  useEffect(() => {
    if (initialized && !authLoading && !user) {
      router.push("/login")
    }
  }, [user, initialized, authLoading, router])

  useEffect(() => {
    // Only fetch if we haven't already fetched and all conditions are met
    if (user && firebase?.db && initialized && !authLoading && !hasFetched) {
      console.log("Fetching organizations...")
      fetchOrganizations()
    }
  }, [user, firebase, initialized, authLoading, hasFetched])

  const fetchOrganizations = async () => {
    if (!firebase?.db || !user) return
    
    try {
      console.log("Starting organizations fetch...")
      setLoading(true)
      
      // Get all users with organization field
      const usersSnapshot = await getDocs(collection(firebase.db, "User"))
      const usersData = usersSnapshot.docs.map((doc) => ({
        UserID: doc.id,
        ...doc.data(),
      })) as User[]
      
      console.log("Total users fetched:", usersData.length)
      
      // Group users by organization
      const orgMap = new Map<string, User[]>()
      
      usersData.forEach(user => {
        if (user.Organization) {
          if (!orgMap.has(user.Organization)) {
            orgMap.set(user.Organization, [])
          }
          orgMap.get(user.Organization)!.push(user)
        }
      })
      
      console.log("Organizations found:", orgMap.size)
      
      // Convert to array and calculate stats
      const orgsData: OrganizationData[] = Array.from(orgMap.entries()).map(([name, users]) => ({
        name,
        users,
        totalUsers: users.length,
        activeUsers: users.filter(u => !u.isUserFreezed).length,
        frozenUsers: users.filter(u => u.isUserFreezed).length,
      }))
      
      // Sort by total users (descending)
      orgsData.sort((a, b) => b.totalUsers - a.totalUsers)
      
      console.log("Setting organizations:", orgsData)
      setOrganizations(orgsData)
      setHasFetched(true)
    } catch (error: any) {
      console.error("Error fetching organizations:", error)
    } finally {
      setLoading(false)
    }
  }

  // Memoize filtered organizations to prevent unnecessary recalculations
  const filteredOrganizations = useMemo(() => {
    if (!searchTerm) return organizations
    
    return organizations.filter(org =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.users.some(user => 
        user.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.Email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [organizations, searchTerm])

  const downloadOrgCSV = (org: OrganizationData) => {
    const rows = [
      ["Name", "Email", "Phone", "Gender", "Subscription", "Status"],
      ...org.users.map(user => [
        user.Name || "N/A",
        user.Email || "N/A",
        user.PhoneNo || "N/A",
        user.Gender || "N/A",
        user.Subscription || "None",
        user.isUserFreezed ? "Frozen" : "Active"
      ])
    ]
    const csv = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${org.name}-users.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRefresh = () => {
    setHasFetched(false)
    setOrganizations([])
    fetchOrganizations()
  }

  const handleDeleteOrganization = async () => {
    if (!orgToDelete) return

    setDeleting(true)
    try {
      console.log(`Deleting organization: ${orgToDelete.name}`)
      
      const response = await fetch("/api/delete-organization", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationName: orgToDelete.name,
        }),
      });

      const data = await response.json();
      console.log("Delete response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete organization");
      }

      console.log("Organization deleted successfully:", data);
      
      // Close dialogs and refresh data
      setDeleteConfirmOpen(false)
      setOrgToDelete(null)
      handleRefresh()
      
      // Show success message (you could add a toast notification here)
      alert(`Organization "${orgToDelete.name}" and ${data.deletedUsers.length} users have been deleted successfully.`);
      
    } catch (error: any) {
      console.error("Error deleting organization:", error);
      alert(error.message || "Failed to delete organization");
    } finally {
      setDeleting(false);
    }
  }

  const openDeleteConfirm = (org: OrganizationData) => {
    setOrgToDelete(org)
    setConfirmText("")
    setDeleteConfirmOpen(true)
  }

  const isDeleteConfirmed = orgToDelete && confirmText === orgToDelete.name

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"
    try {
      return new Date(timestamp.seconds * 1000).toLocaleDateString()
    } catch {
      return "N/A"
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar />
      <div className="flex-1 p-8 overflow-hidden">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Organizations Management</h1>
            <p className="text-gray-400">View and manage all organizations and their users</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search organizations"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-[#B3FF13] focus:outline-none"
              />
            </div>
            <div className="text-white text-sm">
              {filteredOrganizations.length} of {organizations.length} organizations
            </div>
          </div>
        </div>

        {loading || firebaseLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#B3FF13] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Loading Organizations...</h3>
            <p className="text-gray-400">Please wait while we fetch the data</p>
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchTerm ? "No organizations found" : "No organizations yet"}
            </h3>
            <p className="text-gray-400">
              {searchTerm ? "Try adjusting your search terms" : "Organizations will appear here once users are created with organization details"}
            </p>
            {!searchTerm && (
              <button
                onClick={handleRefresh}
                className="mt-4 bg-[#B3FF13] text-black px-6 py-2 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors"
              >
                Refresh Data
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrganizations.map((org, index) => (
              <div key={org.name} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-[#B3FF13] rounded-full flex items-center justify-center text-black font-bold text-lg mr-3">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">{org.name}</h3>
                      <p className="text-gray-400 text-sm">Organization</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedOrg(org)
                      setOrgDetailsOpen(true)
                    }}
                    className="text-[#B3FF13] hover:text-[#9FE611] text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center">
                      <Users size={16} className="mr-2" />
                      Total Users
                    </span>
                    <span className="text-white font-semibold">{org.totalUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 text-sm">Active</span>
                    <span className="text-white font-semibold">{org.activeUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-400 text-sm">Frozen</span>
                    <span className="text-white font-semibold">{org.frozenUsers}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedOrg(org)
                      setOrgDetailsOpen(true)
                    }}
                    className="flex-1 bg-gray-800 text-white px-3 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    View Users
                  </button>
                  <button
                    onClick={() => downloadOrgCSV(org)}
                    className="bg-[#B3FF13] text-black px-3 py-2 rounded text-sm font-medium hover:bg-[#9FE611] transition-colors"
                    title="Download CSV"
                  >
                    <Download size={14} className="inline" />
                  </button>
                  <button
                    onClick={() => openDeleteConfirm(org)}
                    className="bg-red-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors"
                    title="Delete Organization"
                  >
                    <Trash2 size={14} className="inline" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organization Details Dialog */}
      <Dialog open={orgDetailsOpen} onOpenChange={setOrgDetailsOpen}>
        <DialogContent className="bg-gray-900 max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Building2 size={24} className="mr-2 text-[#B3FF13]" />
                <span>{selectedOrg?.name} - User Details</span>
              </div>
              <button
                onClick={() => setOrgDetailsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrg && (
            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{selectedOrg.totalUsers}</div>
                    <div className="text-gray-400 text-sm">Total Users</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{selectedOrg.activeUsers}</div>
                    <div className="text-gray-400 text-sm">Active Users</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{selectedOrg.frozenUsers}</div>
                    <div className="text-gray-400 text-sm">Frozen Users</div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Users List</h3>
                <button
                  onClick={() => downloadOrgCSV(selectedOrg)}
                  className="bg-[#B3FF13] text-black px-4 py-2 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors flex items-center"
                >
                  <Download size={16} className="mr-2" />
                  Download CSV
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-[#B3FF13] font-semibold">Name</th>
                        <th className="px-4 py-3 text-left text-[#B3FF13] font-semibold">Email</th>
                        <th className="px-4 py-3 text-left text-[#B3FF13] font-semibold">Phone</th>
                        <th className="px-4 py-3 text-left text-[#B3FF13] font-semibold">Status</th>
                        <th className="px-4 py-3 text-left text-[#B3FF13] font-semibold">Subscription</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrg.users.map((user, index) => (
                        <tr key={user.UserID} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"}>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-[#B3FF13] rounded-full flex items-center justify-center text-black font-semibold text-sm mr-3">
                                {user.Name?.charAt(0) || "U"}
                              </div>
                              <span className="text-white font-medium">{user.Name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center text-gray-300">
                              <Mail size={14} className="mr-2" />
                              {user.Email}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center text-gray-300">
                              <Phone size={14} className="mr-2" />
                              {user.PhoneNo || "N/A"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              user.isUserFreezed 
                                ? 'bg-red-600 text-white' 
                                : 'bg-green-600 text-white'
                            }`}>
                              {user.isUserFreezed ? 'Frozen' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-[#B3FF13] text-black px-2 py-1 rounded text-xs font-medium">
                              {user.Subscription || "None"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-400">
              <AlertTriangle size={24} className="mr-2" />
              Delete Organization
            </DialogTitle>
          </DialogHeader>
          
          {orgToDelete && (
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-600 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle size={20} className="text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-red-400 font-semibold mb-2">⚠️ IRREVERSIBLE ACTION</h4>
                    <p className="text-red-300 text-sm">
                      You are about to permanently delete the organization <strong>"{orgToDelete.name}"</strong> and ALL of its users.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h5 className="text-white font-semibold mb-3">What will be deleted:</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Organization:</span>
                    <span className="text-white font-medium">{orgToDelete.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Users:</span>
                    <span className="text-white font-medium">{orgToDelete.totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Users:</span>
                    <span className="text-green-400 font-medium">{orgToDelete.activeUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Frozen Users:</span>
                    <span className="text-red-400 font-medium">{orgToDelete.frozenUsers}</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-600 p-3 rounded">
                <p className="text-yellow-300 text-sm">
                  <strong>⚠️ Warning:</strong> This action cannot be undone. All user accounts, data, and access will be permanently removed from the system.
                </p>
              </div>

              <div className="bg-gray-800 p-3 rounded">
                <p className="text-gray-300 text-sm">
                  <strong>To confirm deletion, type the organization name:</strong>
                </p>
                <input
                  type="text"
                  placeholder={`Type "${orgToDelete.name}" to confirm`}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full mt-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-red-500 focus:outline-none"
                  id="confirmInput"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex space-x-3">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteOrganization}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={deleting || !isDeleteConfirmed}
            >
              {deleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Delete Organization</span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
