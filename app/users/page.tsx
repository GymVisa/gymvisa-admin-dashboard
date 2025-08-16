"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { useFirebase } from "@/hooks/useFirebase"
import { useRouter } from "next/navigation"
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore"
import Sidebar from "@/components/Sidebar"
import type { User } from "@/lib/types"
import { Edit, Trash2, Plus, Mail, Phone, Calendar, Users as UsersIcon, Clipboard, Download, Snowflake, Building2 } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { updateDoc } from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

export default function Users() {
  const { user, loading: authLoading, initialized } = useAuth()
  const { firebase, loading: firebaseLoading } = useFirebase()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<Partial<User>>({})
  const [saving, setSaving] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false)
  const [addMode, setAddMode] = useState<'single' | 'org'>('single')
  const [single, setSingle] = useState({ Name: '', Email: '', Password: Math.random().toString(36).slice(-8), PhoneNo: '', Gender: '' })
  const [singleResult, setSingleResult] = useState<{ email: string; password: string } | null>(null)
  const [singleLoading, setSingleLoading] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [orgUsers, setOrgUsers] = useState([{ Name: '', Email: '', PhoneNo: '', Gender: '' }])
  const [orgResult, setOrgResult] = useState<Array<{ email: string; password: string }>>([])
  const [orgLoading, setOrgLoading] = useState(false)
  const GENDERS = ["Male", "Female", "Other"]
  
  function randomPassword(org?: string) {
    if (org) {
      return `${org.replace(/\s+/g, "").toLowerCase()}${Math.floor(100 + Math.random() * 900)}`
    }
    return Math.random().toString(36).slice(-8)
  }
  
  function nowTimestamp() { return new Date() }
  
  const handleSingleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setSingle((prev) => ({ ...prev, [name]: value }))
  }
  
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("Form submitted, starting user creation process...")
    
    // Client-side validation
    if (!single.Name || !single.Email || !single.Password) {
      alert("Please fill in all required fields")
      return
    }
    
    if (single.Password.length < 6) {
      alert("Password must be at least 6 characters long")
      return
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(single.Email)) {
      alert("Please enter a valid email address")
      return
    }
    
    console.log("Creating user via API:", single.Email)
    setSingleLoading(true)
    
    try {
      console.log("Making API call to /api/create-user...")
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: single.Email,
          password: single.Password,
          name: single.Name,
          phoneNo: single.PhoneNo,
          gender: single.Gender,
        }),
      });

      console.log("API response received:", response.status, response.statusText)
      const data = await response.json();
      console.log("API response data:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      console.log("User created successfully:", data);
      setSingleResult({ email: single.Email, password: single.Password });
      
      // Refresh the users list
      fetchUsers();
      
      // Close the add dialog and show results
      setAddDialogOpen(false);
      setResultsDialogOpen(true);
      
    } catch (err: any) {
      console.error("Error creating user:", err);
      alert(err.message || "Failed to create user");
    } finally {
      setSingleLoading(false);
    }
  }
  
  const handleOrgUserChange = (idx: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setOrgUsers((prev) => prev.map((u, i) => i === idx ? { ...u, [name]: value } : u))
  }
  
  const addOrgUser = () => setOrgUsers((prev) => [...prev, { Name: '', Email: '', PhoneNo: '', Gender: '' }])
  const removeOrgUser = (idx: number) => setOrgUsers((prev) => prev.filter((_, i) => i !== idx))
  
  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("Form submitted, starting organization user creation...")
    
    // Client-side validation
    if (!orgName.trim()) {
      alert("Please enter an organization name")
      return
    }
    
    for (let i = 0; i < orgUsers.length; i++) {
      const user = orgUsers[i]
      if (!user.Email || !user.Name) {
        alert(`Please fill in all required fields for User ${i + 1}`)
        return
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(user.Email)) {
        alert(`Please enter a valid email address for User ${i + 1}`)
        return
      }
    }
    
    console.log("Creating organization users via API:", orgName)
    setOrgLoading(true)
    
    try {
      console.log("Making API call to /api/create-org-users...")
      const response = await fetch("/api/create-org-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgName,
          users: orgUsers.map(u => ({
            email: u.Email,
            name: u.Name,
            phoneNo: u.PhoneNo,
            gender: u.Gender,
          })),
        }),
      });

      console.log("API response received:", response.status, response.statusText)
      const data = await response.json();
      console.log("API response data:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to create organization users");
      }

      console.log("Organization users created successfully:", data);
      setOrgResult(data.results);
      
      if (data.errors && data.errors.length > 0) {
        console.warn("Some users had errors:", data.errors);
      }
      
      // Refresh the users list
      fetchUsers();
      
      // Close the add dialog and show results
      setAddDialogOpen(false);
      setResultsDialogOpen(true);
      
    } catch (err: any) {
      console.error("Error creating organization users:", err);
      alert(err.message || "Failed to create organization users");
    } finally {
      setOrgLoading(false);
    }
  }
  
  const downloadXLS = () => {
    const rows = [
      ["Email", "Password"],
      ...orgResult.map(r => [r.email, r.password]),
    ]
    const csv = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `organization-users.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetForm = () => {
    setSingle({ Name: '', Email: '', Password: Math.random().toString(36).slice(-8), PhoneNo: '', Gender: '' })
    setSingleResult(null)
    setOrgName('')
    setOrgUsers([{ Name: '', Email: '', PhoneNo: '', Gender: '' }])
    setOrgResult([])
    setResultsDialogOpen(false)
  }

  useEffect(() => {
    if (initialized && !authLoading && !user) {
      router.push("/login")
    }
  }, [user, initialized, authLoading, router])

  useEffect(() => {
    if (user && firebase?.db && initialized && !authLoading) {
      fetchUsers()
    }
  }, [user, firebase, initialized, authLoading])

  const fetchUsers = async () => {
    if (!firebase?.db || !user) return
    
    // Check if user is properly authenticated
    if (!user.uid) {
      console.error("User not properly authenticated")
      return
    }
    
    try {
      const usersSnapshot = await getDocs(collection(firebase.db, "User"))
      const usersData = usersSnapshot.docs.map((doc) => ({
        UserID: doc.id,
        ...doc.data(),
      })) as User[]
      setUsers(usersData)
    } catch (error: any) {
      console.error("Error fetching users:", error)
      // If it's a permission error, try to get more details
      if (error.code === 'permission-denied') {
        console.error("Permission denied. User might not be properly authenticated.")
        console.error("Current user:", user)
        console.error("User UID:", user.uid)
      }
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!firebase?.db) return
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteDoc(doc(firebase.db, "User", userId))
        setUsers(users.filter((user) => user.UserID !== userId))
      } catch (error) {
        console.error("Error deleting user:", error)
      }
    }
  }

  const handleEditClick = (user: User) => {
    setEditUser(user)
    setEditForm({ ...user })
    setEditDialogOpen(true)
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === "isUserFreezed") {
      setEditForm((prev) => ({ ...prev, [name]: value === "true" }))
    } else {
      setEditForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleEditDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Save as ISO string for consistency
    setEditForm((prev) => ({ ...prev, SubscriptionEndDate: new Date(e.target.value) }))
  }

  const handleEditSave = async () => {
    if (!firebase?.db || !editUser) return
    setSaving(true)
    try {
      const userRef = doc(firebase.db, "User", editUser.UserID)
      // Prepare update object (convert SubscriptionEndDate to Firestore Timestamp if needed)
      const updateData = { ...editForm }
      if (editForm.SubscriptionEndDate instanceof Date) {
        // Firestore Timestamp
        const { Timestamp } = await import("firebase/firestore")
        updateData.SubscriptionEndDate = Timestamp.fromDate(editForm.SubscriptionEndDate)
      }
      await updateDoc(userRef, updateData)
      // Update local state
      setUsers((prev) => prev.map((u) => (u.UserID === editUser.UserID ? { ...u, ...editForm } : u)))
      setEditUser(null)
      setEditDialogOpen(false) // Close dialog after save
    } catch (error) {
      alert("Failed to update user")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"
    try {
      return new Date(timestamp.seconds * 1000).toLocaleDateString()
    } catch {
      return "N/A"
    }
  }

  const handleFreezeUser = async (userId: string, isCurrentlyFrozen: boolean) => {
    if (!firebase?.db) return
    const action = isCurrentlyFrozen ? "unfreeze" : "freeze"
    if (confirm(`Are you sure you want to ${action} this user?`)) {
      try {
        const userRef = doc(firebase.db, "User", userId)
        await updateDoc(userRef, { isUserFreezed: !isCurrentlyFrozen })
        setUsers((prev) => prev.map((user) => 
          user.UserID === userId 
            ? { ...user, isUserFreezed: !isCurrentlyFrozen }
            : user
        ))
      } catch (error) {
        console.error(`Error ${action}ing user:`, error)
        alert(`Failed to ${action} user`)
      }
    }
  }

  if (!user) {
    return null
  }

  // Skeletons for user cards/table
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
      <div className="flex-1 p-8 overflow-hidden">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Users Management</h1>
            <p className="text-gray-400">Manage all registered users</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/organizations"
              className="bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center space-x-2"
            >
              <Building2 size={20} />
              <span>View Organizations</span>
            </Link>
            <button
              className="bg-[#B3FF13] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors flex items-center space-x-2"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus size={20} />
              <span>Add New User</span>
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden relative">
          <div className="overflow-x-auto min-w-full scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            <table className="w-full min-w-[1200px] lg:min-w-[1000px]">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-4 text-left text-[#B3FF13] font-semibold min-w-[200px]">Name</th>
                  <th className="px-4 py-4 text-left text-[#B3FF13] font-semibold min-w-[250px]">Email</th>
                  <th className="px-4 py-4 text-left text-[#B3FF13] font-semibold min-w-[150px]">Phone</th>
                  <th className="px-4 py-4 text-left text-[#B3FF13] font-semibold min-w-[100px]">Gender</th>
                  <th className="px-4 py-4 text-left text-[#B3FF13] font-semibold min-w-[120px]">Subscription</th>
                  <th className="px-4 py-4 text-left text-[#B3FF13] font-semibold min-w-[120px]">End Date</th>
                  <th className="px-4 py-4 text-left text-[#B3FF13] font-semibold min-w-[100px]">Status</th>
                  <th className="px-4 py-4 text-left text-[#B3FF13] font-semibold min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers || firebaseLoading
                  ? userSkeletons
                  : users.map((user, index) => (
                  <tr key={user.UserID} className={index % 2 === 0 ? "bg-gray-900" : "bg-gray-800"}>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-[#B3FF13] rounded-full flex items-center justify-center text-black font-semibold mr-3">
                          {user.Name?.charAt(0) || "U"}
                        </div>
                        <span className="text-white font-medium">{user.Name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center text-gray-300">
                        <Mail size={16} className="mr-2" />
                        {user.Email}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center text-gray-300">
                        <Phone size={16} className="mr-2" />
                        {user.PhoneNo}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-300">{user.Gender}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="bg-[#B3FF13] text-black px-2 py-1 rounded text-sm font-medium">
                        {user.Subscription}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center text-gray-300">
                        <Calendar size={16} className="mr-2" />
                        {formatDate(user.SubscriptionEndDate)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        user.isUserFreezed 
                          ? 'bg-red-600 text-white' 
                          : 'bg-green-600 text-white'
                      }`}>
                        {user.isUserFreezed ? 'Frozen' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        <Dialog open={editDialogOpen && editUser?.UserID === user.UserID} onOpenChange={setEditDialogOpen}>
                          <DialogTrigger asChild>
                            <button
                              className="bg-gray-700 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors"
                              onClick={() => handleEditClick(user)}
                            >
                              <Edit size={16} />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900">
                            <DialogHeader>
                              <DialogTitle>Edit User</DialogTitle>
                            </DialogHeader>
                            {editUser && editUser.UserID === user.UserID && (
                              <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
                                <div>
                                  <label className="block text-white text-sm mb-1">Name</label>
                                  <input
                                    name="Name"
                                    value={editForm.Name || ""}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-white text-sm mb-1">Email</label>
                                  <input
                                    name="Email"
                                    value={editForm.Email || ""}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-white text-sm mb-1">Phone</label>
                                  <input
                                    name="PhoneNo"
                                    value={editForm.PhoneNo || ""}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-white text-sm mb-1">Gender</label>
                                  <select
                                    name="Gender"
                                    value={editForm.Gender || ""}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
                                  >
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-white text-sm mb-1">Subscription</label>
                                  <select
                                    name="Subscription"
                                    value={editForm.Subscription || ""}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
                                  >
                                    <option value="">None</option>
                                    <option value="Standard">Standard</option>
                                    <option value="Premium">Premium</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-white text-sm mb-1">End Date</label>
                                  <input
                                    type="date"
                                    name="SubscriptionEndDate"
                                    value={editForm.SubscriptionEndDate ? (editForm.SubscriptionEndDate instanceof Date ? editForm.SubscriptionEndDate.toISOString().split("T")[0] : (editForm.SubscriptionEndDate.seconds ? new Date(editForm.SubscriptionEndDate.seconds * 1000).toISOString().split("T")[0] : "")) : ""}
                                    onChange={handleEditDateChange}
                                    className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-white text-sm mb-1">Freeze Status</label>
                                  <select
                                    name="isUserFreezed"
                                    value={editForm.isUserFreezed ? "true" : "false"}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
                                  >
                                    <option value="false">Active</option>
                                    <option value="true">Frozen</option>
                                  </select>
                                </div>
                                <DialogFooter>
                                  <button
                                    type="submit"
                                    className="bg-[#B3FF13] text-black px-6 py-2 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors"
                                    disabled={saving}
                                  >
                                    {saving ? "Saving..." : "Save Changes"}
                                  </button>
                                  <DialogClose asChild>
                                    <button type="button" className="bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors" onClick={() => setEditDialogOpen(false)}>Cancel</button>
                                  </DialogClose>
                                </DialogFooter>
                              </form>
                            )}
                          </DialogContent>
                        </Dialog>
                        <button
                          onClick={() => handleFreezeUser(user.UserID, !!user.isUserFreezed)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.isUserFreezed 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          title={user.isUserFreezed ? 'Unfreeze User' : 'Freeze User'}
                        >
                          <Snowflake size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.UserID)}
                          className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No users found</h3>
            <p className="text-gray-400">Users will appear here once they register</p>
          </div>
        )}
      </div>
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open)
        if (!open) {
          resetForm()
        }
      }}>
        <DialogContent className="bg-gray-900 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="flex space-x-2 mb-4">
            <button className={`px-4 py-2 rounded-lg font-semibold transition-colors ${addMode === 'single' ? 'bg-[#B3FF13] text-black' : 'bg-gray-800 text-white'}`} onClick={() => setAddMode('single')}>
              <Plus size={16} className="inline mr-1" /> Single User
            </button>
            <button className={`px-4 py-2 rounded-lg font-semibold transition-colors ${addMode === 'org' ? 'bg-[#B3FF13] text-black' : 'bg-gray-800 text-white'}`} onClick={() => setAddMode('org')}>
              <UsersIcon size={16} className="inline mr-1" /> Organization Users
            </button>
          </div>
          {addMode === 'single' && (
            <form className="space-y-4" onSubmit={handleSingleSubmit}>
              <div>
                <label className="block text-white text-sm mb-1">Name</label>
                <input name="Name" value={single.Name} onChange={handleSingleChange} className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" required />
              </div>
              <div>
                <label className="block text-white text-sm mb-1">Email</label>
                <input name="Email" value={single.Email} onChange={handleSingleChange} className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" required />
              </div>
              <div>
                <label className="block text-white text-sm mb-1">Password</label>
                <input name="Password" value={single.Password} onChange={handleSingleChange} className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" required />
              </div>
              <div>
                <label className="block text-white text-sm mb-1">Phone No</label>
                <input name="PhoneNo" value={single.PhoneNo} onChange={handleSingleChange} className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" />
              </div>
              <div>
                <label className="block text-white text-sm mb-1">Gender</label>
                <select name="Gender" value={single.Gender} onChange={handleSingleChange} className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700">
                  <option value="">Select</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <DialogFooter>
                <button type="submit" className="bg-[#B3FF13] text-black px-6 py-2 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors" disabled={singleLoading}>{singleLoading ? "Creating..." : "Create User"}</button>
              </DialogFooter>
            </form>
          )}
          {addMode === 'org' && (
            <form className="space-y-4" onSubmit={handleOrgSubmit}>
              <div>
                <label className="block text-white text-sm mb-1">Organization Name</label>
                <input value={orgName} onChange={e => setOrgName(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" required />
              </div>
              {orgUsers.map((user, idx) => (
                <div key={idx} className="mb-4 border-b border-gray-700 pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-semibold">User {idx + 1}</span>
                    {orgUsers.length > 1 && <button type="button" className="text-red-400 text-xs" onClick={() => removeOrgUser(idx)}>Remove</button>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input name="Name" value={user.Name} onChange={e => handleOrgUserChange(idx, e)} placeholder="Name" className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" required />
                    <input name="Email" value={user.Email} onChange={e => handleOrgUserChange(idx, e)} placeholder="Email" className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" required />
                    <input name="PhoneNo" value={user.PhoneNo} onChange={e => handleOrgUserChange(idx, e)} placeholder="Phone No" className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" />
                    <select name="Gender" value={user.Gender} onChange={e => handleOrgUserChange(idx, e)} className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700">
                      <option value="">Gender</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              ))}
              <button type="button" className="bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors mb-4" onClick={addOrgUser}><Plus size={16} className="inline mr-1" /> Add Another User</button>
              <DialogFooter>
                <button type="submit" className="bg-[#B3FF13] text-black px-6 py-2 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors" disabled={orgLoading}>{orgLoading ? "Creating..." : "Create Users"}</button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Results Dialog */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="bg-gray-900 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>User Creation Results</span>
              <button
                onClick={() => setResultsDialogOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {singleResult && (
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Single User Created Successfully!
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-700 p-3 rounded">
                    <span className="text-gray-300">Email:</span>
                    <span className="text-white font-mono font-semibold">{singleResult.email}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-700 p-3 rounded">
                    <span className="text-gray-300">Password:</span>
                    <span className="text-white font-mono font-semibold">{singleResult.password}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${singleResult.email} / ${singleResult.password}`);
                      alert("Credentials copied to clipboard!");
                    }}
                    className="w-full bg-[#B3FF13] text-black px-4 py-3 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors flex items-center justify-center"
                  >
                    <Clipboard size={16} className="mr-2" />
                    Copy Email & Password
                  </button>
                </div>
              </div>
            )}
            
            {orgResult.length > 0 && (
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {orgResult.length} Organization Users Created Successfully!
                </h3>
                <div className="space-y-4">
                  <div className="bg-gray-700 p-3 rounded">
                    <span className="text-gray-300">Organization: </span>
                    <span className="text-white font-semibold">{orgName}</span>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {orgResult.map((user, index) => (
                        <div key={index} className="bg-gray-600 p-3 rounded flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-white font-semibold">User {index + 1}</div>
                            <div className="text-gray-300 text-sm">{user.email}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-mono text-sm">{user.password}</div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${user.email} / ${user.password}`);
                                alert("Credentials copied to clipboard!");
                              }}
                              className="text-[#B3FF13] hover:text-[#9FE611] text-xs"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={downloadXLS}
                      className="flex-1 bg-[#B3FF13] text-black px-4 py-3 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors flex items-center justify-center"
                    >
                      <Download size={16} className="mr-2" />
                      Download CSV
                    </button>
                    <button
                      onClick={() => {
                        const allCredentials = orgResult.map(r => `${r.email} / ${r.password}`).join('\n');
                        navigator.clipboard.writeText(allCredentials);
                        alert("All credentials copied to clipboard!");
                      }}
                      className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-colors flex items-center justify-center"
                    >
                      <Clipboard size={16} className="mr-2" />
                      Copy All
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={() => setResultsDialogOpen(false)}
                className="bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

