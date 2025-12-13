
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Match, Player, OpponentTeam } from '../types';
import { Save, ChevronLeft, Calendar, User, Trophy, Hash, Shield } from 'lucide-react';
import { updateMatch } from '../services/storageService';

interface ManualScorecardProps {
    match?: Match;
    players: Player[];
    opponents?: OpponentTeam[];
}

const DISMISSAL_TYPES = ["Not Out", "Bowled", "Caught", "LBW", "Run Out", "Stumped", "Hit Wicket", "Retired"];

// Helper to calculate Extras Total
const calculateExtras = (extras: any) => {
    return (Number(extras.byes) || 0) + (Number(extras.legByes) || 0) + (Number(extras.wides) || 0) + (Number(extras.noBalls) || 0) + (Number(extras.penalty) || 0);
};

const ManualScorecard: React.FC<ManualScorecardProps> = ({ players, opponents = [] }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const matchFromState = location.state?.match as Match | undefined;

    const [matchData, setMatchData] = useState<Partial<Match>>(matchFromState || {
        opponent: '',
        date: new Date().toISOString().split('T')[0],
        venue: '',
        tossTime: '',
        result: 'Pending'
    });

    const [tossWinner, setTossWinner] = useState('');
    const [battingFirst, setBattingFirst] = useState('');
    const [overs, setOvers] = useState('20');

    // Get Opponent Roster if available
    const [opponentRoster, setOpponentRoster] = useState<{ name: string }[]>([]);

    useEffect(() => {
        if (matchData.opponent) {
            const team = opponents.find(o => o.name === matchData.opponent);
            if (team) setOpponentRoster(team.players);
            else setOpponentRoster([]);
        }
    }, [matchData.opponent, opponents]);

    // Data Structures
    const createEmptyBatter = () => ({ name: '', howOut: 'Not Out', fielder: '', bowler: '', runs: '', balls: '', fours: '', sixes: '' });
    const createEmptyBowler = () => ({ name: '', overs: '', maidens: '', runs: '', wickets: '', wides: '', noBalls: '', dots: '' });

    const [teamABatting, setTeamABatting] = useState(Array(11).fill(null).map(createEmptyBatter));
    const [teamBBowling, setTeamBBowling] = useState(Array(8).fill(null).map(createEmptyBowler));
    const [teamBBatting, setTeamBBatting] = useState(Array(11).fill(null).map(createEmptyBatter));
    const [teamABowling, setTeamABowling] = useState(Array(8).fill(null).map(createEmptyBowler));

    const [teamAExtras, setTeamAExtras] = useState({ byes: '', legByes: '', wides: '', noBalls: '', penalty: '' });
    const [teamBExtras, setTeamBExtras] = useState({ byes: '', legByes: '', wides: '', noBalls: '', penalty: '' });

    const handleSave = async () => {
        try {
            if (!matchFromState?.id) {
                alert("Cannot save: No match selected to update.");
                return;
            }

            const manualData = {
                teamABatting, teamBBowling, teamAExtras,
                teamBBatting, teamABowling, teamBExtras,
                tossWinner, battingFirst, overs
            };

            const updatedMatch: Match = {
                ...matchFromState,
                ...matchData as Match,
                scorecardData: { type: 'manual', data: manualData }
            };

            await updateMatch(updatedMatch);
            alert("Scorecard saved successfully!");
            navigate('/matches');
        } catch (e) {
            console.error(e);
            alert("Failed to save scorecard.");
        }
    };

    // --- Render Helpers (Defined inside but using simple inputs to avoid re-mount issues if possible, 
    // OR ensuring key stability. The issue before was likely component re-definition.
    // We will render rows map directly in JSX or use a stable component outside)

    // We'll use simple mapping in the render return to ensure stability.

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 animate-fade-in">
                <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 hover:text-blue-600 font-bold transition-colors">
                    <ChevronLeft size={20} /> Back
                </button>
                <div className="flex gap-2">
                    <button onClick={handleSave} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-slate-800 hover:scale-105 transition-all">
                        <Save size={18} /> Save Scorecard
                    </button>
                </div>
            </div>

            {/* Match Info Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-slide-up">
                <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                    <Trophy size={20} className="text-yellow-500" />
                    <h2 className="text-lg font-bold text-slate-800">Match Configuration</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Opponent</label>
                        <select
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                            value={matchData.opponent}
                            onChange={e => setMatchData({ ...matchData, opponent: e.target.value })}
                        >
                            <option value="">Select Team</option>
                            {opponents.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                            {!opponents.find(o => o.name === matchData.opponent) && matchData.opponent && <option value={matchData.opponent}>{matchData.opponent}</option>}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tournament</label>
                        <input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700" value={matchData.tournament || ''} onChange={e => setMatchData({ ...matchData, tournament: e.target.value })} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Toss Winner</label>
                        <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700" value={tossWinner} onChange={e => setTossWinner(e.target.value)}>
                            <option value="">Select</option>
                            <option value="Indian Strikers">Indian Strikers</option>
                            <option value={matchData.opponent || 'Opponent'}>{matchData.opponent || 'Opponent'}</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Batting First</label>
                        <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700" value={battingFirst} onChange={e => setBattingFirst(e.target.value)}>
                            <option value="">Select</option>
                            <option value="Indian Strikers">Indian Strikers</option>
                            <option value={matchData.opponent || 'Opponent'}>{matchData.opponent || 'Opponent'}</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Overs</label>
                        <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700" value={overs} onChange={e => setOvers(e.target.value)}>
                            <option value="20">20 Overs</option>
                            {[10, 12, 15, 16, 25, 30, 40, 50].map(o => <option key={o} value={o}>{o} Overs</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Scorecard Grids */}
            <div className="grid lg:grid-cols-2 gap-8">

                {/* Left Column: Indian Strikers Batting (Usually Innings 1 if Batting First) */}
                <div className="space-y-6">
                    <BattingSection
                        title="Indian Strikers Batting"
                        data={teamABatting}
                        setData={setTeamABatting}
                        playersList={players.map(p => p.name)} // Home Players
                        bowlersList={opponentRoster.map(p => p.name)} // Opponent Bowlers
                        colorClass="bg-blue-600"
                    />
                    <ExtrasSection title="Extras (Indian Strikers)" data={teamAExtras} setData={setTeamAExtras} />
                    <BowlingSection
                        title={`${matchData.opponent || 'Opponent'} Bowling`}
                        data={teamBBowling}
                        setData={setTeamBBowling}
                        bowlersList={opponentRoster.map(p => p.name)}
                        colorClass="bg-slate-700"
                    />
                </div>

                {/* Right Column: Opponent Batting */}
                <div className="space-y-6">
                    <BattingSection
                        title={`${matchData.opponent || 'Opponent'} Batting`}
                        data={teamBBatting}
                        setData={setTeamBBatting}
                        playersList={opponentRoster.map(p => p.name)} // Opponent Batters
                        bowlersList={players.map(p => p.name)} // Home Bowlers (Fielders)
                        colorClass="bg-orange-600"
                    />
                    <ExtrasSection title={`Extras (${matchData.opponent || 'Opponent'})`} data={teamBExtras} setData={setTeamBExtras} />
                    <BowlingSection
                        title="Indian Strikers Bowling"
                        data={teamABowling}
                        setData={setTeamABowling}
                        bowlersList={players.map(p => p.name)}
                        colorClass="bg-blue-600"
                    />
                </div>
            </div>
        </div>
    );
};

