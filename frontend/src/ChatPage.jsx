import { useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { requestWithRefresh } from './lib/api'
import { AVATAR_OPTIONS } from './lib/avatarOptions'
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

/**
 * Avatar component to display user profile pictures
 * @param {Object} props
 * @param {string} [props.name=''] - User name for avatar initials
 * @param {string} [props.avatarUrl=''] - URL to avatar image
 * @param {string} [props.size='md'] - Avatar size: 'xs', 'sm', or 'md'
 */
function Avatar({ name = '', avatarUrl = '', size = 'md' }) {
  const sizes = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm' }

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'avatar'}
        className={`rounded-full object-cover flex-shrink-0 ${sizes[size].split(' ').slice(0, 2).join(' ')}`}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 uppercase ${sizes[size]}`}
      style={{ backgroundColor: getAvatarColor(name) }}>
      {name.charAt(0)}
    </div>
  )
}

Avatar.propTypes = {
  name: PropTypes.string,
  avatarUrl: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md']),
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
  const setUser = useAuthStore((s) => s.setUser)
  const theme = useAuthStore((s) => s.theme)
  const setTheme = useAuthStore((s) => s.setTheme)

  const [connected, setConnected] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
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
  const [unreadByRoom, setUnreadByRoom] = useState({})
  const [joinError, setJoinError] = useState('')
  const [roomError, setRoomError] = useState('')
  const [directError, setDirectError] = useState('')
  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [replyToMessage, setReplyToMessage] = useState(null)
  const [editingMessageId, setEditingMessageId] = useState('')
  const [toast, setToast] = useState({ message: '', visible: false })
  const [profileAvatar, setProfileAvatar] = useState(user?.avatarUrl || AVATAR_OPTIONS[0])
  const [profileStatus, setProfileStatus] = useState(user?.status || 'Available')

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

  useEffect(() => {
    setProfileAvatar(user?.avatarUrl || AVATAR_OPTIONS[0])
    setProfileStatus(user?.status || 'Available')
  }, [user?.avatarUrl, user?.status])

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
    // Keep UI in sync if DB changed externally (e.g. direct MongoDB updates).
    refetchInterval: 10000,
  })

  const persistedMessages = useMemo(() => {
    return (messagesQuery.data?.pages || [])
      .slice()
      .reverse()
      .flatMap((page) => page.data.messages)
  }, [messagesQuery.data?.pages])

  const messages = useMemo(() => {
    const pendingForRoom = pending.filter((entry) => entry.roomId === selectedRoomId)
    return [...persistedMessages, ...pendingForRoom]
  }, [persistedMessages, pending, selectedRoomId])

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

    socket.on('lastMessageUpdated', () => {
      // Refetch rooms to update last message display
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('onlineUsers')
      socket.off('typing')
      socket.off('stopTyping')
      socket.off('chatMessage')
      socket.off('lastMessageUpdated')
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

  // Sidebar resize handlers
  useEffect(() => {
    function handleMouseMove(e) {
      if (!isResizing) return
      const newWidth = Math.max(250, Math.min(e.clientX, 500))
      setSidebarWidth(newWidth)
    }

    function handleMouseUp() {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing])

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

  const profileMutation = useMutation({
    mutationFn: async () => {
      return requestWithRefresh('/api/users/me/profile', {
        method: 'PATCH',
        body: {
          avatarUrl: profileAvatar,
          status: profileStatus.trim() || 'Available',
        },
      })
    },
    onSuccess: (res) => {
      setUser(res.data.user)
      setShowProfileEditor(false)
    },
  })

  const clearMessagesMutation = useMutation({
    mutationFn: async () => {
      return requestWithRefresh(`/api/rooms/${selectedRoomId}/messages`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      setPending((prev) => prev.filter((entry) => entry.roomId !== selectedRoomId))
      queryClient.removeQueries({ queryKey: ['messages', selectedRoomId] })
      queryClient.invalidateQueries({ queryKey: ['messages', selectedRoomId] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setShowClearConfirm(false)
    },
  })

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, nextText }) => {
      return requestWithRefresh(`/api/rooms/${selectedRoomId}/messages/${messageId}`, {
        method: 'PATCH',
        body: { text: nextText },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedRoomId] })
      setEditingMessageId('')
      setText('')
    },
  })

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      return requestWithRefresh(`/api/rooms/${selectedRoomId}/messages/${messageId}`, {
        method: 'DELETE',
      })
    },
    onSuccess: (_, messageId) => {
      setPending((prev) => prev.filter((entry) => entry.id !== messageId))
      queryClient.invalidateQueries({ queryKey: ['messages', selectedRoomId] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
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

    if (editingMessageId) {
      await editMessageMutation.mutateAsync({ messageId: editingMessageId, nextText: trimmed })
      return
    }

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
        replyTo: replyToMessage
          ? {
              id: replyToMessage.id,
              text: replyToMessage.text,
              sender: replyToMessage.sender,
              senderId: replyToMessage.senderId,
            }
          : null,
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
        {
          roomId: selectedRoomId,
          text: trimmed,
          attachmentIds,
          clientId,
          replyToId: replyToMessage?.id || undefined,
        },
        (ack) => {
          if (!ack?.ok) {
            setPending((prev) => prev.filter((entry) => entry.clientId !== clientId))
          }
        }
      )

      setText('')
      setFiles([])
      setReplyToMessage(null)
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
      setToast({ message: '✓ Invite code copied!', visible: true })
      setTimeout(() => setToast({ message: '', visible: false }), 2000)
    } catch {
      setToast({ message: '✗ Failed to copy', visible: true })
      setTimeout(() => setToast({ message: '', visible: false }), 2000)
    }
  }

  function startReply(message) {
    setReplyToMessage({
      id: message.id,
      text: message.text || '',
      sender: message.sender,
      senderId: message.senderId,
    })
    setEditingMessageId('')
    textareaRef.current?.focus()
  }

  function startEdit(message) {
    setEditingMessageId(message.id)
    setReplyToMessage(null)
    setText(message.text || '')
    textareaRef.current?.focus()
  }

  return (
    <div className={`h-screen flex overflow-hidden chat-wallpaper animate-panel-in ${theme}`}>
      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed top-4 right-4 z-[100] rounded-lg bg-primary text-white px-4 py-2 text-sm shadow-lg animate-slide-right">
          {toast.message}
        </div>
      )}
      {showSidebar && (
        <>
        <aside className="flex flex-col bg-panel border-r border-primary animate-panel-in overflow-hidden" style={{ width: `${sidebarWidth}px` }}>
          <div className="px-4 py-4 bg-panel border-b border-primary flex-shrink-0">
            <p className="text-xl font-bold text-text">💬 Chats</p>
            <p className="text-primary text-xs font-medium mt-0.5">{roomsQuery.data?.length || 0} joined</p>
          </div>

          <div className="p-3 space-y-3 border-b border-primary flex-shrink-0 overflow-y-auto">
            <div className="flex gap-2">
              <input
                value={newRoomName}
                onChange={(event) => setNewRoomName(event.target.value)}
                placeholder="Create room"
                className="flex-1 input-modern text-sm"
              />
              <select
                value={newRoomType}
                onChange={(event) => setNewRoomType(event.target.value)}
                className="input-modern text-sm">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <button
                onClick={() => createRoomMutation.mutate()}
                disabled={!newRoomName.trim() || createRoomMutation.isPending}
                className="btn-primary text-xs disabled:opacity-50 px-2">
                New
              </button>
            </div>
            {roomError && <p className="text-red-500 text-xs">{roomError}</p>}

            <div className="flex gap-2">
              <input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="Join with code"
                className="flex-1 input-modern text-sm"
              />
              <button
                onClick={() => joinRoomMutation.mutate()}
                disabled={!inviteCode.trim() || joinRoomMutation.isPending}
                className="btn-primary text-xs disabled:opacity-50 px-2 bg-gradient-to-r from-teal-500 to-cyan-500">
                Join
              </button>
            </div>
            {joinError && <p className="text-red-500 text-xs">{joinError}</p>}

            <div className="flex gap-2">
              <input
                value={directEmail}
                onChange={(event) => setDirectEmail(event.target.value)}
                placeholder="Start 1-to-1"
                className="flex-1 input-modern text-sm"
              />
              <button
                onClick={() => directRoomMutation.mutate()}
                disabled={!directEmail.trim() || directRoomMutation.isPending}
                className="btn-primary text-xs disabled:opacity-50 px-2 bg-gradient-to-r from-blue-500 to-indigo-500">
                DM
              </button>
            </div>
            {directError && <p className="text-red-500 text-xs">{directError}</p>}

            <div className="flex gap-2">
              <input
                value={roomFilter}
                onChange={(event) => setRoomFilter(event.target.value)}
                placeholder="Search rooms"
                className="flex-1 input-modern text-sm"
              />
              <button
                onClick={() => setRoomFilter('')}
                disabled={!roomFilter}
                className="btn-secondary text-xs disabled:opacity-40">
                Clear
              </button>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search messages"
              className="w-full input-modern text-sm"
            />
            <div className="flex justify-end">
              <button onClick={() => setSearch('')} disabled={!search.trim()} className="text-xs text-primary disabled:opacity-40 hover:underline transition-colors">
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredRooms.length === 0 ? (
              <div className="flex items-center justify-center h-full text-text-secondary text-sm text-center p-4">
                No chat rooms yet. Create one!
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className={`w-full text-left px-4 py-3 border-b border-primary transition-all cursor-pointer group ${
                    selectedRoomId === room.id ? 'bg-primary/20 border-l-4 border-l-primary' : 'hover:bg-primary/10'
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => setSelectedRoomId(room.id)} className="text-left min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text truncate">{room.name}</p>
                      {room.lastMessage ? (
                        <p className="text-[11px] text-text-secondary truncate">
                          <span className="font-medium">{room.lastMessage.sender}:</span> {room.lastMessage.text || '(attachment)'}
                        </p>
                      ) : (
                        <p className="text-[11px] text-text-secondary">{room.type}</p>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      {(unreadByRoom[room.id] || 0) > 0 && (
                        <span className="min-w-5 h-5 px-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                          {unreadByRoom[room.id] > 99 ? '99+' : unreadByRoom[room.id]}
                        </span>
                      )}
                      {room.inviteCode && (
                        <button
                          onClick={() => copyInviteCode(room.inviteCode)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors opacity-0 group-hover:opacity-100">
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <div
          className={`resize-handle ${isResizing ? 'active' : ''}`}
          onMouseDown={() => setIsResizing(true)}
          title="Drag to resize sidebar"
        />
        </>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-3 px-4 py-3 bg-panel border-b border-primary flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg flex-shrink-0">{selectedRoom?.name?.charAt(0).toUpperCase() || 'R'}</div>
            <div className="min-w-0 flex-1">
              <p className="text-text font-semibold text-sm truncate">{selectedRoom?.name || 'Room'}</p>
              <p className="text-xs truncate text-text-secondary">
                {typers.length > 0 ? (
                  <span className="text-primary font-medium">{typers.join(', ')} typing...</span>
                ) : (
                  <span>{onlineUsers.length} online</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-primary animate-glow-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-text-secondary hidden sm:block">{connected ? 'Online' : 'Offline'}</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-full hover:bg-primary/20 text-text-secondary hover:text-text transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            <button
              onClick={() => setShowSidebar((value) => !value)}
              className="p-2 rounded-full hover:bg-primary/20 text-text-secondary hover:text-text transition-colors">
              ☰
            </button>

            {selectedRoom && messages.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="p-2 rounded-full hover:bg-red-500/20 text-text-secondary hover:text-red-500 transition-colors"
                title="Clear messages">
                🗑️
              </button>
            )}

            <button
              onClick={() => logoutMutation.mutate()}
              className="text-xs text-primary hover:text-accent px-3 py-1 rounded hover:bg-primary/10 transition-colors">
              Logout
            </button>

            <button onClick={() => setShowProfileEditor(true)} title="Edit profile" className="flex-shrink-0">
              <Avatar name={user?.name || ''} avatarUrl={user?.avatarUrl || ''} size="sm" />
            </button>
          </div>
        </header>

        {/* Messages Section */}
        <section className="flex-1 overflow-y-auto px-4 py-4">
          {search.trim() && (
            <div className="mb-3 flex items-center justify-between soft-border glass-surface rounded-lg px-3 py-2 animate-panel-in">
              <p className="text-xs text-text-secondary">
                Searching: <span className="font-semibold text-text">{search}</span>
              </p>
              <button onClick={() => setSearch('')} className="text-xs text-primary hover:text-accent transition-colors">
                Clear
              </button>
            </div>
          )}

          {messagesQuery.hasNextPage && (
            <div className="flex justify-center mb-3">
              <button
                onClick={() => messagesQuery.fetchNextPage()}
                disabled={messagesQuery.isFetchingNextPage}
                className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 transition-colors">
                {messagesQuery.isFetchingNextPage ? 'Loading...' : 'Load older messages'}
              </button>
            </div>
          )}

          {messagesQuery.isLoading && (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-10 rounded-xl bg-primary/20 ${i % 2 === 0 ? 'w-2/3 ml-auto' : 'w-1/2'}`} />
              ))}
            </div>
          )}

          {messagesQuery.isError && (
            <div className="text-red-300 text-sm bg-red-900/20 border border-red-500/40 rounded-lg p-3">
              Failed to load messages. Try switching room or refresh.
            </div>
          )}

          {!messagesQuery.isLoading && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-text-secondary">
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1">Start a conversation!</p>
            </div>
          )}

          <div className="space-y-2">
            {messages.map((message) => {
              const mine = message.senderId === user?.id || message.sender === user?.name
              return (
                <div key={message.id} className={`flex items-end gap-2 animate-message-in ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine && <Avatar name={message.sender} avatarUrl={message.senderAvatarUrl || ''} size="xs" />}

                  <div className={`max-w-[72%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    {!mine && (
                      <span className="text-xs font-semibold mb-1 ml-1" style={{ color: getAvatarColor(message.sender) }}>
                        {message.sender}
                      </span>
                    )}

                    <div className={`px-3 pt-2 pb-1.5 rounded-2xl text-sm leading-relaxed ${mine ? 'message-sent rounded-tr-none' : 'message-received rounded-tl-none'} ${message.optimistic ? 'opacity-70' : ''}`}>
                      {message.replyTo && (
                        <div className={`mb-1.5 px-2 py-1 rounded-md border-l-2 ${mine ? 'bg-black/15 border-white/60' : 'bg-primary/10 border-primary/60'}`}>
                          <p className="text-[10px] font-semibold opacity-90">Replying to {message.replyTo.sender}</p>
                          <p className="text-xs opacity-85 truncate">{message.replyTo.text || 'Attachment'}</p>
                        </div>
                      )}

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

                      <p className={`text-[10px] mt-0.5 text-right ${mine ? 'opacity-80' : 'text-text-secondary'}`}>
                        {formatTime(message.createdAt)} {message.editedAt ? '(edited)' : ''}
                      </p>
                    </div>

                    {!message.optimistic && (
                      <div className={`mt-1 flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                        <button
                          onClick={() => startReply(message)}
                          className="text-[10px] text-text-secondary hover:text-primary transition-colors">
                          Reply
                        </button>
                        {mine && (
                          <button
                            onClick={() => startEdit(message)}
                            className="text-[10px] text-text-secondary hover:text-primary transition-colors">
                            Edit
                          </button>
                        )}
                        {mine && (
                          <button
                            onClick={() => deleteMessageMutation.mutate(message.id)}
                            className="text-[10px] text-text-secondary hover:text-red-500 transition-colors"
                            disabled={deleteMessageMutation.isPending}>
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {mine && <Avatar name={message.sender} avatarUrl={user?.avatarUrl || ''} size="xs" />}
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        </section>

        {/* Input Footer */}
        <footer className="px-4 py-3 bg-panel border-t border-primary flex-shrink-0">
          {replyToMessage && (
            <div className="mb-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-primary font-semibold">Replying to {replyToMessage.sender}</p>
                <p className="text-xs text-text truncate">{replyToMessage.text || 'Attachment'}</p>
              </div>
              <button onClick={() => setReplyToMessage(null)} className="text-xs text-text-secondary hover:text-text">Cancel</button>
            </div>
          )}

          {editingMessageId && (
            <div className="mb-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 flex items-center justify-between gap-3">
              <p className="text-xs text-text">Editing message</p>
              <button
                onClick={() => {
                  setEditingMessageId('')
                  setText('')
                }}
                className="text-xs text-text-secondary hover:text-text">
                Cancel
              </button>
            </div>
          )}

          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <span key={`${file.name}-${index}`} className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full border border-primary/40">
                  {file.name}
                </span>
              ))}
              <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-600">
                Clear files
              </button>
            </div>
          )}

          <div className="flex items-end gap-3">
            <label className="h-11 px-3 rounded-lg input-modern text-xs flex items-center cursor-pointer hover:bg-primary/10 transition-colors">
              📎
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => setFiles(Array.from(event.target.files || []))}
              />
            </label>

            <div className="flex-1 bg-panel rounded-2xl px-4 py-2.5 flex items-end input-modern border-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={text}
                onChange={onComposerChange}
                onKeyDown={onComposerKeyDown}
                placeholder="Type a message..."
                className="w-full bg-transparent text-text text-sm outline-none resize-none placeholder-text-secondary leading-relaxed max-h-[120px]"
                style={{ height: 'auto' }}
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={busySend || (!text.trim() && files.length === 0) || !selectedRoomId}
              className="h-11 w-11 rounded-full btn-primary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all">
              <SendIcon />
            </button>
          </div>
        </footer>
      </main>

      {/* Profile Editor Modal */}
      {showProfileEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-panel-in">
          <div className="w-full max-w-md rounded-2xl bg-panel border border-primary p-6 shadow-2xl animate-slide-right">
            <div className="flex items-center justify-between mb-4">
              <p className="text-text font-semibold text-lg">✏️ Edit Profile</p>
              <button
                onClick={() => setShowProfileEditor(false)}
                className="text-text-secondary hover:text-text transition-colors text-xl">
                ✕
              </button>
            </div>

            <p className="text-xs text-text-secondary mb-2 uppercase font-semibold">Choose Avatar</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  type="button"
                  key={avatar}
                  onClick={() => setProfileAvatar(avatar)}
                  className={`rounded-full p-0.5 border-2 transition-all hover:scale-110 ${profileAvatar === avatar ? 'border-primary ring-2 ring-primary/30' : 'border-primary/40 hover:border-primary'}`}>
                  <img src={avatar} alt="avatar option" className="h-12 w-12 rounded-full" />
                </button>
              ))}
            </div>

            <p className="text-xs text-text-secondary mb-2 uppercase font-semibold">Status</p>
            <input
              value={profileStatus}
              onChange={(event) => setProfileStatus(event.target.value)}
              maxLength={120}
              className="w-full input-modern text-sm mb-4"
              placeholder="What's on your mind?"
            />

            {profileMutation.isError && <p className="text-xs text-red-500 mb-3">{profileMutation.error?.message || 'Failed to save profile'}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowProfileEditor(false)}
                className="btn-secondary text-sm px-4">
                Cancel
              </button>
              <button
                onClick={() => profileMutation.mutate()}
                disabled={profileMutation.isPending}
                className="btn-primary text-sm px-4 disabled:opacity-50">
                {profileMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Messages Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-panel-in">
          <div className="w-full max-w-sm rounded-2xl bg-panel border border-primary p-6 shadow-2xl animate-slide-right">
            <p className="text-text font-semibold text-lg mb-2">⚠️ Clear All Messages?</p>
            <p className="text-text-secondary text-sm mb-6">This will permanently delete all messages in this room. This action cannot be undone.</p>

            {clearMessagesMutation.isError && <p className="text-xs text-red-500 mb-3">{clearMessagesMutation.error?.message || 'Failed to clear messages'}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn-secondary text-sm px-4">
                Cancel
              </button>
              <button
                onClick={() => clearMessagesMutation.mutate()}
                disabled={clearMessagesMutation.isPending}
                className="btn-primary text-sm px-4 disabled:opacity-50 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600">
                {clearMessagesMutation.isPending ? 'Clearing...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
