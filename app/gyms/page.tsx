"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { useFirebase } from "@/hooks/useFirebase"
import { useRouter } from "next/navigation"
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import Sidebar from "@/components/Sidebar"
import type { Gym } from "@/lib/types"
import { Edit, Trash2, Plus, MapPin, Phone, Mail, Dumbbell, X, Upload, Camera, Download, QrCode } from "lucide-react"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import QRCode from "qrcode"

export default function Gyms() {
  const { user, loading: authLoading, initialized } = useAuth()
  const { firebase, loading: firebaseLoading } = useFirebase()
  const router = useRouter()
  const [gyms, setGyms] = useState<Gym[]>([])
  const [loadingGyms, setLoadingGyms] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [currentQRCode, setCurrentQRCode] = useState<string>("")
  const [currentGymName, setCurrentGymName] = useState("")
  const [editingGym, setEditingGym] = useState<Gym | null>(null)
  const [newGym, setNewGym] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    description: "",
    email: "",
    phoneNo: "",
    imageUrl1: "",
    imageUrl2: "",
    googleMapsLink: "",
    qrCodeUrl: "",
        subscription: "Standard",
    operatingHours: {
      unified: true,
      male: {
        monday: { open: "06:00", close: "22:00", closed: false },
        tuesday: { open: "06:00", close: "22:00", closed: false },
        wednesday: { open: "06:00", close: "22:00", closed: false },
        thursday: { open: "06:00", close: "22:00", closed: false },
        friday: { open: "06:00", close: "22:00", closed: false },
        saturday: { open: "08:00", close: "20:00", closed: false },
        sunday: { open: "08:00", close: "20:00", closed: false }
      },
      female: {
        monday: { open: "06:00", close: "22:00", closed: false },
        tuesday: { open: "06:00", close: "22:00", closed: false },
        wednesday: { open: "06:00", close: "22:00", closed: false },
        thursday: { open: "06:00", close: "22:00", closed: false },
        friday: { open: "06:00", close: "22:00", closed: false },
        saturday: { open: "08:00", close: "20:00", closed: false },
        sunday: { open: "08:00", close: "20:00", closed: false }
      }
    }
  })
  const [creatingGym, setCreatingGym] = useState(false)
  const [updatingGym, setUpdatingGym] = useState(false)
  const [uploadingImage1, setUploadingImage1] = useState(false)
  const [uploadingImage2, setUploadingImage2] = useState(false)
  const [uploadingEditImage1, setUploadingEditImage1] = useState(false)
  const [uploadingEditImage2, setUploadingEditImage2] = useState(false)
  const [generatingQR, setGeneratingQR] = useState(false)

  useEffect(() => {
    if (initialized && !authLoading && !user) {
      router.push("/login")
    }
  }, [user, initialized, authLoading, router])

  useEffect(() => {
    if (user && firebase?.db) {
      fetchGyms()
    }
  }, [user, firebase])

  const fetchGyms = async () => {
    if (!firebase?.db) return
    try {
      const gymsSnapshot = await getDocs(collection(firebase.db, "Gyms"))
      const gymsData = gymsSnapshot.docs.map((doc) => ({
        gymID: doc.id,
        ...doc.data(),
      })) as Gym[]
      setGyms(gymsData)
    } catch (error) {
      console.error("Error fetching gyms:", error)
    } finally {
      setLoadingGyms(false)
    }
  }

  const handleDeleteGym = async (gymId: string) => {
    if (!firebase?.db) return
    if (confirm("Are you sure you want to delete this gym?")) {
      try {
        await deleteDoc(doc(firebase.db, "Gyms", gymId))
        setGyms(gyms.filter((gym) => gym.gymID !== gymId))
      } catch (error) {
        console.error("Error deleting gym:", error)
      }
    }
  }

  const handleEditGym = (gym: Gym) => {
    setEditingGym(gym)
    setShowEditModal(true)
  }

  const handleUpdateGym = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebase?.db || !editingGym) return
    
    setUpdatingGym(true)
    try {
      const gymData = {
        ...editingGym,
        updatedAt: new Date()
      }
      
      await updateDoc(doc(firebase.db, "Gyms", editingGym.gymID), gymData)
      
      setGyms(gyms.map(gym => 
        gym.gymID === editingGym.gymID ? editingGym : gym
      ))
      
      setShowEditModal(false)
      setEditingGym(null)
    } catch (error) {
      console.error("Error updating gym:", error)
      alert("Failed to update gym. Please try again.")
    } finally {
      setUpdatingGym(false)
    }
  }

  const handleAddGym = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebase?.db) return
    
    setCreatingGym(true)
    try {
      const gymData = {
        ...newGym,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const docRef = await addDoc(collection(firebase.db, "Gyms"), gymData)
      const newGymWithId = { ...gymData, gymID: docRef.id } as Gym
      
      // Generate QR code for the new gym
      try {
        const qrCodeUrl = await generateQRCode(newGymWithId.gymID, newGymWithId.name)
        
        // Update the gym document with the QR code
        await updateDoc(doc(firebase.db, "Gyms", newGymWithId.gymID), {
          qrCodeUrl: qrCodeUrl,
          updatedAt: new Date()
        })
        
        // Update local state with QR code
        newGymWithId.qrCodeUrl = qrCodeUrl
      } catch (qrError) {
        console.error("Error generating QR code:", qrError)
        // Continue without QR code - it can be generated later
      }
      
      setGyms([...gyms, newGymWithId])
      setShowAddModal(false)
      setNewGym({
        name: "",
        address: "",
        city: "",
        country: "",
        description: "",
        email: "",
        phoneNo: "",
        imageUrl1: "",
        imageUrl2: "",
        googleMapsLink: "",
        qrCodeUrl: "",
        subscription: "Standard",
        operatingHours: {
          unified: true,
          male: {
            monday: { open: "06:00", close: "22:00", closed: false },
            tuesday: { open: "06:00", close: "22:00", closed: false },
            wednesday: { open: "06:00", close: "22:00", closed: false },
            thursday: { open: "06:00", close: "22:00", closed: false },
            friday: { open: "06:00", close: "22:00", closed: false },
            saturday: { open: "08:00", close: "20:00", closed: false },
            sunday: { open: "08:00", close: "20:00", closed: false }
          },
          female: {
            monday: { open: "06:00", close: "22:00", closed: false },
            tuesday: { open: "06:00", close: "22:00", closed: false },
            wednesday: { open: "06:00", close: "22:00", closed: false },
            thursday: { open: "06:00", close: "22:00", closed: false },
            friday: { open: "06:00", close: "22:00", closed: false },
            saturday: { open: "08:00", close: "20:00", closed: false },
            sunday: { open: "08:00", close: "20:00", closed: false }
          }
        }
      })
      
      // Show success message with QR code info
      alert(`Gym "${newGymWithId.name}" created successfully! QR code has been generated and saved.`)
    } catch (error) {
      console.error("Error adding gym:", error)
      alert("Failed to add gym. Please try again.")
    } finally {
      setCreatingGym(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewGym(prev => ({ ...prev, [name]: value }))
  }

  const handleOperatingHoursChange = (gender: 'male' | 'female', day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setNewGym(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [gender]: {
          ...prev.operatingHours[gender],
          [day]: {
            ...prev.operatingHours[gender][day as keyof typeof prev.operatingHours[typeof gender]],
            [field]: value
          }
        }
      }
    }))
  }

  const handleUnifiedChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setNewGym(prev => {
      // Create updated male and female timings
      const updatedMale = {
        ...prev.operatingHours.male,
        [day]: {
          ...prev.operatingHours.male[day as keyof typeof prev.operatingHours.male],
          [field]: value
        }
      }
      
      const updatedFemale = {
        ...prev.operatingHours.female,
        [day]: {
          ...prev.operatingHours.female[day as keyof typeof prev.operatingHours.female],
          [field]: value
        }
      }
      
      // Check if male and female timings are still the same after the update
      const maleDay = updatedMale[day as keyof typeof updatedMale]
      const femaleDay = updatedFemale[day as keyof typeof updatedFemale]
      const timingsStillUnified = maleDay.open === femaleDay.open && 
                                  maleDay.close === femaleDay.close && 
                                  maleDay.closed === femaleDay.closed
      
      return {
        ...prev,
        operatingHours: {
          ...prev.operatingHours,
          unified: timingsStillUnified, // Only set to false if timings actually differ
          male: updatedMale,
          female: updatedFemale
        }
      }
    })
  }

  const toggleUnified = () => {
    setNewGym(prev => {
      const newUnified = !prev.operatingHours.unified
      
      if (newUnified) {
        // If switching to unified, copy male timings to female
        return {
          ...prev,
          operatingHours: {
            ...prev.operatingHours,
            unified: true,
            female: { ...prev.operatingHours.male }
          }
        }
      } else {
        // If switching to separate, keep current timings
        return {
          ...prev,
          operatingHours: {
            ...prev.operatingHours,
            unified: false
          }
        }
      }
    })
  }

  // Helper function to check if male and female timings are the same
  const areTimingsUnified = (male: any, female: any): boolean => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    return days.every(day => {
      const maleDay = male[day]
      const femaleDay = female[day]
      return maleDay.open === femaleDay.open && 
             maleDay.close === femaleDay.close && 
             maleDay.closed === femaleDay.closed
    })
  }

  const uploadImage = async (file: File, gymId: string, imageNumber: 1 | 2): Promise<string> => {
    if (!firebase?.storage) throw new Error("Firebase storage not available")
    
    const storageRef = ref(firebase.storage, `gyms/${gymId}/image${imageNumber}`)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    return downloadURL
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, imageNumber: 1 | 2, isEdit: boolean = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    const gymId = isEdit ? editingGym?.gymID : `temp-${Date.now()}`
    if (!gymId) return

    try {
      if (isEdit) {
        if (imageNumber === 1) setUploadingEditImage1(true)
        else setUploadingEditImage2(true)
      } else {
        if (imageNumber === 1) setUploadingImage1(true)
        else setUploadingImage2(true)
      }

      const downloadURL = await uploadImage(file, gymId, imageNumber)
      
      if (isEdit && editingGym) {
        setEditingGym({
          ...editingGym,
          [`imageUrl${imageNumber}`]: downloadURL
        })
      } else {
        setNewGym(prev => ({
          ...prev,
          [`imageUrl${imageNumber}`]: downloadURL
        }))
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      if (isEdit) {
        if (imageNumber === 1) setUploadingEditImage1(false)
        else setUploadingEditImage2(false)
      } else {
        if (imageNumber === 1) setUploadingImage1(false)
        else setUploadingImage2(false)
      }
    }
  }

  const generateQRCode = async (gymId: string, gymName: string): Promise<string> => {
    try {
      setGeneratingQR(true)
      
      // Create QR code data with gym ID
      const gymInfo = `GymID:${gymId}`
      
      // Generate QR code as data URL
      const qrDataURL = await QRCode.toDataURL(gymInfo, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      return qrDataURL
    } catch (error) {
      console.error("Error generating QR code:", error)
      throw new Error("Failed to generate QR code")
    } finally {
      setGeneratingQR(false)
    }
  }

  const showQRCode = async (gym: Gym) => {
    try {
      let qrCodeUrl = gym.qrCodeUrl
      
      // If no QR code exists, generate one
      if (!qrCodeUrl) {
        qrCodeUrl = await generateQRCode(gym.gymID, gym.name)
        
        // Update the gym document with the new QR code
        if (firebase?.db) {
          await updateDoc(doc(firebase.db, "Gyms", gym.gymID), {
            qrCodeUrl: qrCodeUrl,
            updatedAt: new Date()
          })
          
          // Update local state
          setGyms(gyms.map(g => 
            g.gymID === gym.gymID ? { ...g, qrCodeUrl } : g
          ))
        }
      }
      
      setCurrentQRCode(qrCodeUrl)
      setCurrentGymName(gym.name)
      setShowQRModal(true)
    } catch (error) {
      console.error("Error showing QR code:", error)
      alert("Failed to generate/show QR code")
    }
  }

  const downloadQRCode = async () => {
    try {
      // Create a temporary link element
      const link = document.createElement('a')
      link.href = currentQRCode
      link.download = `${currentGymName.replace(/\s+/g, '_')}_QR_Code.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading QR code:", error)
      alert("Failed to download QR code")
    }
  }

  if (!user) {
    return null
  }

  // Skeletons for gym cards
  const gymSkeletons = Array.from({ length: 6 }).map((_, i) => (
    <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <div className="p-6">
        <Skeleton className="h-6 w-1/3 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-2" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  ))

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gyms Management</h1>
            <p className="text-gray-400">Manage all registered gyms</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#B3FF13] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add New Gym</span>
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {(loadingGyms || firebaseLoading)
            ? gymSkeletons
            : gyms.map((gym) => (
                <div key={gym.gymID} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                  <div className="relative h-48">
                    <Image
                      src={gym.imageUrl1 || "/placeholder.svg?height=200&width=400"}
                      alt={gym.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-semibold text-white">{gym.name}</h3>
                      <span className="bg-[#B3FF13] text-black px-2 py-1 rounded text-sm font-medium">
                        {gym.subscription}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-400 text-sm">
                        <MapPin size={16} className="mr-2" />
                        <span>
                          {gym.address}, {gym.city}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-400 text-sm">
                        <Phone size={16} className="mr-2" />
                        <span>{gym.phoneNo}</span>
                      </div>
                      <div className="flex items-center text-gray-400 text-sm">
                        <Mail size={16} className="mr-2" />
                        <span>{gym.email}</span>
                      </div>
                    </div>

                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">{gym.description}</p>

                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditGym(gym)}
                        className="flex-1 bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Edit size={16} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => showQRCode(gym)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <QrCode size={16} />
                        <span>QR Code</span>
                      </button>
                      <button
                        onClick={() => handleDeleteGym(gym.gymID)}
                        className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
          }
        </div>

        {gyms.length === 0 && (
          <div className="text-center py-12">
            <Dumbbell size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No gyms found</h3>
            <p className="text-gray-400">Start by adding your first gym</p>
          </div>
        )}

        {/* Add Gym Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-800">
                <h2 className="text-xl font-semibold text-white">Add New Gym</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddGym} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Gym Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={newGym.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Subscription</label>
                    <select
                      name="subscription"
                      value={newGym.subscription}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={newGym.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      name="phoneNo"
                      value={newGym.phoneNo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={newGym.address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={newGym.city}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Country *</label>
                    <input
                      type="text"
                      name="country"
                      value={newGym.country}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Image 1</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 1)}
                        className="hidden"
                        id="image1-upload"
                      />
                      <label
                        htmlFor="image1-upload"
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        {uploadingImage1 ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#B3FF13]"></div>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Camera size={16} />
                            <span>Upload Image 1</span>
                          </>
                        )}
                      </label>
                    </div>
                    {newGym.imageUrl1 && (
                      <div className="mt-2 text-xs text-gray-400">
                        ✓ Image uploaded successfully
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Image 2</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 2)}
                        className="hidden"
                        id="image2-upload"
                      />
                      <label
                        htmlFor="image2-upload"
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        {uploadingImage2 ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#B3FF13]"></div>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Camera size={16} />
                            <span>Upload Image 2</span>
                          </>
                        )}
                      </label>
                    </div>
                    {newGym.imageUrl2 && (
                      <div className="mt-2 text-xs text-gray-400">
                        ✓ Image uploaded successfully
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Google Maps Link</label>
                    <input
                      type="url"
                      name="googleMapsLink"
                      value={newGym.googleMapsLink}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      placeholder="https://maps.google.com/..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">QR Code</label>
                    <div className="text-xs text-gray-400">
                      QR code will be automatically generated when the gym is created
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    value={newGym.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                    placeholder="Enter gym description..."
                  />
                </div>

                {/* Operating Hours Section */}
                <div className="border-t border-gray-800 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">Operating Hours (Optional)</h3>
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2 text-white text-sm">
                        <input
                          type="checkbox"
                          checked={newGym.operatingHours.unified}
                          onChange={toggleUnified}
                          className="rounded border-gray-600 bg-gray-700 text-[#B3FF13] focus:ring-[#B3FF13] focus:ring-offset-gray-800"
                        />
                        <span>Same timing for Men and Women</span>
                      </label>
                    </div>
                  </div>

                  {newGym.operatingHours.unified ? (
                    <div className="space-y-3">
                      <h4 className="text-md font-medium text-gray-300">Unified Operating Hours</h4>
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                        <div key={day} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                          <div className="w-20 text-white text-sm font-medium capitalize">{day}</div>
                          <label className="flex items-center space-x-2 text-white text-sm">
                            <input
                              type="checkbox"
                              checked={!newGym.operatingHours.male[day as keyof typeof newGym.operatingHours.male].closed}
                              onChange={(e) => handleUnifiedChange(day, 'closed', !e.target.checked)}
                              className="rounded border-gray-600 bg-gray-700 text-[#B3FF13] focus:ring-[#B3FF13] focus:ring-offset-gray-800"
                            />
                            <span>Open</span>
                          </label>
                          {!newGym.operatingHours.male[day as keyof typeof newGym.operatingHours.male].closed && (
                            <>
                              <input
                                type="time"
                                value={newGym.operatingHours.male[day as keyof typeof newGym.operatingHours.male].open}
                                onChange={(e) => handleUnifiedChange(day, 'open', e.target.value)}
                                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              />
                              <span className="text-gray-400">to</span>
                              <input
                                type="time"
                                value={newGym.operatingHours.male[day as keyof typeof newGym.operatingHours.male].close}
                                onChange={(e) => handleUnifiedChange(day, 'close', e.target.value)}
                                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-md font-medium text-gray-300 mb-3">Male Operating Hours</h4>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                          <div key={day} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg mb-2">
                            <div className="w-20 text-white text-sm font-medium capitalize">{day}</div>
                            <label className="flex items-center space-x-2 text-white text-sm">
                              <input
                                type="checkbox"
                                checked={!newGym.operatingHours.male[day as keyof typeof newGym.operatingHours.male].closed}
                                onChange={(e) => handleOperatingHoursChange('male', day, 'closed', !e.target.checked)}
                                className="rounded border-gray-600 bg-gray-700 text-[#B3FF13] focus:ring-[#B3FF13] focus:ring-offset-gray-800"
                              />
                              <span>Open</span>
                            </label>
                            {!newGym.operatingHours.male[day as keyof typeof newGym.operatingHours.male].closed && (
                              <>
                                <input
                                  type="time"
                                  value={newGym.operatingHours.male[day as keyof typeof newGym.operatingHours.male].open}
                                  onChange={(e) => handleOperatingHoursChange('male', day, 'open', e.target.value)}
                                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                />
                                <span className="text-gray-400">to</span>
                                <input
                                  type="time"
                                  value={newGym.operatingHours.male[day as keyof typeof newGym.operatingHours.male].close}
                                  onChange={(e) => handleOperatingHoursChange('male', day, 'close', e.target.value)}
                                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                />
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      <div>
                        <h4 className="text-md font-medium text-gray-300 mb-3">Female Operating Hours</h4>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                          <div key={day} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg mb-2">
                            <div className="w-20 text-white text-sm font-medium capitalize">{day}</div>
                            <label className="flex items-center space-x-2 text-white text-sm">
                              <input
                                type="checkbox"
                                checked={!newGym.operatingHours.female[day as keyof typeof newGym.operatingHours.female].closed}
                                onChange={(e) => handleOperatingHoursChange('female', day, 'closed', !e.target.checked)}
                                className="rounded border-gray-600 bg-gray-700 text-[#B3FF13] focus:ring-[#B3FF13] focus:ring-offset-gray-800"
                              />
                              <span>Open</span>
                            </label>
                            {!newGym.operatingHours.female[day as keyof typeof newGym.operatingHours.female].closed && (
                              <>
                                <input
                                  type="time"
                                  value={newGym.operatingHours.female[day as keyof typeof newGym.operatingHours.female].open}
                                  onChange={(e) => handleOperatingHoursChange('female', day, 'open', e.target.value)}
                                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                />
                                <span className="text-gray-400">to</span>
                                <input
                                  type="time"
                                  value={newGym.operatingHours.female[day as keyof typeof newGym.operatingHours.female].close}
                                  onChange={(e) => handleOperatingHoursChange('female', day, 'close', e.target.value)}
                                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                />
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingGym}
                    className="flex-1 bg-[#B3FF13] text-black py-2 px-4 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingGym ? "Creating..." : "Create Gym"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b border-gray-800">
                <h2 className="text-xl font-semibold text-white">QR Code: {currentGymName}</h2>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 text-center">
                {currentQRCode ? (
                  <>
                    <div className="mb-4">
                      <img 
                        src={currentQRCode} 
                        alt="QR Code" 
                        className="mx-auto border border-gray-700 rounded-lg"
                        style={{ maxWidth: '300px', height: 'auto' }}
                      />
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={downloadQRCode}
                        className="flex-1 bg-[#B3FF13] text-black py-2 px-4 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors flex items-center justify-center space-x-2"
                      >
                        <Download size={16} />
                        <span>Download QR Code</span>
                      </button>
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-3">
                      This QR code contains the gym ID and can be scanned by users to access gym information.
                    </p>
                  </>
                ) : (
                  <div className="py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B3FF13] mx-auto mb-4"></div>
                    <p className="text-gray-400">Generating QR code...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Gym Modal */}
        {showEditModal && editingGym && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-800">
                <h2 className="text-xl font-semibold text-white">Edit Gym: {editingGym.name}</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingGym(null)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleUpdateGym} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Gym Name *</label>
                    <input
                      type="text"
                      value={editingGym.name}
                      onChange={(e) => setEditingGym({...editingGym, name: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Subscription</label>
                    <select
                      value={editingGym.subscription}
                      onChange={(e) => setEditingGym({...editingGym, subscription: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      value={editingGym.email}
                      onChange={(e) => setEditingGym({...editingGym, email: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      value={editingGym.phoneNo}
                      onChange={(e) => setEditingGym({...editingGym, phoneNo: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Address *</label>
                    <input
                      type="text"
                      value={editingGym.address}
                      onChange={(e) => setEditingGym({...editingGym, address: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">City *</label>
                    <input
                      type="text"
                      value={editingGym.city}
                      onChange={(e) => setEditingGym({...editingGym, city: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Country *</label>
                    <input
                      type="text"
                      value={editingGym.country}
                      onChange={(e) => setEditingGym({...editingGym, country: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Image 1</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 1, true)}
                        className="hidden"
                        id="edit-image1-upload"
                      />
                      <label
                        htmlFor="edit-image1-upload"
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        {uploadingEditImage1 ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#B3FF13]"></div>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Camera size={16} />
                            <span>Upload Image 1</span>
                          </>
                        )}
                      </label>
                    </div>
                    {editingGym.imageUrl1 && (
                      <div className="mt-2 text-xs text-gray-400">
                        ✓ Current image: {editingGym.imageUrl1.substring(0, 50)}...
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Image 2</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 2, true)}
                        className="hidden"
                        id="edit-image2-upload"
                      />
                      <label
                        htmlFor="edit-image2-upload"
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        {uploadingEditImage2 ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#B3FF13]"></div>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Camera size={16} />
                            <span>Upload Image 2</span>
                          </>
                        )}
                      </label>
                    </div>
                    {editingGym.imageUrl2 && (
                      <div className="mt-2 text-xs text-gray-400">
                        ✓ Current image: {editingGym.imageUrl2.substring(0, 50)}...
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Google Maps Link</label>
                    <input
                      type="url"
                      value={editingGym.googleMapsLink}
                      onChange={(e) => setEditingGym({...editingGym, googleMapsLink: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                      placeholder="https://maps.google.com/..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">QR Code</label>
                    <div className="space-y-2">
                      {editingGym.qrCodeUrl ? (
                        <div className="text-xs text-gray-400">
                          ✓ QR Code exists: {editingGym.qrCodeUrl.substring(0, 50)}...
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">
                          No QR code generated yet
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const qrCodeUrl = await generateQRCode(editingGym.gymID, editingGym.name)
                            setEditingGym({...editingGym, qrCodeUrl})
                            
                            // Update Firestore
                            if (firebase?.db) {
                              await updateDoc(doc(firebase.db, "Gyms", editingGym.gymID), {
                                qrCodeUrl: qrCodeUrl,
                                updatedAt: new Date()
                              })
                            }
                            
                            alert("QR Code generated successfully!")
                          } catch (error) {
                            alert("Failed to generate QR code")
                          }
                        }}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <QrCode size={16} />
                        <span>Generate QR Code</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={editingGym.description}
                    onChange={(e) => setEditingGym({...editingGym, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none"
                    placeholder="Enter gym description..."
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingGym(null)
                    }}
                    className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingGym}
                    className="flex-1 bg-[#B3FF13] text-black py-2 px-4 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingGym ? "Updating..." : "Update Gym"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
