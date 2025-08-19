"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Dumbbell, Users, QrCode, Bell, CreditCard, Settings, LogOut, Building2, AlertTriangle, Wallet, CreditCard as CreditCardIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import { useState } from "react"
import { useWithdrawalCount } from "@/hooks/useWithdrawalCount"

const sidebarItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Gyms", href: "/gyms", icon: Dumbbell },
  { name: "Users", href: "/users", icon: Users },
  { name: "Organizations", href: "/organizations", icon: Building2 },
  { name: "Subscriptions", href: "/subscriptions", icon: CreditCardIcon },
  { name: "QR Scans", href: "/qr-scans", icon: QrCode },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Transactions", href: "/transactions", icon: CreditCard },
  { name: "Gyms Withdrawals", href: "/gyms-withdrawals", icon: Wallet },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { pendingCount } = useWithdrawalCount()

  const handleLogout = async () => {
    try {
      setShowLogoutConfirm(false)
      router.push("/login")
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <>
      <div className="bg-black border-r border-gray-800 w-64 min-h-screen p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#B3FF13]">Gym Visa</h1>
        </div>

        <nav className="space-y-2 flex-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const showBadge = item.name === "Gyms Withdrawals" && pendingCount > 0

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  isActive ? "bg-[#B3FF13] text-black" : "text-white hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={20} />
                  <span>{item.name}</span>
                </div>
                {showBadge && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
          {/* Insert logout button just below Transactions */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-white hover:bg-red-600 w-full transition-colors mt-2"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </nav>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full">
            <div className="flex items-center space-x-3 p-6 border-b border-gray-800">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Confirm Logout</h3>
                <p className="text-gray-400 text-sm">Are you sure you want to logout?</p>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-300 text-sm mb-6">
                You will be redirected to the login page and will need to sign in again to access the admin dashboard.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
