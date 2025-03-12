// src/App.js
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TimeframeSelector from './components/TimeframeSelector';
import { fetchETFData } from './services/api';
import { processData, aggregateData } from './utils/dataProcessor';
import './App.css';

function App() {
  const [gldData, setGldData] = useState([]);
  const [ibitData, setIbitData] = useState([]);
  const [timeframe, setTimeframe] = useState('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch GLD data (Gold ETF)
        const gldResult = await fetchETFData('GLD');
        if (gldResult.success) {
          setGldData(processData(gldResult.data));
        } else {
          throw new Error(`Failed to fetch GLD data: ${gldResult.error}`);
        }
        
        // Fetch IBIT data (Bitcoin ETF)
        const ibitResult = await fetchETFData('IBIT');
        if (ibitResult.success) {
          setIbitData(processData(ibitResult.data));
        } else {
          throw new Error(`Failed to fetch IBIT data: ${ibitResult.error}`);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Process data based on selected timeframe
  const processedGldData = aggregateData(gldData, timeframe);
  const processedIbitData = aggregateData(ibitData, timeframe);

  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
  };

  if (isLoading) {
    return <div className="loading">Loading ETF data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="app-container">
      <header>
        <h1>Gold ETF vs Bitcoin ETF Performance Comparison</h1>
        <p>Compare the performance trends of GLD (since 2004) and IBIT (since 2024)</p>
      </header>
      
      <TimeframeSelector 
        currentTimeframe={timeframe} 
        onTimeframeChange={handleTimeframeChange} 
      />
      
      <div className="charts-container">
        <div className="chart-wrapper">
          <h2>GLD Performance (Gold ETF)</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={processedGldData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis 
                yAxisId="left"
                orientation="left"
                domain={['auto', 'auto']} 
                label={{ value: 'Price (USD)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#FFD700" 
                name="GLD Price" 
                yAxisId="left"
                dot={false}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-wrapper">
          <h2>IBIT Performance (Bitcoin ETF)</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={processedIbitData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={['auto', 'auto']} 
                label={{ value: 'Price (USD)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#F7931A" 
                name="IBIT Price" 
                yAxisId="right"
                dot={false}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default App;