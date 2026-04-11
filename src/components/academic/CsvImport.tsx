'use client';
// src/components/academic/CsvImport.tsx
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle2, AlertTriangle, FileText, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#378ADD','#1D9E75','#FF6B35','#7F77DD','#D85A30','#0F6E56','#185FA5','#854F0B'];

function normaliseTime(t: string): string {
  if (!t) return '00:00';
  const clean = t.replace(/\s/g,'').toUpperCase();
  const pm = clean.endsWith('PM'), am = clean.endsWith('AM');
  const digits = clean.replace(/[APM:]/g,'');
  let h=0,m=0;
  if (digits.length<=2){h=parseInt(digits)||0;m=0;}
  else if (digits.length===3){h=parseInt(digits[0]);m=parseInt(digits.slice(1));}
  else{h=parseInt(digits.slice(0,2));m=parseInt(digits.slice(2,4));}
  if(pm&&h!==12)h+=12; if(am&&h===12)h=0;
  return `${String(h).padStart(2,'0')}:${String(m||0).padStart(2,'0')}`;
}

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length<2) throw new Error('CSV needs a header row + at least one data row');
  const headers = lines[0].split(',').map(h=>h.trim().toLowerCase());
  const need=['subject','start','end'];
  for(const n of need) if(!headers.includes(n)) throw new Error(`Missing column: "${n}"`);
  const col=(row:string[],...keys:string[])=>{for(const k of keys){const i=headers.indexOf(k);if(i>=0)return(row[i]||'').trim();}return '';};
  return lines.slice(1)
    .map(l=>l.split(',').map(c=>c.trim()))
    .filter(r=>col(r,'subject'))
    .map(r=>({
      subject:col(r,'subject'),
      start:normaliseTime(col(r,'start','starttime','start_time')),
      end:normaliseTime(col(r,'end','endtime','end_time')),
      room:col(r,'room','classroom')||'—',
      day:col(r,'day','days')||'Mon-Fri',
    }));
}

function fmt(t:string){const[h,m]=t.split(':').map(Number);const ap=h>=12?'PM':'AM';const hh=h%12||12;return `${hh}:${String(m).padStart(2,'0')} ${ap}`;}

function assignColors(periods:any[]){
  const subjects=[...new Set(periods.map(p=>p.subject))];
  const map:Record<string,string>={};
  subjects.forEach((s:any,i)=>{map[s]=COLORS[i%COLORS.length];});
  return periods.map(p=>({...p,color:map[p.subject]}));
}

const SAMPLE=`subject,start,end,room,day
Compiler Design,09:30,10:20,CS-201,Mon-Fri
Principles of Management,10:25,11:15,LH-101,Mon-Fri
DBMS,11:20,12:10,CS-301,Mon/Wed/Fri
Lunch Break,12:10,13:00,—,Mon-Fri
Web Tech Lab,13:00,15:50,Lab-2,Tue/Thu
Compiler Design Lab,13:00,15:50,Lab-1,Mon/Wed
Data Structures,14:00,14:50,CS-102,Fri`;

interface Props { slotStart?:string; slotEnd?:string; onImported?:()=>void; }

