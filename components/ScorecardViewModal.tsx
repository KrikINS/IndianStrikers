import React, { useRef, useState } from 'react';
import { X, Download, FileText, Image as ImageIcon, Share2, Target, Zap, Trophy, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { ScheduledMatch, FullScorecardData, InningsData } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ScorecardViewModalProps {
    match: ScheduledMatch;
    isOpen: boolean;
    onClose: () => void;
}

const ScorecardViewModal: React.FC<ScorecardViewModalProps> = ({ match, isOpen, onClose }) => {
    const [activeInnings, setActiveInnings] = useState<1 | 2>(1);
    const inn1Ref = useRef<HTMLDivElement>(null);
    const inn2Ref = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen || !match.scorecard) return null;

    const scorecard = match.scorecard;
    const isHomeBattingFirst = match.isHomeBattingFirst ?? true; // Fallback

    const innings1BattingTeam = isHomeBattingFirst ? 'Indian Strikers' : (match.opponentName || 'Opponent');
    const innings2BattingTeam = isHomeBattingFirst ? (match.opponentName || 'Opponent') : 'Indian Strikers';

    const getInningsTitle = (inn: 1 | 2) => {
        const team = inn === 1 ? innings1BattingTeam : innings2BattingTeam;
        const data = inn === 1 ? scorecard.innings1 : scorecard.innings2;
        return `${team.toUpperCase()}: ${data.totalRuns}/${data.totalWickets} (${data.totalOvers} ov)`;
    };

    const downloadAsImage = async () => {
        setIsExporting(true);
        try {
            const refs = [inn1Ref, inn2Ref];
            for (let i = 0; i < 2; i++) {
                const ref = refs[i];
                if (ref.current) {
                    const canvas = await html2canvas(ref.current, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        useCORS: true,
                    });
                    const link = document.createElement('a');
                    link.download = `Scorecard_Innings_${i + 1}_${match.opponentName || 'Match'}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
            }
        } catch (err) {
            console.error('Failed to export images:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const downloadAsPDF = async () => {
        setIsExporting(true);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const refs = [inn1Ref, inn2Ref];

            for (let i = 0; i < 2; i++) {
                const ref = refs[i];
                if (ref.current) {
                    const canvas = await html2canvas(ref.current, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        useCORS: true,
                    });
                    const imgData = canvas.toDataURL('image/png');
                    const imgProps = pdf.getImageProperties(imgData);
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                    if (i > 0) pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                }
            }
            pdf.save(`Full_Scorecard_${match.opponentName || 'Match'}.pdf`);
        } catch (err) {
            console.error('Failed to export PDF:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const renderInnings = (inn: 1 | 2, ref: React.RefObject<HTMLDivElement>) => {
        const data = inn === 1 ? scorecard.innings1 : scorecard.innings2;
        const battingTeam = inn === 1 ? innings1BattingTeam : innings2BattingTeam;
        const bowlingTeam = inn === 1 ? innings2BattingTeam : innings1BattingTeam;

        return (
            <div ref={ref} className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xl space-y-6 md:space-y-8 min-w-0">
                {/* Header Info */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 graduate tracking-tighter uppercase italic">{battingTeam}</h2>
                        <div className="flex items-center gap-4 mt-2">
                             <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                <Trophy size={14} className="text-blue-600" /> {match.tournament}
                             </div>
                             <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                <MapPin size={14} className="text-blue-600" /> {match.groundId}
                             </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black text-blue-600 graduate">{data.totalRuns}/{data.totalWickets}</div>
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{data.totalOvers} OVERS</div>
                    </div>
                </div>

                {/* Batting Table */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-blue-500 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">
                        <Target size={16} /> Batting Performance
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#1e293b]">
                                <tr className="text-slate-300 text-[10px] font-black uppercase tracking-widest">
                                    <th className="py-3 px-4">Batter</th>
                                    <th className="py-3 px-2">Status</th>
                                    <th className="py-3 px-2 text-right">R</th>
                                    <th className="py-3 px-2 text-right">B</th>
                                    <th className="py-3 px-2 text-right">4s</th>
                                    <th className="py-3 px-2 text-right">6s</th>
                                    <th className="py-3 px-4 text-right">SR</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {data.batting.map((b, i) => (
                                    <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${b.outHow === 'Did Not Bat' ? 'opacity-40' : ''}`}>
                                        <td className="py-3 px-4 font-bold text-slate-700">{b.name}</td>
                                        <td className="py-3 px-2 text-xs font-medium text-slate-500 italic">
                                            {b.outHow === 'Not Out' ? <span className="text-emerald-600 italic font-bold">Not Out</span> : b.outHow}
                                            {b.bowlerId && <span className="text-[10px] block opacity-60 ml-2">b {b.bowlerId}</span>}
                                            {b.fielderId && <span className="text-[10px] block opacity-60 ml-2">c {b.fielderId}</span>}
                                        </td>
                                        <td className="py-3 px-2 text-right font-black text-slate-900">{b.runs || 0}</td>
                                        <td className="py-3 px-2 text-right text-slate-500">{b.balls || 0}</td>
                                        <td className="py-3 px-2 text-right text-slate-500">{b.fours || 0}</td>
                                        <td className="py-3 px-2 text-right text-slate-500">{b.sixes || 0}</td>
                                        <td className="py-3 px-4 text-right font-mono text-[10px] text-blue-600">{(b.balls || 0) > 0 ? (((b.runs || 0) / b.balls) * 100).toFixed(1) : '-'}</td>
                                    </tr>
                                ))}
                                <tr className="bg-blue-50/50 font-black text-slate-900 border-t-2 border-slate-100">
                                    <td colSpan={2} className="py-4 px-2 uppercase tracking-widest text-[10px]">
                                        Extras (wd {(data.extras as any)?.wide || (data.extras as any)?.wides || 0}, 
                                        nb {(data.extras as any)?.no_ball || (data.extras as any)?.noBall || 0}, 
                                        lb {data.extras?.legByes || 0}, 
                                        b {data.extras?.byes || 0})
                                    </td>
                                    <td colSpan={5} className="py-4 px-2 text-right text-xl italic graduate">
                                        {((data.extras as any)?.wide || (data.extras as any)?.wides || 0) + 
                                         ((data.extras as any)?.no_ball || (data.extras as any)?.noBall || 0) + 
                                         (data.extras?.legByes || 0) + 
                                         (data.extras?.byes || 0)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bowling Table */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-blue-500 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">
                        <Zap size={16} className="text-emerald-500" /> Bowling Attack
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#1e293b]">
                                <tr className="text-slate-300 text-[10px] font-black uppercase tracking-widest">
                                    <th className="py-3 px-4">Bowler</th>
                                    <th className="py-3 px-2 text-right">O</th>
                                    <th className="py-3 px-2 text-right">M</th>
                                    <th className="py-3 px-2 text-right">R</th>
                                    <th className="py-3 px-2 text-right">W</th>
                                    <th className="py-3 px-4 text-right">Econ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {data.bowling?.filter(b => b.playerId).map((b, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-700">{b.name}</td>
                                        <td className="py-3 px-2 text-right font-black text-slate-900">{b.overs || 0}</td>
                                        <td className="py-3 px-2 text-right text-slate-500">{b.maidens || 0}</td>
                                        <td className="py-3 px-2 text-right text-slate-500">{(b as any).runsConceded || (b as any).runs || 0}</td>
                                        <td className="py-3 px-2 text-right font-black text-emerald-600">{b.wickets || 0}</td>
                                        <td className="py-3 px-4 text-right font-mono text-[10px] text-blue-600">
                                            {(() => {
                                                const oversVal = Number(b.overs || 0);
                                                const oversPart = Math.floor(oversVal);
                                                const ballsPart = Math.round((oversVal % 1) * 10);
                                                const totalBalls = (oversPart * 6) + ballsPart;
                                                const runs = (b as any).runsConceded || (b as any).runs || 0;
                                                return totalBalls > 0 ? ((runs * 6) / totalBalls).toFixed(2) : '-';
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FOW Timeline */}
                {data.fallOfWickets && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                             Fall of Wickets
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed italic">
                            {data.fallOfWickets}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md p-2 md:p-8 overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-6xl mx-auto my-4 md:my-8 flex flex-col gap-4 md:gap-6">
                
                {/* Fixed Control Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-6 rounded-3xl border border-white/10 shadow-2xl">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                             <Share2 className="text-blue-500" /> 
                             Scorecard Overview
                        </h2>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">
                            {match.matchFormat || 'T20'} • {match.tournament} • {new Date(match.date).toLocaleDateString()}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                         <button 
                            onClick={downloadAsImage}
                            disabled={isExporting}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                            title="Download as PNG images"
                            aria-label="Export scorecard as images"
                         >
                            <ImageIcon size={18} /> {isExporting ? 'Processing...' : 'Export UI Images'}
                         </button>
                         <button 
                            onClick={downloadAsPDF}
                            disabled={isExporting}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-blue-900/40 disabled:opacity-50"
                            title="Download as PDF document"
                            aria-label="Save scorecard as PDF"
                         >
                            <FileText size={18} /> {isExporting ? 'Processing...' : 'Save as PDF'}
                         </button>
                         <button 
                            onClick={onClose}
                            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all"
                            title="Close Scorecard"
                            aria-label="Close scorecard view"
                         >
                            <X size={24} />
                         </button>
                    </div>
                </div>

                {/* Scorecard Display Tabs (Desktop) / Scroll (Mobile) */}
                <div className="hidden md:flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 self-start">
                    <button 
                        onClick={() => setActiveInnings(1)}
                        className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeInnings === 1 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}
                        title="View 1st Innings"
                        aria-label="Switch to 1st innings"
                    >
                        1st Innings
                    </button>
                    <button 
                        onClick={() => setActiveInnings(2)}
                        className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeInnings === 2 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}
                        title="View 2nd Innings"
                        aria-label="Switch to 2nd innings"
                    >
                        2nd Innings
                    </button>
                    <button 
                         onClick={() => {
                             inn1Ref.current?.scrollIntoView({ behavior: 'smooth' });
                             setActiveInnings(1);
                         }}
                         className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                        Full View <ExternalLink size={14} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="grid grid-cols-1 gap-12 pb-20">
                    {/* Innings 1 Rendering (Hidden on mobile if not active, or just scroll?) */}
                    {/* To support export, we need both to be in DOM or we render them specially */}
                    <div className={activeInnings === 2 ? 'hidden md:block' : 'block'}>
                         {renderInnings(1, inn1Ref as React.RefObject<HTMLDivElement>)}
                    </div>
                    <div className={activeInnings === 1 ? 'hidden md:block' : 'block'}>
                         {renderInnings(2, inn2Ref as React.RefObject<HTMLDivElement>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScorecardViewModal;
