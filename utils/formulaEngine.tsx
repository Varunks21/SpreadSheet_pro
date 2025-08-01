const colLetterToIndex = (col: string): number =>
  col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 65 + 1, 0) - 1;

const getValueFromCellRef = (
  sheets: Record<string, any[][]>,
  currentSheet: string,
  ref: string
): any => {
  let sheetName = currentSheet;
  let cellRef = ref;

  
  
  if (ref.includes('!')) {
    const parts = ref.split('!');
    if (parts.length === 2) [sheetName, cellRef] = parts;
    else return 0;
  }

  const data = sheets[sheetName];
  if (!data) return 0;

  const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return 0; 

  const [, colLetters, rowStr] = match;
  const colIndex = colLetterToIndex(colLetters.toUpperCase());
  const rowIndex = parseInt(rowStr, 10) - 1;

  if (addDepFn) addDepFn(`${sheetName}!R${rowIndex}C${colIndex}`);

  return data?.[rowIndex]?.[colIndex] ?? 0;
};

let addDepFn: ((dep: string) => void) | undefined;

export function setDependencyTracker(fn?: (dep: string) => void) {
  addDepFn = fn;
}


// utils/formulaEngine.ts

export function extractCellRefsFromFormula(formula: string): string[] {
  const regex = /([A-Z]+[0-9]+)/g; // Matches A1, B2, etc.
  const matches = formula.match(regex) || [];
  return matches;
}

const getValuesFromRange = (
  sheets: Record<string, any[][]>,
  currentSheet: string,
  range: string
): any[] => {
  const [sheetPart, rangePart] = range.includes('!') ? range.split('!') : [currentSheet, range];
  const [startRef, endRef] = rangePart.split(':');
  const startMatch = startRef.match(/^([A-Z]+)(\d+)$/i);
  const endMatch = endRef.match(/^([A-Z]+)(\d+)$/i);
  const data = sheets[sheetPart];
  if (!data || !startMatch || !endMatch) return [];

  const startCol = colLetterToIndex(startMatch[1].toUpperCase());
  const startRow = parseInt(startMatch[2], 10) - 1;
  const endCol = colLetterToIndex(endMatch[1].toUpperCase());
  const endRow = parseInt(endMatch[2], 10) - 1;

  const values: any[] = [];
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      values.push(data?.[r]?.[c]);
    }
  }

  return values;
};

function parseArguments(expr: string): string[] {
  const args: string[] = [];
  let depth = 0, current = '';
  for (let char of expr) {
    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      if (char === '(') depth++;
      if (char === ')') depth--;
      current += char;
    }
  }
  if (current) args.push(current.trim());
  return args;
}

function parseDate(val: any): Date {
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  return new Date();
}

