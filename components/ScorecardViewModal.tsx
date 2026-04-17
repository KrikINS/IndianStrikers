import React, { useRef, useState, useMemo } from 'react';
import { X, Download, FileText, Image as ImageIcon, Share2, Target, Zap, Trophy, MapPin, Calendar, ExternalLink, ChevronRight, Activity, Award } from 'lucide-react';
import { ScheduledMatch, FullScorecardData, InningsData, Player, OpponentTeam, Ground } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface InningsBattingEntry {
    playerId: string;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    outHow: string;
    bowlerId?: string;
    fielderId?: string;
    index?: number;
}

interface InningsBowlingEntry {
    playerId: string;
    name: string;
    overs: number;
    maidens: number;
    runsConceded: number;
    wickets: number;
    index?: number;
}

interface InningsExtras {
    wide: number;
    no_ball: number;
    legByes: number;
    byes: number;
}

interface ScorecardViewModalProps {
    match: ScheduledMatch;
    isOpen: boolean;
    onClose: () => void;
    players?: Player[];
    allOpponents?: OpponentTeam[];
    grounds?: Ground[];
    initialTab?: 'scorecard' | 'commentary';
}

const ScorecardViewModal: React.FC<ScorecardViewModalProps> = ({
    match,
    isOpen,
    onClose,
    players = [],
    allOpponents = [],
    grounds = [],
    initialTab = 'scorecard'
}) => {
    const inn1Ref = useRef<HTMLDivElement>(null);
    const inn2Ref = useRef<HTMLDivElement>(null);
    const fullScorecardRef = useRef<HTMLDivElement>(null);
    const modalContentRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'scorecard' | 'commentary'>(initialTab);

    // --- LIVE DATA REHYDRATION ENGINE ---
    const scorecard = useMemo(() => {
        if (match.status === 'live' && (match as any).live_data) {
            const ld = (match as any).live_data;
            const transformInnings = (inn: any): InningsData | null => {
                if (!inn || (!inn.battingStats && !inn.bowlingStats)) return null;
                const battingArr: any[] = Object.entries(inn.battingStats || {}).map(([id, p]: [string, any]) => ({
                    playerId: id,
                    name: p.name || 'Unknown',
                    runs: p.runs || 0,
                    balls: p.balls || 0,
                    fours: p.fours || 0,
                    sixes: p.sixes || 0,
                    outHow: p.status === 'batting' ? 'Not Out' : (p.outHow || (p.status === 'out' ? 'Out' : 'Did Not Bat')),
                    bowlerId: p.bowlerId,
                    fielderId: p.fielderId,
                    index: p.index
                })).sort((a, b) => (a.index || 0) - (b.index || 0));

                const bowlingArr: any[] = Object.entries(inn.bowlingStats || {}).map(([id, b]: [string, any]) => ({
                    playerId: id,
                    name: b.name || 'Unknown',
                    overs: b.overs || 0,
                    maidens: b.maidens || 0,
                    runsConceded: b.runs || 0,
                    wickets: b.wickets || 0,
                    index: b.index
                })).sort((a, b) => (a.index || 0) - (b.index || 0));

                const extras: InningsExtras = {
                    wide: inn.extras?.wide || 0,
                    no_ball: inn.extras?.no_ball || 0,
                    legByes: inn.extras?.legByes || 0,
                    byes: inn.extras?.byes || 0
                };

                return {
                    batting: battingArr,
                    bowling: bowlingArr,
                    extras,
                    totalRuns: inn.totalRuns || 0,
                    totalWickets: inn.wickets || 0,
                    totalOvers: Number(((inn.totalBalls || 0) / 6).toFixed(1)),
                    fallOfWickets: inn.fallOfWickets || '',
                    history: inn.history || []
                };
            };
            return {
                innings1: transformInnings(ld.innings1) || { batting: [], bowling: [], extras: { wide: 0, no_ball: 0, legByes: 0, byes: 0 }, totalRuns: 0, totalWickets: 0, totalOvers: 0, history: [] },
                innings2: transformInnings(ld.innings2) || { batting: [], bowling: [], extras: { wide: 0, no_ball: 0, legByes: 0, byes: 0 }, totalRuns: 0, totalWickets: 0, totalOvers: 0, history: [] }
            } as FullScorecardData;
        }
        return match.scorecard || {
            innings1: { batting: [], bowling: [], extras: { wide: 0, no_ball: 0, legByes: 0, byes: 0 }, totalRuns: 0, totalWickets: 0, totalOvers: 0, history: [] },
            innings2: { batting: [], bowling: [], extras: { wide: 0, no_ball: 0, legByes: 0, byes: 0 }, totalRuns: 0, totalWickets: 0, totalOvers: 0, history: [] }
        } as FullScorecardData;
    }, [match]);

    const isHomeBattingFirst = match.isHomeBattingFirst ?? true;
    const opponent = allOpponents.find(o => o.id === match.opponentId);
    const opponentName = opponent?.name || match.opponentName || 'Opponent';
    const innings1BattingTeam = isHomeBattingFirst ? 'Indian Strikers' : opponentName;
    const innings2BattingTeam = isHomeBattingFirst ? opponentName : 'Indian Strikers';
    const ground = grounds.find(g => g.id === match.groundId);
    const groundDisplay = ground?.name || match.groundId || 'TBA';

    const resolvePlayerName = (name: string | undefined, id: string | undefined, teamType: 'home' | 'opponent') => {
        if (!id && !name) return '-';
        const searchId = String(id || name || '').trim();
        if (!searchId || searchId === 'undefined') return name || '-';
        if (teamType === 'home') {
            const p = players.find(player => {
                const pid = String(player.id || '');
                const psid = String((player as any).player_id || '');
                const pname = String(player.name || '').toLowerCase();
                const target = searchId.toLowerCase();
                return pid === searchId || psid === searchId || pname === target;
            });
            if (p) return p.name;
        } else {
            const oppPlayer = opponent?.players?.find(player => {
                const pid = String(player.id || '');
                const pname = String(player.name || '').toLowerCase();
                const target = searchId.toLowerCase();
                return pid === searchId || pname === target;
            });
            if (oppPlayer) return oppPlayer.name;
        }
        if (name && !name.includes('-') && isNaN(Number(name))) return name;
        if (searchId.length > 3 && !searchId.includes('-') && isNaN(Number(searchId))) return searchId;
        return teamType === 'home' ? "Indian Strikers Player" : (opponentName + " Player");
    };

    const renderStatus = (b: any, isBattingHome: boolean) => {
        if (b.outHow === 'Not Out') return <span className="text-sky-400 font-bold">Not Out</span>;
        if (b.outHow === 'Did Not Bat') return <span className="text-slate-400">DNB</span>;
        if (b.outHow === 'Retired Hurt') return <span className="text-slate-500">Retired Hurt</span>;
        const fielder = b.fielderId ? resolvePlayerName(undefined, b.fielderId, isBattingHome ? 'opponent' : 'home') : null;
        const bowler = b.bowlerId ? resolvePlayerName(undefined, b.bowlerId, isBattingHome ? 'opponent' : 'home') : null;
        if (b.outHow === 'Caught' || b.outHow === 'c') return <span>c {fielder} b {bowler}</span>;
        if (b.outHow === 'Bowled' || b.outHow === 'b') return <span>b {bowler}</span>;
        if (b.outHow === 'LBW' || b.outHow === 'lbw') return <span>lbw b {bowler}</span>;
        if (b.outHow === 'Run Out' || b.outHow === 'run out') return <span>run out ({fielder || 'sub'})</span>;
        if (b.outHow === 'Stumped' || b.outHow === 'st') return <span>st {fielder} b {bowler}</span>;
        if (b.outHow === 'Hit Wicket') return <span>hit wicket b {bowler}</span>;
        return <span>{b.outHow} {bowler ? `b ${bowler}` : ''}</span>;
    };

    const BallBadge: React.FC<{ ball: any, variant?: 'default' | 'small' }> = ({ ball, variant = 'default' }) => {
        const { runs, isWicket, type } = ball;
        const isSmall = variant === 'small';
        let classes = `flex items-center justify-center rounded-full font-black shadow-sm transition-transform hover:scale-110 ${isSmall ? 'w-5 h-5 text-[8px]' : 'w-7 h-7 text-[10px]'}`;
        let label = isWicket ? 'W' : `${runs}`;
        if (isWicket) { } else if (type === 'wide' || type === 'no-ball') {
            label = type === 'wide' ? 'Wd' : 'Nb';
            if (runs > 0) label += `+${runs}`;
        } else if (runs === 0) label = "0";
        return (
            <div className={classes} style={{ backgroundColor: isWicket ? '#EF4444' : (runs >= 4 ? '#10B981' : (runs > 0 ? '#3B82F6' : '#94A3B8')), color: '#FFFFFF' }} title={isWicket ? `Wicket: ${ball.wicketType || 'Out'}` : `${runs} Runs`}>
                {label}
            </div>
        );
    };

    const CommentaryEventCard: React.FC<{ type: 'wicket' | 'milestone50' | 'milestone100' | 'hat-trick'; player: string; tagline?: string; }> = ({ type, player, tagline }) => {
        const variants = {
            wicket: "bg-red-50 border-l-4 border-red-600",
            milestone50: "bg-gradient-to-r from-amber-50 to-yellow-100 border-l-4 border-amber-400",
            milestone100: "bg-gradient-to-r from-yellow-100 to-amber-200 border-l-4 border-amber-600",
            'hat-trick': "bg-slate-900 text-white border-l-4 border-yellow-500"
        };
        const icons = {
            wicket: <Target className="text-red-500 shrink-0" size={24} />,
            milestone50: <Award className="text-amber-500 shrink-0" size={24} />,
            milestone100: <Trophy className="text-amber-600 shrink-0" size={24} />,
            'hat-trick': <Zap className="text-yellow-400 shrink-0 animate-pulse" size={24} />
        };
        const titles = {
            wicket: "WICKET!",
            milestone50: "FIFTY!",
            milestone100: "CENTURY!",
            'hat-trick': "HAT-TRICK!"
        };
        return (
            <div className={`${variants[type]} p-4 md:p-6 mb-4 rounded-r-2xl shadow-md flex items-center gap-4 animate-[slideIn_0.5s_ease-out]`}>
                {icons[type]}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${type === 'hat-trick' ? 'text-yellow-400' : 'text-slate-500'}`}>
                            {titles[type]}
                        </span>
                    </div>
                    <h4 className={`text-lg font-black italic graduate mb-1 ${type === 'hat-trick' ? 'text-white' : 'text-slate-900'}`}>
                        {player.toUpperCase()}
                    </h4>
                    {tagline && <p className={`text-xs font-bold italic ${type === 'hat-trick' ? 'text-slate-300' : 'text-slate-600'}`}>"{tagline}"</p>}
                </div>
            </div>
        );
    };

    const TAGLINES = {
        wicket: ["STRIKE! The timber is disturbed!", "OUT! A crucial breakthrough!", "GONE! Safe hands in the field!", "Walking back to the pavilion!", "Brilliant delivery! No answer!"],
        milestone50: ["FIFTY! A solid contribution!", "Raise the bat! Sparkling 50!", "The milestones keep coming!", "A well-crafted innings reaches 50!"],
        milestone100: ["CENTURY! A masterclass!", "Standing ovation! 100 runs!", "UNBELIEVABLE! Heroic hundred!", "History in the making!"],
        hatTrick: ["HAT-TRICK! History made!", "THREE IN THREE!", "UNSTOPPABLE! Magical Hat-trick!", "Clinical! Three beauties!"]
    };

    const getRandomTagline = (type: keyof typeof TAGLINES) => {
        const pool = TAGLINES[type];
        return pool[Math.floor(Math.random() * pool.length)];
    };

    const LiveMiniScoreboard: React.FC<{ inn: any, innNum: number, target?: number, batTeamName: string, oppTeamName: string }> = ({ inn, innNum, target, batTeamName, oppTeamName }) => {
        if (!inn || !inn.history || inn.history.length === 0) return null;
        const history = [...inn.history];
        const recentBalls = [...history].reverse().slice(0, 12);
        const activeBatters = (inn.batting || []).filter((b: any) => b.outHow === 'Not Out');
        const lastBall = history[history.length - 1];
        const strikerId = lastBall?.strikerId;
        const totalRuns = (inn.batting || []).reduce((s: number, b: any) => s + (b.runs || 0), 0) + ((inn.extras as any)?.total || 0);
        const totalBalls = (history || []).filter(b => b.isLegal).length;
        const crr = totalBalls > 0 ? ((totalRuns / totalBalls) * 6).toFixed(2) : '0.00';
        let rrr = null;
        if (innNum === 2 && target) {
            const runsNeeded = target - totalRuns;
            const matchFormat = (match as any).match_format || 'T20';
            const maxBalls = matchFormat === 'OD' ? 300 : matchFormat === 'T10' ? 60 : 120;
            const ballsRemaining = maxBalls - totalBalls;
            rrr = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : '0.00';
        }
        const p1 = (activeBatters || [])[0];
        const p2 = (activeBatters || [])[1];
        const pRuns = (p1?.runs || 0) + (p2?.runs || 0);
        const pBalls = (p1?.balls || 0) + (p2?.balls || 0);
        return (
            <div className="sticky top-0 z-[20] -mx-4 mb-6 mt-[-1rem] bg-white border-b border-slate-200 p-4 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex flex-col gap-1 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                             <span className="text-[10px] font-black text-slate-500 uppercase">Current Partnership</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`flex items-baseline gap-1 ${strikerId === p1?.playerId ? 'text-blue-700' : 'text-slate-900'}`}>
                                <span className="text-sm font-black italic">{p1 ? resolvePlayerName(undefined, p1.playerId, innNum === 1 ? 'home' : 'opponent') : '---'}</span>
                                <span className="text-xs font-bold opacity-60">{p1?.runs || 0}({p1?.balls || 0}){strikerId === p1?.playerId ? '*' : ''}</span>
                            </div>
                            <span className="text-slate-300 font-bold">&</span>
                            <div className={`flex items-baseline gap-1 ${strikerId === p2?.playerId ? 'text-blue-700' : 'text-slate-900'}`}>
                                <span className="text-sm font-black italic">{p2 ? resolvePlayerName(undefined, p2.playerId, innNum === 1 ? 'home' : 'opponent') : '---'}</span>
                                <span className="text-xs font-bold opacity-60">{p2?.runs || 0}({p2?.balls || 0}){strikerId === p2?.playerId ? '*' : ''}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1 max-w-[200px] md:max-w-none">
                        {recentBalls.map((b, idx) => <BallBadge key={idx} ball={b} variant="small" />)}
                    </div>
                </div>
            </div>
        );
    };

    const calculateTotalOvers = (bowlingData: any[]) => {
        if (!bowlingData || bowlingData.length === 0) return "0.0";
        let totalBalls = 0;
        bowlingData.forEach(b => {
            const overs = Number(b.overs || 0);
            const wholeOvers = Math.floor(overs);
            const extraBalls = Math.round((overs % 1) * 10);
            totalBalls += (wholeOvers * 6) + extraBalls;
        });
        return `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;
    };

    const calculateTotalExtras = (data: InningsData) => {
        const ext = data.extras || {};
        let bowlWides = 0; let bowlNBs = 0;
        data.bowling?.forEach(b => {
            bowlWides += (Number((b as any).wides || (b as any).wide || 0));
            bowlNBs += (Number((b as any).no_balls || (b as any).noBall || 0));
        });
        const totalWides = Math.max(bowlWides, Number((ext as any).wide || (ext as any).wides || 0));
        const totalNBs = Math.max(bowlNBs, Number((ext as any).no_ball || (ext as any).noBall || 0));
        return totalWides + totalNBs + Number(ext.legByes || 0) + Number(ext.byes || 0);
    };

    const shareScorecard = async () => {
        setIsExporting(true);
        try {
            const ref = modalContentRef;
            if (ref.current) {
                const canvas = await html2canvas(ref.current, {
                    scale: 2,
                    backgroundColor: '#020617',
                    useCORS: true,
                    logging: false,
                    onclone: (clonedDoc) => {
                        const clonedTarget = clonedDoc.getElementById('scorecard-capture-target');
                        if (clonedTarget) {
                            clonedTarget.style.height = 'auto';
                            clonedTarget.style.width = '1080px'; 
                            clonedTarget.style.overflow = 'visible';
                            const scrollable = clonedTarget.querySelector('.overflow-y-auto');
                            if (scrollable) {
                                (scrollable as HTMLElement).style.height = 'auto';
                                (scrollable as HTMLElement).style.overflow = 'visible';
                            }
                        }
                    }
                });
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const file = new File([blob], `Scorecard_${match.opponentName || 'Match'}.png`, { type: 'image/png' });
                        const shareData = {
                            files: [file],
                            title: `Match Scorecard: Indian Strikers vs ${match.opponentName}`,
                            text: `Detailed scorecard for our match against ${match.opponentName}. #IndianStrikers #Cricket`,
                            url: `${window.location.origin}/#/scorecard/${match.id}`
                        };
                        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                            try {
                                await navigator.share(shareData);
                            } catch (e) {
                                await navigator.share({
                                    title: shareData.title,
                                    text: shareData.text,
                                    url: shareData.url
                                });
                            }
                        } else if (navigator.share) {
                             await navigator.share({
                                 title: shareData.title,
                                 text: shareData.text,
                                 url: shareData.url
                             });
                        } else {
                            downloadAsImage();
                        }
                    }
                }, 'image/png', 0.9);
            }
        } catch (err) {
            console.error('Failed to share scorecard:', err);
            downloadAsImage();
        } finally {
            setIsExporting(false);
        }
    };

    const downloadAsImage = async () => {
        setIsExporting(true);
        try {
            const ref = modalContentRef; 
            if (ref.current) {
                const canvas = await html2canvas(ref.current, {
                    scale: 3,
                    backgroundColor: '#020617',
                    useCORS: true,
                    logging: false,
                    scrollY: -window.scrollY,
                    onclone: (clonedDoc) => {
                        const clonedTarget = clonedDoc.getElementById('scorecard-capture-target');
                        if (clonedTarget) {
                            clonedTarget.style.height = 'auto';
                            clonedTarget.style.width = '1200px';
                            clonedTarget.style.overflow = 'visible';
                            clonedTarget.style.position = 'relative';
                            const scrollable = clonedTarget.querySelector('.overflow-y-auto');
                            if (scrollable) {
                                (scrollable as HTMLElement).style.height = 'auto';
                                (scrollable as HTMLElement).style.overflow = 'visible';
                            }
                        }
                    }
                });
                const rawName = match.opponentName || 'Match';
                const safeName = rawName.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                const fileName = `Full_Scorecard_${safeName}.png`.replace(/_+/g, '_');
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }
                }, 'image/png', 1.0);
            }
        } catch (err) {
            console.error('Failed to export image:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const renderInningsContent = (inn: 1 | 2, ref: React.RefObject<HTMLDivElement | null>) => {
        const data = inn === 1 ? scorecard.innings1 : scorecard.innings2;
        if (!data || (data.batting?.length === 0 && data.bowling?.length === 0)) return <div className="p-20 text-center opacity-40 uppercase font-black">No Data Recorded</div>;
        const battingTeam = inn === 1 ? innings1BattingTeam : innings2BattingTeam;
        const isBattingHome = inn === 1 ? isHomeBattingFirst : !isHomeBattingFirst;
        const extrasCount = (data as any)?.extras_total || calculateTotalExtras(data);
        const autoOvers = calculateTotalOvers(data?.bowling || []);
        const displayOvers = (data as any).total_overs || (data.totalOvers && Number(data.totalOvers) !== 0 ? data.totalOvers : autoOvers);
        const activeBatters = (data.batting || []).filter(b => (b.runs || 0) > 0 || (b.balls || 0) > 0 || b.outHow === 'Not Out' || (b.outHow && b.outHow !== 'Did Not Bat')).sort((a,b) => (a.index || 0) - (b.index || 0));
        const dnbList = (data.batting || []).filter(b => !activeBatters.find(ab => ab.playerId === b.playerId));
        return (
            <div ref={ref} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-4">
                <div className="flex justify-between items-end border-b pb-3">
                    <h3 className="text-xl font-black italic">{battingTeam.toUpperCase()}</h3>
                    <div className="text-right">
                        <div className="text-3xl font-black graduate">{data.totalRuns}/{data.totalWickets}</div>
                        <div className="text-[10px] font-black text-sky-500 uppercase">{displayOvers} OVERS</div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950 text-white uppercase text-[9px]">
                                <tr><th className="p-2">Batter</th><th className="p-2">Status</th><th className="p-2">R</th><th className="p-2">B</th><th className="p-2 text-right">SR</th></tr>
                            </thead>
                            <tbody>
                                {activeBatters.map((b, i) => (
                                    <tr key={i} className="border-b border-slate-100 italic">
                                        <td className="p-2 font-bold">{resolvePlayerName(b.name, b.playerId, isBattingHome ? 'home' : 'opponent')}</td>
                                        <td className="p-2 text-[10px]">{renderStatus(b, isBattingHome)}</td>
                                        <td className="p-2 font-black">{b.runs || 0}</td>
                                        <td className="p-2 text-slate-500">{b.balls || 0}</td>
                                        <td className="p-2 text-right text-sky-600">{(b.balls || 0) > 0 ? (((b.runs || 0) / b.balls) * 100).toFixed(1) : '-'}</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-black">
                                    <td colSpan={2} className="p-2 uppercase text-[9px] text-slate-500">EXTRAS</td>
                                    <td colSpan={3} className="p-2 text-right text-lg text-sky-600">{extrasCount}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950 text-white uppercase text-[9px]">
                                <tr><th className="p-2">Bowler</th><th className="p-2">O</th><th className="p-2">R</th><th className="p-2">W</th><th className="p-2 text-right">Econ</th></tr>
                            </thead>
                            <tbody>
                                {(data.bowling || []).map((b, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="p-2 font-bold">{resolvePlayerName(b.name, b.playerId, isBattingHome ? 'opponent' : 'home')}</td>
                                        <td className="p-2 font-black">{b.overs || 0}</td>
                                        <td className="p-2">{ (b as any).runsConceded || b.runs || 0 }</td>
                                        <td className="p-2 font-black text-sky-500">{b.wickets || 0}</td>
                                        <td className="p-2 text-right font-black text-blue-600">-</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div ref={modalContentRef} id="scorecard-capture-target" className="fixed inset-0 z-[150] bg-slate-950 flex flex-col overflow-hidden">
            <div className="sticky top-0 z-[160] bg-slate-950/90 backdrop-blur-xl border-b border-white/10 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/INS%20LOGO.PNG" className="h-10 w-10 object-contain" alt="Logo" />
                        <h2 className="text-white font-black graduate italic text-lg hidden sm:block">INDIAN STRIKERS</h2>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 pl-2 sm:pl-4 border-l border-white/10">
                        <button
                            onClick={shareScorecard}
                            disabled={isExporting}
                            title="Share Scorecard"
                            aria-label="Share Scorecard"
                            className="p-1.5 sm:p-2 text-slate-400 hover:text-emerald-400 transition-all hover:bg-white/5 rounded-lg"
                        >
                            <Share2 size={18} className="sm:w-5 sm:h-5" />
                        </button>
                        <button
                            onClick={downloadAsImage}
                            disabled={isExporting}
                            title="Download Scorecard Image"
                            aria-label="Download Scorecard Image"
                            className="p-1.5 sm:p-2 text-slate-400 hover:text-sky-400 transition-all hover:bg-white/5 rounded-lg"
                        >
                            <ImageIcon size={18} className="sm:w-5 sm:h-5" />
                        </button>
                        <button 
                            onClick={onClose} 
                            title="Close Scorecard"
                            aria-label="Close Scorecard"
                            className="p-2 text-slate-400 hover:text-white"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto flex gap-6 mt-4 border-b border-white/5">
                    {['scorecard', 'commentary'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-2 text-[10px] font-black uppercase tracking-widest ${activeTab === tab ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-500'}`}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className={`flex-1 overflow-y-auto p-4 ${activeTab === 'scorecard' ? 'bg-white' : 'bg-slate-50'}`}>
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'scorecard' ? (
                        <div className="space-y-6">
                            {renderInningsContent(1, inn1Ref)}
                            {renderInningsContent(2, inn2Ref)}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {[1, 2].map(innNum => {
                                const inn = innNum === 1 ? scorecard.innings1 : scorecard.innings2;
                                if (!inn || !inn.history || inn.history.length === 0) return null;
                                const history = [...inn.history].reverse();
                                const overGroups: Record<number, any[]> = {};
                                history.forEach(ball => {
                                    const ov = ball.overNumber ?? 0;
                                    if (!overGroups[ov]) overGroups[ov] = [];
                                    overGroups[ov].push(ball);
                                });
                                const sortedOvers = Object.keys(overGroups).map(Number).sort((a,b) => b-a);
                                return (
                                    <div key={innNum}>
                                        <h3 className="text-center text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6">Innings {innNum} Commentary</h3>
                                        {sortedOvers.map(overNum => (
                                            <div key={overNum} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                                                <div className="p-4 bg-slate-50 font-black text-xs border-b">OVER {overNum + 1}</div>
                                                <div className="divide-y">
                                                    {overGroups[overNum].map((ball, bIdx) => {
                                                         const bName = resolvePlayerName(undefined, ball.bowlerId, innNum === 1 ? 'opponent' : 'home');
                                                         const sName = resolvePlayerName(undefined, ball.strikerId, innNum === 1 ? 'home' : 'opponent');
                                                         let resultText = ball.ballLog || `${ball.runs} runs.`;
                                                         return (
                                                            <React.Fragment key={bIdx}>
                                                                <div className="p-4 flex items-start gap-4">
                                                                    <BallBadge ball={ball} />
                                                                    <div>
                                                                        <div className="text-[10px] font-black text-slate-400 uppercase">{ball.overNumber}.{ball.ballInOver}</div>
                                                                        <div className="text-xs font-black uppercase">{bName} TO {sName}</div>
                                                                        <p className="text-sm text-slate-600">{resultText}</p>
                                                                    </div>
                                                                </div>
                                                                {ball.isWicket && (
                                                                     <CommentaryEventCard type="wicket" player={sName} tagline={getRandomTagline('wicket')} />
                                                                )}
                                                            </React.Fragment>
                                                         );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `.graduate { font-family: 'Graduate', serif; }` }} />
        </div>
    );
};

export default ScorecardViewModal;