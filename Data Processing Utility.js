// src/utils/dataProcessor.js

// Process raw data from Alpha Vantage API
export const processData = (rawData) => {
    if (!rawData || !rawData['Time Series (Daily)']) {
      return [];
    }
    
    const timeSeries = rawData['Time Series (Daily)'];
    
    return Object.entries(timeSeries).map(([date, values]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'], 10)
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  
  // Aggregate data based on selected timeframe
  export const aggregateData = (data, timeframe) => {
    if (!data || data.length === 0) return [];
    
    switch (timeframe) {
      case 'daily':
        return data;
        
      case 'weekly':
        return aggregateByPeriod(data, item => {
          const date = new Date(item.date);
          const year = date.getFullYear();
          const week = getWeekNumber(date);
          return `${year}-W${week}`;
        });
        
      case 'monthly':
        return aggregateByPeriod(data, item => {
          const date = new Date(item.date);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        });
        
      case 'quarterly':
        return aggregateByPeriod(data, item => {
          const date = new Date(item.date);
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          return `${date.getFullYear()}-Q${quarter}`;
        });
        
      case 'yearly':
        return aggregateByPeriod(data, item => {
          return new Date(item.date).getFullYear().toString();
        });
        
      default:
        return data;
    }
  };
  
  // Helper function to get ISO week number
  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };
  
  // Aggregate data by period (week, month, quarter, year)
  const aggregateByPeriod = (data, getPeriodKey) => {
    const periods = {};
    
    // Group data by period
    data.forEach(item => {
      const key = getPeriodKey(item);
      
      if (!periods[key]) {
        periods[key] = {
          items: [],
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          date: key
        };
      } else {
        periods[key].items.push(item);
        periods[key].high = Math.max(periods[key].high, item.high);
        periods[key].low = Math.min(periods[key].low, item.low);
        periods[key].close = item.close; // Last close price
        periods[key].volume += item.volume;
      }
    });
    
    return Object.values(periods).sort((a, b) => {
      // Sort by date
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return 0;
    });
  };