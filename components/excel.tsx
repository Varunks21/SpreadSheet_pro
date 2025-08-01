'use client';

import React, { useState } from 'react';
import { loadExcelToStore } from '../utils/loadexcel';

export default function ImportExcel({ onImport, hidden }: { onImport?: () => void, hidden?: boolean }) {
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      loadExcelToStore(file);
      if (onImport) onImport();
    }
  };

  if (hidden) {
    return (
      <div className="mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition"
          onClick={() => onImport && onImport()}
        >
          Replace file
        </button>
        {fileName && (
          <span className="ml-4 text-sm text-gray-600">Current: {fileName}</span>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-4 flex flex-col gap-2 items-start">
      <label className="block mb-1 text-sm font-medium text-gray-700">
        Upload Excel File
      </label>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {fileName && (
        <span className="text-sm text-gray-600">Selected: {fileName}</span>
      )}
    </div>
  );
}
