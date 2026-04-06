import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { Player } from '../types';
import { 
  Plus, MapPin, Trophy, Settings,
  Users, Layout
} from 'lucide-react';

type ControlTab = 'grounds' | 'tournaments' | 'users' | 'requests' | 'legacy';

interface ControlPanelProps {
  players: Player[];
  onUpdatePlayer: (p: Player) => void | Promise<void>;
}

const ControlPanel: React.FC<ControlPanelProps> = () => {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ControlTab>((tab as ControlTab) || 'grounds');

  useEffect(() => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab as ControlTab);
    }
  }, [tab]);

  const renderTabButton = (id: ControlTab, label: string, Icon: any) => (
    <button
      onClick={() => navigate(`/control-panel/${id}`)}
      className={`flex items-center gap-2 px-6 py-3 text-sm font-black uppercase tracking-widest transition-all border-b-2 
        ${activeTab === id ? 'border-blue-500 text-blue-500 bg-blue-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
    >
      <Icon size={18} /> {label}
    </button>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-3">
            <Settings className="text-blue-600" size={36} /> Control Panel
          </h1>
          <p className="text-slate-500 font-medium md:text-lg mt-1">Global management hub for club masters and users.</p>
        </div>
      </div>

      {/* Glassmorphism Tabs */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="flex overflow-x-auto border-b border-slate-800 no-scrollbar">
          {renderTabButton('grounds', 'Grounds', MapPin)}
          {renderTabButton('tournaments', 'Tournaments', Trophy)}
          {renderTabButton('users', 'Users', Users)}
          {renderTabButton('legacy', 'Club Legacy', Layout)}
        </div>

        {/* Tab Content - Now using Outlet for sub-routes */}
        <div className="p-6 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
