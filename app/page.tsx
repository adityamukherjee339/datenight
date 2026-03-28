"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Video, Sparkles, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const createRoom = () => {
    setIsCreating(true);
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setTimeout(() => {
      router.push(`/room/${code}`);
    }, 600);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length >= 4) {
      setIsJoining(true);
      router.push(`/room/${joinCode.toUpperCase()}`);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-black overflow-hidden selection:bg-cyan-900 selection:text-cyan-100 px-4 py-8 sm:px-6 md:px-8">

      {/* Animated ambient background glows */}
      <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-cyan-400/5 rounded-full blur-[200px] pointer-events-none" />

      <div className="z-10 w-full max-w-lg p-6 sm:p-10 space-y-12 group">

        {/* Hero Section */}
        <div className="text-center space-y-6 p-6">
          <div className="relative inline-flex items-center justify-center p-5 rounded-3xl bg-zinc-900/60 border border-white/5 backdrop-blur-2xl mb-2 group-hover:border-cyan-500/40 transition-all duration-700 group-hover:shadow-[0_0_40px_rgba(34,211,238,0.15)]">
            <Heart className="w-14 h-14 text-cyan-400 fill-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)] animate-pulse" />
            <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-cyan-300 animate-bounce" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 py-2 leading-tight">
            Date Night
          </h1>
          <p className="text-zinc-400 text-lg sm:text-xl leading-relaxed px-4 py-2 max-w-sm mx-auto">
            Watch together. Video chat. Vibe.
          </p>
        </div>

        {/* Card Section */}
        <div className="p-8 sm:p-10 rounded-3xl bg-zinc-900/50 border border-white/10 backdrop-blur-2xl space-y-8 shadow-[0_8px_60px_rgba(0,0,0,0.5)] hover:border-cyan-500/20 transition-all duration-500">

          {/* Create Room Button */}
          <button
            onClick={createRoom}
            disabled={isCreating || isJoining}
            className="w-full relative group/btn disabled:opacity-50 cursor-pointer"
          >
            <div className="absolute inset-0 bg-cyan-400 rounded-2xl blur-lg opacity-20 group-hover/btn:opacity-50 transition-opacity duration-500" />
            <div className="relative flex items-center justify-center gap-3 w-full py-5 px-6 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-bold text-lg rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20">
              <Video className="w-6 h-6" />
              <span>{isCreating ? 'Creating...' : 'Create New Room'}</span>
              <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />
            </div>
          </button>

          {/* Divider */}
          <div className="relative flex items-center py-2 px-4">
            <div className="flex-grow border-t border-zinc-700/60"></div>
            <span className="flex-shrink-0 mx-5 text-zinc-500 text-xs tracking-[0.25em] uppercase font-semibold">or join existing</span>
            <div className="flex-grow border-t border-zinc-700/60"></div>
          </div>

          {/* Join Room Form */}
          <form onSubmit={joinRoom} className="space-y-5">
            <div className="space-y-3 p-2">
              <label htmlFor="code" className="text-sm font-medium text-zinc-300 ml-1 tracking-wide">
                Room Code
              </label>
              <input
                id="code"
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. A4X9"
                className="w-full px-6 py-5 bg-black/60 border border-zinc-700/60 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 transition-all duration-300 text-center tracking-[0.25em] font-mono text-xl hover:border-zinc-600 focus:shadow-[0_0_30px_rgba(6,182,212,0.1)]"
              />
            </div>
            <button
              type="submit"
              disabled={joinCode.length < 4 || isJoining || isCreating}
              className="w-full py-5 px-6 bg-white/5 hover:bg-white/10 text-white font-semibold text-lg rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        </div>

        {/* Footer tagline */}
        <p className="text-center text-zinc-600 text-sm tracking-wider py-4 px-6">
          ✨ Designed for couples, built with love
        </p>
      </div>

      {/* Decorative dots grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none mask-image-radial-center" />
    </main>
  );
}
