import { useState, useEffect } from 'react'
import './App.css'
import MultiTimeframeDashboard from './MultiTimeFrameDashboard.jsx'
import CoinDetailModal from './CoinDetailModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

function App({ onMultiViewClick }) {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('longterm')
  const [dbStats, setDbStats] = useState(null)
  const [error, setError] = useState(null)
  const [selectedCoin, setSelectedCoin] = useState(null)

  // Auto-load on mount
  useEffect(() => {
    loadFromDatabase()
  }, [])

  const checkDatabaseStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/database-stats`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setDbStats(data)
      return data
    } catch (error) {
      console.error('Failed to fetch database stats:', error)
      return null
    }
  }

  const loadFromDatabase = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // First check if API is reachable
      const healthCheck = await fetch(`${API_URL}/health`).catch(() => null)
      if (!healthCheck || !healthCheck.ok) {
        throw new Error('API server is not running. Start it with: python3 api_server_with_db.py')
      }

      // Get database stats
      const stats = await checkDatabaseStats()
      
      // Check if database has data
      if (stats && stats.coins === 0) {
        throw new Error('Database is empty. Run: python3 background_worker.py')
      }

      // Fetch strategic summary
      const response = await fetch(`${API_URL}/api/strategic-summary`)
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      console.log('✅ API Response:', data) // Debug log
      
      // Stablecoins to filter out
      const stablecoins = ['USDC', 'USDT', 'DAI', 'USDS', 'USDE', 'PYUSD', 'FDUSD', 
                          'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD',
                          'USDT0', 'SUSDS', 'USD1', 'BSC-USD', 'WBETH']
      
      // Filter function to remove stablecoins
      const filterStablecoins = (coins) => {
        if (!Array.isArray(coins)) return []
        return coins.filter(coin => !stablecoins.includes(coin.symbol))
      }
      
      // Transform data to match expected format
      const transformedData = {
        scan_date: new Date().toISOString(),
        summary: {
          total_scanned: (data.evaluate_long_term?.count || 0) + 
                        (data.trade_now_short_term?.count || 0) + 
                        (data.avoid?.count || 0),
          total_above_weekly: data.evaluate_long_term?.count || 0,
          total_below_weekly: data.avoid?.count || 0,
        },
        strategic_summary: {
          coins_to_evaluate_long_term: filterStablecoins(data.evaluate_long_term?.coins || []),
          coins_to_trade_now_short_term: filterStablecoins(data.trade_now_short_term?.coins || []),
          coins_to_avoid: filterStablecoins(data.avoid?.coins || [])
        }
      }
      
      console.log('✅ Transformed:', {
        evaluate: transformedData.strategic_summary.coins_to_evaluate_long_term.length,
        trade: transformedData.strategic_summary.coins_to_trade_now_short_term.length,
        avoid: transformedData.strategic_summary.coins_to_avoid.length
      })
      
      setResults(transformedData)
      
    } catch (error) {
      console.error('❌ Load failed:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    if (price >= 1) return `$${price.toFixed(2)}`
    return `$${price.toFixed(6)}`
  }

  const CoinCard = ({ coin, showTimeframe = true }) => (
    <div className="coin-card" onClick={() => setSelectedCoin(coin.symbol)} style={{ cursor: 'pointer' }}>
      <div className="coin-header">
        <div className="coin-rank">#{coin.market_cap_rank || coin.rank}</div>
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
            {coin.pct_from_ema50 > 0 ? '+' : ''}{coin.pct_from_ema50?.toFixed(2)}%
          </span>
        </div>
        {coin.four_h_pct_from_ema !== undefined && (
          <div className="stat">
            <span className="stat-label">4H Distance</span>
            <span className={`stat-value ${coin.four_h_pct_from_ema >= 0 ? 'positive' : 'negative'}`}>
              {coin.four_h_pct_from_ema >= 0 ? '+' : ''}{coin.four_h_pct_from_ema?.toFixed(2)}%
            </span>
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
              onClick={onMultiViewClick}
              title="Switch to multi-timeframe view"
            >
              7 TF
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
                    {results.summary.total_above_weekly || 0}
                  </span>
                </div>
                <div className="header-stat">
                  <span className="header-stat-label">BELOW</span>
                  <span className="header-stat-value negative">
                    {results.summary.total_below_weekly || 0}
                  </span>
                </div>
              </>
            )}
            {loading && (
              <div className="header-stat">
                <span className="header-stat-label">STATUS</span>
                <span className="header-stat-value loading">LOADING...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container">
        <div className="control-panel">
          <h2 className="panel-title">CONTROL TERMINAL</h2>
          
          <div className="controls">
            {dbStats && (
              <div className="db-status">
                <div className="db-stat">
                  <span className="db-label">📊 Coins in DB:</span>
                  <span className="db-value">{dbStats.coins}</span>
                </div>
                <div className="db-stat">
                  <span className="db-label">📈 EMA Analysis:</span>
                  <span className="db-value">{dbStats.ema_analysis}</span>
                </div>
                {dbStats.latest_scan && (
                  <div className="db-stat">
                    <span className="db-label">🕐 Last Scan:</span>
                    <span className="db-value">
                      {new Date(dbStats.latest_scan).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="control-buttons">
              <button
                onClick={loadFromDatabase}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? '⟳ LOADING...' : '↻ REFRESH DATA'}
              </button>

              <button
                onClick={checkDatabaseStats}
                disabled={loading}
                className="btn btn-outline"
              >
                📊 REFRESH STATS
              </button>
            </div>
          </div>

          {error && (
            <div className="error-notice">
              <p>❌ {error}</p>
            </div>
          )}

          {!dbStats?.coins && !loading && !error && (
            <div className="empty-db-notice">
              <p>⚠️ Database is empty. Run the background worker first:</p>
              <code>python3 background_worker.py</code>
            </div>
          )}
        </div>

        {results && summary && !loading && (
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

        {!results && loading && (
          <div className="loading-state">
            <div className="loading-spinner">⟳</div>
            <h3>LOADING CRYPTOCURRENCY DATA...</h3>
            <p>Fetching analysis from database</p>
          </div>
        )}

        {!results && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <h3>NO DATA LOADED</h3>
            <p>Click "Refresh Data" to reload cryptocurrency analysis</p>
            {dbStats?.coins > 0 && (
              <p className="empty-hint">
                ✅ Database has {dbStats.coins} coins ready to load
              </p>
            )}
          </div>
        )}
      </div>

      <footer className="footer">
        <p>
          ⚡ Crypto EMA Scanner Dashboard · Multi-timeframe analysis (Weekly/Daily/4H) · 
          <span className="footer-highlight"> Instant Database Loading</span>
        </p>
        <p className="footer-warning">
          ⚠ For educational purposes only · Not financial advice · DYOR
        </p>
      </footer>

      {/* Coin Detail Modal */}
      {selectedCoin && (
        <CoinDetailModal 
          symbol={selectedCoin} 
          onClose={() => setSelectedCoin(null)} 
        />
      )}
    </div>
  )
}

export default App