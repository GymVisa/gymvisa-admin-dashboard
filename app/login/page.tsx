"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import { Eye, EyeOff } from "lucide-react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { user, signIn, loading: authLoading, initialized } = useAuth()

  useEffect(() => {
    if (initialized && user) {
      router.push("/")
    }
  }, [user, initialized, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (email !== "gymvisaa@gmail.com") {
      setError("Unauthorized email address")
      return
    }

    setLoading(true)
    setError("")

    try {
      await signIn(email, password)
      // Navigation will happen automatically via useEffect
    } catch (error: any) {
      console.error("Login error:", error)
      setError("Invalid credentials. Please check your password.")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !initialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#B3FF13] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-[#B3FF13] text-xl font-semibold">Initializing Firebase...</div>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black"></div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#B3FF13] mb-2">Gym Visa Admin</h1>
          <p className="text-gray-400">Sign in to access the admin panel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none transition-colors"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-[#B3FF13] focus:outline-none transition-colors pr-12"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#B3FF13] text-black font-semibold py-3 rounded-lg hover:bg-[#9FE611] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">Authorized access only</p>
        </div>
      </div>
    </div>
  )
}
