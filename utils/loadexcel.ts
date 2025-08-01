// utils/loadExcel.ts
import * as XLSX from 'xlsx';
import { useStore } from '../store';

export function loadExcelToStore(file: File) {
  // Validate that we have a valid File object
  if (!file || !(file instanceof File)) {
    console.error('Invalid file parameter. Expected a File object.');
    return;
  }

  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
  
      const parsed: Record<string, any[][]> = {};
      workbook.SheetNames.forEach((sheetName) => {
        parsed[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      });
  
      const store = useStore.getState();
      store.setSheets(parsed);
      store.setActiveSheet(workbook.SheetNames[0]);
      
      console.log(`Successfully loaded Excel file with ${workbook.SheetNames.length} sheets`);
    } catch (error) {
      console.error('Error loading Excel file:', error);
      alert('Error loading Excel file. Please make sure it\'s a valid Excel file.');
    }
  };
  
  reader.onerror = () => {
    console.error('Error reading file');
    alert('Error reading file. Please try again.');
  };
  
  reader.readAsArrayBuffer(file);
}
  