function countNetworkDays(start: Date, end: Date, holidays: Date[] = []): number {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    const isWeekend = (day === 0 || day === 6);
    const isHoliday = holidays.some(h => h.toDateString() === cur.toDateString());
    if (!isWeekend && !isHoliday) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function handleFormula(
  sheetName: string,
  row: number,
  col: number,
  formula: string,
  allSheets: Record<string, any[][]>
): any {
  if (!formula.startsWith('=')) return null;

  try {
    const expr = formula.slice(1);

    const evaluateFunction = (func: string, argString: string) => {
      const args = parseArguments(argString);

      switch (func.toUpperCase()) {
        // --- Math ---
        case 'SUM':
          return args.flatMap(a =>
            a.includes(':')
              ? getValuesFromRange(allSheets, sheetName, a)
              : [getValueFromCellRef(allSheets, sheetName, a)]
          ).reduce((a, b) => a + (parseFloat(b) || 0), 0);

        case 'AVERAGE': {
          const vals = args.flatMap(a =>
            a.includes(':') ? getValuesFromRange(allSheets, sheetName, a) : [getValueFromCellRef(allSheets, sheetName, a)]
          ).map(Number).filter(v => !isNaN(v));
          return vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
        }

        case 'MIN':
        case 'MAX': {
          const vals = args.flatMap(a =>
            a.includes(':') ? getValuesFromRange(allSheets, sheetName, a) : [getValueFromCellRef(allSheets, sheetName, a)]
          ).map(Number).filter(v => !isNaN(v));
          return func.toUpperCase() === 'MIN' ? Math.min(...vals) : Math.max(...vals);
        }

        case 'COUNT':
          return args.flatMap(a =>
            a.includes(':') ? getValuesFromRange(allSheets, sheetName, a) : [getValueFromCellRef(allSheets, sheetName, a)]
          ).filter(v => !isNaN(parseFloat(v))).length;

        case 'COUNTA':
          return args.flatMap(a =>
            a.includes(':') ? getValuesFromRange(allSheets, sheetName, a) : [getValueFromCellRef(allSheets, sheetName, a)]
          ).filter(v => v !== null && v !== undefined && v !== '').length;

        case 'PRODUCT':
          return args.flatMap(a =>
            a.includes(':') ? getValuesFromRange(allSheets, sheetName, a) : [getValueFromCellRef(allSheets, sheetName, a)]
          ).reduce((a, b) => a * (parseFloat(b) || 1), 1);

        case 'ABS':
          return Math.abs(evalExpression(args[0]));

        case 'ROUND':
          return Number(parseFloat(evalExpression(args[0])).toFixed(parseInt(args[1])));

        case 'MOD':
          return parseFloat(evalExpression(args[0])) % parseFloat(evalExpression(args[1]));

        case 'DIFFERENCE':
          return parseFloat(evalExpression(args[0])) - parseFloat(evalExpression(args[1]));

        case 'POWER':
          return Math.pow(parseFloat(evalExpression(args[0])), parseFloat(evalExpression(args[1])));

        // --- Logic ---
        case 'IF':
          return evalExpression(args[0]) ? evalExpression(args[1]) : evalExpression(args[2]);

        case 'AND':
          return args.every(arg => !!evalExpression(arg));

        case 'OR':
          return args.some(arg => !!evalExpression(arg));

        // --- Date & Time ---
        case 'TODAY':
          return new Date().toISOString().split('T')[0];

        case 'NOW':
          return new Date().toISOString();

        case 'DATE':
          return new Date(
            parseInt(evalExpression(args[0])),
            parseInt(evalExpression(args[1])) - 1,
            parseInt(evalExpression(args[2]))
          ).toISOString().split('T')[0];

        case 'DATEDIF': {
          const d1 = parseDate(evalExpression(args[0]));
          const d2 = parseDate(evalExpression(args[1]));
          const unit = args[2]?.replace(/['"]/g, '').toLowerCase();

          const diff = d2.getTime() - d1.getTime();
          const dayMs = 1000 * 60 * 60 * 24;

          switch (unit) {
            case 'd': return Math.floor(diff / dayMs);
            case 'm': return (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth();
            case 'y': return d2.getFullYear() - d1.getFullYear();
            default: return '#UNIT!';
          }
        }

        case 'EDATE': {
          const baseDate = parseDate(evalExpression(args[0]));
          const months = parseInt(evalExpression(args[1]));
          baseDate.setMonth(baseDate.getMonth() + months);
          return baseDate.toISOString().split('T')[0];
        }

        case 'NETWORKDAYS': {
          const start = parseDate(evalExpression(args[0]));
          const end = parseDate(evalExpression(args[1]));
          const holidays = args.slice(2).map(h => parseDate(evalExpression(h)));
          return countNetworkDays(start, end, holidays);
        }

        case 'WEEKDAY': {
          const date = parseDate(evalExpression(args[0]));
          const returnType = parseInt(evalExpression(args[1] || '1'));
          const day = date.getDay(); // Sunday: 0
          if (returnType === 1) return day === 0 ? 7 : day;
          if (returnType === 2) return day;
          return day + 1;
        }

        default:
          return '#FUNC?';
      }
    };

    const evalExpression = (input: string): any => {
      const match = input.match(/^([A-Z]+)\((.*)\)$/i);
      if (match) {
        return evaluateFunction(match[1], match[2]);
      }

      // Replace all cell references (cross-sheet supported)
      const replaced = input.replace(/([A-Za-z0-9_]+!)?[A-Z]+\d+/g, (match) => {
        const val = getValueFromCellRef(allSheets, sheetName, match);
        return typeof val === 'number' ? val : parseFloat(val) || 0;
      });

      return eval(replaced);
    };

    const result = evalExpression(expr);
    return result === undefined || Number.isNaN(result) ? '#ERROR' : result;

  } catch {
    return '#ERROR';
  }
}