export default function CsvImport({ slotStart='09:00', slotEnd='16:00', onImported }:Props) {
  const [rawCsv, setRawCsv]=useState('');
  const [parsed, setParsed]=useState<any[]>([]);
  const [fileName, setFileName]=useState('');
  const [error, setError]=useState('');
  const [importing, setImporting]=useState(false);
  const [done, setDone]=useState(false);

  function process(text:string, name:string){
    setError('');setDone(false);setFileName(name);
    try{const rows=parseCsv(text);if(!rows.length)throw new Error('No valid rows');setRawCsv(text);setParsed(assignColors(rows));}
    catch(e:any){setError(e.message);setParsed([]);}
  }

  const onDrop=useCallback((files:File[])=>{
    const f=files[0];if(!f)return;
    const r=new FileReader();r.onload=e=>process(e.target?.result as string,f.name);r.readAsText(f);
  },[]);

  const {getRootProps,getInputProps,isDragActive}=useDropzone({onDrop,accept:{'text/csv':['.csv'],'text/plain':['.txt']},multiple:false});

  async function doImport(){
    if(!rawCsv)return; setImporting(true);
    try{
      const res=await fetch('/api/academic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csvText:rawCsv,slotStart,slotEnd})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Import failed');
      toast.success(`Imported ${data.periodsCount} periods!`);
      setDone(true); onImported?.();
    }catch(e:any){toast.error(e.message);}
    finally{setImporting(false);}
  }

  return(
    <div>
      <div {...getRootProps()} style={{border:`1.5px dashed ${isDragActive?'var(--accent)':error?'rgba(226,75,74,0.5)':'var(--border2)'}`,borderRadius:10,padding:28,textAlign:'center',cursor:'pointer',background:isDragActive?'rgba(255,107,53,0.03)':'transparent',transition:'all 0.15s',marginBottom:14}}>
        <input {...getInputProps()}/>
        <Upload size={32} color="var(--text3)" style={{margin:'0 auto 10px'}}/>
        <div style={{fontSize:13,fontWeight:500,marginBottom:3}}>{isDragActive?'Drop here!':'Drag & drop or click to upload'}</div>
        <div style={{fontSize:12,color:'var(--text3)',marginBottom:10}}>Columns: <code style={{fontFamily:'var(--font-mono)',background:'var(--surface2)',padding:'1px 5px',borderRadius:4,fontSize:11}}>subject, start, end, room, day</code></div>
        <button className="btn btn-primary btn-sm" onClick={e=>e.stopPropagation()}>Browse file</button>
      </div>

      <AnimatePresence>
        {error&&(<motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 13px',borderRadius:8,background:'rgba(226,75,74,0.08)',border:'0.5px solid rgba(226,75,74,0.3)',marginBottom:12,fontSize:13,color:'#791F1F'}}>
          <AlertTriangle size={14}/>{error}
        </motion.div>)}
      </AnimatePresence>

      <AnimatePresence>
        {parsed.length>0&&(
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:10}}>
              <FileText size={14} color="var(--text3)"/>
              <span style={{fontSize:13,fontWeight:500,color:'var(--text2)'}}>{fileName}</span>
              <span style={{fontSize:12,color:'var(--text3)'}}>— {parsed.length} periods</span>
              <button onClick={()=>{setParsed([]);setRawCsv('');setFileName('');setDone(false);}} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'var(--text3)'}}><X size={14}/></button>
            </div>
            <div style={{border:'0.5px solid var(--border)',borderRadius:8,overflow:'hidden',marginBottom:12}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{background:'var(--surface2)'}}>
                  {['Subject','Start','End','Room','Day'].map(h=>(<th key={h} style={{textAlign:'left',padding:'6px 10px',fontWeight:500,color:'var(--text3)',fontSize:11,borderBottom:'0.5px solid var(--border)'}}>{h}</th>))}
                </tr></thead>
                <tbody>{parsed.map((p,i)=>(
                  <tr key={i} style={{borderBottom:i<parsed.length-1?'0.5px solid var(--border)':'none'}}>
                    <td style={{padding:'6px 10px'}}><div style={{display:'flex',alignItems:'center',gap:7}}><div style={{width:8,height:8,borderRadius:'50%',background:p.color}}/><span style={{fontWeight:500}}>{p.subject}</span></div></td>
                    <td style={{padding:'6px 10px',color:'var(--text2)'}}>{fmt(p.start)}</td>
                    <td style={{padding:'6px 10px',color:'var(--text2)'}}>{fmt(p.end)}</td>
                    <td style={{padding:'6px 10px',color:'var(--text3)'}}>{p.room}</td>
                    <td style={{padding:'6px 10px',color:'var(--text3)'}}>{p.day}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {!done?(
              <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={doImport} disabled={importing}>
                {importing?<><Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> Importing…</>:<><Upload size={14}/> Import {parsed.length} periods</>}
              </button>
            ):(
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'11px 14px',borderRadius:8,background:'rgba(29,158,117,0.08)',border:'0.5px solid rgba(29,158,117,0.3)',fontSize:13,color:'#085041'}}>
                <CheckCircle2 size={16} color="#1D9E75"/> Imported! Open Timeline to see live academic periods.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!parsed.length&&(
        <div style={{marginTop:16}}>
          <div style={{fontSize:12,color:'var(--text3)',marginBottom:7}}>No CSV? Try the sample:</div>
          <button className="btn btn-sm" onClick={()=>process(SAMPLE,'sample-timetable.csv')}>Load sample timetable</button>
        </div>
      )}
    </div>
  );
}
