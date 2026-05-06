import React from 'react';
import { Shield } from 'lucide-react';
import { LeagueStanding } from '../types';

interface StandingTableProps {
  entries: LeagueStanding[];
  qCount?: number;
}

const LeagueStandingTable: React.FC<StandingTableProps> = ({ entries, qCount = 4 }) => {
  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
        No Data Available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/50">
            <th className="pl-8 pr-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Psn</th>
            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Team</th>
            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">P</th>
            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">W</th>
            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">L</th>
            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">NR</th>
            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Pts</th>
            <th className="px-8 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">NRR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((ent, idx) => {
            const isQualifying = idx < qCount;
            return (
              <tr key={`${ent.team_id}-${idx}`} className={`hover:bg-blue-50/30 transition-all group ${isQualifying ? 'bg-emerald-50/10' : ''} relative`}>
                <td className="pl-8 pr-4 py-5">
                   <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm ${
                     isQualifying ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                   }`}>
                     {idx + 1}
                   </div>
                   {isQualifying && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[2px_0_10px_rgba(16,185,129,0.3)]" />}
                </td>
                <td className="px-4 py-5">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-white border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center">
                       {ent.logo_url ? <img src={ent.logo_url} className="w-full h-full object-contain" alt="" /> : <Shield size={14} className="text-slate-300" />}
                     </div>
                     <span className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight leading-none truncate max-w-[150px]">{ent.team_name}</span>
                   </div>
                </td>
                <td className="px-4 py-5 text-center text-xs font-bold text-slate-600">{ent.p}</td>
                <td className="px-4 py-5 text-center text-xs font-bold text-emerald-600">{ent.w}</td>
                <td className="px-4 py-5 text-center text-xs font-bold text-red-500">{ent.l}</td>
                <td className="px-4 py-5 text-center text-xs font-bold text-slate-400">{ent.nr}</td>
                <td className="px-4 py-5 text-center text-xs font-black text-slate-900 italic tracking-tighter">{ent.pts}</td>
                <td className="px-8 py-5 text-center">
                   <span className={`text-[11px] font-black italic tracking-tighter ${ent.nrr >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                     {ent.nrr >= 0 ? '+' : ''}{parseFloat(String(ent.nrr)).toFixed(3)}
                   </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LeagueStandingTable;
