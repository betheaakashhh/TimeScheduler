// src/lib/parseAcademic.ts
import * as XLSX from 'xlsx';
import { AcademicPeriod } from '@/types';

/**
 * Parse PDF buffer using pdf-parse (text extraction).
 * We look for time patterns like "09:30 - 10:20" followed by subject names.
 */
export async function parsePdfTimetable(buffer: Buffer): Promise<Partial<AcademicPeriod>[]> {
  // Dynamic import to avoid SSR issues
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  return parseTextTimetable(data.text);
}

/**
 * Parse Excel/CSV buffer. Looks for columns with time and subject headers.
 */
export function parseExcelTimetable(buffer: Buffer, ext: 'xlsx' | 'csv'): Partial<AcademicPeriod>[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as string[][];
  return parseGridTimetable(rows);
}

/**
 * Core text parser — handles both PDF text and raw CSV text.
 * Regex-based extraction of time slots + subjects.
 */
function parseTextTimetable(text: string): Partial<AcademicPeriod>[] {
  const periods: Partial<AcademicPeriod>[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Match patterns like: "09:30 - 10:20 Compiler Design CS-201"
  // or: "9:30-10:20 | Compiler Design | Room 201"
  const timePattern = /(\d{1,2}:\d{2})\s*[-–to]+\s*(\d{1,2}:\d{2})/gi;

  const dayMap: Record<string, number> = {
    monday: 1, mon: 1, tuesday: 2, tue: 2, wednesday: 3, wed: 3,
    thursday: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6, sunday: 7, sun: 7,
  };

  let currentDays: number[] = [1, 2, 3, 4, 5];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Detect day headers
    for (const [dayName, dayNum] of Object.entries(dayMap)) {
      if (lowerLine === dayName || lowerLine.startsWith(dayName + ' ') || lowerLine.endsWith(' ' + dayName)) {
        currentDays = [dayNum];
      }
    }

    const match = timePattern.exec(line);
    if (match) {
      const startTime = normalizeTime(match[1]);
      const endTime = normalizeTime(match[2]);
      const rest = line.slice(match.index + match[0].length).trim();
      const parts = rest.split(/[\|,\t]/).map((p) => p.trim()).filter(Boolean);
      const subject = parts[0] || 'Unknown Subject';
      const room = parts[1] || undefined;

      // Skip lunch/break patterns
      if (/lunch|break|recess/i.test(subject)) {
        periods.push({ subject: 'Lunch Break', startTime, endTime, room: '—', dayOfWeek: currentDays, isLab: false });
        continue;
      }

      periods.push({
        subject,
        startTime,
        endTime,
        room,
        dayOfWeek: [...currentDays],
        isLab: /lab|practical/i.test(subject),
      });
    }
    timePattern.lastIndex = 0;
  }

  return periods;
}

/**
 * Parse grid-style Excel timetable.
 * Assumes row 0 = day headers, col 0 = time slots, cells = subjects.
 */
function parseGridTimetable(rows: string[][]): Partial<AcademicPeriod>[] {
  if (rows.length < 2) return [];

  const dayMap: Record<string, number> = {
    monday: 1, mon: 1, tuesday: 2, tue: 2, wednesday: 3, wed: 3,
    thursday: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6,
  };

  const headerRow = rows[0].map((h) => (h || '').toLowerCase().trim());
  const dayColumns: Record<number, number> = {};

  headerRow.forEach((header, colIdx) => {
    for (const [name, num] of Object.entries(dayMap)) {
      if (header.includes(name)) dayColumns[colIdx] = num;
    }
  });

  const periods: Partial<AcademicPeriod>[] = [];
  const timePattern = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/;

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const timeCell = (row[0] || '').trim();
    const tm = timePattern.exec(timeCell);
    if (!tm) continue;

    const startTime = normalizeTime(tm[1]);
    const endTime = normalizeTime(tm[2]);

    for (const [colIdxStr, dayNum] of Object.entries(dayColumns)) {
      const colIdx = parseInt(colIdxStr);
      const subject = (row[colIdx] || '').trim();
      if (!subject || subject === '-') continue;

      periods.push({
        subject,
        startTime,
        endTime,
        dayOfWeek: [dayNum],
        isLab: /lab|practical/i.test(subject),
      });
    }
  }

  return mergeConsecutive(periods);
}

function normalizeTime(t: string): string {
  const [h, m] = t.split(':');
  return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
}

/** Merge same-subject consecutive periods (lab sessions etc.) */
function mergeConsecutive(periods: Partial<AcademicPeriod>[]): Partial<AcademicPeriod>[] {
  const result: Partial<AcademicPeriod>[] = [];
  for (const p of periods) {
    const last = result[result.length - 1];
    if (
      last &&
      last.subject === p.subject &&
      last.endTime === p.startTime &&
      JSON.stringify(last.dayOfWeek) === JSON.stringify(p.dayOfWeek)
    ) {
      last.endTime = p.endTime;
      if (last.isLab !== undefined) last.isLab = true;
    } else {
      result.push({ ...p });
    }
  }
  return result;
}

export function assignSubjectColors(subjects: string[]): Record<string, string> {
  const palette = ['#4A90D9','#2DCB7A','#FF6B35','#9B59B6','#E74C3C','#F39C12','#1ABC9C','#34495E','#E67E22','#3498DB'];
  const map: Record<string, string> = {};
  const unique = [...new Set(subjects)];
  unique.forEach((s, i) => { map[s] = palette[i % palette.length]; });
  return map;
}
