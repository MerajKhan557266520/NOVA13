
import React, { useEffect, useState, useRef } from 'react';
import { AppState, NovaResponse } from '../types';

interface HoloAvatarProps {
  state: AppState;
  audioLevel: number;
  novaState: NovaResponse | null;
}

const HoloAvatar: React.FC<HoloAvatarProps> = ({ state, audioLevel, novaState }) => {
  const [time, setTime] = useState(0);
  const frameRef = useRef<number>(0);

  // Physics state for smooth animations
  const p = useRef({
    hoverY: 0,
    breath: 0,
    eyeOpen: 1,
    mouthH: 0,
    mouthV: 0,
    armL: 0,
    armR: 0,
    hairSway: 0,
    wingSpan: 0,
    glowIntensity: 0
  });

  const blinkTimer = useRef(0);
  const saccadeTimer = useRef(0);
  const eyeTarget = useRef({ x: 0, y: 0 });
  const eyeCurrent = useRef({ x: 0, y: 0 });

  const isSpeaking = state === AppState.SPEAKING;

  useEffect(() => {
    const animate = () => {
        const now = Date.now();
        const t = now / 1000;
        setTime(t);

        // 1. FLOATING & BREATHING
        p.current.hoverY = Math.sin(t * 1.5) * 8;
        p.current.breath = Math.sin(t * 2.5) * 0.02;

        // 2. HAIR PHYSICS (Sine waves with offset)
        p.current.hairSway = Math.sin(t * 1.2) * 2 + Math.cos(t * 0.8) * 1;

        // 3. BLINKING LOGIC
        if (now > blinkTimer.current) {
            // Start blink
            const duration = 150;
            const progress = (now - blinkTimer.current) / duration;
            if (progress > 1) {
                // Blink done
                blinkTimer.current = now + 2000 + Math.random() * 3000;
                p.current.eyeOpen = 1;
            } else {
               // Blinking curve
               p.current.eyeOpen = Math.abs(Math.sin(progress * Math.PI)); 
            }
        }

        // 4. GAZE LOGIC
        if (now > saccadeTimer.current) {
            eyeTarget.current = {
                x: (Math.random() - 0.5) * 10,
                y: (Math.random() - 0.5) * 5
            };
            saccadeTimer.current = now + 1000 + Math.random() * 2000;
        }
        // Smooth eye follow
        eyeCurrent.current.x += (eyeTarget.current.x - eyeCurrent.current.x) * 0.1;
        eyeCurrent.current.y += (eyeTarget.current.y - eyeCurrent.current.y) * 0.1;

        // 5. LIP SYNC & EXPRESSION
        // Smoothly interpolate mouth shape based on audio
        const targetMouthV = isSpeaking ? Math.min(15, audioLevel / 5) : 0;
        const targetMouthH = isSpeaking ? Math.min(5, audioLevel / 10) : 0;
        
        p.current.mouthV += (targetMouthV - p.current.mouthV) * 0.3;
        p.current.mouthH += (targetMouthH - p.current.mouthH) * 0.3;

        // 6. WINGS & GLOW
        const targetWing = isSpeaking ? 1 : 0.2;
        p.current.wingSpan += (targetWing - p.current.wingSpan) * 0.05;
        p.current.glowIntensity = 0.5 + (audioLevel / 255) * 0.5;

        frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [audioLevel, isSpeaking]);

  // COLOR PALETTE
  const C = {
    line: "#22d3ee", // Cyan 400
    fill: "#083344", // Cyan 950
    glow: "#67e8f9", // Cyan 300
    skin: "#ecfeff", // Cyan 50
    suit: "#0f172a", // Slate 900
    hair: "#cffafe", // Cyan 100
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative perspective-1000">
        
        {/* HOLOGRAM FLICKER FILTER */}
        <svg className="absolute w-0 h-0">
            <defs>
                <filter id="hologram-glitch">
                    <feTurbulence type="fractalNoise" baseFrequency="0.01 0.5" numOctaves="1" result="noise" />
                    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" in="noise" result="alpha" />
                    <feComposite operator="in" in="SourceGraphic" in2="alpha" />
                </filter>
                <linearGradient id="cyber-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={C.line} stopOpacity="0.8"/>
                    <stop offset="100%" stopColor={C.fill} stopOpacity="0.2"/>
                </linearGradient>
            </defs>
        </svg>

        <svg 
            viewBox="0 0 500 800" 
            className="h-[90vh] w-auto drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-transform duration-100"
            style={{ transform: `translateY(${p.current.hoverY}px)` }}
        >
            {/* === WINGS (BEHIND) === */}
            <g transform="translate(250, 300)">
                {[1, -1].map((scale, i) => (
                    <g key={i} transform={`scale(${scale}, 1) rotate(${p.current.wingSpan * 5})`}>
                        <path 
                            d="M 40,0 L 180,-80 L 220,20 L 80,120 Z" 
                            fill="url(#cyber-grad)" stroke={C.line} strokeWidth="1"
                            opacity={0.3 + p.current.wingSpan * 0.4}
                        />
                        <path d="M 50,10 L 180,-70" stroke={C.glow} strokeDasharray="5 5" opacity="0.6"/>
                        <circle cx="220" cy="20" r="3" fill={C.line} className="animate-pulse"/>
                    </g>
                ))}
            </g>

            {/* === MAIN BODY === */}
            <g transform="translate(250, 400)">
                
                {/* 1. BODY SUIT */}
                <path 
                    d="M -40,-130 C -60,-100 -55,50 -45,100 L -70,350 L 70,350 L 45,100 C 55,50 60,-100 40,-130" 
                    fill={C.suit} stroke={C.line} strokeWidth="2"
                />
                
                {/* Suit Details */}
                <path d="M -45,100 Q 0,150 45,100" fill="none" stroke={C.line} strokeWidth="1"/>
                <path d="M 0,-130 L 0,140" fill="none" stroke={C.line} strokeWidth="1" strokeOpacity="0.5"/>
                <circle cx="0" cy="-30" r="8" fill={C.glow} filter="blur(2px)" opacity={0.6 + p.current.breath * 5} />

                {/* Arms (Simplified geometric) */}
                <path d="M -45,-120 L -90,-20 L -100,150" fill="none" stroke={C.suit} strokeWidth="20" strokeLinecap="round"/>
                <path d="M -45,-120 L -90,-20 L -100,150" fill="none" stroke={C.line} strokeWidth="1"/>
                
                <path d="M 45,-120 L 90,-20 L 100,150" fill="none" stroke={C.suit} strokeWidth="20" strokeLinecap="round"/>
                <path d="M 45,-120 L 90,-20 L 100,150" fill="none" stroke={C.line} strokeWidth="1"/>

                {/* === HEAD === */}
                <g transform="translate(0, -140)">
                    
                    {/* Back Hair */}
                    <path 
                        d="M -60,-60 C -80,0 -80,100 -50,140 L 50,140 C 80,100 80,0 60,-60 C 40,-100 -40,-100 -60,-60" 
                        fill="#164e63" stroke={C.line} strokeWidth="2"
                    />

                    {/* Face Shape */}
                    <path 
                        d="M -45,-40 C -45,40 -30,90 0,110 C 30,90 45,40 45,-40 C 45,-90 -45,-90 -45,-40" 
                        fill={C.skin} 
                    />

                    {/* === FACE FEATURES === */}
                    <g transform="translate(0, 10)">
                        
                        {/* Eyes */}
                        {[-1, 1].map((scale, i) => (
                            <g key={i} transform={`translate(${scale * 22}, -10)`}>
                                {/* Sclera */}
                                <ellipse cx="0" cy="0" rx="14" ry="10" fill="#fff" />
                                
                                {/* Eyelid Mask / Blink */}
                                <path 
                                    d={`M -15,-12 L 15,-12 L 15,${-12 + (24 * (1 - p.current.eyeOpen))} L -15,${-12 + (24 * (1 - p.current.eyeOpen))} Z`} 
                                    fill={C.skin}
                                />
                                
                                {/* Iris */}
                                <g transform={`translate(${eyeCurrent.current.x}, ${eyeCurrent.current.y})`}>
                                    <circle r="7" fill={C.line} />
                                    <circle r="3" fill="#000" />
                                    <circle cx="3" cy="-3" r="2" fill="#fff" opacity="0.8" />
                                </g>

                                {/* Lashes */}
                                <path d="M -14,-4 Q 0,-14 14,-4" fill="none" stroke="#000" strokeWidth="2"/>
                            </g>
                        ))}

                        {/* Mouth */}
                        <g transform="translate(0, 45)">
                            <ellipse 
                                cx="0" cy="0" 
                                rx={6 + p.current.mouthH} 
                                ry={2 + p.current.mouthV} 
                                fill="#f43f5e" 
                            />
                        </g>

                        {/* Cheeks */}
                        <circle cx="-30" cy="20" r="8" fill="#f472b6" opacity="0.3" filter="blur(4px)"/>
                        <circle cx="30" cy="20" r="8" fill="#f472b6" opacity="0.3" filter="blur(4px)"/>
                    </g>

                    {/* Front Hair / Bangs */}
                    <path 
                        d="M -50,-50 C -40,-20 -20,-10 0,-30 C 20,-10 40,-20 50,-50 C 40,-80 -40,-80 -50,-50" 
                        fill={C.hair} opacity="0.9" stroke={C.line} strokeWidth="1"
                        transform={`rotate(${p.current.hairSway})`}
                    />
                    
                    {/* Headset / Tech Crown */}
                    <path 
                        d="M -55,-40 L -60,-80 L -30,-90 L 0,-80 L 30,-90 L 60,-80 L 55,-40" 
                        fill="none" stroke={C.glow} strokeWidth="2"
                    />
                    <circle cx="-60" cy="-40" r="4" fill={C.line} className="animate-pulse"/>
                    <circle cx="60" cy="-40" r="4" fill={C.line} className="animate-pulse"/>

                </g>
            </g>

            {/* SCANLINES OVERLAY */}
            <path d="M 0,0 L 500,0 L 500,800 L 0,800 Z" fill="url(#scanlines)" opacity="0.3" pointerEvents="none"/>
            <defs>
                <pattern id="scanlines" patternUnits="userSpaceOnUse" width="100" height="4">
                    <line x1="0" y1="0" x2="100" y2="0" stroke="white" strokeWidth="1" opacity="0.1"/>
                </pattern>
            </defs>

        </svg>

        {/* GLOW UNDERNEATH */}
        <div 
            className="absolute bottom-10 w-64 h-20 bg-cyan-500 rounded-full blur-[60px] opacity-30 animate-pulse"
            style={{ transform: `scale(${0.8 + audioLevel/200})` }}
        ></div>
    </div>
  );
};

export default HoloAvatar;
