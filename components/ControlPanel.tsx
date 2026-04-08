import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Derive active tab from the last segment of the URL
  const activeTab = (pathname.split('/').pop() || 'grounds') as ControlTab;

  const renderTabButton = (id: ControlTab, label: string, Icon: any) => (
    <button
      onClick={() => navigate(`/control-panel/${id}`)}
      className={`flex items-center gap-2 px-5 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap
        ${activeTab === id ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-white hover:text-blue-400 hover:border-blue-500 hover:bg-blue-500/5'}`}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full max-w-7xl mx-auto">
      {/* Standardized Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-2">
            <Settings className="text-blue-600" size={28} /> Control Panel
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">Global management hub for club masters and users.</p>
        </div>
      </div>

      {/* Standardized Glassmorphism Tabs Container */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
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