// --- Sub-Components (Defined Outside to prevent focus loss) ---

const BattingSection = ({ title, data, setData, playersList, bowlersList, colorClass }: any) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className={`${colorClass} p-4 text-white font-bold flex items-center justify-between`}>
                <span>{title}</span>
                <Shield size={16} className="opacity-50" />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-3 w-10">#</th>
                            <th className="p-3 min-w-[140px]">Batter</th>
                            <th className="p-3 min-w-[100px]">Dismissal</th>
                            <th className="p-3 min-w-[100px]">Fielder</th>
                            <th className="p-3 min-w-[100px]">Bowler</th>
                            <th className="p-3 w-12 text-center">R</th>
                            <th className="p-3 w-12 text-center">B</th>
                            <th className="p-3 w-12 text-center">4s</th>
                            <th className="p-3 w-12 text-center">6s</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                <td className="p-2">
                                    <input
                                        list={`players-${title}-${idx}`}
                                        className="w-full p-1.5 bg-transparent border-b border-transparent focus:border-blue-500 outline-none font-bold text-slate-700 placeholder-slate-300"
                                        placeholder="Player Name"
                                        value={row.name}
                                        onChange={e => {
                                            const newData = [...data];
                                            newData[idx].name = e.target.value;
                                            setData(newData);
                                        }}
                                    />
                                    <datalist id={`players-${title}-${idx}`}>
                                        {playersList.map((p: string) => <option key={p} value={p} />)}
                                    </datalist>
                                </td>
                                <td className="p-2">
                                    <select
                                        className="w-full p-1.5 bg-transparent border-b border-slate-100 focus:border-blue-500 outline-none text-xs font-semibold"
                                        value={row.howOut}
                                        onChange={e => {
                                            const newData = [...data];
                                            newData[idx].howOut = e.target.value;
                                            setData(newData);
                                        }}
                                    >
                                        {DISMISSAL_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </td>
                                <td className="p-2">
                                    <input
                                        list={`fielders-${title}`}
                                        className="w-full p-1.5 bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-xs"
                                        placeholder="Fielder"
                                        value={row.fielder}
                                        onChange={e => {
                                            const newData = [...data];
                                            newData[idx].fielder = e.target.value;
                                            setData(newData);
                                        }}
                                    />
                                    <datalist id={`fielders-${title}`}>
                                        {bowlersList.map((p: string) => <option key={p} value={p} />)}
                                    </datalist>
                                </td>
                                <td className="p-2">
                                    <input
                                        list={`bowlers-${title}`}
                                        className="w-full p-1.5 bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-xs"
                                        placeholder="Bowler"
                                        value={row.bowler}
                                        onChange={e => {
                                            const newData = [...data];
                                            newData[idx].bowler = e.target.value;
                                            setData(newData);
                                        }}
                                    />
                                    <datalist id={`bowlers-${title}`}>
                                        {bowlersList.map((p: string) => <option key={p} value={p} />)}
                                    </datalist>
                                </td>
                                <td className="p-2"><input type="number" className="w-full text-center p-1 font-bold bg-slate-50 rounded" value={row.runs} onChange={e => { const n = [...data]; n[idx].runs = e.target.value; setData(n) }} /></td>
                                <td className="p-2"><input type="number" className="w-full text-center p-1 text-xs" value={row.balls} onChange={e => { const n = [...data]; n[idx].balls = e.target.value; setData(n) }} /></td>
                                <td className="p-2"><input type="number" className="w-full text-center p-1 text-xs text-green-600" value={row.fours} onChange={e => { const n = [...data]; n[idx].fours = e.target.value; setData(n) }} /></td>
                                <td className="p-2"><input type="number" className="w-full text-center p-1 text-xs text-purple-600" value={row.sixes} onChange={e => { const n = [...data]; n[idx].sixes = e.target.value; setData(n) }} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const BowlingSection = ({ title, data, setData, bowlersList, colorClass }: any) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className={`${colorClass} p-4 text-white font-bold flex items-center justify-between`}>
                <span>{title}</span>
                <Hash size={16} className="opacity-50" />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-3 w-10">#</th>
                            <th className="p-3 min-w-[150px]">Bowler</th>
                            <th className="p-3 text-center">O</th>
                            <th className="p-3 text-center">M</th>
                            <th className="p-3 text-center">R</th>
                            <th className="p-3 text-center">W</th>
                            <th className="p-3 text-center">WD</th>
                            <th className="p-3 text-center">NB</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                <td className="p-2">
                                    <input
                                        list={`bowlers-bowl-${title}-${idx}`}
                                        className="w-full p-1.5 bg-transparent border-b border-transparent focus:border-blue-500 outline-none font-bold text-slate-700"
                                        placeholder="Bowler Name"
                                        value={row.name}
                                        onChange={e => {
                                            const newData = [...data];
                                            newData[idx].name = e.target.value;
                                            setData(newData);
                                        }}
                                    />
                                    <datalist id={`bowlers-bowl-${title}-${idx}`}>
                                        {bowlersList.map((p: string) => <option key={p} value={p} />)}
                                    </datalist>
                                </td>
                                <td className="p-2"><input type="number" className="w-full text-center p-1 font-bold bg-slate-50 rounded" value={row.overs} onChange={e => { const n = [...data]; n[idx].overs = e.target.value; setData(n) }} /></td>
                                <td className="p-2"><input type="number" className="w-full text-center p-1 text-xs" value={row.maidens} onChange={e => { const n = [...data]; n[idx].maidens = e.target.value; setData(n) }} /></td>
                                <td className="p-2"><input type="number" className="w-full text-center p-1 text-xs" value={row.runs} onChange={e => { const n = [...data]; n[idx].runs = e.target.value; setData(n) }} /></td>
                                <td className="p-2"><input type="number" className="w-full text-center p-1 font-black text-red-600 bg-red-50 rounded" value={row.wickets} onChange={e => { const n = [...data]; n[idx].wickets = e.target.value; setData(n) }} /></td>
                                <td className="p-2"><input type="number" className="w-full text-center p-1 text-xs" value={row.wides} onChange={e => { const n = [...data]; n[idx].wides = e.target.value; setData(n) }} /></td>
                                <td className="p-2"><input type="number" className="w-full text-center p-1 text-xs" value={row.noBalls} onChange={e => { const n = [...data]; n[idx].noBalls = e.target.value; setData(n) }} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const ExtrasSection = ({ title, data, setData }: any) => {
    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-4">
            <label className="text-xs font-bold uppercase text-slate-500">{title}</label>
            <div className="flex items-center gap-2">
                <input type="number" placeholder="B" title="Byes" className="w-12 p-1.5 border border-slate-200 rounded text-center font-bold" value={data.byes} onChange={e => setData({ ...data, byes: e.target.value })} />
                <input type="number" placeholder="LB" title="Leg Byes" className="w-12 p-1.5 border border-slate-200 rounded text-center font-bold" value={data.legByes} onChange={e => setData({ ...data, legByes: e.target.value })} />
                <input type="number" placeholder="WD" title="Wides" className="w-12 p-1.5 border border-slate-200 rounded text-center font-bold" value={data.wides} onChange={e => setData({ ...data, wides: e.target.value })} />
                <input type="number" placeholder="NB" title="No Balls" className="w-12 p-1.5 border border-slate-200 rounded text-center font-bold" value={data.noBalls} onChange={e => setData({ ...data, noBalls: e.target.value })} />
                <input type="number" placeholder="PEN" title="Penalty" className="w-12 p-1.5 border border-slate-200 rounded text-center font-bold" value={data.penalty} onChange={e => setData({ ...data, penalty: e.target.value })} />
            </div>
            <div className="ml-auto bg-slate-200 px-3 py-1 rounded-lg text-sm font-bold text-slate-700">
                Total Extras: {calculateExtras(data)}
            </div>
        </div>
    )
}

export default ManualScorecard;
