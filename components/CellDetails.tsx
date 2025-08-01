'use client';

import { useState, useEffect } from 'react';
import { useStore } from '../store';

interface CellDetailsProps {
  selectedCell: { row: number; col: number } | null;
  activeSheet: string;
}

const CellDetails = ({ selectedCell, activeSheet }: CellDetailsProps) => {
  const { sheets } = useStore();
  const [cellValue, setCellValue] = useState<any>('');
  const [cellAddress, setCellAddress] = useState<string>('');

  useEffect(() => {
    if (selectedCell && activeSheet) {
      const { row, col } = selectedCell;
      const sheet = sheets[activeSheet];
      const value = sheet?.[row]?.[col] ?? '';
      setCellValue(value);
      
      // Convert to Excel-style address (A1, B2, etc.)
      const colLetter = String.fromCharCode(65 + col);
      const rowNumber = row + 1;
      setCellAddress(`${colLetter}${rowNumber}`);
    }
  }, [selectedCell, activeSheet, sheets]);

  if (!selectedCell) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm">Select a cell to view details</p>
        </div>
      </div>
    );
  }

  const isFormula = typeof cellValue === 'string' && cellValue.startsWith('=');
  const isNumber = typeof cellValue === 'number' || (!isNaN(parseFloat(cellValue)) && !isFormula);

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Cell Details</h3>
        <div className="text-sm text-gray-600">
          Sheet: <span className="font-medium">{activeSheet}</span>
        </div>
      </div>

      {/* Cell Address */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm font-medium text-gray-700 mb-1">Address:</div>
        <div className="text-lg font-mono text-blue-600">{cellAddress}</div>
      </div>

      {/* Cell Value */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Value:</div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="font-mono text-sm break-all">
            {cellValue === '' ? '(empty)' : String(cellValue)}
          </div>
        </div>
      </div>

      {/* Cell Type */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Type:</div>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            isFormula ? 'bg-purple-100 text-purple-700' :
            isNumber ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {isFormula ? 'Formula' : isNumber ? 'Number' : 'Text'}
          </span>
        </div>
      </div>

      {/* Formula Details */}
      {isFormula && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">Formula:</div>
          <div className="font-mono text-sm text-purple-700 break-all">
            {cellValue}
          </div>
        </div>
      )}

      {/* Number Formatting */}
      {isNumber && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Number Format:</div>
          <div className="space-y-2">
            <div className="text-xs text-gray-600">
              <strong>Raw:</strong> {cellValue}
            </div>
            <div className="text-xs text-gray-600">
              <strong>Formatted:</strong> {typeof cellValue === 'number' ? cellValue.toLocaleString() : parseFloat(cellValue).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">
              <strong>Currency:</strong> ₹{typeof cellValue === 'number' ? cellValue.toLocaleString() : parseFloat(cellValue).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">
              <strong>Percentage:</strong> {((typeof cellValue === 'number' ? cellValue : parseFloat(cellValue)) * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Cell History (placeholder) */}
      {/* <div className="mt-6 p-3 bg-yellow-50 rounded-lg">
        <div className="text-xs text-yellow-800">
          <strong>Tip:</strong> Use the toolbar above to format this cell with bold, italic, currency, etc.
        </div>
      </div> */}
    </div>
  );
};

export default CellDetails; 