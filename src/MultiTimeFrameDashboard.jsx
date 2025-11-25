import { useState, useEffect } from 'react'
import './MultiTimeframe.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

function MultiTimeframeDashboard() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedCoin, setSelectedCoin] = useState(null)
  const [topN, setTopN] = useState(10)

  const timeframes = ['15m', '30m', '1h', '4h', '12h', '1d', '1w']
  
  const startMultiScan = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/scan/multi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ top_n: topN })
      })
      
      if (!response.ok) throw new Error('Scan failed')
      
      // Poll for completion
      const checkInterval = setInterval(async () => {
        const statusRes = await fetch(`${API_URL}/api/status`)
        const status = await statusRes.json()
        
        if (!status.running) {
          clearInterval(checkInterval)
          await loadResults()
          setLoading(false)
        }
      }, 2000)
      
    } catch (error) {
      console.error('Scan failed:', error)
      alert('Failed to start scan. Make sure API server is running.')
      setLoading(false)
    }
  }

  const loadResults = async () => {
    try {
      const response = await fetch(`${API_URL}/api/results/multi/latest`)
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Failed to load results:', error)
    }
  }

  const getTrendColor = (pct) => {
    if (pct > 10) return 'very-bullish'
    if (pct > 5) return 'bullish'
    if (pct > 0) return 'slightly-bullish'
    if (pct > -5) return 'neutral'
    if (pct > -10) return 'slightly-bearish'
    return 'bearish'
  }

  const getTrendIcon = (pct) => {
    if (pct > 5) return '▲▲'
    if (pct > 0) return '▲'
    if (pct > -5) return '━'
    if (pct > -10) return '▼'
    return '▼▼'
  }

  const CoinDetailView = ({ coin }) => {
    const tfData = coin.timeframe_data || {}
    
    return (
      <div className="coin-detail-panel">
        <div className="detail-header">
          <h2>#{coin.rank} {coin.name} ({coin.symbol})</h2>
          <button onClick={() => setSelectedCoin(null)} className="close-btn">✕</button>
        </div>
        
        <div className="detail-summary">
          <div className="summary-card">
            <span className="summary-label">Primary Trend</span>
            <span className={`summary-value ${coin.primary_trend.toLowerCase()}`}>
              {coin.primary_trend}
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Alignment</span>
            <span className="summary-value">{coin.alignment_score.toFixed(1)}%</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Bullish TF</span>
            <span className="summary-value bullish">{coin.bullish_timeframes}/{coin.total_timeframes}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Bearish TF</span>
            <span className="summary-value bearish">{coin.bearish_timeframes}/{coin.total_timeframes}</span>
          </div>
        </div>

        <div className="timeframe-grid">
          {timeframes.map(tf => {
            const data = tfData[tf]
            if (!data) {
              return (
                <div key={tf} className="timeframe-card unavailable">
                  <div className="tf-header">
                    <span className="tf-name">{tf.toUpperCase()}</span>
                  </div>
                  <div className="tf-body">
                    <span className="tf-na">No Data</span>
                  </div>
                </div>
              )
            }
            
            return (
              <div key={tf} className={`timeframe-card ${getTrendColor(data.pct)}`}>
                <div className="tf-header">
                  <span className="tf-name">{tf.toUpperCase()}</span>
                  <span className="tf-icon">{getTrendIcon(data.pct)}</span>
                </div>
                <div className="tf-body">
                  <div className="tf-pct">{data.pct > 0 ? '+' : ''}{data.pct.toFixed(2)}%</div>
                  <div className="tf-trend">{data.trend}</div>
                  <div className="tf-position">{data.above ? 'Above EMA' : 'Below EMA'}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="timeframe-heatmap">
          <h3>Timeframe Heatmap</h3>
          <div className="heatmap-row">
            {timeframes.map(tf => {
              const data = tfData[tf]
              const pct = data ? data.pct : null
              
              return (
                <div key={tf} className="heatmap-cell">
                  <div className="heatmap-label">{tf}</div>
                  <div 
                    className={`heatmap-bar ${pct !== null ? getTrendColor(pct) : 'unavailable'}`}
                    style={{ 
                      height: pct !== null ? `${Math.abs(pct) * 2}px` : '20px',
                      maxHeight: '100px'
                    }}
                    title={pct !== null ? `${pct.toFixed(2)}%` : 'N/A'}
                  ></div>
                  {pct !== null && (
                    <div className="heatmap-value">{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="multi-timeframe-app">
      <div className="scanlines"></div>
      <div className="grid-bg"></div>

      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">MULTI-TIMEFRAME SCANNER</span>
          </div>
          {results && (
            <div className="header-stats">
              <div className="header-stat">
                <span className="header-stat-label">COINS</span>
                <span className="header-stat-value">{results.analysis?.length || 0}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="container">
        <div className="control-panel">
          <h2 className="panel-title">MULTI-TIMEFRAME CONTROL</h2>
          
          <div className="controls">
            <div className="control-group">
              <label className="control-label">
                <span>TOP COINS</span>
                <input
                  type="number"
                  value={topN}
                  onChange={(e) => setTopN(Math.max(5, Math.min(50, parseInt(e.target.value) || 10)))}
                  min="5"
                  max="50"
                  className="control-input"
                  disabled={loading}
                />
              </label>
            </div>

            <div className="control-buttons">
              <button
                onClick={startMultiScan}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'SCANNING...' : 'RUN MULTI-TF SCAN'}
              </button>
              
              <button
                onClick={loadResults}
                disabled={loading}
                className="btn btn-outline"
              >
                LOAD LATEST
              </button>
            </div>
          </div>

          <div className="timeframe-legend">
            <span className="legend-title">Timeframes:</span>
            {timeframes.map(tf => (
              <span key={tf} className="legend-item">{tf.toUpperCase()}</span>
            ))}
          </div>
        </div>

        {selectedCoin && <CoinDetailView coin={selectedCoin} />}

        {results && !selectedCoin && (
          <div className="results-section">
            <h2 className="section-title">TIMEFRAME ALIGNMENT ANALYSIS</h2>
            <p className="section-desc">
              Coins sorted by alignment score - higher score means more timeframes agree on the trend
            </p>

            <div className="coins-table">
              <div className="table-header">
                <div className="th rank">Rank</div>
                <div className="th name">Coin</div>
                <div className="th trend">Trend</div>
                <div className="th align">Alignment</div>
                <div className="th bull">Bull TF</div>
                <div className="th bear">Bear TF</div>
                <div className="th timeframes">Timeframes (% from EMA50)</div>
                <div className="th action">Action</div>
              </div>

              {results.analysis?.map((coin, idx) => (
                <div key={idx} className="table-row">
                  <div className="td rank">#{coin.rank}</div>
                  <div className="td name">
                    <div className="coin-name-full">{coin.name}</div>
                    <div className="coin-symbol">{coin.symbol}</div>
                  </div>
                  <div className={`td trend ${coin.primary_trend.toLowerCase()}`}>
                    {coin.primary_trend}
                  </div>
                  <div className="td align">
                    <div className="align-bar">
                      <div 
                        className="align-fill"
                        style={{ width: `${coin.alignment_score}%` }}
                      ></div>
                    </div>
                    <span>{coin.alignment_score.toFixed(0)}%</span>
                  </div>
                  <div className="td bull">{coin.bullish_timeframes}</div>
                  <div className="td bear">{coin.bearish_timeframes}</div>
                  <div className="td timeframes">
                    <div className="tf-mini-grid">
                      {timeframes.map(tf => {
                        const data = coin.timeframe_data?.[tf]
                        if (!data) return (
                          <div key={tf} className="tf-mini na" title={`${tf}: No data`}>
                            <span className="tf-mini-label">{tf}</span>
                            <span className="tf-mini-value">-</span>
                          </div>
                        )
                        
                        return (
                          <div 
                            key={tf} 
                            className={`tf-mini ${getTrendColor(data.pct)}`}
                            title={`${tf}: ${data.pct.toFixed(2)}%`}
                          >
                            <span className="tf-mini-label">{tf}</span>
                            <span className="tf-mini-value">
                              {data.pct > 0 ? '+' : ''}{data.pct.toFixed(1)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="td action">
                    <button 
                      className="btn-details"
                      onClick={() => setSelectedCoin(coin)}
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!results && !loading && (
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <h3>NO MULTI-TIMEFRAME DATA</h3>
            <p>Run a multi-timeframe scan to see detailed analysis across 7 timeframes</p>
            <p className="empty-hint">15m · 30m · 1h · 4h · 12h · 1D · 1W</p>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>
          ⚡ Multi-Timeframe EMA Scanner · 7 Timeframes (15m to 1W) · 
          <span className="footer-highlight"> Complete Trend Analysis</span>
        </p>
        <p className="footer-warning">
          ⚠ For educational purposes only · Not financial advice · DYOR
        </p>
      </footer>
    </div>
  )
}

export default MultiTimeframeDashboard