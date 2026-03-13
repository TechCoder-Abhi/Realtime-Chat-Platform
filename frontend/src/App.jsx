import { useEffect, useRef, useState } from 'react'
import { connectWS } from './ws'

// Avatar color palette — deterministic per username
const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#01CBC6', '#10AC84',
  '#EE5A24', '#009432', '#0652DD', '#9980FA', '#FDA7DF',
]

function getAvatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// eslint-disable-next-line react/prop-types
function Avatar({ name = '', size = 'md' }) {
  const sizes = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' }
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 uppercase ${sizes[size]}`}
      style={{ backgroundColor: getAvatarColor(name) }}>
      {name.charAt(0)}
    </div>
  )
}

function SendIcon() {
  return (
    <svg className="w-5 h-5 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  )
}

export default function App() {
  const timer = useRef(null)
  const socket = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const [userName, setUserName] = useState('')
  const [showNamePopup, setShowNamePopup] = useState(true)
  const [inputName, setInputName] = useState('')
  const [typers, setTypers] = useState([])
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [onlineUsers, setOnlineUsers] = useState([])
  const [connected, setConnected] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  // AUTO-SCROLL on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // SOCKET SETUP
  useEffect(() => {
    socket.current = connectWS()

    socket.current.on('connect', () => setConnected(true))
    socket.current.on('disconnect', () => setConnected(false))

    socket.current.on('userJoined', (name) => {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), type: 'system',
        text: `${name} joined the chat`, ts: Date.now(),
      }])
    })

    socket.current.on('userLeft', (name) => {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), type: 'system',
        text: `${name} left the chat`, ts: Date.now(),
      }])
    })

    socket.current.on('onlineUsers', (users) => setOnlineUsers(users))

    socket.current.on('chatMessage', (msg) => {
      setMessages((prev) => [...prev, msg])
    })

    socket.current.on('typing', (name) => {
      setTypers((prev) => prev.includes(name) ? prev : [...prev, name])
    })

    socket.current.on('stopTyping', (name) => {
      setTypers((prev) => prev.filter((t) => t !== name))
    })

    return () => {
      ['connect', 'disconnect', 'userJoined', 'userLeft', 'onlineUsers',
        'chatMessage', 'typing', 'stopTyping'].forEach((e) => socket.current.off(e))
      socket.current.disconnect()
    }
  }, [])

  // TYPING INDICATOR
  useEffect(() => {
    if (!userName) return
    if (text) {
      socket.current.emit('typing', userName)
      clearTimeout(timer.current)
    }
    timer.current = setTimeout(() => socket.current.emit('stopTyping', userName), 1000)
    return () => clearTimeout(timer.current)
  }, [text, userName])

  function formatTime(ts) {
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  function handleNameSubmit(e) {
    e.preventDefault()
    const trimmed = inputName.trim()
    if (!trimmed) return
    socket.current.emit('joinRoom', trimmed)
    setUserName(trimmed)
    setShowNamePopup(false)
  }

  function sendMessage() {
    const t = text.trim()
    if (!t) return
    const msg = { id: crypto.randomUUID(), sender: userName, text: t, ts: Date.now() }
    setMessages((m) => [...m, msg])
    socket.current.emit('chatMessage', msg)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleTextChange(e) {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div className="h-screen flex flex-col bg-[#111B21] overflow-hidden">

      {/* ── NAME ENTRY POPUP ───────────────────────────────────────── */}
      {showNamePopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#202C33] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 border border-[#2A3942]">
            <div className="flex items-center gap-3 mb-7">
              <div className="h-12 w-12 rounded-full bg-[#00A884] flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Join Group Chat</h1>
                <p className="text-xs text-[#8696A0]">Real-time messaging</p>
              </div>
            </div>
            <form onSubmit={handleNameSubmit}>
              <label className="block text-xs font-semibold text-[#8696A0] mb-2 uppercase tracking-wider">
                Your Name
              </label>
              <input
                autoFocus
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                maxLength={30}
                className="w-full bg-[#2A3942] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00A884] placeholder-[#8696A0] text-sm"
                placeholder="e.g. John Doe"
              />
              <div className="flex items-center justify-between mt-2 mb-6">
                <span className="text-xs text-[#8696A0]">{inputName.length}/30</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-[#00A884]' : 'bg-yellow-400'}`} />
                  <span className="text-xs text-[#8696A0]">{connected ? 'Server connected' : 'Connecting...'}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={!inputName.trim()}
                className="w-full py-3 rounded-xl bg-[#00A884] text-white font-semibold text-sm
                  disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#017561] transition-colors cursor-pointer">
                Start Chatting
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ───────────────────────────────────────────── */}
      {!showNamePopup && (
        <div className="flex-1 flex overflow-hidden">

          {/* SIDEBAR — Online Users */}
          {showSidebar && (
            <div className="w-64 xl:w-72 flex-shrink-0 flex flex-col bg-[#111B21] border-r border-[#2A3942]">
              <div className="px-4 py-4 bg-[#202C33] border-b border-[#2A3942]">
                <p className="text-white font-semibold text-sm">Members</p>
                <p className="text-[#00A884] text-xs font-medium mt-0.5">
                  {onlineUsers.length} online
                </p>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {onlineUsers.map((user) => (
                  <div key={user} className="flex items-center gap-3 px-4 py-3 hover:bg-[#182229] transition-colors">
                    <div className="relative">
                      <Avatar name={user} size="md" />
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-[#00A884] border-2 border-[#111B21] rounded-full" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${user === userName ? 'text-[#00A884]' : 'text-[#E9EDEF]'}`}>
                        {user}
                      </p>
                      <p className="text-xs text-[#8696A0]">
                        {user === userName ? 'You' : 'Active now'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHAT PANEL */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* HEADER */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#202C33] border-b border-[#2A3942] flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-[#00A884] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                G
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Group Chat</p>
                <p className="text-xs truncate">
                  {typers.length > 0
                    ? <span className="text-[#00A884]">{typers.join(', ')} typing...</span>
                    : <span className="text-[#8696A0]">{onlineUsers.length} member{onlineUsers.length !== 1 ? 's' : ''} online</span>
                  }
                </p>
              </div>
              {/* Controls */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full transition-colors ${connected ? 'bg-[#00A884]' : 'bg-red-400'}`} />
                  <span className="text-xs text-[#8696A0] hidden sm:block">
                    {connected ? 'Connected' : 'Reconnecting...'}
                  </span>
                </div>
                <button
                  onClick={() => setShowSidebar((s) => !s)}
                  title="Toggle members list"
                  className="p-2 rounded-full hover:bg-[#2A3942] text-[#8696A0] hover:text-white transition-colors cursor-pointer">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
                <Avatar name={userName} size="sm" />
              </div>
            </div>

            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#0B141A]">

              {/* EMPTY STATE */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center select-none">
                  <div className="h-16 w-16 rounded-full bg-[#202C33] flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-[#8696A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-[#8696A0] text-sm font-medium">No messages yet</p>
                  <p className="text-[#8696A0] text-xs mt-1">Be the first to say something!</p>
                </div>
              )}

              {/* MESSAGE LIST */}
              <div className="space-y-1">
                {messages.map((m) => {
                  // SYSTEM MESSAGE
                  if (m.type === 'system') {
                    return (
                      <div key={m.id} className="flex justify-center my-4">
                        <span className="bg-[#182229] text-[#8696A0] text-xs px-4 py-1.5 rounded-full border border-[#2A3942]">
                          {m.text} · {formatTime(m.ts)}
                        </span>
                      </div>
                    )
                  }

                  // CHAT MESSAGE
                  const mine = m.sender === userName
                  return (
                    <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {!mine && <Avatar name={m.sender} size="xs" />}
                      <div className={`max-w-[70%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                        {!mine && (
                          <span className="text-xs font-semibold mb-1 ml-1" style={{ color: getAvatarColor(m.sender) }}>
                            {m.sender}
                          </span>
                        )}
                        <div className={`px-3 pt-2 pb-1.5 rounded-2xl text-sm leading-relaxed shadow
                          ${mine
                            ? 'bg-[#005C4B] text-white rounded-tr-none'
                            : 'bg-[#202C33] text-[#E9EDEF] rounded-tl-none'
                          }`}>
                          <p className="break-words whitespace-pre-wrap">{m.text}</p>
                          <p className={`text-[10px] mt-0.5 text-right ${mine ? 'text-[#8EDBB5]' : 'text-[#8696A0]'}`}>
                            {formatTime(m.ts)}
                          </p>
                        </div>
                      </div>
                      {mine && <Avatar name={m.sender} size="xs" />}
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* INPUT BAR */}
            <div className="px-4 py-3 bg-[#202C33] border-t border-[#2A3942] flex-shrink-0">
              <div className="flex items-end gap-3">
                <div className="flex-1 bg-[#2A3942] rounded-2xl px-4 py-2.5 flex items-end">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="w-full bg-transparent text-[#E9EDEF] text-sm outline-none resize-none placeholder-[#8696A0] leading-relaxed max-h-[120px]"
                    style={{ height: 'auto' }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!text.trim()}
                  className="h-11 w-11 rounded-full bg-[#00A884] text-white flex items-center justify-center flex-shrink-0
                    disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#017561] transition-colors cursor-pointer">
                  <SendIcon />
                </button>
              </div>
              <p className="text-[10px] text-[#8696A0] mt-1.5 ml-1">
                Press <kbd className="bg-[#2A3942] px-1 py-0.5 rounded text-[#E9EDEF]">Enter</kbd> to send ·{' '}
                <kbd className="bg-[#2A3942] px-1 py-0.5 rounded text-[#E9EDEF]">Shift+Enter</kbd> for new line
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
