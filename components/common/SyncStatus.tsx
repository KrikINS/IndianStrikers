import React, { useState, useEffect } from 'react';
import { useCricketScorer } from '../../store/matchStore';
import { Cloud, CloudOff, CloudLightning } from 'lucide-react';
import styled from 'styled-components';

const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  
  &:hover > div {
    opacity: 1;
    visibility: visible;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  padding: 8px 12px;
  background: #001F3F;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 700;
  color: white;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s;
  z-index: 100;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
`;

export const SyncStatus: React.FC = () => {
    const offlineQueueLength = useCricketScorer(state => state.offlineQueue?.length || 0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const isHealthy = isOnline && offlineQueueLength === 0;
    const isError = !isOnline || offlineQueueLength >= 10;
    const isWarning = isOnline && offlineQueueLength > 0 && offlineQueueLength < 10;
    
    // Status color
    let bgColor = 'bg-emerald-500';
    let pulseColor = 'bg-emerald-400';
    let Icon = Cloud;
    
    if (isError) {
        bgColor = 'bg-red-500';
        pulseColor = 'bg-red-400';
        Icon = CloudOff;
    } else if (isWarning || (!isOnline && offlineQueueLength < 10)) {
        bgColor = 'bg-amber-500';
        pulseColor = 'bg-amber-400';
        Icon = CloudLightning;
    }

    return (
        <TooltipContainer>
            <div className={`relative flex items-center justify-center p-[4px] rounded-full bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 cursor-help transition-all shadow-sm`}>
                {(!isHealthy) && (
                    <span className="absolute flex h-full w-full inset-0">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-30`}></span>
                    </span>
                )}
                <div className={`relative flex items-center justify-center ${bgColor} rounded-full p-1`}>
                    <Icon size={12} color="white" />
                </div>
                {offlineQueueLength > 0 && (
                    <span className="ml-[6px] mr-[4px] text-[0.65rem] font-black text-slate-200">
                        {offlineQueueLength}
                    </span>
                )}
            </div>
            <Tooltip>
                {isHealthy ? "All data backed up to GCP" : `Waiting to sync ${offlineQueueLength} deliveries...`}
            </Tooltip>
        </TooltipContainer>
    );
};
