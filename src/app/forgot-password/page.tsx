'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'expired') {
      setError('リンクの有効期限が切れています。もう一度リセットメールを送信してください。')
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
      setError('メールの送信に失敗しました。メールアドレスを確認してください。')
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
          <h1 className="text-2xl font-bold text-gray-800">パスワードのリセット</h1>
          <p className="text-gray-500 text-sm mt-1">登録済みのメールアドレスを入力してください</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-700 text-sm">パスワードリセット用のメールを送信しました。<br/>メールのリンクからパスワードを再設定してください。</p>
            </div>
            <Link href="/login" className="text-sm text-blue-600 hover:underline">ログイン画面に戻る</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
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
              {loading ? '送信中...' : 'リセットメールを送信'}
            </button>
            <div className="text-center">
              <Link href="/login" className="text-sm text-gray-500 hover:underline">ログイン画面に戻る</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
