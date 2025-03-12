// src/components/TimeframeSelector.js
import React from 'react';

const TimeframeSelector = ({ currentTimeframe, onTimeframeChange }) => {
  const timeframes = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'quarterly', label: 'Quarterly' },
    { id: 'yearly', label: 'Yearly' }
  ];

  return (
    <div className="timeframe-selector">
      <span>Select Timeframe: </span>
      {timeframes.map(frame => (
        <button
          key={frame.id}
          className={currentTimeframe === frame.id ? 'active' : ''}
          onClick={() => onTimeframeChange(frame.id)}
        >
          {frame.label}
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;