'use client';

import { useState, useEffect } from 'react';
import { useStore } from '../store';

interface ExchangeRate {
  currency: string;
  rate: number;
  symbol: string;
}

const CurrencyConverter = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { sheets, updateCell } = useStore();

  // Fetch exchange rates from API
  const fetchExchangeRates = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Using a free currency API (you can replace with your preferred API)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
      const data = await response.json();
      
      const exchangeRates: ExchangeRate[] = [
        { currency: 'USD', rate: data.rates.USD, symbol: '$' },
        { currency: 'EUR', rate: data.rates.EUR, symbol: '€' },
        { currency: 'GBP', rate: data.rates.GBP, symbol: '£' },
        { currency: 'JPY', rate: data.rates.JPY, symbol: '¥' },
        { currency: 'AUD', rate: data.rates.AUD, symbol: 'A$' },
        { currency: 'CAD', rate: data.rates.CAD, symbol: 'C$' },
        { currency: 'CHF', rate: data.rates.CHF, symbol: 'CHF' },
        { currency: 'CNY', rate: data.rates.CNY, symbol: '¥' },
        { currency: 'SGD', rate: data.rates.SGD, symbol: 'S$' },
        { currency: 'AED', rate: data.rates.AED, symbol: 'د.إ' },
      ];
      
      setRates(exchangeRates);
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      setError('Failed to fetch exchange rates. Please try again.');
      
      // Fallback rates (approximate)
      const fallbackRates: ExchangeRate[] = [
        { currency: 'USD', rate: 0.012, symbol: '$' },
        { currency: 'EUR', rate: 0.011, symbol: '€' },
        { currency: 'GBP', rate: 0.0095, symbol: '£' },
        { currency: 'JPY', rate: 1.8, symbol: '¥' },
        { currency: 'AUD', rate: 0.018, symbol: 'A$' },
        { currency: 'CAD', rate: 0.016, symbol: 'C$' },
        { currency: 'CHF', rate: 0.011, symbol: 'CHF' },
        { currency: 'CNY', rate: 0.087, symbol: '¥' },
        { currency: 'SGD', rate: 0.016, symbol: 'S$' },
        { currency: 'AED', rate: 0.044, symbol: 'د.إ' },
      ];
      setRates(fallbackRates);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
  }, []);

  // Convert all numeric values in sheets to selected currency
  const convertAllSheets = () => {
    const selectedRate = rates.find(r => r.currency === selectedCurrency);
    if (!selectedRate) return;

    Object.keys(sheets).forEach(sheetName => {
      const sheet = sheets[sheetName];
      if (!sheet) return;

      sheet.forEach((row, rowIndex) => {
        if (!row) return;
        
        row.forEach((cell, colIndex) => {
          // Skip empty cells
          if (cell === null || cell === undefined || cell === '') {
            return;
          }

          // Check if cell is a number (not text, not formula)
          let numValue: number;
          
          if (typeof cell === 'number') {
            // Direct number value
            numValue = cell;
          } else if (typeof cell === 'string') {
            // Check if it's a formula (starts with =)
            if (cell.trim().startsWith('=')) {
              return; // Skip formulas
            }
            
            // Try to parse as number
            numValue = parseFloat(cell);
            if (isNaN(numValue)) {
              return; // Skip if not a valid number
            }
          } else {
            return; // Skip other types
          }

          // Convert the numeric value
          const convertedValue = numValue * selectedRate.rate;
          updateCell(sheetName, rowIndex, colIndex, convertedValue);
        });
      });
    });
  };

  const selectedRate = rates.find(r => r.currency === selectedCurrency);

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Currency Converter</h3>
        <p className="text-sm text-gray-600 mb-4">
          Convert INR to international currencies across all sheets
        </p>
      </div>

      {/* Exchange Rate Display */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Current Rate:</span>
          <button
            onClick={fetchExchangeRates}
            disabled={loading}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {selectedRate && (
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              1 INR = {selectedRate.symbol}{selectedRate.rate.toFixed(4)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {selectedCurrency}
            </div>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 text-sm mt-2">{error}</div>
        )}
      </div>

      {/* Currency Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Currency:
        </label>
        <select
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {rates.map((rate) => (
            <option key={rate.currency} value={rate.currency}>
              {rate.currency} ({rate.symbol})
            </option>
          ))}
        </select>
      </div>

      {/* Convert Button */}
      <button
        onClick={convertAllSheets}
        disabled={!selectedRate || loading}
        className="w-full py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        Convert All Sheets to {selectedCurrency}
      </button>

      {/* Exchange Rates List */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Available Rates:</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {rates.map((rate) => (
            <div
              key={rate.currency}
              className={`flex justify-between items-center p-2 rounded text-sm cursor-pointer transition ${
                rate.currency === selectedCurrency
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedCurrency(rate.currency)}
            >
              <span className="font-medium">{rate.currency}</span>
              <span className="text-gray-600">
                {rate.symbol}{rate.rate.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-3 bg-yellow-50 rounded-lg">
        <p className="text-xs text-yellow-800">
          <strong>Note:</strong> This will convert all numeric values in all sheets. 
          Formulas and text values will remain unchanged.
        </p>
      </div>
    </div>
  );
};

export default CurrencyConverter; 