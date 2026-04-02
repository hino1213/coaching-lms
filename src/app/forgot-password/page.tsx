'use client'
import { useState, useEffect, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function ForgotPasswordContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'expired') {
      setError('ãªã³ã¯ã®æå¹æéãåãã¦ãã¾ããããä¸åº¦ãªã»ããã¡ã¼ã«ãéä¿¡ãã¦ãã ããã')
    }
  }, [searchParams])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/callback?next=/reset-password',
    })
    if (error) {
      setError('ã¡ã¼ã«ã®éä¿¡ã«å¤±æãã¾ãããã¡ã¼ã«ã¢ãã¬ã¹ãç¢ºèªãã¦ãã ããã')
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">ãã¹ã¯ã¼ãã®ãªã»ãã</h1>
          <p className="text-gray-500 text-sm mt-1">ç»é²æ¸ã¿ã®ã¡ã¼ã«ã¢ãã¬ã¹ãå¥åãã¦ãã ãã</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-700 text-sm">ãã¹ã¯ã¼ããªã»ããç¨ã®ã¡ã¼ã«ãéä¿¡ãã¾ããã<br/>ã¡ã¼ã«ã®ãªã³ã¯ãããã¹ã¯ã¼ããåè¨­å®ãã¦ãã ããã</p>
            </div>
            <Link href="/login" className="text-sm text-blue-600 hover:underline">ã­ã°ã¤ã³ç»é¢ã«æ»ã</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ã¡ã¼ã«ã¢ãã¬ã¹</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'éä¿¡ä¸­...' : 'ãªã»ããã¡ã¼ã«ãéä¿¡'}
            </button>
            <div className="text-center">
              <Link href="/login" className="text-sm text-gray-500 hover:underline">ã­ã°ã¤ã³ç»é¢ã«æ»ã</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
