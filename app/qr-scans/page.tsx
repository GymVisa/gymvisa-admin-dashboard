"use client"

import { useEffect, useState, useMemo } from "react"
import { useFirebase } from "@/hooks/useFirebase"
import Sidebar from "@/components/Sidebar"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Calendar, Search, Users, Dumbbell, QrCode, ChevronDown, ChevronRight } from "lucide-react"
import { useAuth } from "@/components/AuthProvider"
import { useRouter } from "next/navigation"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function QRAnalytics() {
  const { user, loading: authLoading } = useAuth()
  const { firebase } = useFirebase()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [qrScans, setQrScans] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [gyms, setGyms] = useState<any[]>([])
  const [filter, setFilter] = useState({ gym: "", user: "", start: "", end: "" })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!firebase?.db || !user) return
    setLoading(true)
    const fetchAll = async () => {
      const { collection, getDocs } = await import("firebase/firestore")
      const [qrSnap, userSnap, gymSnap] = await Promise.all([
        getDocs(collection(firebase.db, "QR")),
        getDocs(collection(firebase.db, "User")),
        getDocs(collection(firebase.db, "Gyms")),
      ])
      setQrScans(qrSnap.docs.map((doc) => ({ QRID: doc.id, ...doc.data() })))
      setUsers(userSnap.docs.map((doc) => ({ UserID: doc.id, ...doc.data() })))
      setGyms(gymSnap.docs.map((doc) => ({ gymID: doc.id, ...doc.data() })))
      setLoading(false)
    }
    fetchAll()
  }, [firebase?.db, user])

  // Map for quick lookup
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.UserID, u])), [users])
  // Map gyms by gymName and gymID for robust lookup
  const gymNameMap = useMemo(() => Object.fromEntries(gyms.map(g => [g.gymName, g])), [gyms])
  const gymIdMap = useMemo(() => Object.fromEntries(gyms.map(g => [g.gymID, g])), [gyms])

  // Filtered scans
  const filteredScans = useMemo(() => {
    return qrScans.filter(scan => {
      const matchGym = !filter.gym || scan.gymName === filter.gym || scan.gymID === filter.gym
      const matchUser = !filter.user || scan.UserID === filter.user
      const matchStart = !filter.start || new Date(scan.Time) >= new Date(filter.start)
      const matchEnd = !filter.end || new Date(scan.Time) <= new Date(filter.end)
      return matchGym && matchUser && matchStart && matchEnd
    })
  }, [qrScans, filter])

  // Summary (memoized)
  const summary = useMemo(() => {
    const totalScans = filteredScans.length
    const uniqueGyms = new Set(filteredScans.map(s => s.gymName || s.gymID)).size
    const uniqueUsers = new Set(filteredScans.map(s => s.UserID)).size
    return { totalScans, uniqueGyms, uniqueUsers }
  }, [filteredScans])

  // Time series data
  const chartData = useMemo(() => {
    const byDay: Record<string, number> = {}
    filteredScans.forEach(scan => {
      const day = scan.Time.split("T")[0]
      byDay[day] = (byDay[day] || 0) + 1
    })
    const days = Object.keys(byDay).sort()
    return {
      labels: days,
      datasets: [
        {
          label: "QR Scans",
          data: days.map(d => byDay[d]),
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
    }
  }, [filteredScans])

  // Gym-wise table (use gymName if available, else gymID)
  const gymsWithScans = useMemo(() => {
    const map: Record<string, any[]> = {}
    filteredScans.forEach(scan => {
      const key = scan.gymName || scan.gymID
      if (!map[key]) map[key] = []
      map[key].push(scan)
    })
    return Object.entries(map).map(([gymKey, scans]) => ({ gymKey, scans }))
  }, [filteredScans])

  // Chart options (memoized to prevent unnecessary re-renders)
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        type: "linear" as const,
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.1)" },
        ticks: { color: "#B3FF13" },
      },
      x: {
        grid: { color: "rgba(255,255,255,0.1)" },
        ticks: { color: "#B3FF13" },
      },
    },
  }), [])

  // Auth loading: show skeletons only
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><QrCode size={32} /> QR Analytics</h1>
            <p className="text-gray-400">Detailed analytics of all QR scans across gyms and users</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-12 w-full mb-8" />
          <Skeleton className="h-80 w-full mb-8" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </div>
      </div>
    )
  }
  // Not authenticated: show nothing (or redirect)
  if (!user) return null

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><QrCode size={32} /> QR Analytics</h1>
          <p className="text-gray-400">Detailed analytics of all QR scans across gyms and users</p>
        </div>
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 flex items-center gap-4">
            <QrCode size={32} className="text-[#B3FF13]" />
            <div>
              <div className="text-gray-400 text-sm">Total Scans</div>
              <div className="text-2xl font-bold text-white">{loading ? <Skeleton className="h-8 w-16" /> : summary.totalScans}</div>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 flex items-center gap-4">
            <Dumbbell size={32} className="text-[#B3FF13]" />
            <div>
              <div className="text-gray-400 text-sm">Unique Gyms</div>
              <div className="text-2xl font-bold text-white">{loading ? <Skeleton className="h-8 w-16" /> : summary.uniqueGyms}</div>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 flex items-center gap-4">
            <Users size={32} className="text-[#B3FF13]" />
            <div>
              <div className="text-gray-400 text-sm">Unique Users</div>
              <div className="text-2xl font-bold text-white">{loading ? <Skeleton className="h-8 w-16" /> : summary.uniqueUsers}</div>
            </div>
          </div>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8 items-end">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Gym</label>
            <select
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white"
              value={filter.gym}
              onChange={e => setFilter(f => ({ ...f, gym: e.target.value }))}
            >
              <option value="">All</option>
              {gyms.map(g => <option key={g.gymName} value={g.gymName}>{g.gymName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">User</label>
            <select
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white"
              value={filter.user}
              onChange={e => setFilter(f => ({ ...f, user: e.target.value }))}
            >
              <option value="">All</option>
              {users.map(u => <option key={u.UserID} value={u.UserID}>{u.Name || u.UserID}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Start Date</label>
            <input
              type="date"
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white"
              value={filter.start}
              onChange={e => setFilter(f => ({ ...f, start: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">End Date</label>
            <input
              type="date"
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white"
              value={filter.end}
              onChange={e => setFilter(f => ({ ...f, end: e.target.value }))}
            />
          </div>
          <div className="flex-1" />
          <button
            className="bg-[#B3FF13] text-black px-6 py-2 rounded-lg font-semibold hover:bg-[#9FE611] transition-colors flex items-center gap-2"
            onClick={() => setFilter({ gym: "", user: "", start: "", end: "" })}
          >
            <Search size={18} /> Reset Filters
          </button>
        </div>
        {/* Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Scans Over Time</h2>
          <div className="h-80">
            {loading ? <Skeleton className="h-80 w-full" /> : <Line data={chartData} options={chartOptions} />}
          </div>
        </div>
        {/* Gym Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Gym-wise Scan Details</h2>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : gymsWithScans.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No scans found for the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="py-2 px-4">Gym</th>
                    <th className="py-2 px-4">Total Scans</th>
                    <th className="py-2 px-4">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {gymsWithScans.map(({ gymKey, scans }) => (
                    <GymRow key={gymKey} gymKey={gymKey} scans={scans} userMap={userMap} gymNameMap={gymNameMap} gymIdMap={gymIdMap} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GymRow({ gymKey, scans, userMap, gymNameMap, gymIdMap }: { gymKey: string, scans: any[], userMap: Record<string, any>, gymNameMap: Record<string, any>, gymIdMap: Record<string, any> }) {
  const [open, setOpen] = useState(false)
  // Group scans by day
  const byDay: Record<string, any[]> = {}
  scans.forEach(scan => {
    const day = scan.Time.split("T")[0]
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(scan)
  })
  const days = Object.keys(byDay).sort((a, b) => b.localeCompare(a))
  return (
    <>
      <tr
        className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <td className="py-2 px-4 font-semibold text-white flex items-center gap-2">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {gymNameMap[gymKey]?.gymName || gymIdMap[gymKey]?.gymName || gymKey}
        </td>
        <td className="py-2 px-4 text-[#B3FF13] font-bold">{scans.length}</td>
        <td className="py-2 px-4 text-blue-400 underline">{open ? "Hide" : "Show"} Details</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={3} className="bg-gray-950 px-4 py-2">
            <div className="space-y-4">
              {days.map(day => (
                <div key={day}>
                  <div className="text-gray-400 font-semibold mb-2 flex items-center gap-2"><Calendar size={16} /> {day}</div>
                  <table className="min-w-full text-left mb-4">
                    <thead>
                      <tr className="text-gray-400">
                        <th className="py-1 px-2">User</th>
                        <th className="py-1 px-2">Time</th>
                        <th className="py-1 px-2">Subscription</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byDay[day].map(scan => (
                        <tr key={scan.QRID} className="text-white border-b border-gray-800">
                          <td className="py-1 px-2">{userMap[scan.UserID]?.Name || scan.UserID}</td>
                          <td className="py-1 px-2">{new Date(scan.Time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                          <td className="py-1 px-2">{scan.gymSubscription}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
} 