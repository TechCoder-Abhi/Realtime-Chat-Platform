import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from './lib/api'
import { AVATAR_OPTIONS } from './lib/avatarOptions'
import { useAuthStore } from './store/authStore'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    setBusy(true)

    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        ...(mode === 'register' ? { name: form.name.trim(), avatarUrl: selectedAvatar } : {}),
      }

      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login'
      const res = await apiRequest(endpoint, { method: 'POST', body: payload })

      setAuth(res.data)
      navigate('/chat', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-screen bg-[#0b141a] auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-[#ffffff] rounded-2xl shadow-2xl p-8 border border-[#d9dbdf]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-[#25d366] mb-4">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#111b21] mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
            </h1>
            <p className="text-sm text-[#667781]">Secure realtime group chat</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-[#8696A0] mb-2 uppercase">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={30}
                  placeholder="Your name"
                  className="w-full bg-[#f0f2f5] text-[#111b21] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#25d366] placeholder-[#667781] text-sm"
                />

                <div className="mt-3">
                  <p className="block text-xs font-semibold text-[#667781] mb-2 uppercase">Pick Avatar</p>
                  <div className="grid grid-cols-4 gap-2">
                    {AVATAR_OPTIONS.map((avatar) => (
                      <button
                        type="button"
                        key={avatar}
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`rounded-full p-0.5 border-2 transition ${selectedAvatar === avatar ? 'border-[#25d366]' : 'border-transparent hover:border-[#b6e7c7]'}`}>
                        <img src={avatar} alt="avatar option" className="h-11 w-11 rounded-full" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#8696A0] mb-2 uppercase">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
                className="w-full bg-[#f0f2f5] text-[#111b21] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#25d366] placeholder-[#667781] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8696A0] mb-2 uppercase">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min 6 characters"
                className="w-full bg-[#f0f2f5] text-[#111b21] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#25d366] placeholder-[#667781] text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-300 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-lg bg-[#25d366] text-[#08240f] font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1fbe5b] transition-colors cursor-pointer">
              {busy ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#d9dbdf]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[#ffffff] text-[#667781]">or</span>
            </div>
          </div>

          <button
            onClick={() => {
              setMode((m) => (m === 'login' ? 'register' : 'login'))
              setError('')
            }}
            className="w-full text-sm text-[#0b846f] hover:text-[#075e54] transition-colors">
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>
        </div>

        <p className="text-center text-[#d7e0e3] text-xs mt-8">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}
