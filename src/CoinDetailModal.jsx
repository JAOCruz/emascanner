import { useState, useEffect } from 'react'
import './CoinDetailModal.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

function CoinDetailModal({ symbol, onClose }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadCoinDetails()
  }, [symbol])

  const loadCoinDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/coins/${symbol}/details`)
      
      if (!response.ok) {
        throw new Error('Failed to load coin details')
      }
      
      const data = await response.json()
      setDetails(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A'
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `$${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    if (num >= 1) return `$${num.toFixed(2)}`
    return `$${num.toFixed(6)}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-loading">
            <div className="loading-spinner"></div>
            <p>Loading coin details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>✕</button>
          <div className="modal-error">
            <p>❌ {error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!details) return null

  const { coin_info, data_coverage, overall_quality, ema_analysis, price_range, trading_confidence } = details

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content coin-detail-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        {/* Header */}
        <div className="modal-header">
          <div className="coin-title">
            <h2>{coin_info.name}</h2>
            <span className="coin-symbol">{coin_info.symbol}</span>
          </div>
          <div className="coin-rank">#{coin_info.market_cap_rank}</div>
        </div>

        {/* Current Price */}
        <div className="price-section">
          <div className="current-price">
            <span className="price-label">Current Price</span>
            <span className="price-value">{formatNumber(coin_info.current_price)}</span>
          </div>
          <div className="market-cap">
            <span className="mcap-label">Market Cap</span>
            <span className="mcap-value">{formatNumber(coin_info.market_cap)}</span>
          </div>
        </div>

        <div className="modal-divider"></div>

        {/* EMA Analysis */}
        <div className="section">
          <h3>📈 EMA Analysis (All Timeframes)</h3>
          
          <div className="ema-list">
            {ema_analysis.map(ema => {
              const distance = parseFloat(ema.pct_from_ema50)
              const isAbove = ema.above_ema50
              
              return (
                <div key={ema.timeframe} className={`ema-item ${isAbove ? 'bullish' : 'bearish'}`}>
                  <div className="ema-header">
                    <span className="ema-tf">{ema.timeframe.toUpperCase()}</span>
                    <span className={`ema-status ${isAbove ? 'above' : 'below'}`}>
                      {isAbove ? '↑ Above EMA' : '↓ Below EMA'}
                    </span>
                  </div>
                  <div className="ema-values">
                    <div className="ema-value">
                      <span className="ema-label">Price:</span>
                      <span>{formatNumber(ema.current_price)}</span>
                    </div>
                    <div className="ema-value">
                      <span className="ema-label">EMA-50:</span>
                      <span>{formatNumber(ema.ema50)}</span>
                    </div>
                    <div className="ema-value">
                      <span className="ema-label">Distance:</span>
                      <span className={distance >= 0 ? 'positive' : 'negative'}>
                        {distance >= 0 ? '+' : ''}{distance.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="modal-divider"></div>

        {/* Historical Price Range */}
        <div className="section">
          <h3>💎 Historical Price Range</h3>
          
          <div className="price-ranges">
            {/* 5 Year Range */}
            {price_range.five_year_low && price_range.five_year_high && (
              <div className="price-range-item">
                <div className="range-label">5 Year Range</div>
                <div className="range-values">
                  <span className="range-low">Low: {formatNumber(price_range.five_year_low)}</span>
                  <span className="range-separator">→</span>
                  <span className="range-high">High: {formatNumber(price_range.five_year_high)}</span>
                </div>
                {price_range.price_position_5y !== null && (
                  <div className="price-position">
                    <div className="position-bar">
                      <div 
                        className="position-indicator"
                        style={{ left: `${price_range.price_position_5y}%` }}
                      >
                        <div className="position-dot"></div>
                        <span className="position-label">{price_range.price_position_5y}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 1 Year Range */}
            {price_range.one_year_low && price_range.one_year_high && (
              <div className="price-range-item">
                <div className="range-label">1 Year Range</div>
                <div className="range-values">
                  <span className="range-low">Low: {formatNumber(price_range.one_year_low)}</span>
                  <span className="range-separator">→</span>
                  <span className="range-high">High: {formatNumber(price_range.one_year_high)}</span>
                </div>
              </div>
            )}

            {/* All Time Range */}
            {price_range.all_time_low && price_range.all_time_high && (
              <div className="price-range-item">
                <div className="range-label">All Time</div>
                <div className="range-values">
                  <span className="range-low">ATL: {formatNumber(price_range.all_time_low)}</span>
                  <span className="range-separator">→</span>
                  <span className="range-high">ATH: {formatNumber(price_range.all_time_high)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-divider"></div>

        {/* Trading Confidence */}
        <div className="section confidence-section">
          <h3>🎯 Trading Confidence</h3>
          
          <div className={`confidence-badge confidence-${trading_confidence.color}`}>
            {trading_confidence.level}
          </div>

          <div className="confidence-factors">
            {trading_confidence.factors.map((factor, idx) => (
              <div key={idx} className="confidence-factor">
                <span className="factor-bullet">•</span>
                <span>{factor}</span>
              </div>
            ))}
          </div>

          <div className="confidence-note">
            Based on {data_coverage.length} timeframes with {overall_quality}% data coverage
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="footer-info">
            <span>Data Source: {coin_info.data_source || 'Binance'}</span>
            <span>Last Updated: {formatDate(coin_info.last_updated)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoinDetailModal