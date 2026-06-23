import React from 'react';

interface LogoProps {
  variant?: 'header' | 'footer' | 'hero' | 'simple';
  className?: string;
  showText?: boolean;
}

export default function Logo({ variant = 'simple', className = '', showText = true }: LogoProps) {
  // SVG Gold Gradient and Glow Wave
  const WaveSVG = () => (
    <svg
      viewBox="0 0 280 80"
      className="w-full h-auto text-[#c4a484] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-all duration-300 pointer-events-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Real Metallic Gold Gradient Accent */}
        <linearGradient id="gold-gradient-logo" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f7ebd9" />
          <stop offset="25%" stopColor="#dfbd9a" />
          <stop offset="50%" stopColor="#c4a484" />
          <stop offset="75%" stopColor="#a38364" />
          <stop offset="100%" stopColor="#806348" />
        </linearGradient>
        {/* Subtle blur overlay for neon candlelit terrace vibe */}
        <filter id="logo-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Behind glowing shadow path */}
      <path
        d="M 25,48 C 65,12 110,22 130,42 C 155,68 190,14 245,35 C 215,48 180,47 155,40 C 130,33 105,62 70,64 C 45,66 30,60 25,48 Z"
        fill="url(#gold-gradient-logo)"
        opacity="0.25"
        filter="url(#logo-glow-filter)"
      />

      {/* Solid front gold wave */}
      <path
        d="M 25,48 C 65,12 110,22 130,42 C 155,68 190,14 245,35 C 215,48 180,47 155,40 C 130,33 105,62 70,64 C 45,66 30,60 25,48 Z"
        fill="url(#gold-gradient-logo)"
      />
    </svg>
  );

  if (variant === 'header') {
    return (
      <div className={`flex items-center space-x-3 group ${className}`} id="brand-logo-header">
        {/* Compact Wave container */}
        <div className="w-12 h-10 flex items-center justify-center shrink-0">
          <WaveSVG />
        </div>
        {showText && (
          <div className="flex flex-col select-none">
            <h1 className="font-serif tracking-[0.08em] text-sm sm:text-base text-white font-semibold uppercase group-hover:text-[#c4a484] transition-colors duration-300 leading-tight">
              CON<span className="text-[#c4a484] mx-0.5">~</span>SENTID@S
            </h1>
            <span className="block text-[7.5px] tracking-[0.16em] text-gray-400 group-hover:text-white transition-colors duration-300 font-mono uppercase leading-none">
              caffê • pastry shop • bistrot
            </span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex flex-col items-center text-center space-y-3 group ${className}`} id="brand-logo-footer">
        {/* Sizable Wave Accent */}
        <div className="w-24 sm:w-28 flex items-center justify-center">
          <WaveSVG />
        </div>
        {showText && (
          <div className="flex flex-col items-center">
            <h2 className="font-serif tracking-[0.15em] text-lg sm:text-xl text-white font-light uppercase leading-none">
              CON<span className="text-[#c4a485]">~</span>SENTID@S
            </h2>
            <span className="block text-[8px] sm:text-[9px] tracking-[0.22em] text-[#c4a484] font-mono uppercase mt-1.5 opacity-90">
              caffê • pastry shop • bistrot
            </span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={`flex flex-col items-center text-center space-y-4 group ${className}`} id="brand-logo-hero">
        {/* Prominent main wave representation */}
        <div className="w-36 sm:w-44 lg:w-48 flex items-center justify-center animate-pulse duration-8000">
          <WaveSVG />
        </div>
        {showText && (
          <div className="flex flex-col items-center">
            <h2 className="font-serif tracking-[0.2em] text-3xl sm:text-4xl lg:text-5xl text-white font-extralight uppercase leading-normal">
              CON<span className="text-[#c4a484]">~</span>SENTID@S
            </h2>
            <div className="w-12 h-px bg-[#c4a484]/45 my-3" />
            <span className="block text-[10px] sm:text-xs tracking-[0.35em] text-[#c4a484] font-mono uppercase">
              caffê • pastry shop • bistrot
            </span>
          </div>
        )}
      </div>
    );
  }

  // Simple / Default variant (minimal badge logo box)
  return (
    <div className={`flex flex-col items-center space-y-1.5 ${className}`} id="brand-logo-simple">
      <div className="w-16">
        <WaveSVG />
      </div>
      {showText && (
        <span className="font-serif tracking-widest text-[10px] text-white uppercase font-bold">
          CON~SENTID@S
        </span>
      )}
    </div>
  );
}
