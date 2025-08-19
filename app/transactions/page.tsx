"use client"

import { useEffect, useState, useMemo } from "react"
import { useFirebase } from "@/hooks/useFirebase"
import { useAuth } from "@/components/AuthProvider"
import { useRouter } from "next/navigation"
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
import { Calendar, Search, Users, DollarSign, CreditCard, ChevronDown, ChevronRight } from "lucide-react"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const PERIODS = ["daily", "weekly", "monthly"] as const

type Period = typeof PERIODS[number]

export default function TransactionsAnalytics() {
  const { user, loading: authLoading } = useAuth()
  const { firebase } = useFirebase()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [filter, setFilter] = useState({ user: "", subscription: "", status: "", start: "", end: "" })
  const [period, setPeriod] = useState<Period>("daily")

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
      const [txnSnap, userSnap] = await Promise.all([
        getDocs(collection(firebase.db, "Transactions")),
        getDocs(collection(firebase.db, "User")),
      ])
      setTransactions(txnSnap.docs.map((doc) => ({ transactionId: doc.id, ...doc.data() })))
      setUsers(userSnap.docs.map((doc) => ({ UserID: doc.id, ...doc.data() })))
      setLoading(false)
    }
    fetchAll()
  }, [firebase?.db, user])

  // Map for quick lookup
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.UserID, u])), [users])

  // Filtered transactions
  const filteredTxns = useMemo(() => {
    return transactions.filter(txn => {
      const matchUser = !filter.user || txn.UserId === filter.user
      const matchSub = !filter.subscription || txn.Subscription === filter.subscription
      const matchStatus = !filter.status || txn.Status === filter.status
      const matchStart = !filter.start || new Date(txn.UpdatedAt) >= new Date(filter.start)
      const matchEnd = !filter.end || new Date(txn.UpdatedAt) <= new Date(filter.end)
      return matchUser && matchSub && matchStatus && matchStart && matchEnd
    })
  }, [transactions, filter])

  // Summary (memoized)
  const summary = useMemo(() => {
    const totalRevenue = filteredTxns.filter(t => t.Status === "Paid").reduce((sum, t) => sum + (t.Amount || 0), 0)
    const totalTxns = filteredTxns.length
    const uniqueUsers = new Set(filteredTxns.map(t => t.UserId)).size
    return { totalRevenue, totalTxns, uniqueUsers }
  }, [filteredTxns])

  // Time series data (by period)
  const chartData = useMemo(() => {
    const byPeriod: Record<string, { revenue: number; count: number }> = {}
    
    filteredTxns.forEach(txn => {
      let key = ""
      
      // Try different possible date fields
      let dateField = txn.UpdatedAt || txn.createdAt || txn.CreatedAt || txn.date || txn.Date || txn.timestamp || txn.Timestamp
      
      // If no date field found, use current date as fallback
      if (!dateField) {
        dateField = new Date().toISOString()
      }
      
      const date = new Date(dateField)
      
      if (isNaN(date.getTime())) {
        // Use current date as fallback if parsing fails
        const fallbackDate = new Date()
        if (period === "daily") {
          key = fallbackDate.toISOString().split("T")[0]
        } else if (period === "weekly") {
          const firstDay = new Date(fallbackDate)
          firstDay.setDate(fallbackDate.getDate() - fallbackDate.getDay())
          key = firstDay.toISOString().split("T")[0]
        } else if (period === "monthly") {
          key = fallbackDate.getFullYear() + "-" + String(fallbackDate.getMonth() + 1).padStart(2, "0")
        }
      } else {
        if (period === "daily") {
          key = date.toISOString().split("T")[0]
        } else if (period === "weekly") {
          const firstDay = new Date(date)
          firstDay.setDate(date.getDate() - date.getDay())
          key = firstDay.toISOString().split("T")[0]
        } else if (period === "monthly") {
          key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0")
        }
      }
      
      if (!byPeriod[key]) byPeriod[key] = { revenue: 0, count: 0 }
      if (txn.Status === "Paid") byPeriod[key].revenue += txn.Amount || 0
      byPeriod[key].count += 1
    })
    
    const keys = Object.keys(byPeriod).sort()
    
    // Format labels for better readability
    const formattedLabels = keys.map(periodKey => {
      if (period === "daily") {
        const date = new Date(periodKey)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (period === "weekly") {
        const date = new Date(periodKey)
        const endDate = new Date(date)
        endDate.setDate(date.getDate() + 6)
        return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      } else {
        const [year, month] = periodKey.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1)
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }
    })
    
    return {
      labels: formattedLabels,
      datasets: [
        {
          label: "Revenue",
          data: keys.map(k => byPeriod[k].revenue),
          borderColor: "#B3FF13",
          backgroundColor: "rgba(179, 255, 19, 0.2)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          yAxisID: "y",
          pointBackgroundColor: "#B3FF13",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 10,
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: "#B3FF13",
        },
        {
          label: "Transactions",
          data: keys.map(k => byPeriod[k].count),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          yAxisID: "y1",
          pointBackgroundColor: "#3B82F6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: "#3B82F6",
        },
      ],
    }
  }, [filteredTxns, period])

  // Table: group by period
  const txnsByPeriod = useMemo(() => {
    const map: Record<string, any[]> = {}
    filteredTxns.forEach(txn => {
      let key = ""
      const date = new Date(txn.UpdatedAt)
      if (isNaN(date.getTime())) return // skip invalid dates
      if (period === "daily") {
        key = date.toISOString().split("T")[0]
      } else if (period === "weekly") {
        const firstDay = new Date(date)
        firstDay.setDate(date.getDate() - date.getDay())
        key = firstDay.toISOString().split("T")[0]
      } else if (period === "monthly") {
        key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0")
      }
      if (!map[key]) map[key] = []
      map[key].push(txn)
    })
    return Object.entries(map).map(([periodKey, txns]) => ({ periodKey, txns }))
  }, [filteredTxns, period])

  // Unique subscriptions and statuses for filters
  const subscriptions = useMemo(() => Array.from(new Set(transactions.map(t => t.Subscription))).filter(Boolean), [transactions])
  const statuses = useMemo(() => Array.from(new Set(transactions.map(t => t.Status))).filter(Boolean), [transactions])

  // Chart options (memoized to prevent unnecessary re-renders)
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        display: true,
        position: 'top' as const,
        labels: {
          color: '#ffffff',
          font: {
            size: 14,
            weight: 'bold' as const
          },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#B3FF13',
        bodyColor: '#ffffff',
        borderColor: '#B3FF13',
        borderWidth: 1,
        titleFont: {
          size: 16,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 14
        },
        callbacks: {
          title: function(context: any) {
            return `Period: ${context[0].label}`
          },
          label: function(context: any) {
            if (context.datasetIndex === 0) {
              return `Revenue: Rs ${context.parsed.y.toLocaleString()}`
            } else {
              return `Transactions: ${context.parsed.y}`
            }
          }
        }
      }
    },
    scales: {
      y: {
        type: "linear" as const,
        beginAtZero: true,
        title: { 
          display: true, 
          text: "Revenue (Rs)",
          color: '#B3FF13',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        },
        position: "left" as const,
        grid: { 
          color: "rgba(255,255,255,0.1)",
          drawBorder: true,
          borderColor: "rgba(255,255,255,0.3)"
        },
        ticks: { 
          color: "#B3FF13",
          font: {
            size: 12
          },
          callback: function(value: any) {
            return `Rs ${value.toLocaleString()}`
          }
        },
        border: {
          color: "rgba(255,255,255,0.3)"
        }
      },
      y1: {
        type: "linear" as const,
        beginAtZero: true,
        title: { 
          display: true, 
          text: "Number of Transactions",
          color: '#3B82F6',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        },
        position: "right" as const,
        grid: { 
          drawOnChartArea: false,
          color: "rgba(255,255,255,0.05)"
        },
        ticks: { 
          color: "#3B82F6",
          font: {
            size: 12
          },
          stepSize: 1,
          callback: function(value: any) {
            return Math.floor(value) === value ? value : ''
          }
        },
        border: {
          color: "rgba(255,255,255,0.3)"
        }
      },
      x: {
        title: {
          display: true,
          text: "Time Period",
          color: '#ffffff',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        },
        grid: { 
          color: "rgba(255,255,255,0.1)",
          drawBorder: true,
          borderColor: "rgba(255,255,255,0.3)"
        },
        ticks: { 
          color: "#ffffff",
          font: {
            size: 12
          },
          maxRotation: 45,
          minRotation: 0
        },
        border: {
          color: "rgba(255,255,255,0.3)"
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    },
    elements: {
      point: {
        hoverRadius: 10
      }
    }
  }), [period])

  // Auth loading: show skeletons only
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><CreditCard size={32} /> Transactions Analytics</h1>
            <p className="text-gray-400">Detailed analytics of all transactions and revenue</p>
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
  if (!user) return null

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><CreditCard size={32} /> Transactions Analytics</h1>
          <p className="text-gray-400">Detailed analytics of all transactions and revenue</p>
        </div>
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 flex items-center gap-4">
            <DollarSign size={32} className="text-[#B3FF13]" />
            <div>
              <div className="text-gray-400 text-sm">Total Revenue</div>
              <div className="text-2xl font-bold text-white">{loading ? <Skeleton className="h-8 w-24" /> : `Rs ${summary.totalRevenue.toLocaleString()}`}</div>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 flex items-center gap-4">
            <CreditCard size={32} className="text-[#B3FF13]" />
            <div>
              <div className="text-gray-400 text-sm">Total Transactions</div>
              <div className="text-2xl font-bold text-white">{loading ? <Skeleton className="h-8 w-16" /> : summary.totalTxns}</div>
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
            <label className="block text-gray-400 text-sm mb-1">Subscription</label>
            <select
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white"
              value={filter.subscription}
              onChange={e => setFilter(f => ({ ...f, subscription: e.target.value }))}
            >
              <option value="">All</option>
              {subscriptions.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Status</label>
            <select
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white"
              value={filter.status}
              onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            >
              <option value="">All</option>
              {statuses.map(status => <option key={status} value={status}>{status}</option>)}
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
            onClick={() => setFilter({ user: "", subscription: "", status: "", start: "", end: "" })}
          >
            <Search size={18} /> Reset Filters
          </button>
        </div>
        {/* Period Toggle */}
        <div className="flex gap-2 mb-4">
          {PERIODS.map(p => (
            <button
              key={p}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${period === p ? "bg-[#B3FF13] text-black" : "bg-gray-900 text-white border border-gray-800 hover:bg-gray-800"}`}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        {/* Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Revenue & Transactions Over Time</h2>
          <div className="h-80">
            {loading ? <Skeleton className="h-80 w-full" /> : <Line data={chartData} options={chartOptions} />}
          </div>
        </div>
        
        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">{period.charAt(0).toUpperCase() + period.slice(1)} Transactions</h2>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : txnsByPeriod.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No transactions found for the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="py-2 px-4">Period</th>
                    <th className="py-2 px-4">User</th>
                    <th className="py-2 px-4">Subscription</th>
                    <th className="py-2 px-4">Amount</th>
                    <th className="py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txnsByPeriod.map(({ periodKey, txns }) => (
                    <TxnRow key={periodKey} periodKey={periodKey} txns={txns} userMap={userMap} loading={loading} />
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

function TxnRow({ periodKey, txns, userMap, loading }: { periodKey: string, txns: any[], userMap: Record<string, any>, loading: boolean }) {
  if (loading) return null
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr
        className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <td className="py-2 px-4 font-semibold text-white flex items-center gap-2">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {periodKey}
        </td>
        <td className="py-2 px-4 text-[#B3FF13] font-bold">{txns.length}</td>
        <td className="py-2 px-4 text-white">-</td>
        <td className="py-2 px-4 text-white">-</td>
        <td className="py-2 px-4 text-white">-</td>
      </tr>
      {open && txns.map(txn => (
        <tr key={txn.transactionId} className="bg-gray-950 border-b border-gray-800">
          <td className="py-1 px-4" />
          <td className="py-1 px-4">{userMap[txn.UserId]?.Name || txn.UserId}</td>
          <td className="py-1 px-4">{txn.Subscription}</td>
          <td className="py-1 px-4">Rs {txn.Amount}</td>
          <td className="py-1 px-4">{txn.Status}</td>
        </tr>
      ))}
    </>
  )
} 