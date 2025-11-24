
import React, { useState, useEffect } from 'react';
import { AppState, NovaResponse } from './types';
import HoloAvatar from './components/HoloAvatar';
import BackgroundMatrix from './components/BackgroundMatrix';
import { geminiLiveService } from './services/geminiService';

const MASTER_NAME = "MR. KHAN";

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [appState, setAppState] = useState<AppState>(AppState.LOCKED);
  const [audioLevel, setAudioLevel] = useState(0);
  const [novaState, setNovaState] = useState<NovaResponse | null>(null);
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    // Service Bindings
    geminiLiveService.onAudioLevel = (level) => {
      setAudioLevel(level);
      if (level > 20 && appState === AppState.AUTHORIZED) {
        setAppState(AppState.SPEAKING);
      } else if (level < 10 && appState === AppState.SPEAKING) {
        setAppState(AppState.AUTHORIZED);
      }
    };
    
    // Process Structured Nova Response
    geminiLiveService.onNovaUpdate = (response) => {
      setNovaState(response);
      setSubtitle(response.speech);
    };

    geminiLiveService.onError = (err) => {
        setSubtitle("CONNECTION INTERRUPTED");
    };

  }, [appState]);

  const initSystem = async () => {
    try {
        await geminiLiveService.initializeAudio();
        setIsInitialized(true);
        setAppState(AppState.CONNECTING);
        
        await geminiLiveService.connect(() => {
            setAppState(AppState.AUTHORIZED);
        });
    } catch (e: any) {
        console.error(e);
    }
  };

  // 1. LANDING SCREEN
  if (!isInitialized) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center font-rajdhani overflow-hidden relative">
         <BackgroundMatrix />
         <div className="z-10 text-center flex flex-col items-center animate-[fadeIn_1s_ease-out] border border-cyan-500/30 p-12 bg-black/40 backdrop-blur-md rounded-2xl shadow-[0_0_100px_rgba(6,182,212,0.1)]">
            <h1 className="text-8xl font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 tracking-tighter filter drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                NOVA
            </h1>
            <div className="text-cyan-500/50 font-mono tracking-[0.5em] text-xs mt-2">CREATED BY MR. KHAN</div>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-500 to-transparent my-6"></div>
            <button 
                onClick={initSystem}
                className="group relative px-10 py-4 overflow-hidden rounded-full border border-cyan-500/50 transition-all duration-300 hover:scale-105 active:scale-95 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
            >
                <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-all duration-300"></div>
                <span className="relative text-cyan-300 font-orbitron tracking-[0.3em] text-sm">INITIALIZE</span>
            </button>
         </div>
      </div>
    );
  }

  // 2. MAIN INTERFACE
  return (
    <div className="h-screen w-screen bg-black text-white font-rajdhani overflow-hidden flex flex-col relative">
      
      <BackgroundMatrix audioLevel={audioLevel} />
      
      {/* Cinematic Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] pointer-events-none z-10"></div>
      
      {/* Header */}
      <header className="absolute top-0 left-0 w-full h-24 z-30 flex items-start justify-between px-8 py-6 bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
         <div className="flex flex-col">
            <div className="flex items-center gap-3 opacity-90">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]"></div>
                <div className="text-xl font-orbitron text-cyan-50 tracking-[0.2em] drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">NOVA // SYSTEM</div>
            </div>
            <div className="text-[10px] font-mono text-cyan-400/70 tracking-[0.3em] ml-5 mt-1 animate-pulse">
                CREATED BY MR. KHAN
            </div>
         </div>
      </header>

      {/* AVATAR STAGE */}
      <main className="flex-1 w-full h-full relative z-20 flex flex-col items-center justify-end pb-0 overflow-hidden">
        <HoloAvatar state={appState} audioLevel={audioLevel} novaState={novaState} />
      </main>

      {/* SUBTITLES */}
      {subtitle && (
        <div className="absolute bottom-12 z-40 w-full flex justify-center pointer-events-none px-4">
            <div className="bg-black/40 backdrop-blur-md border border-cyan-500/20 py-4 px-12 max-w-4xl text-center rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <p className="text-xl md:text-2xl font-light tracking-wide text-cyan-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-sans">
                    {subtitle}
                </p>
            </div>
        </div>
      )}

    </div>
  );
}

export default App;
