import React, { useRef, useState, useMemo } from 'react';
import { X, Download, FileText, Image as ImageIcon, Share2, Target, Zap, Trophy, MapPin, Calendar, ExternalLink, ChevronRight, Activity, Award } from 'lucide-react';
import { ScheduledMatch, FullScorecardData, InningsData, Player, OpponentTeam, Ground } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

    if (!isOpen || !match.scorecard) return null;

    const scorecard = match.scorecard;
    const isHomeBattingFirst = match.isHomeBattingFirst ?? true;

    const opponent = allOpponents.find(o => o.id === match.opponentId);
    const opponentName = opponent?.name || match.opponentName || 'Opponent';

    const innings1BattingTeam = isHomeBattingFirst ? 'Indian Strikers' : opponentName;
    const innings2BattingTeam = isHomeBattingFirst ? opponentName : 'Indian Strikers';

    const ground = grounds.find(g => g.id === match.groundId);
    const groundDisplay = ground?.name || match.groundId || 'TBA';

    // Helper to resolve player name from ID if name is missing
    const resolvePlayerName = (name: string | undefined, id: string | undefined, teamType: 'home' | 'opponent') => {
        if (!id && !name) return '-';

        // Search ID can be the ID itself or the name if passed in the ID field (common in some legacy imports)
        const searchId = String(id || name || '').trim();
        if (!searchId || searchId === 'undefined') return name || '-';

        if (teamType === 'home') {
            // HIGH-ROBUSTNESS SEARCH: Check ID, player_id (Supabase), and Name matches
            const p = players.find(player => {
                const pid = String(player.id || '');
                const psid = String((player as any).player_id || '');
                const pname = String(player.name || '').toLowerCase();
                const target = searchId.toLowerCase();
                return pid === searchId || psid === searchId || pname === target;
            });
            if (p) return p.name;
        } else {
            // Check opponent roster
            const oppPlayer = opponent?.players?.find(player => {
                const pid = String(player.id || '');
                const pname = String(player.name || '').toLowerCase();
                const target = searchId.toLowerCase();
                return pid === searchId || pname === target;
            });
            if (oppPlayer) return oppPlayer.name;
        }

        // FALLBACK: If we have a raw name that isn't a UUID or pure number, use it
        if (name && !name.includes('-') && isNaN(Number(name))) return name;
        
        // Final effort: If searchId looks like a name (not a UUID), just return it
        if (searchId.length > 3 && !searchId.includes('-') && isNaN(Number(searchId))) return searchId;

        return teamType === 'home' ? "Indian Strikers Player" : (opponentName + " Player");
    };

    // New helper to render broadcast-style status
    const renderStatus = (b: any, isBattingHome: boolean) => {
        if (b.outHow === 'Not Out') return <span className="text-sky-400 font-bold">Not Out</span>;
        if (b.outHow === 'Did Not Bat') return <span className="text-slate-400">DNB</span>;
        if (b.outHow === 'Retired Hurt') return <span className="text-slate-500">Retired Hurt</span>;

        const fielder = b.fielderId ? resolvePlayerName(undefined, b.fielderId, isBattingHome ? 'opponent' : 'home') : null;
        const bowler = b.bowlerId ? resolvePlayerName(undefined, b.bowlerId, isBattingHome ? 'opponent' : 'home') : null;

        if (b.outHow === 'Caught' || b.outHow === 'c') {
            return <span>c {fielder} b {bowler}</span>;
        }
        if (b.outHow === 'Bowled' || b.outHow === 'b') {
            return <span>b {bowler}</span>;
        }
        if (b.outHow === 'LBW' || b.outHow === 'lbw') {
            return <span>lbw b {bowler}</span>;
        }
        if (b.outHow === 'Run Out' || b.outHow === 'run out') {
            return <span>run out ({fielder || 'sub'})</span>;
        }
        if (b.outHow === 'Stumped' || b.outHow === 'st') {
            return <span>st {fielder} b {bowler}</span>;
        }
        if (b.outHow === 'Hit Wicket') {
            return <span>hit wicket b {bowler}</span>;
        }

        return <span>{b.outHow} {bowler ? `b ${bowler}` : ''}</span>;
    };

    /**
     * BallBadge Component
     * Standardized design system for ball results
     */
    const BallBadge: React.FC<{ ball: any }> = ({ ball }) => {
        const { runs, isWicket, type } = ball;
        
        // Determine styling based on outcome
        let classes = "flex items-center justify-center rounded-full font-extrabold shadow-sm transition-transform hover:scale-110 ";
        let label = isWicket ? 'W' : `${runs}`;

        if (isWicket) {
            classes += "bg-red-600 text-white w-8 h-8 text-sm";
        } else if (type === 'wide' || type === 'no-ball') {
            classes += "bg-amber-400 text-slate-900 w-8 h-8 text-xs";
            label = type === 'wide' ? 'Wd' : 'Nb';
            if (runs > 0) label += `+${runs}`;
        } else if (runs === 6) {
            classes += "bg-purple-600 text-white w-9 h-9 text-base ring-2 ring-purple-300 animate-[subtlePulse_2s_infinite]";
        } else if (runs === 4) {
            classes += "bg-emerald-500 text-white w-8 h-8 text-sm";
        } else if (runs > 0) {
            classes += "bg-blue-500 text-white w-8 h-8 text-sm";
        } else {
            classes += "bg-slate-200 text-slate-500 w-7 h-7 text-xs";
            label = "0";
        }

        return (
            <div className={classes} title={isWicket ? `Wicket: ${ball.wicketType || 'Out'}` : `${runs} Runs`}>
                {label}
            </div>
        );
    };

    /**
     * CommentaryEventCard Component
     * High-impact cards for big match moments
     */
    const CommentaryEventCard: React.FC<{ 
        type: 'wicket' | 'milestone50' | 'milestone100' | 'hat-trick'; 
        player: string;
        tagline?: string;
    }> = ({ type, player, tagline }) => {
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
                    {tagline && (
                        <p className={`text-xs font-bold italic ${type === 'hat-trick' ? 'text-slate-300' : 'text-slate-600'}`}>
                            "{tagline}"
                        </p>
                    )}
                </div>
                {type === 'hat-trick' && (
                    <div className="hidden md:flex flex-col items-center">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const TAGLINES = {
        wicket: [
            "STRIKE! The timber is disturbed!",
            "OUT! A crucial breakthrough for the bowling side!",
            "GONE! Safe hands in the field!",
            "Walking back to the pavilion!",
            "Brilliant delivery! There was no answer to that!"
        ],
        milestone50: [
            "FIFTY! A solid contribution to the team total!",
            "Raise the bat! A sparkling half-century!",
            "The milestones keep coming! 50 for the striker!",
            "A well-crafted innings reaches the 50-run mark!"
        ],
        milestone100: [
            "CENTURY! A masterclass in batting!",
            "Standing ovation! 100 runs of pure class!",
            "UNBELIEVABLE! A heroic hundred!",
            "History in the making! The hundred is up!"
        ],
        hatTrick: [
            "HAT-TRICK! History made on the field!",
            "THREE IN THREE! He's on fire!",
            "UNSTOPPABLE! A rare and magical Hat-trick!",
            "Absolutely clinical! Three absolute beauties!"
        ]
    };

    const getRandomTagline = (type: keyof typeof TAGLINES) => {
        const pool = TAGLINES[type];
        return pool[Math.floor(Math.random() * pool.length)];
    };

    /**
     * LiveMiniScoreboard Component
     * Pinned at the top of the Commentary Tab
     */
    const LiveMiniScoreboard: React.FC<{ 
        inn: any, 
        innNum: number, 
        target?: number, 
        batTeamName: string,
        oppTeamName: string 
    }> = ({ inn, innNum, target, batTeamName, oppTeamName }) => {
        if (!inn.history || inn.history.length === 0) return null;

        const history = [...inn.history]; // chronological
        const recentBalls = [...history].reverse().slice(0, 12);
        
        // Finalize current strikers and partnership
        // Note: For a live view, we identify non-out batsmen
        const activeBatters = (inn.batting || []).filter((b: any) => b.outHow === 'Not Out');
        const lastBall = history[history.length - 1];
        const strikerId = lastBall?.strikerId;

        // Calculate Run Rates
        const totalRuns = (inn.batting || []).reduce((s: number, b: any) => s + (b.runs || 0), 0) + 
                         (inn.extras?.total || 0);
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

        // Partnership Logic
        // In this app structure, we identify the current pair by the most recent balls
        const p1 = activeBatters[0];
        const p2 = activeBatters[1];
        const pRuns = (p1?.runs || 0) + (p2?.runs || 0); // Simplified partnership for this view
        const pBalls = (p1?.balls || 0) + (p2?.balls || 0);

        return (
            <div className="sticky top-0 z-[20] -mx-4 mb-6 mt-[-1rem] bg-slate-900/60 backdrop-blur-xl border-b border-white/10 p-4 shadow-2xl overflow-hidden">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    
                    {/* Partnership & Strikers */}
                    <div className="flex flex-col gap-1 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Partnership</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`flex items-baseline gap-1 ${strikerId === p1?.playerId ? 'text-sky-400' : 'text-white'}`}>
                                <span className="text-sm font-black italic graduate">{p1 ? resolvePlayerName(undefined, p1.playerId, innNum === 1 ? 'home' : 'opponent') : '---'}</span>
                                <span className="text-xs font-bold opacity-70">{p1?.runs || 0}({p1?.balls || 0}){strikerId === p1?.playerId ? '*' : ''}</span>
                            </div>
                            <span className="text-slate-700 font-bold">&</span>
                            <div className={`flex items-baseline gap-1 ${strikerId === p2?.playerId ? 'text-sky-400' : 'text-white'}`}>
                                <span className="text-sm font-black italic graduate">{p2 ? resolvePlayerName(undefined, p2.playerId, innNum === 1 ? 'home' : 'opponent') : '---'}</span>
                                <span className="text-xs font-bold opacity-70">{p2?.runs || 0}({p2?.balls || 0}){strikerId === p2?.playerId ? '*' : ''}</span>
                            </div>
                            <div className="h-4 w-px bg-white/10 mx-2"></div>
                            <div className="text-white">
                                <span className="text-xs font-black opacity-40 uppercase mr-1">Total:</span>
                                <span className="text-sm font-black text-sky-400 graduate">{pRuns}({pBalls})</span>
                            </div>
                        </div>
                    </div>

                    {/* Run Rates */}
                    <div className="flex gap-6 items-center bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        <div className="text-center">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">CRR</div>
                            <div className="text-sm font-black text-white italic graduate">{crr}</div>
                        </div>
                        {rrr && (
                            <>
                                <div className="h-6 w-px bg-white/10"></div>
                                <div className="text-center">
                                    <div className="text-[9px] font-black text-amber-500 uppercase tracking-tighter">RRR</div>
                                    <div className="text-sm font-black text-amber-400 italic graduate">{rrr}</div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Recent Balls Ticker */}
                    <div className="flex flex-col gap-1 items-end w-full md:w-auto">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Last 12 Balls</span>
                        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar max-w-[200px] md:max-w-none">
                            {recentBalls.map((b, idx) => (
                                <BallBadge key={idx} ball={b} />
                            ))}
                        </div>
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
        
        // 1. Get Wides & No Balls (Prioritize sum from bowling attack as it's more detailed)
        let bowlWides = 0;
        let bowlNBs = 0;
        data.bowling?.forEach(b => {
            bowlWides += (Number((b as any).wides || (b as any).wide || 0));
            bowlNBs += (Number((b as any).no_balls || (b as any).noBall || (b as any).no_ball || 0));
        });

        // Use the higher value between summary and bowling sum (robustness for different scoring styles)
        const totalWides = Math.max(bowlWides, Number((ext as any).wide || (ext as any).wides || 0));
        const totalNBs = Math.max(bowlNBs, Number((ext as any).no_ball || (ext as any).noBall || 0));
        
        // 2. Add Leg Byes & Byes (Always from summary)
        const lb = Number(ext.legByes || 0);
        const b = Number(ext.byes || 0);

        return totalWides + totalNBs + lb + b;
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

                        // ROBUST SHARING: Check if navigator.share exists AND can share files
                        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                            try {
                                await navigator.share(shareData);
                            } catch (e) {
                                // Fallback to plain share if file share fails
                                await navigator.share({
                                    title: shareData.title,
                                    text: shareData.text,
                                    url: shareData.url
                                });
                            }
                        } else if (navigator.share) {
                             // Basic share if file share not supported
                             await navigator.share({
                                 title: shareData.title,
                                 text: shareData.text,
                                 url: shareData.url
                             });
                        } else {
                            // TOTAL FALLBACK: Download the image
                            downloadAsImage();
                        }
                    }
                }, 'image/png', 0.9);
            }
        } catch (err) {
            console.error('Failed to share scorecard:', err);
            // On hard error, at least try to download
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
                // Ensure the entire content is visible for capture
                const canvas = await html2canvas(ref.current, {
                    scale: 3,
                    backgroundColor: '#020617',
                    useCORS: true,
                    logging: false,
                    scrollY: -window.scrollY, // Avoid offset issues
                    onclone: (clonedDoc) => {
                        const clonedTarget = clonedDoc.getElementById('scorecard-capture-target');
                        if (clonedTarget) {
                            // TRANSFORM: Remove all scroll restrictions and fixed heights for the capture
                            clonedTarget.style.height = 'auto';
                            clonedTarget.style.width = '1200px'; // Set a consistent width for broadcast look
                            clonedTarget.style.overflow = 'visible';
                            clonedTarget.style.position = 'relative';
                            
                            // Also expand the internal scroll container
                            const scrollable = clonedTarget.querySelector('.overflow-y-auto');
                            if (scrollable) {
                                (scrollable as HTMLElement).style.height = 'auto';
                                (scrollable as HTMLElement).style.overflow = 'visible';
                            }
                        }
                    }
                });

                // Generate a robust filename
                const rawName = match.opponentName || 'Match';
                const safeName = rawName.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                const fileName = `Full_Scorecard_${safeName}.png`.replace(/_+/g, '_');

                // Use Blob for more reliable download and 'Save As' behavior
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
        const battingTeam = inn === 1 ? innings1BattingTeam : innings2BattingTeam;
        const bowlingTeam = inn === 1 ? innings2BattingTeam : innings1BattingTeam;
        const isBattingHome = inn === 1 ? isHomeBattingFirst : !isHomeBattingFirst;

        const extrasCount = (data as any).extras_total || calculateTotalExtras(data);
        const autoOvers = calculateTotalOvers(data.bowling);
        const displayOvers = (data as any).total_overs || (data.totalOvers && Number(data.totalOvers) !== 0 ? data.totalOvers : autoOvers);

        // Separate active batters from DNB
        const activeBatters = data.batting.filter(b => {
             const hasPlayed = (b.runs || 0) > 0 || (b.balls || 0) > 0 || (b.outHow && b.outHow !== 'Did Not Bat' && b.outHow !== 'Not Out');
             // Also include current 'Not Out' players even if 0(0)
             return hasPlayed || b.outHow === 'Not Out';
        }).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

        const dnbList = data.batting.filter(b => {
             const hasNotPlayed = (b.runs || 0) === 0 && (b.balls || 0) === 0 && (b.outHow === 'Did Not Bat' || !b.outHow);
             // Verify they aren't one of the 'active' ones
             return hasNotPlayed && !activeBatters.find(ab => ab.playerId === b.playerId);
        });

        const displayWides = Number((data.extras as any)?.wide || (data.extras as any)?.wides || 0) || 
                             data.bowling?.reduce((acc: number, b: any) => acc + (Number(b.wides || b.wide || 0)), 0) || 0;
        const displayNBs = Number((data.extras as any)?.no_ball || (data.extras as any)?.noBall || (data.extras as any)?.no_balls || 0) || 
                           data.bowling?.reduce((acc: number, b: any) => acc + (Number(b.no_balls || b.noBall || b.nb || 0)), 0) || 0;

        return (
            <div ref={ref} className="bg-white p-3 md:p-5 rounded-3xl border border-slate-200 shadow-xl space-y-3">
                {/* Team Sub-Header */}
                <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-6 bg-blue-900 rounded-full"></div>
                            <h3 className="text-xl font-black text-slate-900 italic tracking-tight">{battingTeam.toUpperCase()} INNINGS</h3>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Award size={12} className="text-sky-500" /> {match.matchFormat || 'T20'} LEAGUE</span>
                            <span className="flex items-center gap-1"><MapPin size={12} className="text-sky-500" /> {groundDisplay}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-slate-900 graduate">{data.totalRuns}/{data.totalWickets}</div>
                        <div className="text-[10px] font-black text-sky-500 uppercase tracking-widest">{displayOvers} OVERS</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3">
                    {/* Batting Card */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                             <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Batting Performance</span>
                             <span className="text-[10px] text-sky-500 font-bold italic">Max Overs: {(match as any).overs || '20'}</span>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-950 text-white text-[9px] font-black uppercase tracking-widest">
                                        <th className="py-2 px-3">Batter</th>
                                        <th className="py-2 px-3">Status</th>
                                        <th className="py-2 px-2 text-center w-10">R</th>
                                        <th className="py-2 px-2 text-center w-10">B</th>
                                        <th className="py-2 px-2 text-center w-8">4s</th>
                                        <th className="py-2 px-2 text-center w-8">6s</th>
                                        <th className="py-2 px-3 text-right">SR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeBatters.map((b, i) => {
                                        return (
                                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <td className="py-[5px] px-3 font-bold text-slate-900 whitespace-nowrap">
                                                    {resolvePlayerName(b.name, b.playerId, isBattingHome ? 'home' : 'opponent')}
                                                </td>
                                                <td className="py-[5px] px-3 text-[10px] font-medium text-slate-600 italic">
                                                    {renderStatus(b, isBattingHome)}
                                                </td>
                                                <td className="py-[5px] px-2 text-center font-black text-slate-900">{b.runs || 0}</td>
                                                <td className="py-[5px] px-2 text-center text-slate-500 font-bold">{b.balls || 0}</td>
                                                <td className="py-[5px] px-2 text-center text-slate-500">{b.fours || 0}</td>
                                                <td className="py-[5px] px-2 text-center text-slate-500">{b.sixes || 0}</td>
                                                <td className="py-[5px] px-3 text-right font-black text-[10px] text-sky-600">{(b.balls || 0) > 0 ? (((b.runs || 0) / b.balls) * 100).toFixed(1) : '-'}</td>
                                            </tr>
                                        );
                                    })}
                                    
                                    {/* DNB Single Row */}
                                    {dnbList.length > 0 && (
                                        <tr className="border-b border-slate-100 bg-slate-50/30">
                                            <td colSpan={7} className="py-2 px-3 text-[10px] font-bold text-slate-500 italic">
                                                <span className="uppercase tracking-widest mr-2 text-slate-400 font-black">Did Not Bat:</span>
                                                {dnbList.map((p, idx) => (
                                                    <span key={idx}>
                                                        {resolvePlayerName(p.name, p.playerId, isBattingHome ? 'home' : 'opponent')}
                                                        {idx < dnbList.length - 1 ? ', ' : ''}
                                                    </span>
                                                ))}
                                            </td>
                                        </tr>
                                    )}

                                    <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                                        <td colSpan={2} className="py-2 px-3 uppercase tracking-widest text-[9px] text-slate-500">
                                            EXTRAS (Wd {displayWides}, Nb {displayNBs}, Lb {data.extras?.legByes || 0}, B {data.extras?.byes || 0})
                                        </td>
                                        <td colSpan={5} className="py-2 px-3 text-right text-lg font-black italic graduate text-sky-600">
                                            {extrasCount}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bowling Card */}
                    <div className="space-y-3">
                        <div className="flex items-center px-2">
                             <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Bowling Attack</span>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-950 text-white text-[9px] font-black uppercase tracking-widest">
                                        <th className="py-2 px-3">Bowler</th>
                                        <th className="py-2 px-2 text-center">O</th>
                                        <th className="py-2 px-2 text-center">R</th>
                                        <th className="py-2 px-2 text-center">W</th>
                                        <th className="py-2 px-3 text-right">Econ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.bowling?.filter(b => b.playerId || b.name)
                                        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
                                        .map((b, i) => (
                                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="py-[5px] px-3 font-bold text-slate-900">
                                                {resolvePlayerName(b.name, b.playerId, isBattingHome ? 'opponent' : 'home')}
                                            </td>
                                            <td className="py-[5px] px-2 text-center font-black text-slate-900 italic">{b.overs || 0}</td>
                                            <td className="py-[5px] px-2 text-center text-slate-600 font-bold">{(b as any).runsConceded || (b as any).runs || 0}</td>
                                            <td className="py-[5px] px-2 text-center font-black text-sky-500">{b.wickets || 0}</td>
                                            <td className="py-[5px] px-3 text-right font-black text-[10px] text-blue-600">
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

                        {/* FOW & Stats mini section */}
                        {data.fallOfWickets && (
                            <div className="p-3 bg-slate-100 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Fall of Wickets</span>
                                <p className="text-[10px] text-slate-600 italic leading-tight">{data.fallOfWickets}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={modalContentRef} 
            id="scorecard-capture-target"
            className="fixed inset-0 z-[150] bg-slate-950 flex flex-col overflow-hidden"
        >
            {/* Frozen Header - Premium Aesthetic */}
            <div className="sticky top-0 z-[160] bg-slate-950/80 backdrop-blur-xl border-b border-white/10 p-4 shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    {/* Left: Home Team */}
                    <div className="flex items-center gap-3 flex-1 justify-end">
                        <div className="text-right hidden sm:block">
                            <h2 className="text-sm font-black text-white graduate tracking-tight">INDIAN STRIKERS</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Home Team</p>
                        </div>
                        <div className="w-12 h-12 flex items-center justify-center">
                            <img src="/INS%20LOGO.PNG" className="max-h-full max-w-full object-contain" alt="Indian Strikers" />
                        </div>
                    </div>

                    {/* Center: Score & Badge */}
                    <div className="flex flex-col items-center gap-1 min-w-[140px]">
                        <div className="bg-sky-500/10 text-sky-400 text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full border border-sky-500/20 mb-1 animate-pulse">
                            LEAGUE MATCH
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-3xl font-black text-white italic graduate">{scorecard?.innings1?.totalRuns || 0}-{scorecard?.innings1?.totalWickets || 0}</span>
                            <span className="text-slate-700 font-black italic">VS</span>
                            <span className="text-3xl font-black text-white italic graduate">{scorecard?.innings2?.totalRuns || 0}-{scorecard?.innings2?.totalWickets || 0}</span>
                        </div>
                        <div className="text-white font-black text-[12.5px] uppercase tracking-widest mt-1 italic flex items-center gap-2">
                            <ExternalLink size={16} className="text-sky-500" />
                            {new Date(match.date).getFullYear()} {match.tournament}
                        </div>
                        {((match as any).resultNote || (match as any).resultSummary) && (
                            <div className={`mt-2 ${
                                ((match as any).resultNote || (match as any).resultSummary)?.toLowerCase().includes('won') 
                                    ? 'bg-emerald-900/60 border-emerald-500/30 text-white' 
                                    : ((match as any).resultNote || (match as any).resultSummary)?.toLowerCase().includes('lost')
                                        ? 'bg-red-900/60 border-red-500/30 text-white'
                                        : 'bg-slate-900/30 border-slate-800/20 text-white'
                            } text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded flex items-center gap-2 border`}>
                                <Trophy size={14} className="fill-current/20" />
                                {(match as any).resultNote || (match as any).resultSummary}
                            </div>
                        )}
                    </div>

                    {/* Right: Away Team */}
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 flex items-center justify-center">
                            {opponent?.logoUrl ? (
                                <img src={opponent.logoUrl} className="max-h-full max-w-full object-contain" alt={opponentName} />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                    <Activity className="text-blue-500" size={24} />
                                </div>
                            )}
                        </div>
                        <div className="hidden sm:block">
                            <h2 className="text-sm font-black text-white graduate tracking-tight">{opponentName.toUpperCase()}</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Opponent</p>
                        </div>
                    </div>

                    {/* Exit & Export */}
                    <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                        <button
                            onClick={shareScorecard}
                            disabled={isExporting}
                            className="p-2 text-slate-400 hover:text-emerald-400 transition-all hover:bg-white/5 rounded-lg active:scale-95"
                            title="Share on Social Media"
                        >
                            <Share2 size={20} />
                        </button>
                        <button
                            onClick={downloadAsImage}
                            disabled={isExporting}
                            className="p-2 text-slate-400 hover:text-sky-400 transition-all hover:bg-white/5 rounded-lg active:scale-95"
                            title="Download HD Image"
                        >
                            <ImageIcon size={20} />
                        </button>
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            aria-label="Close scorecard"
                            className="p-2 text-slate-400 hover:text-white transition-all hover:bg-white/5 rounded-lg active:scale-95"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="max-w-7xl mx-auto w-full px-4 mb-2 flex border-b border-white/5">
                    {(['scorecard', 'commentary'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                                activeTab === tab ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            {tab === 'scorecard' ? '📋 Scorecard' : '🎙 Commentary'}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Body - Pure Data Flow */}
            <div className={`flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar ${activeTab === 'scorecard' ? 'bg-white' : 'bg-slate-950'}`}>
                <div ref={fullScorecardRef} className="max-w-7xl mx-auto pb-10">
                    {activeTab === 'scorecard' ? (
                        <div className="space-y-5">
                            {renderInningsContent(1, inn1Ref)}
                            {renderInningsContent(2, inn2Ref)}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {[1, 2].map(innNum => {
                                const inn = innNum === 1 ? scorecard.innings1 : scorecard.innings2;
                                const batTeam = innNum === 1 ? innings1BattingTeam : innings2BattingTeam;

                                // Calculate Innings 1 total for RRR in Innings 2
                                const innings1Total = (scorecard.innings1?.batting || []).reduce((s: number, b: any) => s + (b.runs || 0), 0) + 
                                                     ((scorecard.innings1?.extras as any)?.total || calculateTotalExtras(scorecard.innings1));

                                if (!inn.history || inn.history.length === 0) return null;

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
                                        <div className="flex items-center gap-3 mb-6 px-4">
                                            <div className="h-px flex-1 bg-white/10" />
                                            <h3 className="text-[11px] font-black text-sky-400 uppercase tracking-[0.3em] italic">
                                                {batTeam} Innings
                                            </h3>
                                            <div className="h-px flex-1 bg-white/10" />
                                        </div>

                                        <LiveMiniScoreboard 
                                            inn={inn} 
                                            innNum={innNum} 
                                            target={innNum === 2 ? innings1Total : undefined}
                                            batTeamName={batTeam}
                                            oppTeamName={innNum === 1 ? innings2BattingTeam : innings1BattingTeam}
                                        />

                                        <div className="space-y-6">
                                            {sortedOvers.map(overNum => {
                                                const ballsInOver = overGroups[overNum];
                                                const overRuns = ballsInOver.reduce((s, b) => {
                                                    const ballRuns = (b.runs || 0) + (b.type === 'wide' || b.type === 'no-ball' ? 1 : 0);
                                                    return s + ballRuns;
                                                }, 0);
                                                const overWkts = ballsInOver.filter(b => b.isWicket).length;
                                                const lastBall = ballsInOver[0]; 
                                                const bowlerId = lastBall?.bowlerId;
                                                const bowlerName = resolvePlayerName(undefined, bowlerId, innNum === 1 ? 'opponent' : 'home');
                                                const bowlerStats = inn.bowling.find((b: any) => b.playerId === bowlerId);
                                                const bowlerFigures = bowlerStats ? `${bowlerStats.wickets}-${(bowlerStats as any).runsConceded || (bowlerStats as any).runs || 0}` : '';

                                                // --- Big Moments Data Processing ---
                                                // We process the balls to identify wickets and cumulative scores
                                                // Since history is already reversed (descending), we process chronological to detect milestones
                                                const chronBalls = [...ballsInOver].sort((a,b) => (a.ballNumber || 0) - (b.ballNumber || 0));
                                                
                                                return (
                                                    <div key={overNum} className="mb-8">
                                                        <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-t-2xl shadow-lg">
                                                            <div className="flex items-center gap-4">
                                                                <span className="bg-sky-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                                    Over {overNum + 1}
                                                                </span>
                                                                <div className="h-4 w-px bg-slate-700 mx-1"></div>
                                                                <span className="text-white font-black text-sm graduate italic">
                                                                    {overRuns} RUNS | {overWkts} WKTS
                                                                </span>
                                                                {bowlerName && (
                                                                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest ml-1 hidden sm:inline">
                                                                        · {bowlerName} {bowlerFigures}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-1.5">
                                                                {chronBalls.map((b, idx) => (
                                                                    <div key={idx} className={`w-2 h-2 rounded-full ${b.isWicket ? 'bg-red-500' : (b.runs || 0) >= 4 ? 'bg-emerald-400' : 'bg-slate-700'}`}></div>
                                                                ))}
                                                            </div>
                                                        </div>
                <div className="bg-slate-900/40 border-x border-b border-slate-800 rounded-b-2xl overflow-hidden divide-y divide-slate-800/50">
                                                            {ballsInOver.sort((a,b) => (b.ballNumber || 0) - (a.ballNumber || 0)).map((ball, bIdx) => {
                                                                const bName = resolvePlayerName(undefined, ball.bowlerId, innNum === 1 ? 'opponent' : 'home');
                                                                const sName = resolvePlayerName(undefined, ball.strikerId, innNum === 1 ? 'home' : 'opponent');
                                                                
                                                                let resultText = (ball.generatedCommentary || ball.generated_commentary) ? (ball.generatedCommentary || ball.generated_commentary) : 
                                                                              ball.isWicket ? `OUT! (${ball.wicketType || 'Wicket'})` : 
                                                                              ball.runs === 6 ? 'SIX - Deep into the stands!' : 
                                                                              ball.runs === 4 ? 'FOUR - Elegant boundary!' : 
                                                                              ball.type === 'wide' ? 'WIDE' : 
                                                                              ball.type === 'no-ball' ? 'NO BALL' : 
                                                                              ball.runs === 0 ? 'Dot Ball' : `${ball.runs} Run(s)`;

                                                                // Logical Detection for "Match Moments"
                                                                const isWicket = ball.isWicket;
                                                                
                                                                // To detect milestones, we need cumulative runs up to THIS ball.
                                                                const hitZone = ball.hitZone || ball.hit_zone;
                                                                
                                                                return (
                                                                    <React.Fragment key={bIdx}>
                                                                        {/* The Ball Row */}
                                                                        <div className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-all group">
                                                                            <div className="flex flex-col items-center min-w-[40px]">
                                                                                <span className="text-[10px] font-black text-slate-500 mb-1">
                                                                                    {overNum}.{ball.ballNumber}
                                                                                </span>
                                                                                <BallBadge ball={ball} />
                                                                            </div>
                                                                            
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-tighter">{bName}</span>
                                                                                    <ChevronRight size={10} className="text-slate-600" />
                                                                                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">{sName}</span>
                                                                                    {hitZone && (
                                                                                        <span className="ml-auto bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">{hitZone}</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className={`text-sm font-bold tracking-tight leading-relaxed ${
                                                                                    ball.isWicket ? 'text-red-500' : (ball.runs || 0) >= 4 ? 'text-emerald-400' : 'text-slate-200'
                                                                                }`}>
                                                                                    {resultText}
                                                                                </div>
                                                                            </div>

                                                                            <div className="text-right hidden sm:block">
                                                                                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Ball Result</div>
                                                                                 <div className="text-xs font-black text-slate-400 italic graduate opacity-60">
                                                                                    {ball.isWicket ? 'OUT' : `${ball.runs} R`}
                                                                                 </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Interstitial Event Cards */}
                                                                        {isWicket && (
                                                                            <CommentaryEventCard 
                                                                                type="wicket" 
                                                                                player={sName} 
                                                                                tagline={getRandomTagline('wicket')} 
                                                                            />
                                                                        )}

                                                                        {/* Milestone Simulation/Check */}
                                                                        {ball.milestone === 50 && (
                                                                            <CommentaryEventCard 
                                                                                type="milestone50" 
                                                                                player={sName} 
                                                                                tagline={getRandomTagline('milestone50')} 
                                                                            />
                                                                        )}
                                                                        {ball.milestone === 100 && (
                                                                            <CommentaryEventCard 
                                                                                type="milestone100" 
                                                                                player={sName} 
                                                                                tagline={getRandomTagline('milestone100')} 
                                                                            />
                                                                        )}
                                                                        {ball.isHatTrick && (
                                                                            <CommentaryEventCard 
                                                                                type="hat-trick" 
                                                                                player={bName} 
                                                                                tagline={getRandomTagline('hatTrick')} 
                                                                            />
                                                                        )}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>


            {/* Bottom Floating Stats Bar */}
            <div className="bg-slate-900/90 backdrop-blur-md border-t border-white/10 p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 px-8">
                <div className="flex gap-8 items-center">
                    <div className="flex gap-4 items-center">
                        <Calendar size={14} className="text-sky-500" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{new Date(match.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                    </div>
                    <div className="flex gap-4 items-center border-l border-white/10 pl-8">
                        <Trophy size={14} className="text-sky-500" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            {match.status === 'live' ? 'MATCH IN PROGRESS' : 
                             match.status === 'upcoming' ? 'MATCH SCHEDULED' : 
                             (match as any).resultNote || (match as any).resultSummary || 'MATCH COMPLETED'}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <div className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] italic">www.indianstrikers.club</div>
                    <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Image Generated by INS Team Management App</div>
                </div>
            </div>

            {/* Custom Animations */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes subtlePulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.9; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes slideIn {
                    0% { transform: translateX(30px); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
                .graduate { font-family: 'Graduate', serif; }
            `}} />

            {/* Loading Overlay */}
            {isExporting && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-slate-950 p-8 rounded-3xl border border-sky-500/30 text-center">
                        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white font-black uppercase tracking-widest italic">Generating HD Scorecard...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScorecardViewModal;
