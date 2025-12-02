import { useEffect, useRef, useState } from 'react'

// Use Railway WebSocket URL (will be wss:// in production)
const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5002'

/**
 * Hook to receive live price updates from backend WebSocket
 * Usage: const { prices, connected } = useLivePrices()
 * Returns: { prices: { BTC: 95234.50, ETH: 3456.78, ... }, connected: true/false }
 */
export function useLivePrices() {
  const [prices, setPrices] = useState({})
  const [volumes, setVolumes] = useState({})
  const [connected, setConnected] = useState(false)
  const ws = useRef(null)
  const reconnectTimer = useRef(null)

  const connect = () => {
    console.log('📡 Connecting to price WebSocket...')
    
    try {
      ws.current = new WebSocket(WEBSOCKET_URL)
      
      ws.current.onopen = () => {
        console.log('✅ Price WebSocket connected')
        setConnected(true)
      }
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'price_update') {
            setPrices(prev => ({
              ...prev,
              [data.symbol]: data.price
            }))
            
            if (data.volume_24h) {
              setVolumes(prev => ({
                ...prev,
                [data.symbol]: data.volume_24h
              }))
            }
          }
        } catch (err) {
          console.error('Error parsing price update:', err)
        }
      }
      
      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
      }
      
      ws.current.onclose = () => {
        console.log('🔌 WebSocket disconnected, reconnecting in 5s...')
        setConnected(false)
        
        // Auto-reconnect after 5 seconds
        reconnectTimer.current = setTimeout(() => {
          connect()
        }, 5000)
      }
    } catch (err) {
      console.error('Failed to create WebSocket:', err)
      
      // Retry connection
      reconnectTimer.current = setTimeout(() => {
        connect()
      }, 5000)
    }
  }

  useEffect(() => {
    connect()
    
    // Cleanup on unmount
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [])

  return { prices, volumes, connected }
}

export default useLivePrices