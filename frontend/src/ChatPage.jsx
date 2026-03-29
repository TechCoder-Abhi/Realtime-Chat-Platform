import { useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { requestWithRefresh } from './lib/api'
import { useAuthStore } from './store/authStore'
import { connectWS } from './ws'

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

function formatTime(ts) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// eslint-disable-next-line react/prop-types
function Avatar({ name = '', size = 'md' }) {
  const sizes = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm' }
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

export default function ChatPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const socketRef = useRef(null)
  const typingTimerRef = useRef(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const activeRoomRef = useRef('')

  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const [connected, setConnected] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)
  const [roomFilter, setRoomFilter] = useState('')
  const [search, setSearch] = useState('')
  const [text, setText] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [directEmail, setDirectEmail] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomType, setNewRoomType] = useState('public')
  const [typers, setTypers] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [pending, setPending] = useState([])
  const [files, setFiles] = useState([])
  const [busySend, setBusySend] = useState(false)
  const [copiedCode, setCopiedCode] = useState('')
  const [unreadByRoom, setUnreadByRoom] = useState({})
  const [joinError, setJoinError] = useState('')
  const [roomError, setRoomError] = useState('')
  const [directError, setDirectError] = useState('')

  const roomsQuery = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await requestWithRefresh('/api/rooms')
      return res.data.rooms
    },
  })

  const selectedRoom = useMemo(
    () => (roomsQuery.data || []).find((room) => room.id === selectedRoomId) || null,
    [roomsQuery.data, selectedRoomId]
  )

  const filteredRooms = useMemo(() => {
    const needle = roomFilter.trim().toLowerCase()
    if (!needle) return roomsQuery.data || []

    return (roomsQuery.data || []).filter((room) => {
      return room.name.toLowerCase().includes(needle) || room.type.toLowerCase().includes(needle)
    })
  }, [roomFilter, roomsQuery.data])

  useEffect(() => {
    if (!selectedRoomId && roomsQuery.data?.length) {
      setSelectedRoomId(roomsQuery.data[0].id)
    }
  }, [selectedRoomId, roomsQuery.data])

  const messagesQuery = useInfiniteQuery({
    queryKey: ['messages', selectedRoomId, search],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' })
      if (pageParam) params.set('before', pageParam)
      if (search.trim()) params.set('q', search.trim())
      const res = await requestWithRefresh(`/api/rooms/${selectedRoomId}/messages?${params.toString()}`)
      return res
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor || undefined,
    enabled: Boolean(selectedRoomId),
  })

  const persistedMessages = useMemo(() => {
    return (messagesQuery.data?.pages || [])
      .slice()
      .reverse()
      .flatMap((page) => page.data.messages)
  }, [messagesQuery.data?.pages])

  const messages = useMemo(() => [...persistedMessages, ...pending], [persistedMessages, pending])

  useEffect(() => {
    if (!selectedRoomId) return
    setUnreadByRoom((prev) => {
      if (!prev[selectedRoomId]) return prev
      const next = { ...prev }
      delete next[selectedRoomId]
      return next
    })
  }, [selectedRoomId])

  useEffect(() => {
    activeRoomRef.current = selectedRoomId
  }, [selectedRoomId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (!accessToken) return

    const socket = connectWS(accessToken)
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('onlineUsers', (payload) => {
      if (payload.roomId === activeRoomRef.current) {
        setOnlineUsers(payload.users || [])
      }
    })

    socket.on('typing', ({ roomId, name }) => {
      if (roomId !== activeRoomRef.current || name === user?.name) return
      setTypers((prev) => (prev.includes(name) ? prev : [...prev, name]))
    })

    socket.on('stopTyping', ({ roomId, name }) => {
      if (roomId !== activeRoomRef.current) return
      setTypers((prev) => prev.filter((entry) => entry !== name))
    })

    socket.on('chatMessage', (message) => {
      if (message.roomId !== activeRoomRef.current) {
        setUnreadByRoom((prev) => ({
          ...prev,
          [message.roomId]: (prev[message.roomId] || 0) + 1,
        }))
        return
      }

      if (message.clientId) {
        setPending((prev) => prev.filter((entry) => entry.clientId !== message.clientId))
      }

      queryClient.invalidateQueries({ queryKey: ['messages', message.roomId] })
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('onlineUsers')
      socket.off('typing')
      socket.off('stopTyping')
      socket.off('chatMessage')
      socket.disconnect()
    }
  }, [accessToken, queryClient, user?.name])

  useEffect(() => {
    if (!selectedRoomId || !connected || !socketRef.current) return

    setTypers([])
    socketRef.current.emit('joinRoom', { roomId: selectedRoomId }, (ack) => {
      if (!ack?.ok) {
        setOnlineUsers([])
      }
    })
  }, [selectedRoomId, connected])

  useEffect(() => {
    if (!selectedRoomId || !messages.length) return

    requestWithRefresh(`/api/rooms/${selectedRoomId}/read`, {
      method: 'POST',
      body: {},
    }).catch(() => {})
  }, [selectedRoomId, messages.length])

  useEffect(() => {
    if (!socketRef.current || !selectedRoomId) return

    if (text.trim()) {
      socketRef.current.emit('typing', { roomId: selectedRoomId })
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        socketRef.current?.emit('stopTyping', { roomId: selectedRoomId })
      }, 1000)
    }

    return () => clearTimeout(typingTimerRef.current)
  }, [text, selectedRoomId])

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        await requestWithRefresh('/api/auth/logout', {
          method: 'POST',
          body: { refreshToken },
        })
      }
    },
    onSettled: () => {
      clearAuth()
      navigate('/auth', { replace: true })
    },
  })

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      return requestWithRefresh('/api/rooms', {
        method: 'POST',
        body: { name: newRoomName.trim(), type: newRoomType },
      })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setSelectedRoomId(res.data.room.id)
      setNewRoomName('')
      setRoomError('')
    },
    onError: (error) => setRoomError(error.message),
  })

  const joinRoomMutation = useMutation({
    mutationFn: async () => {
      return requestWithRefresh(`/api/rooms/join/${inviteCode.trim()}`, { method: 'POST' })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setSelectedRoomId(res.data.room.id)
      setInviteCode('')
      setJoinError('')
    },
    onError: (error) => setJoinError(error.message),
  })

  const directRoomMutation = useMutation({
    mutationFn: async () => {
      return requestWithRefresh(`/api/rooms/direct/${encodeURIComponent(directEmail.trim())}`, { method: 'POST' })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setSelectedRoomId(res.data.room.id)
      setDirectEmail('')
      setDirectError('')
    },
    onError: (error) => setDirectError(error.message),
  })

  async function uploadAttachments(roomId, selectedFiles) {
    const attachmentIds = []

    for (const file of selectedFiles) {
      const form = new FormData()
      form.append('file', file)
      const res = await requestWithRefresh(`/api/rooms/${roomId}/attachments`, {
        method: 'POST',
        body: form,
      })
      attachmentIds.push(res.data.attachment.id)
    }

    return attachmentIds
  }

  async function sendMessage() {
    const trimmed = text.trim()
    if ((!trimmed && files.length === 0) || !selectedRoomId || !socketRef.current) return

    setBusySend(true)
    try {
      const attachmentIds = await uploadAttachments(selectedRoomId, files)
      const clientId = crypto.randomUUID()
      const optimistic = {
        id: clientId,
        clientId,
        sender: user?.name || 'You',
        senderId: user?.id,
        text: trimmed,
        createdAt: Date.now(),
        roomId: selectedRoomId,
        attachments: files.map((file) => ({
          id: `temp-${file.name}-${file.size}`,
          fileName: file.name,
          size: file.size,
          url: '',
          mimeType: file.type,
        })),
        optimistic: true,
      }

      setPending((prev) => [...prev, optimistic])

      socketRef.current.emit(
        'chatMessage',
        { roomId: selectedRoomId, text: trimmed, attachmentIds, clientId },
        (ack) => {
          if (!ack?.ok) {
            setPending((prev) => prev.filter((entry) => entry.clientId !== clientId))
          }
        }
      )

      setText('')
      setFiles([])
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } finally {
      setBusySend(false)
    }
  }

  function onComposerKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  function onComposerChange(event) {
    setText(event.target.value)
    event.target.style.height = 'auto'
    event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`
  }

  async function copyInviteCode(code) {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(''), 1500)
    } catch {
      setCopiedCode('Failed')
      setTimeout(() => setCopiedCode(''), 1500)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#111B21] animate-panel-in">
      {showSidebar && (
        <aside className="w-80 flex-shrink-0 flex flex-col bg-[#111B21] border-r border-[#2A3942] animate-panel-in">
          <div className="px-4 py-4 glass-surface border-b border-[#2A3942]">
            <p className="text-white font-semibold text-sm">Rooms</p>
            <p className="text-[#00A884] text-xs font-medium mt-0.5">{roomsQuery.data?.length || 0} joined</p>
          </div>

          <div className="p-3 space-y-3 border-b border-[#2A3942]">
            <div className="flex gap-2">
              <input
                value={newRoomName}
                onChange={(event) => setNewRoomName(event.target.value)}
                placeholder="Create room"
                className="flex-1 bg-[#2A3942] text-[#E9EDEF] text-sm rounded-lg px-3 py-2 outline-none placeholder-[#8696A0]"
              />
              <select
                value={newRoomType}
                onChange={(event) => setNewRoomType(event.target.value)}
                className="bg-[#2A3942] text-[#E9EDEF] text-sm rounded-lg px-2 py-2 outline-none">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <button
                onClick={() => createRoomMutation.mutate()}
                disabled={!newRoomName.trim() || createRoomMutation.isPending}
                className="px-3 text-xs rounded-lg bg-[#00A884] text-white disabled:opacity-50 hover-lift">
                New
              </button>
            </div>
            {roomError && <p className="text-red-300 text-xs">{roomError}</p>}

            <div className="flex gap-2">
              <input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="Join with invite"
                className="flex-1 bg-[#2A3942] text-[#E9EDEF] text-sm rounded-lg px-3 py-2 outline-none placeholder-[#8696A0]"
              />
              <button
                onClick={() => joinRoomMutation.mutate()}
                disabled={!inviteCode.trim() || joinRoomMutation.isPending}
                className="px-3 text-xs rounded-lg bg-[#005C4B] text-white disabled:opacity-50 hover-lift">
                Join
              </button>
            </div>
            {joinError && <p className="text-red-300 text-xs">{joinError}</p>}

            <div className="flex gap-2">
              <input
                value={directEmail}
                onChange={(event) => setDirectEmail(event.target.value)}
                placeholder="Start 1-to-1 by email"
                className="flex-1 bg-[#2A3942] text-[#E9EDEF] text-sm rounded-lg px-3 py-2 outline-none placeholder-[#8696A0]"
              />
              <button
                onClick={() => directRoomMutation.mutate()}
                disabled={!directEmail.trim() || directRoomMutation.isPending}
                className="px-3 text-xs rounded-lg bg-[#0B5D84] text-white disabled:opacity-50 hover-lift">
                DM
              </button>
            </div>
            {directError && <p className="text-red-300 text-xs">{directError}</p>}

            <div className="flex gap-2">
              <input
                value={roomFilter}
                onChange={(event) => setRoomFilter(event.target.value)}
                placeholder="Search room"
                className="flex-1 bg-[#2A3942] text-[#E9EDEF] text-sm rounded-lg px-3 py-2 outline-none placeholder-[#8696A0]"
              />
              <button
                onClick={() => setRoomFilter('')}
                disabled={!roomFilter}
                className="px-3 text-xs rounded-lg bg-[#2A3942] text-[#D7E4EA] disabled:opacity-40">
                Clear filter
              </button>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search messages"
              className="w-full bg-[#2A3942] text-[#E9EDEF] text-sm rounded-lg px-3 py-2 outline-none placeholder-[#8696A0]"
            />
            <div className="flex justify-end">
              <button
                onClick={() => setSearch('')}
                disabled={!search.trim()}
                className="text-xs text-[#9ecbbf] disabled:opacity-40 hover:text-white transition-colors">
                Clear search
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className={`w-full text-left px-4 py-3 border-b border-[#1A262D] transition-colors ${selectedRoomId === room.id ? 'bg-[#182229]' : 'hover:bg-[#182229]'}`}>
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setSelectedRoomId(room.id)} className="text-left min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#E9EDEF] truncate">{room.name}</p>
                    <p className="text-xs text-[#8696A0]">{room.type} • invite: {room.inviteCode || 'n/a'}</p>
                  </button>

                  <div className="flex items-center gap-2">
                    {(unreadByRoom[room.id] || 0) > 0 && (
                      <span className="min-w-5 h-5 px-1 rounded-full bg-[#00A884] text-[#08241d] text-[10px] font-bold flex items-center justify-center">
                        {unreadByRoom[room.id] > 99 ? '99+' : unreadByRoom[room.id]}
                      </span>
                    )}
                    {room.inviteCode && (
                      <button
                        onClick={() => copyInviteCode(room.inviteCode)}
                        className="text-[10px] px-2 py-1 rounded bg-[#2A3942] text-[#C8E8DE] hover:text-white">
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-4 py-3 glass-surface border-b border-[#2A3942] flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-[#00A884] flex items-center justify-center text-white font-bold text-lg">R</div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{selectedRoom?.name || 'Room'}</p>
            <p className="text-xs truncate">
              {typers.length > 0
                ? <span className="text-[#00A884]">{typers.join(', ')} typing...</span>
                : <span className="text-[#8696A0]">{onlineUsers.length} online</span>}
            </p>
            {selectedRoom?.inviteCode && (
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-[10px] text-[#7fa0af]">Invite: {selectedRoom.inviteCode}</span>
                <button
                  onClick={() => copyInviteCode(selectedRoom.inviteCode)}
                  className="text-[10px] text-[#9ecbbf] hover:text-white underline underline-offset-2">
                  Copy code
                </button>
                {copiedCode === selectedRoom.inviteCode && (
                  <span className="text-[10px] text-[#00A884]">Copied</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-[#00A884] animate-glow-pulse' : 'bg-red-400'}`} />
              <span className="text-xs text-[#8696A0] hidden sm:block">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <button
              onClick={() => setShowSidebar((value) => !value)}
              className="p-2 rounded-full hover:bg-[#2A3942] text-[#8696A0] hover:text-white">
              ☰
            </button>
            <button
              onClick={() => logoutMutation.mutate()}
              className="text-xs text-[#9ecbbf] hover:text-white px-3 py-1 rounded hover:bg-[#2A3942]">
              Logout
            </button>
            <Avatar name={user?.name || ''} size="sm" />
          </div>
        </header>

        <section className="flex-1 overflow-y-auto px-4 py-4 bg-[#0B141A]">
          {search.trim() && (
            <div className="mb-3 flex items-center justify-between soft-border glass-surface rounded-lg px-3 py-2 animate-panel-in">
              <p className="text-xs text-[#C6D7DF]">
                Searching in this chat: <span className="font-semibold text-[#9FE1D0]">{search}</span>
              </p>
              <button onClick={() => setSearch('')} className="text-xs text-[#9ecbbf] hover:text-white">
                Clear search
              </button>
            </div>
          )}

          {messagesQuery.hasNextPage && (
            <div className="flex justify-center mb-3">
              <button
                onClick={() => messagesQuery.fetchNextPage()}
                disabled={messagesQuery.isFetchingNextPage}
                className="text-xs px-3 py-1 rounded-full bg-[#202C33] text-[#9ecbbf] hover:text-white disabled:opacity-50">
                {messagesQuery.isFetchingNextPage ? 'Loading...' : 'Load older messages'}
              </button>
            </div>
          )}

          {messagesQuery.isLoading && (
            <div className="space-y-2 animate-pulse">
              <div className="h-10 w-2/3 bg-[#1A262D] rounded-xl" />
              <div className="h-10 w-1/2 bg-[#1A262D] rounded-xl ml-auto" />
              <div className="h-10 w-3/4 bg-[#1A262D] rounded-xl" />
            </div>
          )}

          {messagesQuery.isError && (
            <div className="text-red-300 text-sm bg-red-900/20 border border-red-500/40 rounded-lg p-3">
              Failed to load messages. Try switching room or refresh.
            </div>
          )}

          {!messagesQuery.isLoading && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#8696A0]">
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1">Start chatting in {selectedRoom?.name || 'this room'}.</p>
            </div>
          )}

          <div className="space-y-2">
            {messages.map((message) => {
              const mine = message.senderId === user?.id || message.sender === user?.name
              return (
                <div key={message.id} className={`flex items-end gap-2 animate-message-in ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine && <Avatar name={message.sender} size="xs" />}

                  <div className={`max-w-[72%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    {!mine && (
                      <span className="text-xs font-semibold mb-1 ml-1" style={{ color: getAvatarColor(message.sender) }}>
                        {message.sender}
                      </span>
                    )}

                    <div className={`px-3 pt-2 pb-1.5 rounded-2xl text-sm leading-relaxed shadow ${mine ? 'bg-[#005C4B] text-white rounded-tr-none' : 'bg-[#202C33] text-[#E9EDEF] rounded-tl-none'} ${message.optimistic ? 'opacity-70' : ''}`}>
                      {message.text && <p className="break-words whitespace-pre-wrap">{message.text}</p>}

                      {(message.attachments || []).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment) => (
                            attachment.url ? (
                              <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-xs underline underline-offset-2 opacity-90 hover:opacity-100">
                                {attachment.fileName} ({Math.max(1, Math.round((attachment.size || 0) / 1024))} KB)
                              </a>
                            ) : (
                              <span key={attachment.id} className="block text-xs opacity-90">
                                {attachment.fileName} (uploading...)
                              </span>
                            )
                          ))}
                        </div>
                      )}

                      <p className={`text-[10px] mt-0.5 text-right ${mine ? 'text-[#8EDBB5]' : 'text-[#8696A0]'}`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>

                  {mine && <Avatar name={message.sender} size="xs" />}
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        </section>

        <footer className="px-4 py-3 bg-[#202C33] border-t border-[#2A3942]">
          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <span key={`${file.name}-${index}`} className="bg-[#2A3942] text-[#E9EDEF] text-xs px-2 py-1 rounded-full">
                  {file.name}
                </span>
              ))}
              <button onClick={() => setFiles([])} className="text-xs text-red-300">Clear files</button>
            </div>
          )}

          <div className="flex items-end gap-3">
            <label className="h-11 px-3 rounded-xl bg-[#2A3942] text-[#E9EDEF] text-xs flex items-center cursor-pointer">
              Attach
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => setFiles(Array.from(event.target.files || []))}
              />
            </label>

            <div className="flex-1 bg-[#2A3942] rounded-2xl px-4 py-2.5 flex items-end">
              <textarea
                ref={textareaRef}
                rows={1}
                value={text}
                onChange={onComposerChange}
                onKeyDown={onComposerKeyDown}
                placeholder="Type a message..."
                className="w-full bg-transparent text-[#E9EDEF] text-sm outline-none resize-none placeholder-[#8696A0] leading-relaxed max-h-[120px]"
                style={{ height: 'auto' }}
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={busySend || (!text.trim() && files.length === 0) || !selectedRoomId}
              className="h-11 w-11 rounded-full bg-[#00A884] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#017561] transition-colors hover-lift">
              <SendIcon />
            </button>
          </div>
        </footer>
      </main>
    </div>
  )
}
