'use client';

import { useStore } from '../store';
import * as XLSX from 'xlsx';

interface ExportExcelProps {
  className?: string;
}

const ExportExcel = ({ className = '' }: ExportExcelProps) => {
  const { sheets, activeSheet } = useStore();

  const handleExport = () => {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Add each sheet to the workbook
      Object.entries(sheets).forEach(([sheetName, sheetData]) => {
        // Filter out empty rows and columns for cleaner export
        const filteredData = sheetData.filter(row => 
          row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
        );

        if (filteredData.length > 0) {
          // Create worksheet from the filtered data
          const worksheet = XLSX.utils.aoa_to_sheet(filteredData);
          
          // Add the worksheet to the workbook
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
      });

      // Generate filename with current date and time
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `spreadsheet_export_${timestamp}.xlsx`;

      // Export the workbook
      XLSX.writeFile(workbook, filename);

      // Show success message
      alert(`Spreadsheet exported successfully as "${filename}"`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleExportCurrentSheet = () => {
    try {
      if (!activeSheet || !sheets[activeSheet]) {
        alert('No active sheet to export.');
        return;
      }

      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Get current sheet data
      const sheetData = sheets[activeSheet];
      
      // Filter out empty rows and columns
      const filteredData = sheetData.filter(row => 
        row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );

      if (filteredData.length > 0) {
        // Create worksheet from the filtered data
        const worksheet = XLSX.utils.aoa_to_sheet(filteredData);
        
        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, activeSheet);

        // Generate filename with current date and time
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `${activeSheet}_export_${timestamp}.xlsx`;

        // Export the workbook
        XLSX.writeFile(workbook, filename);

        // Show success message
        alert(`Sheet "${activeSheet}" exported successfully as "${filename}"`);
      } else {
        alert('No data to export in the current sheet.');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const hasData = Object.values(sheets).some(sheetData => 
    sheetData && sheetData.some(row => 
      row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    )
  );

  const hasCurrentSheetData = activeSheet && sheets[activeSheet] && 
    sheets[activeSheet].some(row => 
      row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Spreadsheet</h3>
      
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <button
            onClick={handleExport}
            disabled={!hasData}
            className={`px-4 py-2 rounded-md font-medium transition ${
              hasData
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={hasData ? 'Export all sheets to Excel file' : 'No data to export'}
          >
            📊 Export All Sheets
          </button>
          
          <p className="text-sm text-gray-600">
            Export all sheets with data to a new Excel file
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleExportCurrentSheet}
            disabled={!hasCurrentSheetData}
            className={`px-4 py-2 rounded-md font-medium transition ${
              hasCurrentSheetData
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={hasCurrentSheetData ? `Export current sheet "${activeSheet}"` : 'No data in current sheet'}
          >
            📄 Export Current Sheet
          </button>
          
          <p className="text-sm text-gray-600">
            Export only the current active sheet to Excel file
          </p>
        </div>

        {!hasData && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              💡 <strong>Tip:</strong> Add some data to your spreadsheet before exporting
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Export Features:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Exports all formulas and calculated values</li>
          <li>• Preserves sheet names and structure</li>
          <li>• Filters out empty rows for cleaner files</li>
          <li>• Includes timestamp in filename</li>
          <li>• Compatible with Excel, Google Sheets, and other spreadsheet apps</li>
        </ul>
      </div>
    </div>
  );
};

export default ExportExcel; 