import { io } from 'socket.io-client'
import { API_BASE } from './lib/api'

export function connectWS(token) {
  return io(API_BASE, {
    auth: { token },
    transports: ['websocket'],
    withCredentials: true, // Include cookies for authentication
  })
}
