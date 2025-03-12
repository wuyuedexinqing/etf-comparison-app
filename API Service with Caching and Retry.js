// src/services/api.js
import axios from 'axios';

// In-memory cache
const cache = {
  data: {},
  timestamps: {}
};

// Cache expiration time (in milliseconds)
const CACHE_EXPIRATION = 60 * 60 * 1000; // 1 hour

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Alpha Vantage API key (replace with your actual key)
const API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY;

// Check if data is in cache and not expired
const isValidCache = (symbol, timeframe) => {
  const key = `${symbol}-${timeframe}`;
  const timestamp = cache.timestamps[key];
  
  if (!timestamp) return false;
  
  const now = new Date().getTime();
  return (now - timestamp) < CACHE_EXPIRATION && cache.data[key];
};

// Fetch data with retry mechanism
const fetchWithRetry = async (url, retries = 0) => {
  try {
    const response = await axios.get(url);
    return { success: true, data: response.data };
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`Retry attempt ${retries + 1} for URL: ${url}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, retries + 1);
    }
    return { success: false, error: error.message };
  }
};

// Fetch ETF data from Alpha Vantage
export const fetchETFData = async (symbol, outputSize = 'full') => {
  const cacheKey = `${symbol}-${outputSize}`;
  
  // Check cache first
  if (isValidCache(symbol, outputSize)) {
    console.log(`Using cached data for ${symbol}`);
    return { success: true, data: cache.data[cacheKey] };
  }
  
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputSize}&apikey=${API_KEY}`;
  
  const result = await fetchWithRetry(url);
  
  // Update cache if fetch was successful
  if (result.success) {
    cache.data[cacheKey] = result.data;
    cache.timestamps[cacheKey] = new Date().getTime();
  }
  
  return result;
};