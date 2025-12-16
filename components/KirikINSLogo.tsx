
import React from 'react';
import './KirikINSLogo.css';

interface KirikINSLogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xl';
}

const KirikINSLogo: React.FC<KirikINSLogoProps> = ({ className = '', size = 'large' }) => {

  // Dimensions
  let width = 150;
  let height = 40;
  let fontSize = 30;

  if (size === 'small') {
    width = 60; // Increased from 50
    height = 24; // Increased from 15 to prevent clipping
    fontSize = 12;
  } else if (size === 'medium') {
    width = 100; // Increased from 90
    height = 30; // Increased from 25
    fontSize = 18;
  } else if (size === 'xl') {
    width = 200;
    height = 60;
    fontSize = 40;
  }

  // Adjust starting X for INS
  const insStartX = size === 'small' ? 28 : size === 'medium' ? 40 : size === 'xl' ? 82 : 62;

  // Neon Glow Filter ID
  const filterId = `neonGlow-${size}`;

  // Create filter class name based on size
  const filterClass = `filter-${size}`;

  return (
    <div
      className={`kirik-logo-container perspective-container select-none ${size} ${className}`}
      data-filter-id={filterId}
    >
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
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Group with Filter */}
        <g className={`kirik-logo-filter ${filterClass}`}>
          {/* Part 1: Kirik - White Fill, Neon Font */}
          <text
            x="0"
            y="55%"
            dominantBaseline="middle"
            fontFamily="'Tilt Neon', sans-serif"
            fontWeight="400"
            fontSize={fontSize}
            fill="white"
            className="kirik-text-white-glow"
          >
            Krik
          </text>

          {/* Part 2: INS - Solid Royal Blue Fill with circular rotation */}
          <g className="rotate-ins">
            <text
              x={insStartX}
              y="55%"
              dominantBaseline="middle"
              fontFamily="'Tilt Neon', sans-serif"
              fontWeight="400"
              fontSize={fontSize}
              fill="#4169E1"
              className="kirik-text-blue-glow"
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