
import React from 'react';

interface KirikINSLogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xl';
}

const KirikINSLogo: React.FC<KirikINSLogoProps> = ({ className = '', size = 'large' }) => {
  
  // Dimensions reduced by half compared to previous
  let width = 150;
  let height = 40;
  let fontSize = 30;
  
  if (size === 'small') {
    width = 50;
    height = 15;
    fontSize = 12;
  } else if (size === 'medium') {
    width = 90;
    height = 25;
    fontSize = 18;
  } else if (size === 'xl') {
    width = 200;
    height = 60;
    fontSize = 40;
  }

  // Adjust starting X for INS to sit flush with Kirik
  // Font is 'Tilt Neon'
  const insStartX = size === 'small' ? 24 : size === 'medium' ? 36 : size === 'xl' ? 82 : 62;

  // Neon Glow Filter ID
  const filterId = `neonGlow-${size}`;

  return (
    <div className={`perspective-container select-none ${className}`} style={{ width: width, height: height }}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`} 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="royalBlueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4169E1" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Group for positioning text vertically centered */}
        <g transform={`translate(0, ${height / 1.5})`} style={{ filter: `url(#${filterId})` }}>
            {/* Part 1: Kirik - White Fill, Neon Font */}
            <text 
              x="0" 
              y="0" 
              fontFamily="'Tilt Neon', sans-serif" 
              fontWeight="400" 
              fontSize={fontSize} 
              fill="white"
              style={{ textShadow: '0 0 5px rgba(255,255,255,0.8)' }}
            >
              Kirik
            </text>

            {/* Part 2: INS - Royal Blue Fill with vertical rotation */}
            <g className="rotate-ins" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                <text 
                  x={insStartX} 
                  y="0" 
                  fontFamily="'Tilt Neon', sans-serif" 
                  fontWeight="400" 
                  fontSize={fontSize} 
                  fill="#4169E1"
                  stroke="white"
                  strokeWidth="0.5"
                  style={{ textShadow: '0 0 8px rgba(65, 105, 225, 0.8)' }}
                >
                  INS
                </text>
            </g>
        </g>
      </svg>
    </div>
  );
};

export default KirikINSLogo;
