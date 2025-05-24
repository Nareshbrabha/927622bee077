import React, { useEffect, useState } from 'react';
import './App.css';

// Utility functions
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function stddev(arr) {
  const m = mean(arr);
  return Math.sqrt(mean(arr.map(x => (x - m) ** 2)));
}
function covariance(arr1, arr2) {
  const m1 = mean(arr1);
  const m2 = mean(arr2);
  return mean(arr1.map((x, i) => (x - m1) * (arr2[i] - m2)));
}
function pearson(arr1, arr2) {
  return covariance(arr1, arr2) / ((stddev(arr1) * stddev(arr2)) || 1);
}

function App() {
  const [stocksList, setStocksList] = useState([]);
  const [selectedStocks, setSelectedStocks] = useState([]);
  const [minutes, setMinutes] = useState(30);
  const [priceHistories, setPriceHistories] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [correlation, setCorrelation] = useState([]);

  // Fetch all stocks on mount
  useEffect(() => {
    fetch('http://20.244.56.144/evaluation-service/stocks')
      .then(res => res.json())
      .then(data => {
        const stocks = Object.entries(data.stocks).map(([name, symbol]) => ({ name, symbol }));
        setStocksList(stocks);
      });
  }, []);

  // Fetch price histories for selected stocks
  const fetchPrices = async () => {
    setLoading(true);
    setError('');
    let histories = {};
    try {
      for (let stock of selectedStocks) {
        const res = await fetch(`http://20.244.56.144/evaluation-service/stocks/${stock}?minutes=${minutes}`);
        const data = await res.json();
        histories[stock] = Array.isArray(data) ? data : [data.stock];
      }
      setPriceHistories(histories);

      // Correlation matrix
      const matrix = selectedStocks.map((s1, i) =>
        selectedStocks.map((s2, j) => {
          if (i === j) return 1;
          const arr1 = (histories[s1] || []).map(p => p.price);
          const arr2 = (histories[s2] || []).map(p => p.price);
          const minLen = Math.min(arr1.length, arr2.length);
          return minLen > 1 ? pearson(arr1.slice(-minLen), arr2.slice(-minLen)) : 0;
        })
      );
      setCorrelation(matrix);
    } catch (e) {
      setError('Failed to fetch stock prices.');
    }
    setLoading(false);
  };

  // Chart rendering (SVG, no chart libs)
  function renderChart(prices) {
    if (!prices.length) return null;
    const w = 300, h = 100;
    const maxP = Math.max(...prices);
    const minP = Math.min(...prices);
    const avg = mean(prices);
    const points = prices.map((p, i) => `${(i / (prices.length - 1)) * w},${h - ((p - minP) / (maxP - minP || 1)) * h}`).join(' ');
    const avgY = h - ((avg - minP) / (maxP - minP || 1)) * h;
    return (
      <svg width={w} height={h} style={{ background: '#222', margin: 8 }}>
        <polyline fill="none" stroke="#61dafb" strokeWidth="2" points={points} />
        <line x1="0" y1={avgY} x2={w} y2={avgY} stroke="orange" strokeDasharray="4" />
      </svg>
    );
  }

  // Heatmap rendering (SVG)
  function renderHeatmap() {
    if (!correlation.length) return null;
    const n = correlation.length;
    const cellSize = 40;
    function color(val) {
      // blue (neg) - white (0) - red (pos)
      const r = val > 0 ? Math.round(255 * val) : 0;
      const b = val < 0 ? Math.round(255 * -val) : 0;
      return `rgb(${r},${255 - Math.abs(r - b)},${b})`;
    }
    return (
      <svg width={cellSize * n + 80} height={cellSize * n + 40} style={{ margin: 8, border: '1px solid #fff', background: '#222' }}>
        {/* Axis labels */}
        {selectedStocks.map((s, i) => (
          <text key={'x' + s} x={i * cellSize + cellSize / 2 + 60} y={30} fontSize="12" fill="#fff" textAnchor="middle">{s}</text>
        ))}
        {selectedStocks.map((s, i) => (
          <text key={'y' + s} x={55} y={i * cellSize + cellSize / 2 + 45} fontSize="12" fill="#fff" textAnchor="end">{s}</text>
        ))}
        {/* Cells */}
        {correlation.map((row, i) =>
          row.map((val, j) => (
            <g key={i + '-' + j}>
              <rect x={j * cellSize + 60} y={i * cellSize + 40} width={cellSize} height={cellSize} fill={color(val)} stroke="#333" />
              <text x={j * cellSize + cellSize / 2 + 60} y={i * cellSize + cellSize / 2 + 55} fontSize="14" fill="#000" textAnchor="middle">{val.toFixed(2)}</text>
            </g>
          ))
        )}
      </svg>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Stock Price Aggregator</h1>
        <div style={{ marginBottom: 16 }}>
          <label>Select stocks: </label>
          <select multiple value={selectedStocks} onChange={e => setSelectedStocks(Array.from(e.target.selectedOptions, o => o.value))} style={{ minWidth: 200, minHeight: 80 }}>
            {stocksList.map(s => <option key={s.symbol} value={s.symbol}>{s.name} ({s.symbol})</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Last <input type="number" min="1" max="120" value={minutes} onChange={e => setMinutes(e.target.value)} style={{ width: 60 }} /> minutes</label>
        </div>
        <button onClick={fetchPrices} disabled={loading || !selectedStocks.length} style={{ padding: '8px 16px', fontSize: 16 }}>
          {loading ? 'Loading...' : 'Fetch Data'}
        </button>
        {error && <div style={{ color: 'red', margin: 10 }}>{error}</div>}
        {/* Stock charts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 24 }}>
          {selectedStocks.map(s => {
            const prices = (priceHistories[s] || []).map(p => p.price);
            const avg = mean(prices).toFixed(2);
            const sd = stddev(prices).toFixed(2);
            return (
              <div key={s} style={{ margin: 12, background: '#333', padding: 12, borderRadius: 8 }}>
                <h3>{s}</h3>
                {renderChart(prices)}
                <div>Avg: <b>{avg}</b> | Std Dev: <b>{sd}</b></div>
              </div>
            );
          })}
        </div>
        {/* Correlation heatmap */}
        {selectedStocks.length > 1 && (
          <div style={{ marginTop: 32 }}>
            <h2>Correlation Heatmap</h2>
            {renderHeatmap()}
            <div style={{ marginTop: 8, color: '#fff' }}>
              <span style={{ background: 'rgb(0,255,255)', padding: '2px 8px', marginRight: 8 }}>-1</span>
              <span style={{ background: 'rgb(255,255,255)', padding: '2px 8px', marginRight: 8 }}>0</span>
              <span style={{ background: 'rgb(255,255,0)', padding: '2px 8px', marginRight: 8 }}>+1</span>
              <span style={{ marginLeft: 12 }}>Correlation: blue (negative) → white (none) → red (positive)</span>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
