import { useState, useEffect } from 'react'
import './MultiTimeframe.css'
import CoinDetailModal from './CoinDetailModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

function MultiTimeframeDashboard({ onBackClick }) {
  const [allCoins, setAllCoins] = useState([])
  const [selectedTimeframe, setSelectedTimeframe] = useState('1w')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCoin, setSelectedCoin] = useState(null)

  const timeframes = [
    { value: '15m', label: '15M' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
    { value: '1w', label: '1W' }
  ]

  const loadAllTimeframes = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('📊 Loading coins for', selectedTimeframe, 'timeframe...')
      
      // Fetch data for the selected timeframe
      const response = await fetch(`${API_URL}/api/ema-analysis/all?timeframe=${selectedTimeframe}`)
      if (!response.ok) throw new Error('Failed to fetch data')
      
      const data = await response.json()
      
      console.log('Raw API response:', data)
      
      // The API returns { above_ema50: { coins: [...] }, below_ema50: { coins: [...] } }
      const allCoinsData = [
        ...(data.above_ema50?.coins || []),
        ...(data.below_ema50?.coins || [])
      ]

      // Remove stablecoins
      const stablecoins = ['USDC', 'USDT', 'DAI', 'USDS', 'USDE', 'PYUSD', 'FDUSD', 
                          'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD',
                          'USDT0', 'SUSDS', 'USD1', 'BSC-USD', 'WBETH']
      
      const filteredCoins = allCoinsData.filter(coin => !stablecoins.includes(coin.symbol))

      setAllCoins(filteredCoins)
      console.log('✅ Loaded', filteredCoins.length, 'coins for', selectedTimeframe)

    } catch (error) {
      console.error('❌ Load failed:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Reload data when timeframe changes
  useEffect(() => {
    loadAllTimeframes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeframe])

  // Sort coins by distance from EMA for selected timeframe
  const getSortedCoins = () => {
    return [...allCoins].sort((a, b) => {
      // Sort by pct_from_ema50 - most above EMA first
      return (b.pct_from_ema50 || 0) - (a.pct_from_ema50 || 0)
    })
  }

  const getTrendColor = (pct) => {
    if (pct > 10) return 'very-bullish'
    if (pct > 5) return 'bullish'
    if (pct > 0) return 'slightly-bullish'
    if (pct > -5) return 'neutral'
    if (pct > -10) return 'slightly-bearish'
    return 'bearish'
  }

  const formatPrice = (price) => {
    if (!price) return 'N/A'
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    if (price >= 1) return `$${price.toFixed(2)}`
    return `$${price.toFixed(6)}`
  }

  const sortedCoins = getSortedCoins()

  return (
    <div className="multi-timeframe-app">
      <div className="scanlines"></div>
      <div className="grid-bg"></div>

      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">◆</span>
            <span className="logo-text">MULTI-TIMEFRAME SCANNER</span>
            <button 
              className="view-toggle"
              onClick={onBackClick}
              title="Back to main dashboard"
            >
              ← 1 TF
            </button>
          </div>
          <div className="header-stats">
            {allCoins.length > 0 && (
              <div className="header-stat">
                <span className="header-stat-label">COINS</span>
                <span className="header-stat-value">{allCoins.length}</span>
              </div>
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
          <h2 className="panel-title">TIMEFRAME SELECTOR</h2>
          
          <div className="controls">
            <div className="timeframe-buttons">
              {timeframes.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setSelectedTimeframe(tf.value)}
                  className={`tf-button ${selectedTimeframe === tf.value ? 'active' : ''}`}
                  disabled={loading}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="control-buttons">
              <button
                onClick={loadAllTimeframes}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? '⟳ LOADING...' : '↻ REFRESH DATA'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-notice">
              <p>❌ {error}</p>
            </div>
          )}

          <div className="timeframe-info">
            <p>Currently viewing: <strong>{timeframes.find(tf => tf.value === selectedTimeframe)?.label}</strong> timeframe</p>
            <p className="info-text">Coins are sorted by distance from EMA50 - positive values are above EMA (bullish)</p>
          </div>
        </div>

        {sortedCoins.length > 0 && !loading && (
          <div className="results-section">
            <h2 className="section-title">
              {timeframes.find(tf => tf.value === selectedTimeframe)?.label} TIMEFRAME ANALYSIS
            </h2>
            <p className="section-desc">
              Showing {sortedCoins.length} coins ranked by their position relative to EMA50
            </p>

            <div className="coins-grid-simple">
              {sortedCoins.map((coin, idx) => (
                <div 
                  key={coin.symbol} 
                  className={`coin-card-simple ${getTrendColor(coin.pct_from_ema50)}`}
                  onClick={() => setSelectedCoin(coin.symbol)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="coin-card-header">
                    <div className="coin-rank-simple">
                      <div className="position-number">#{idx + 1}</div>
                      <div className="mcap-rank">MC: {coin.market_cap_rank}</div>
                    </div>
                    <div className="coin-info-simple">
                      <div className="coin-name-simple">{coin.name}</div>
                      <div className="coin-symbol-simple">{coin.symbol}</div>
                    </div>
                  </div>
                  
                  <div className="coin-stats-simple">
                    <div className="stat-row">
                      <span className="stat-label">Price:</span>
                      <span className="stat-value">{formatPrice(coin.current_price)}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">EMA50:</span>
                      <span className="stat-value">{formatPrice(coin.ema50)}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Distance:</span>
                      <span className={`stat-value ${coin.pct_from_ema50 >= 0 ? 'positive' : 'negative'}`}>
                        {coin.pct_from_ema50 >= 0 ? '+' : ''}{coin.pct_from_ema50?.toFixed(2)}%
                      </span>
                    </div>
                    {coin.four_h_pct_from_ema !== undefined && (
                      <div className="stat-row">
                        <span className="stat-label">4H Distance:</span>
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
              ))}
            </div>
          </div>
        )}

        {!allCoins.length && loading && (
          <div className="loading-state">
            <div className="loading-spinner">⟳</div>
            <h3>LOADING DATA...</h3>
            <p>Fetching cryptocurrency analysis</p>
          </div>
        )}

        {!allCoins.length && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">◆</div>
            <h3>NO DATA AVAILABLE</h3>
            <p>Click "Refresh Data" to load cryptocurrency analysis</p>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>
          ⚡ Multi-Timeframe EMA Scanner · Switch between 5 timeframes · 
          <span className="footer-highlight"> Instant Ranking</span>
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

export default MultiTimeframeDashboard