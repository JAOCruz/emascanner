import { useState, useEffect } from 'react'
import './App.css'
import MultiTimeframeDashboard from './MultiTimeFrameDashboard.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

function App() {
  const [viewMode, setViewMode] = useState('standard') // 'standard' or 'multi'
  const [scanStatus, setScanStatus] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [topN, setTopN] = useState(10)
  const [useCache, setUseCache] = useState(true)
  const [activeTab, setActiveTab] = useState('longterm')

  // Poll scan status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/status`)
        const data = await response.json()
        setScanStatus(data)
        
        // Auto-load results when scan completes
        if (!data.running && data.progress > 0 && !results) {
          loadLatestResults()
        }
      } catch (error) {
        console.error('Status check failed:', error)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 2000)
    return () => clearInterval(interval)
  }, [results])

  const startScan = async (isDemo = false) => {
    setLoading(true)
    setResults(null)
    
    try {
      if (isDemo) {
        const response = await fetch(`${API_URL}/api/demo`)
        const data = await response.json()
        setResults(data)
      } else {
        await fetch(`${API_URL}/api/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ top_n: topN, use_cache: useCache })
        })
      }
    } catch (error) {
      console.error('Scan failed:', error)
      alert('Failed to start scan. Make sure the API server is running on port 5001.')
    } finally {
      setLoading(false)
    }
  }

  const loadLatestResults = async () => {
    try {
      const response = await fetch(`${API_URL}/api/results/latest`)
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Failed to load results:', error)
    }
  }

  const formatPrice = (price) => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    if (price >= 1) return `$${price.toFixed(2)}`
    return `$${price.toFixed(6)}`
  }

  // If multi-timeframe view, render that component instead
  if (viewMode === 'multi') {
    return <MultiTimeframeDashboard />
  }

  const CoinCard = ({ coin, showTimeframe = true }) => (
    <div className="coin-card">
      <div className="coin-header">
        <div className="coin-rank">#{coin.rank}</div>
        <div className="coin-info">
          <div className="coin-name">{coin.name}</div>
          <div className="coin-symbol">{coin.symbol}</div>
        </div>
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

  const summary = results?.strategic_summary

  return (
    <div className="app">
      <div className="scanlines"></div>
      <div className="grid-bg"></div>
      
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">CRYPTO EMA SCANNER</span>
            <button 
              className="view-toggle"
              onClick={() => setViewMode(viewMode === 'standard' ? 'multi' : 'standard')}
              title="Switch to multi-timeframe view"
            >
              {viewMode === 'standard' ? '7 TF' : '3 TF'}
            </button>
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
                  disabled={scanStatus?.running}
                />
              </label>
            </div>

            <div className="control-group">
              <label className="control-checkbox">
                <input
                  type="checkbox"
                  checked={useCache}
                  onChange={(e) => setUseCache(e.target.checked)}
                  disabled={scanStatus?.running}
                />
                <span>Use Cache (60 min)</span>
              </label>
            </div>

            <div className="control-buttons">
              <button
                onClick={() => startScan(false)}
                disabled={scanStatus?.running || loading}
                className="btn btn-primary"
              >
                {scanStatus?.running ? 'SCANNING...' : 'RUN SCAN'}
              </button>
              
              <button
                onClick={() => startScan(true)}
                disabled={scanStatus?.running || loading}
                className="btn btn-secondary"
              >
                DEMO MODE
              </button>

              <button
                onClick={loadLatestResults}
                disabled={scanStatus?.running}
                className="btn btn-outline"
              >
                LOAD LATEST
              </button>
            </div>
          </div>

          {scanStatus && (
            <div className="status-display">
              <div className="status-header">
                <span className="status-indicator" data-status={scanStatus.running ? 'active' : 'idle'}></span>
                <span className="status-text">{scanStatus.status_message}</span>
              </div>
              
              {scanStatus.running && (
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
        </div>

        {results && summary && (
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
                      Price ABOVE Weekly EMA50 or within 10% BELOW. Strong technical position for position trading.
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
                      4H chart within 5% of EMA50. Critical support/resistance levels for immediate trading opportunities.
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
                      Price MORE than 10% below EMA50. Weak technical position - wait for trend reversal.
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

        {!results && !scanStatus?.running && (
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <h3>NO SCAN DATA</h3>
            <p>Run a scan or load existing results to view cryptocurrency analysis</p>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>
          ⚡ Crypto EMA Scanner Dashboard · Multi-timeframe analysis (Weekly/Daily/4H) · 
          <span className="footer-highlight"> EMA50 Technical Indicator</span>
        </p>
        <p className="footer-warning">
          ⚠ For educational purposes only · Not financial advice · DYOR
        </p>
      </footer>
    </div>
  )
}

export default App