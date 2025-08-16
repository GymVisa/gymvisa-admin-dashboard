"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import { useFirebase } from "@/hooks/useFirebase"
import Sidebar from "@/components/Sidebar"
import StatsCard from "@/components/StatsCard"
import type { QRScan, Transaction } from "@/lib/types"
import { Dumbbell, Users, QrCode, DollarSign, TrendingUp, Activity, MapPin, Clock } from "lucide-react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Skeleton } from "@/components/ui/skeleton"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function Dashboard() {
  const { user, loading: authLoading, initialized } = useAuth()
  const { firebase } = useFirebase()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalGyms: 0,
    totalUsers: 0,
    todayScans: 0,
    totalRevenue: 0,
  })
  const [recentScans, setRecentScans] = useState<QRScan[]>([])
  const [chartData, setChartData] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialized && !user) {
      router.push("/login")
    }
  }, [user, initialized, router])

  useEffect(() => {
    if (user && firebase?.db) {
      fetchDashboardData()
    }
  }, [user, firebase])

  const fetchDashboardData = async () => {
    try {
      setError(null)

      if (!firebase?.db) {
        throw new Error("Database not available")
      }

      const { collection, getDocs } = await import("firebase/firestore")

      // Fetch gyms count
      const gymsSnapshot = await getDocs(collection(firebase.db, "Gyms"))
      const totalGyms = gymsSnapshot.size

      // Fetch users count
      const usersSnapshot = await getDocs(collection(firebase.db, "User"))
      const totalUsers = usersSnapshot.size

      // Fetch today's QR scans
      const today = new Date().toISOString().split("T")[0]
      const qrSnapshot = await getDocs(collection(firebase.db, "QR"))
      const allScans = qrSnapshot.docs.map((doc) => ({ QRID: doc.id, ...doc.data() })) as QRScan[]
      const todayScans = allScans.filter((scan) => scan.Time?.startsWith(today)).length

      // Fetch total revenue from transactions
      const transactionsSnapshot = await getDocs(collection(firebase.db, "Transactions"))
      const transactions = transactionsSnapshot.docs.map((doc) => doc.data()) as Transaction[]
      const totalRevenue = transactions.filter((t) => t.Status === "Paid").reduce((sum, t) => sum + (t.Amount || 0), 0)

      setStats({
        totalGyms,
        totalUsers,
        todayScans,
        totalRevenue,
      })

      // Get recent scans for activity feed
      const recentScansData = allScans
        .sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime())
        .slice(0, 10)
      setRecentScans(recentScansData)

      // Generate chart data for last 7 days
      generateChartData(allScans)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setError("Failed to load dashboard data. Please try again.")
    } finally {
      setLoadingData(false)
    }
  }

  const generateChartData = (scans: QRScan[]) => {
    const last7Days = []
    const scanCounts = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateString = date.toISOString().split("T")[0]
      const dayScans = scans.filter((scan) => scan.Time?.startsWith(dateString)).length

      last7Days.push(date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }))
      scanCounts.push(dayScans)
    }

    setChartData({
      labels: last7Days,
      datasets: [
        {
          label: "QR Scans",
          data: scanCounts,
          borderColor: "#B3FF13",
          backgroundColor: "rgba(179, 255, 19, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#B3FF13",
          pointBorderColor: "#B3FF13",
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    })
  }

  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "N/A"
    }
  }

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
              setLoadingData(true)
              fetchDashboardData()
            }}
            className="bg-[#B3FF13] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Skeletons for stats
  const statsSkeletons = [1, 2, 3, 4].map((i) => (
    <Skeleton key={i} className="h-28 w-full" />
  ))

  // Skeletons for chart
  const chartSkeleton = <Skeleton className="h-80 w-full" />

  // Skeletons for recent activity
  const activitySkeletons = Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
      <Skeleton className="w-2 h-2 rounded-full mt-2 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  ))

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#B3FF13",
        bodyColor: "white",
        borderColor: "#B3FF13",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "#9CA3AF",
        },
      },
      y: {
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "#9CA3AF",
        },
        beginAtZero: true,
      },
    },
  }

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Welcome to Gym Visa Admin Panel</p>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loadingData
            ? statsSkeletons
            : <>
                <StatsCard title="Total Gyms" value={stats.totalGyms} icon={<Dumbbell size={24} />} />
                <StatsCard title="Total Users" value={stats.totalUsers} icon={<Users size={24} />}  />
                <StatsCard title="Today's Scans" value={stats.todayScans} icon={<QrCode size={24} />} />
                <StatsCard title="Total Revenue" value={`Rs ${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign size={24} />} />
              </>
          }
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">QR Scan Analytics</h2>
                  <p className="text-gray-400 text-sm">Last 7 days activity</p>
                </div>
              </div>
              <div className="h-80">
                {loadingData ? chartSkeleton : (chartData && <Line data={chartData} options={chartOptions} />)}
              </div>
            </div>
          </div>
          {/* Recent Activity */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
              <Activity size={20} className="text-[#B3FF13]" />
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {loadingData
                ? activitySkeletons
                : recentScans.length > 0
                  ? recentScans.map((scan) => (
                      <div key={scan.QRID} className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
                        <div className="w-2 h-2 bg-[#B3FF13] rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{scan.gymName}</p>
                          <div className="flex items-center text-gray-400 text-xs mt-1">
                            <MapPin size={12} className="mr-1" />
                            <span className="truncate">{scan.gymAddress}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="bg-[#B3FF13] text-black px-2 py-1 rounded text-xs font-medium">
                              {scan.gymSubscription}
                            </span>
                            <div className="flex items-center text-gray-400 text-xs">
                              <Clock size={12} className="mr-1" />
                              <span>{formatTime(scan.Time)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  : <div className="text-center py-8">
                      <QrCode size={48} className="mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">No recent activity</p>
                    </div>
              }
            </div>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => router.push("/gyms")}
              className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-[#B3FF13] transition-colors group"
            >
              <Dumbbell size={32} className="text-[#B3FF13] mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-semibold mb-1">Manage Gyms</h3>
              <p className="text-gray-400 text-sm">Add, edit, or remove gyms</p>
            </button>
            <button
              onClick={() => router.push("/users")}
              className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-[#B3FF13] transition-colors group"
            >
              <Users size={32} className="text-[#B3FF13] mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-semibold mb-1">Manage Users</h3>
              <p className="text-gray-400 text-sm">View and manage user accounts</p>
            </button>
            <button
              onClick={() => router.push("/notifications")}
              className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-[#B3FF13] transition-colors group"
            >
              <Activity size={32} className="text-[#B3FF13] mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-semibold mb-1">Send Notifications</h3>
              <p className="text-gray-400 text-sm">Push notifications to users</p>
            </button>
            <button
              onClick={() => router.push("/qr-scans")}
              className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-[#B3FF13] transition-colors group"
            >
              <QrCode size={32} className="text-[#B3FF13] mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-semibold mb-1">QR Analytics</h3>
              <p className="text-gray-400 text-sm">View scan reports and trends</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
