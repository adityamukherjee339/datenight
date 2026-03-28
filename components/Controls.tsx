"use client";

import { Heart, Zap } from 'lucide-react';
import { socket } from '@/lib/socket';

export default function Controls({ roomId }: { roomId: string }) {
  const sendReaction = () => {
    socket.emit('interaction', { type: 'reaction', payload: 'heart', roomId });
    // Dispatch custom event for local UI to catch as well!
    window.dispatchEvent(new CustomEvent('date-night-reaction'));
  };

  const sendNudge = () => {
    socket.emit('interaction', { type: 'nudge', payload: null, roomId });
  };

  return (
    <div className="flex items-center justify-center space-x-4 p-4 bg-zinc-900/50 border border-white/5 rounded-2xl">
      <button 
        onClick={sendReaction}
        className="flex items-center space-x-2 px-6 py-3 bg-black border border-pink-900/50 hover:border-pink-500/50 hover:bg-zinc-900 rounded-xl transition-all group"
        title="Send Heart"
      >
        <Heart className="w-5 h-5 text-pink-500 group-hover:scale-125 transition-transform" />
        <span className="text-pink-100 font-medium">React</span>
      </button>
      <button 
        onClick={sendNudge}
        className="flex items-center space-x-2 px-6 py-3 bg-black border border-cyan-900/50 hover:border-cyan-500/50 hover:bg-zinc-900 rounded-xl transition-all group"
        title="Nudge Partner"
      >
        <Zap className="w-5 h-5 text-cyan-400 group-hover:animate-pulse" />
        <span className="text-cyan-100 font-medium">Nudge</span>
      </button>
    </div>
  );
}
