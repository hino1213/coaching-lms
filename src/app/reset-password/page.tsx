'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

    useEffect(() => {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                  if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                            setReady(true)
                  }
          })

          supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session) setReady(true)
          })

          const timer = setTimeout(() => {
                  router.push('/forgot-password?error=expired')
          }, 5000)

          return () => {
                  subscription.unsubscribe()
                  clearTimeout(timer)
          }
    }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('パスワードが一致しません。')
      return
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください。')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('パスワードの更新に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    // Success - redirect to login
    router.push('/login')
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white text-2xl font-bold mb-4">
            C
          </div>
          <h1 className="text-2xl font-bold text-gray-900">新しいパスワードを設定</h1>
          <p className="text-gray-500 mt-2">
            新しいパスワードを入力してください
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                placeholder="6文字以上で入力"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード確認
              </label>
              <input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                placeholder="もう一度入力"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '更新中...' : 'パスワードを更新'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            ログインページに戻る
          </a>
        </p>
      </div>
    </div>
  )
}
