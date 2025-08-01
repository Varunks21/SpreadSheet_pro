// store.ts
import { create } from 'zustand';

interface StoreState {
  sheets: Record<string, any[][]>;
  activeSheet: string;
  cellDependencies: Record<string, Set<string>>;
  formulaMap: Record<string, string>;
  reverseDependencies: Record<string, Set<string>>;
  setSheets: (sheets: Record<string, any[][]>) => void;
  setActiveSheet: (sheetName: string) => void;
  updateCell: (sheetName: string, row: number, col: number, value: any) => void;
  addSheet: (sheetName: string) => void;
  renameSheet: (oldName: string, newName: string) => void;
  deleteSheet: (sheetName: string) => void;
  addDependencies: (cellKey: string, refs: string[], formula: string) => void;
  removeDependenciesForCell: (cellKey: string) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  sheets: {},
  activeSheet: '',
  cellDependencies: {},
  formulaMap: {},
  reverseDependencies: {},

  setSheets: (sheets) => set({ sheets }),

  setActiveSheet: (sheetName) => set({ activeSheet: sheetName }),

  updateCell: (sheetName, row, col, value) => {
    set((state) => {
      const updatedSheets = { ...state.sheets };
      if (!updatedSheets[sheetName]) {
        updatedSheets[sheetName] = [];
      }
      if (!updatedSheets[sheetName][row]) {
        updatedSheets[sheetName][row] = [];
      }
      updatedSheets[sheetName][row][col] = value;
      return { sheets: updatedSheets };
    });
  },

  addSheet: (sheetName) => {
    set((state) => {
      const updatedSheets = { ...state.sheets };
      updatedSheets[sheetName] = [];
      return { sheets: updatedSheets };
    });
  },

  renameSheet: (oldName, newName) => {
    set((state) => {
      const updatedSheets = { ...state.sheets };
      if (updatedSheets[oldName]) {
        updatedSheets[newName] = updatedSheets[oldName];
        delete updatedSheets[oldName];
      }
      const newActiveSheet = state.activeSheet === oldName ? newName : state.activeSheet;
      return { sheets: updatedSheets, activeSheet: newActiveSheet };
    });
  },

  deleteSheet: (sheetName) => {
    set((state) => {
      const updatedSheets = { ...state.sheets };
      delete updatedSheets[sheetName];
      
      let newActiveSheet = state.activeSheet;
      if (state.activeSheet === sheetName) {
        const remainingSheets = Object.keys(updatedSheets);
        newActiveSheet = remainingSheets.length > 0 ? remainingSheets[0] : '';
      }
      
      return { sheets: updatedSheets, activeSheet: newActiveSheet };
    });
  },

  addDependencies: (cellKey, refs, formula) => {
    set((state) => {
      const updatedDependencies = { ...state.cellDependencies };
      const updatedFormulaMap = { ...state.formulaMap };
      const updatedReverseDependencies = { ...state.reverseDependencies };

      // Remove old dependencies
      if (updatedDependencies[cellKey]) {
        for (const oldRef of updatedDependencies[cellKey]) {
          if (updatedReverseDependencies[oldRef]) {
            updatedReverseDependencies[oldRef].delete(cellKey);
          }
        }
      }

      // Add new dependencies
      updatedDependencies[cellKey] = new Set(refs);
      updatedFormulaMap[cellKey] = formula;

      for (const ref of refs) {
        if (!updatedReverseDependencies[ref]) {
          updatedReverseDependencies[ref] = new Set();
        }
        updatedReverseDependencies[ref].add(cellKey);
      }

      return {
        cellDependencies: updatedDependencies,
        formulaMap: updatedFormulaMap,
        reverseDependencies: updatedReverseDependencies,
      };
    });
  },

  removeDependenciesForCell: (cellKey) => {
    set((state) => {
      const updatedDependencies = { ...state.cellDependencies };
      const updatedFormulaMap = { ...state.formulaMap };
      const updatedReverseDependencies = { ...state.reverseDependencies };

      // Remove from reverse dependencies
      if (updatedDependencies[cellKey]) {
        for (const ref of updatedDependencies[cellKey]) {
          if (updatedReverseDependencies[ref]) {
            updatedReverseDependencies[ref].delete(cellKey);
          }
        }
      }

      // Remove the cell's dependencies
      delete updatedDependencies[cellKey];
      delete updatedFormulaMap[cellKey];

      return {
        cellDependencies: updatedDependencies,
        formulaMap: updatedFormulaMap,
        reverseDependencies: updatedReverseDependencies,
      };
    });
  },
}));
