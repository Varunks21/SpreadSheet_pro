'use client';

import { useRef, useState, useEffect } from 'react';
import { HotTable, HotTableClass } from '@handsontable/react';
import { useStore } from '../store';
import 'handsontable/dist/handsontable.full.min.css';
import ImportExcel from './excel';
import CurrencyConverter from './CurrencyConverter';
import CellDetails from './CellDetails';
import ExportExcel from './ExportExcel';
import AIAnalysis from './AIAnalysis';
import { handleFormula } from '../utils/formulaEngine';
import { extractCellRefsFromFormula } from '../utils/formulaEngine';

const Spreadsheet = () => {
  const {
    activeSheet,
    sheets,
    setActiveSheet,
    updateCell,
    addSheet,
    renameSheet,
    deleteSheet,
    cellDependencies,
    formulaMap,
    addDependencies,
    removeDependenciesForCell,
  } = useStore();

  const [renamingSheet, setRenamingSheet] = useState<string | null>(null);
  const [newSheetName, setNewSheetName] = useState('');
  const [imported, setImported] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [sidePanelMode, setSidePanelMode] = useState<'currency' | 'details' | 'export' | 'analysis'>('details');
  const [showAnalysisAfterImport, setShowAnalysisAfterImport] = useState(false);
  const hotRef = useRef<HotTableClass>(null);
  const sheetNames = Object.keys(sheets);

  const MAX_ROWS = 1000;
  const MAX_COLS = 100;

  const normalizeSheetData = (data: (string | number | null)[][]): (string | number | null)[][] => {
    const maxCols = Math.max(
      MAX_COLS,
      data.reduce((max, row) => Math.max(max, row.length), 0)
    );

    const normalizedData = [...data];
    for (let i = 0; i < normalizedData.length; i++) {
      while (normalizedData[i].length < maxCols) {
        normalizedData[i].push(null);
      }
    }

    while (normalizedData.length < MAX_ROWS) {
      const emptyRow = Array(maxCols).fill(null);
      normalizedData.push(emptyRow);
    }

    return normalizedData;
  };

  const recomputeDependents = (cellKey: string) => {
    const visited = new Set<string>();

    const compute = (key: string) => {
      if (visited.has(key)) return;
      visited.add(key);

      const dependents = cellDependencies[key];
      if (!dependents) return;

      for (const depKey of dependents) {
        const [sheet, rest] = depKey.split('!');
        const [, rowStr, colStr] = rest.match(/R(\d+)C(\d+)/) || [];
        if (!sheet || rowStr == null || colStr == null) continue;

        const row = parseInt(rowStr);
        const col = parseInt(colStr);
        const formula = formulaMap[depKey];

        if (formula) {
          const referenced = extractCellRefsFromFormula(formula);
          addDependencies(depKey, referenced, formula);
          const result = handleFormula(sheet, row, col, formula, sheets);
          updateCell(sheet, row, col, result);
          compute(depKey);
        }
      }
    };

    compute(cellKey);
  };

  const sheetData = normalizeSheetData(sheets[activeSheet] || []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterChange = (changes: any[] | null, source: string) => {
    if (changes && source !== 'loadData') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      changes.forEach(([row, col, , newValue]: any) => {
        const colIndex = typeof col === 'string' ? parseInt(col, 10) : col;
        const cellKey = `${activeSheet}!R${row}C${colIndex}`;
        if (!isNaN(colIndex)) {
          if (typeof newValue === 'string' && newValue.startsWith('=')) {
            removeDependenciesForCell(cellKey);
            const refs = extractCellRefsFromFormula(newValue);
            addDependencies(cellKey, refs, newValue);
            const result = handleFormula(activeSheet, row, colIndex, newValue.trim(), sheets);
            updateCell(activeSheet, row, colIndex, result);
            recomputeDependents(cellKey);
          } else {
            updateCell(activeSheet, row, colIndex, newValue);
            recomputeDependents(cellKey);
          }
        }
      });
    }
  };

  const afterSelection = (row: number, col: number) => {
    setSelectedCell({ row, col });
  };

  const handleAddSheet = () => {
    const sheetName = `Sheet${sheetNames.length + 1}`;
    addSheet(sheetName);
    setActiveSheet(sheetName);
  };

  const handleRenameSheet = (oldName: string, newName: string) => {
    if (newName && newName !== oldName) {
      renameSheet(oldName, newName);
    }
    setRenamingSheet(null);
  };

  const handleDeleteSheet = (name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteSheet(name);
    }
  };

  // Auto-show analysis after import
  useEffect(() => {
    if (showAnalysisAfterImport && sheetNames.length > 0) {
      setSidePanelMode('analysis');
      setShowAnalysisAfterImport(false);
    }
  }, [showAnalysisAfterImport, sheetNames.length]);

  const handleImport = () => {
    setImported(true);
    setShowAnalysisAfterImport(true);
  };

  // Show import if no sheets or not imported yet
  const showImport = sheetNames.length === 0 || !imported;

  // Style first row as dark, and summary/total rows as dark
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hotCells = (row: number, col: number) => {
    let className = '';
  
    // Header Row
    if (row === 0) {
      className = 'htFirstRow';
    } else {
      const rowData = sheetData?.[row];
      if (
        rowData &&
        rowData.some((cell: string | number | null) =>
          typeof cell === 'string' &&
          (/total/i.test(cell) || /sum/i.test(cell) || /=\s*sum\s*\(/i.test(cell))
        )
      ) {
        className = 'htSummaryRow';
      }
    }
  
    return {
      className,
    };
  };

  return (
    <div className="h-full w-full p-0 sm:p-4 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between py-4 px-4 sm:px-8 bg-white shadow-sm rounded-b-lg mb-4">
        <h1 className="text-2xl font-bold text-blue-700 tracking-tight">SpreadSheet Pro</h1>
        <div className="flex gap-2">
          <button
            onClick={handleAddSheet}
            className="px-3 py-1 bg-green-500 text-white rounded shadow hover:bg-green-600 transition"
          >
            + Add Sheet
          </button>
          <button
            onClick={() => setSidePanelMode('export')}
            className="px-3 py-1 bg-orange-500 text-white rounded shadow hover:bg-orange-600 transition"
            title="Export spreadsheet to Excel"
          >
            📊 Export
          </button>
          <button
            onClick={() => setSidePanelMode('analysis')}
            className="px-3 py-1 bg-purple-500 text-white rounded shadow hover:bg-purple-600 transition"
            title="AI Analysis using Cohere"
          >
            🤖 Cohere AI
          </button>
          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            className="px-3 py-1 bg-gray-500 text-white rounded shadow hover:bg-gray-600 transition"
          >
            {showSidePanel ? 'Hide' : 'Show'} Tools
          </button>
        </div>
      </header>

      {/* Import Excel */}
      {showImport && (
        <ImportExcel
          onImport={handleImport}
          hidden={imported && sheetNames.length > 0}
        />
      )}

      {/* Sheet Tabs */}
      {sheetNames.length > 0 && (
        <nav className="flex gap-2 flex-wrap mb-4 px-4 sm:px-8">
          {sheetNames.map((name) => (
            <div key={name} className="flex items-center gap-1">
              {renamingSheet === name ? (
                <input
                  className="px-2 py-1 rounded border border-blue-400 focus:ring-2 focus:ring-blue-300"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  onBlur={() => handleRenameSheet(name, newSheetName)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSheet(name, newSheetName);
                  }}
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setActiveSheet(name)}
                  className={`px-4 py-2 rounded-t-lg border-b-2 transition font-medium ${
                    name === activeSheet
                      ? 'bg-white border-blue-600 text-blue-700 shadow-sm'
                      : 'bg-blue-100 border-transparent text-blue-600 hover:bg-blue-200'
                  }`}
                >
                  {name}
                </button>
              )}
              <button onClick={() => {
                setRenamingSheet(name);
                setNewSheetName(name);
              }} className="text-sm text-gray-400 hover:text-blue-600">✎</button>
              <button onClick={() => handleDeleteSheet(name)} className="text-sm text-red-400 hover:text-red-600">🗑</button>
            </div>
          ))}
        </nav>
      )}

      {/* Main Content with Side Panel */}
      {sheetNames.length > 0 && (
        <div className="flex h-[calc(70vh-60px)]">
          {/* Spreadsheet Area */}
          <main className={`bg-white border border-blue-100 rounded-lg shadow-lg overflow-auto p-2 sm:p-4 ${
            showSidePanel ? 'flex-1' : 'w-full'
          }`}>
            <HotTable
              ref={hotRef}
              data={sheetData}
              rowHeaders
              colHeaders
              licenseKey="non-commercial-and-evaluation"
              manualRowResize
              manualColumnResize
              autoWrapRow
              autoWrapCol
              stretchH="last"
              width="100%"
              height="100%"
              viewportRowRenderingOffset="auto"
              viewportColumnRenderingOffset="auto"
              rowHeights={23}
              colWidths={100}
              persistentState={true}
              contextMenu={true}
              outsideClickDeselects={false}
              afterChange={afterChange}
              afterSelection={afterSelection}
              fixedRowsTop={1}
              cells={hotCells}
            />
          </main>

          {/* Side Panel */}
          {showSidePanel && (
            <div className="flex flex-col w-80">
              {/* Side Panel Tabs */}
              <div className="flex bg-gray-100">
                <button
                  onClick={() => setSidePanelMode('details')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition ${
                    sidePanelMode === 'details'
                      ? 'bg-white text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setSidePanelMode('currency')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition ${
                    sidePanelMode === 'currency'
                      ? 'bg-white text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Currency
                </button>
                <button
                  onClick={() => setSidePanelMode('export')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition ${
                    sidePanelMode === 'export'
                      ? 'bg-white text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Export
                </button>
                <button
                  onClick={() => setSidePanelMode('analysis')}
                  className={`flex-1 px-2 py-2 text-xs font-medium transition ${
                    sidePanelMode === 'analysis'
                      ? 'bg-white text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Cohere AI
                </button>
              </div>

              {/* Side Panel Content */}
              <div className="flex-1 overflow-y-auto">
                {sidePanelMode === 'details' ? (
                  <CellDetails selectedCell={selectedCell} activeSheet={activeSheet} />
                ) : sidePanelMode === 'currency' ? (
                  <CurrencyConverter />
                ) : sidePanelMode === 'export' ? (
                  <ExportExcel />
                ) : (
                  <AIAnalysis />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Spreadsheet;