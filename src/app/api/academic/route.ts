// src/app/api/academic/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { cache, CACHE_KEYS } from '@/lib/redis';
import { parsePdfTimetable, parseExcelTimetable, assignSubjectColors } from '@/lib/parseAcademic';
import dayjs from 'dayjs';

function normaliseTime(t: string): string {
  if (!t) return '00:00';
  const clean = t.replace(/\s/g, '').toUpperCase();
  const pm = clean.endsWith('PM'), am = clean.endsWith('AM');
  const digits = clean.replace(/[APM:]/g, '');
  let h = 0, m = 0;
  if (digits.length <= 2)       { h = parseInt(digits) || 0; m = 0; }
  else if (digits.length === 3) { h = parseInt(digits[0]); m = parseInt(digits.slice(1)); }
  else                          { h = parseInt(digits.slice(0,2)); m = parseInt(digits.slice(2,4)); }
  if (pm && h !== 12) h += 12;
  if (am && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${String(m||0).padStart(2,'0')}`;
}

function parseDays(raw: string): number[] {
  const map: Record<string,number> = { mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sun:7, monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6,sunday:7 };
  const norm = raw.toLowerCase().replace(/[–\s]/g,'/');
  const parts = norm.split('/').map(p=>p.trim()).filter(Boolean);
  if (parts.length === 2 && map[parts[0]] && map[parts[1]]) {
    const s = map[parts[0]], e = map[parts[1]];
    if (e >= s) return Array.from({length: e-s+1}, (_,i) => s+i);
  }
  const days = parts.map(p => map[p]).filter(Boolean);
  return days.length > 0 ? [...new Set(days)].sort() : [1,2,3,4,5];
}

function parseRawCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h=>h.trim().toLowerCase());
  const col = (row: string[], ...keys: string[]) => { for (const k of keys) { const i=headers.indexOf(k); if(i>=0) return (row[i]||'').trim(); } return ''; };
  return lines.slice(1)
    .map(l => l.split(',').map(c=>c.trim()))
    .filter(r => col(r,'subject'))
    .map(r => ({
      subject:   col(r,'subject'),
      startTime: normaliseTime(col(r,'start','starttime','start_time')),
      endTime:   normaliseTime(col(r,'end','endtime','end_time')),
      room:      col(r,'room','classroom') || null,
      faculty:   col(r,'faculty','teacher') || null,
      dayOfWeek: parseDays(col(r,'day','days') || 'Mon-Fri'),
      isLab:     /lab|practical/i.test(col(r,'subject')),
    }));
}

function periodRow(p: any) {
  return { subject:p.subject, startTime:p.startTime, endTime:p.endTime, room:p.room||null, faculty:p.faculty||null, dayOfWeek:p.dayOfWeek||[1,2,3,4,5], isLab:p.isLab||false, color:p.color||null };
}

async function savePeriods(userId: string, periods: any[], slotStart: string, slotEnd: string) {
  if (!periods.length) return null;
  const colorMap = assignSubjectColors([...new Set(periods.map(p=>p.subject))]);
  const withColors = periods.map(p=>({...p, color: colorMap[p.subject]}));
  const existing = await prisma.academicTimetable.findUnique({ where:{userId} });
  if (existing) {
    await prisma.academicPeriod.deleteMany({ where:{timetableId:existing.id} });
    return prisma.academicTimetable.update({ where:{userId}, data:{ slotStart, slotEnd, parsedData:withColors as any, periods:{create:withColors.map(periodRow)} }, include:{periods:true} });
  }
  return prisma.academicTimetable.create({ data:{ userId, slotStart, slotEnd, parsedData:withColors as any, periods:{create:withColors.map(periodRow)} }, include:{periods:true} });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as {id?: string} | undefined)?.id;
  if (!userId) return NextResponse.json({error:'Unauthorized'},{status:401});
  const cached = await cache.get(CACHE_KEYS.academic(userId)).catch(()=>null);
  if (cached) return NextResponse.json(cached);
  const tt = await prisma.academicTimetable.findUnique({ where:{userId}, include:{periods:true} });
  if (!tt) return NextResponse.json({timetable:null, todayPeriods:[]});
  const dow = dayjs().day(); const d = dow===0?7:dow;
  const now = dayjs().format('HH:mm');
  const todayPeriods = tt.periods.filter(p=>p.dayOfWeek.includes(d)).sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(p=>({
    ...p,
    isCurrentlyActive: now>=p.startTime && now<p.endTime,
    minutesLeft: now>=p.startTime&&now<p.endTime ? parseInt(p.endTime.split(':')[0])*60+parseInt(p.endTime.split(':')[1]) - (parseInt(now.split(':')[0])*60+parseInt(now.split(':')[1])) : 0,
    isUpcoming: p.startTime>now,
  }));
  const result = {timetable:tt, todayPeriods};
  await cache.set(CACHE_KEYS.academic(userId), result, 300).catch(()=>{});
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
 
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({error:'Unauthorized'},{status:401});
  const ct = req.headers.get('content-type')||'';
  let parsedPeriods: any[] = [], slotStart='09:00', slotEnd='16:00';

  try {
    if (ct.includes('application/json')) {
      const body = await req.json();
      slotStart = body.slotStart||'09:00'; slotEnd = body.slotEnd||'16:00';
      if (body.csvText)             parsedPeriods = parseRawCsv(body.csvText);
      else if (Array.isArray(body.periods)) parsedPeriods = body.periods;
    } else if (ct.includes('multipart/form-data')) {
      const fd = await req.formData();
      const file = fd.get('file') as File|null;
      slotStart = (fd.get('slotStart') as string)||'09:00';
      slotEnd   = (fd.get('slotEnd')   as string)||'16:00';
      if (!file) return NextResponse.json({error:'No file'},{status:400});
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = (file.name.split('.').pop()||'').toLowerCase();
      if (ext==='pdf')                    parsedPeriods = await parsePdfTimetable(buf);
      else if (['xlsx','xls'].includes(ext)) parsedPeriods = parseExcelTimetable(buf,'xlsx');
      else if (ext==='csv')               parsedPeriods = parseRawCsv(buf.toString('utf8'));
      else return NextResponse.json({error:'Unsupported format'},{status:400});
    } else {
      return NextResponse.json({error:'Unsupported content-type'},{status:415});
    }

    if (!parsedPeriods.length)
      return NextResponse.json({error:'No periods found — check your CSV has: subject, start, end, room, day'},{status:422});

    const timetable = await savePeriods(userId, parsedPeriods, slotStart, slotEnd);
    await cache.del(CACHE_KEYS.academic(userId)).catch(()=>{});
    return NextResponse.json({ok:true, timetable, periodsCount:parsedPeriods.length});
  } catch(err:any) {
    console.error('Academic POST error:', err);
    return NextResponse.json({error:err.message||'Failed'},{status:500});
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if(!userId) return NextResponse.json({error:'Unauthorized'},{status:401});
  const {periodId,...rest} = await req.json();
  if (!periodId) return NextResponse.json({error:'periodId required'},{status:400});
  
  const tt = await prisma.academicTimetable.findUnique({where:{userId}});
  if (!tt) return NextResponse.json({error:'No timetable'},{status:404});
  const updated = await prisma.academicPeriod.update({where:{id:periodId},data:rest});
  await cache.del(CACHE_KEYS.academic(userId)).catch(()=>{});
  return NextResponse.json(updated);
}
