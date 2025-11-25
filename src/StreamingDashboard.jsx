import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_URL = 'http://localhost:5000'
const CACHE_KEY = 'crypto_scanner_results'
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

function StreamingDashboard() {
  const [scanStatus, setScanStatus] = useState(null)
  const [results, setResults] = useState(null)
  const [streamingResults, setStreamingResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [topN, setTopN] = useState(10)
  const [useCache, setUseCache] = useState(true)
  const [activeTab, setActiveTab] = useState('longterm')
  const [isStreaming, setIsStreaming] = useState(false)
  const eventSourceRef = useRef(null)

  // Load cached results on mount
  useEffect(() => {
    loadFromCache()
  }, [])

  // Poll scan status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/status`)
        const data = await response.json()
        setScanStatus(data)
      } catch (error) {
        console.error('Status check failed:', error)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  // Save to localStorage
  const saveToCache = (data) => {
    try {
      const cacheData = {
        timestamp: Date.now(),
        data: data
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      console.log('💾 Results cached to browser')
    } catch (error) {
      console.error('Failed to cache results:', error)
    }
  }

  // Load from localStorage
  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return

      const cacheData = JSON.parse(cached)
      const age = Date.now() - cacheData.timestamp
      
      if (age < CACHE_DURATION) {
        setResults(cacheData.data)
        console.log(`✅ Loaded cached results (${Math.floor(age / 60000)} minutes old)`)
      } else {
        console.log('⏰ Cache expired, clearing...')
        localStorage.removeItem(CACHE_KEY)
      }
    } catch (error) {
      console.error('Failed to load cache:', error)
    }
  }

  // Clear cache
  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY)
    setResults(null)
    setStreamingResults([])
    console.log('🗑️ Cache cleared')
  }

  // Start streaming scan
  const startStreamingScan = async () => {
    setLoading(true)
    setStreamingResults([])
    setIsStreaming(true)

    try {
      // Start the scan
      await fetch(`${API_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ top_n: topN, use_cache: false })
      })

      // Connect to SSE stream
      eventSourceRef.current = new EventSource(`${API_URL}/api/stream`)
      
      eventSourceRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'coin_result') {
          // Add coin result immediately to display
          setStreamingResults(prev => [...prev, data.data])
        } else if (data.type === 'complete') {
          // Scan complete - load final results
          setTimeout(() => {
            loadLatestResults()
            setIsStreaming(false)
            setLoading(false)
            eventSourceRef.current?.close()
          }, 1000)
        } else if (data.type === 'error') {
          console.error('Scan error:', data.error)
          setIsStreaming(false)
          setLoading(false)
          eventSourceRef.current?.close()
        }
      }

      eventSourceRef.current.onerror = (error) => {
        console.error('Stream error:', error)
        setIsStreaming(false)
        setLoading(false)
        eventSourceRef.current?.close()
      }

    } catch (error) {
      console.error('Scan failed:', error)
      alert('Failed to start scan. Make sure API server is running.')
      setLoading(false)
      setIsStreaming(false)
    }
  }

  // Load latest results and cache them
  const loadLatestResults = async () => {
    try {
      const response = await fetch(`${API_URL}/api/results/latest`)
      const data = await response.json()
      setResults(data)
      saveToCache(data)
      setStreamingResults([]) // Clear streaming results
    } catch (error) {
      console.error('Failed to load results:', error)
    }
  }

  // Start demo mode
  const startDemo = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/demo`)
      const data = await response.json()
      setResults(data)
      saveToCache(data)
    } catch (error) {
      console.error('Demo failed:', error)
      alert('Failed to load demo.')
    } finally {
      setLoading(false)
    }
  }

  // Refresh from cache
  const refreshFromCache = () => {
    loadFromCache()
  }

  const formatPrice = (price) => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    if (price >= 1) return `$${price.toFixed(2)}`
    return `$${price.toFixed(6)}`
  }

  const CoinCard = ({ coin, showTimeframe = true, isStreaming = false }) => (
    <div className={`coin-card ${isStreaming ? 'streaming-in' : ''}`}>
      <div className="coin-header">
        <div className="coin-rank">#{coin.rank}</div>
        <div className="coin-info">
          <div className="coin-name">{coin.name}</div>
          <div className="coin-symbol">{coin.symbol}</div>
        </div>
        {isStreaming && <span className="streaming-badge">NEW</span>}
      </div>
      <div className="coin-stats">
        <div className="stat">
          <span className="stat-label">Price</span>
          <span className="stat-value">{formatPrice(coin.current_price)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">EMA50</span>
          <span className="stat-value">{formatPrice(coin.ema50)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Distance</span>
          <span className={`stat-value ${coin.above_ema50 ? 'positive' : 'negative'}`}>
            {coin.pct_from_ema50 > 0 ? '+' : ''}{coin.pct_from_ema50.toFixed(2)}%
          </span>
        </div>
        {showTimeframe && (
          <div className="stat">
            <span className="stat-label">Timeframe</span>
            <span className="stat-value">{coin.timeframe}</span>
          </div>
        )}
      </div>
      <div className={`position-badge ${coin.above_ema50 ? 'above' : 'below'}`}>
        {coin.above_ema50 ? '▲ ABOVE EMA' : '▼ BELOW EMA'}
      </div>
    </div>
  )

  // Get cache age
  const getCacheAge = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null
      
      const cacheData = JSON.parse(cached)
      const age = Date.now() - cacheData.timestamp
      const minutes = Math.floor(age / 60000)
      
      return minutes
    } catch {
      return null
    }
  }

  const summary = results?.strategic_summary
  const cacheAge = getCacheAge()

  return (
    <div className="app">
      <div className="scanlines"></div>
      <div className="grid-bg"></div>
      
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">CRYPTO EMA SCANNER</span>
            {isStreaming && <span className="streaming-indicator">● LIVE</span>}
          </div>
          <div className="header-stats">
            {results && (
              <>
                <div className="header-stat">
                  <span className="header-stat-label">SCANNED</span>
                  <span className="header-stat-value">{results.summary.total_scanned}</span>
                </div>
                <div className="header-stat">
                  <span className="header-stat-label">ABOVE</span>
                  <span className="header-stat-value positive">
                    {results.summary.total_above_weekly || results.summary.total_above || 0}
                  </span>
                </div>
                <div className="header-stat">
                  <span className="header-stat-label">BELOW</span>
                  <span className="header-stat-value negative">
                    {results.summary.total_below_weekly || results.summary.total_below || 0}
                  </span>
                </div>
              </>
            )}
            {cacheAge !== null && (
              <div className="header-stat cache-stat">
                <span className="header-stat-label">CACHED</span>
                <span className="header-stat-value">{cacheAge}m ago</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container">
        <div className="control-panel">
          <h2 className="panel-title">CONTROL TERMINAL</h2>
          
          <div className="controls">
            <div className="control-group">
              <label className="control-label">
                <span>TOP COINS</span>
                <input
                  type="number"
                  value={topN}
                  onChange={(e) => setTopN(Math.max(5, Math.min(200, parseInt(e.target.value) || 10)))}
                  min="5"
                  max="200"
                  className="control-input"
                  disabled={scanStatus?.running || isStreaming}
                />
              </label>
            </div>

            <div className="control-buttons">
              <button
                onClick={startStreamingScan}
                disabled={scanStatus?.running || loading || isStreaming}
                className="btn btn-primary"
              >
                {isStreaming ? '● STREAMING...' : scanStatus?.running ? 'SCANNING...' : '🔴 LIVE SCAN'}
              </button>
              
              <button
                onClick={startDemo}
                disabled={scanStatus?.running || loading || isStreaming}
                className="btn btn-secondary"
              >
                DEMO MODE
              </button>

              <button
                onClick={loadLatestResults}
                disabled={scanStatus?.running || isStreaming}
                className="btn btn-outline"
              >
                LOAD LATEST
              </button>

              <button
                onClick={refreshFromCache}
                disabled={!cacheAge}
                className="btn btn-cache"
                title="Load from browser cache"
              >
                📦 CACHE ({cacheAge || 0}m)
              </button>

              <button
                onClick={clearCache}
                disabled={!cacheAge}
                className="btn btn-clear"
                title="Clear browser cache"
              >
                🗑️ CLEAR
              </button>
            </div>
          </div>

          {scanStatus && (
            <div className="status-display">
              <div className="status-header">
                <span className="status-indicator" data-status={scanStatus.running || isStreaming ? 'active' : 'idle'}></span>
                <span className="status-text">{scanStatus.status_message}</span>
                {isStreaming && <span className="streaming-count">({streamingResults.length} received)</span>}
              </div>
              
              {(scanStatus.running || isStreaming) && (
                <>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(scanStatus.progress / scanStatus.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {scanStatus.current_coin && (
                      <span className="current-coin">{scanStatus.current_coin}</span>
                    )}
                    <span className="progress-count">
                      {scanStatus.progress} / {scanStatus.total}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {cacheAge !== null && (
            <div className="cache-info">
              💾 Browser cache active - Results saved locally for 60 minutes
            </div>
          )}
        </div>

        {/* Show streaming results as they come in */}
        {isStreaming && streamingResults.length > 0 && (
          <div className="streaming-section">
            <h3 className="section-title">● LIVE RESULTS - As they scan</h3>
            <div className="coins-grid">
              {streamingResults.map((coinResult, idx) => {
                const coin = coinResult.weekly || coinResult.daily || coinResult['4h']
                if (!coin) return null
                return <CoinCard key={idx} coin={coin} isStreaming={true} />
              })}
            </div>
          </div>
        )}

        {results && summary && !isStreaming && (
          <div className="results-section">
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'longterm' ? 'active' : ''}`}
                onClick={() => setActiveTab('longterm')}
              >
                <span className="tab-icon">✓</span>
                LONG TERM
                <span className="tab-count">{summary.coins_to_evaluate_long_term.length}</span>
              </button>
              <button
                className={`tab ${activeTab === 'tradenow' ? 'active' : ''}`}
                onClick={() => setActiveTab('tradenow')}
              >
                <span className="tab-icon">⚡</span>
                TRADE NOW
                <span className="tab-count">{summary.coins_to_trade_now_short_term.length}</span>
              </button>
              <button
                className={`tab ${activeTab === 'avoid' ? 'active' : ''}`}
                onClick={() => setActiveTab('avoid')}
              >
                <span className="tab-icon">✕</span>
                AVOID
                <span className="tab-count">{summary.coins_to_avoid.length}</span>
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'longterm' && (
                <div className="tab-panel">
                  <div className="panel-header">
                    <h3>COINS TO EVALUATE - LONG TERM</h3>
                    <p className="panel-desc">
                      Price ABOVE Weekly EMA50 or within 10% BELOW. Strong technical position.
                    </p>
                  </div>
                  <div className="coins-grid">
                    {summary.coins_to_evaluate_long_term.map((coin, idx) => (
                      <CoinCard key={idx} coin={coin} />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'tradenow' && (
                <div className="tab-panel">
                  <div className="panel-header">
                    <h3>POSSIBLE TO TRADE NOW - SHORT TERM</h3>
                    <p className="panel-desc">
                      4H chart within 5% of EMA50. Critical support/resistance levels.
                    </p>
                  </div>
                  <div className="coins-grid">
                    {summary.coins_to_trade_now_short_term.map((coin, idx) => (
                      <CoinCard key={idx} coin={coin} showTimeframe={false} />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'avoid' && (
                <div className="tab-panel">
                  <div className="panel-header">
                    <h3>COINS TO AVOID</h3>
                    <p className="panel-desc">
                      Price MORE than 10% below EMA50. Weak technical position.
                    </p>
                  </div>
                  <div className="coins-grid">
                    {summary.coins_to_avoid.map((coin, idx) => (
                      <CoinCard key={idx} coin={coin} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!results && !scanStatus?.running && !isStreaming && (
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <h3>NO SCAN DATA</h3>
            <p>Click "🔴 LIVE SCAN" to see real-time results as coins are analyzed</p>
            <p className="empty-hint">Or load from cache/demo mode</p>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>
          ⚡ Real-time Streaming Scanner · Browser Caching · Multi-timeframe EMA50 Analysis
        </p>
        <p className="footer-warning">
          ⚠ For educational purposes only · Not financial advice · DYOR
        </p>
      </footer>
    </div>
  )
}

export default StreamingDashboard