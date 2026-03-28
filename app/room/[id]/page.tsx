"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { socket } from '@/lib/socket';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const VideoChat = dynamic(() => import('@/components/VideoChat'), { ssr: false });

import Controls from '@/components/Controls';
import { Heart } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';


export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{id: number, left: number}[]>([]);
  
  // Video Sync State
  const [currentVideoId, setCurrentVideoId] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  
  // Interaction State
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const triggerHeart = useCallback(() => {
    const newHeart = { id: Date.now() + Math.random(), left: Math.random() * 80 + 10 };
    setFloatingHearts(prev => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 2500);
  }, []);

  useEffect(() => {
    socket.connect();
    
    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', roomId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('user-joined', (id) => {
      setMessages(p => [...p, `✨ User joined the room: ${id.substring(0, 4)}`]);
    });

    socket.on('receive-interaction', (data) => {
      if (data.type === 'chat') {
        setMessages(p => [...p, `💭 Partner: ${data.payload}`]);
      } else if (data.type === 'nudge') {
        setIsNudging(true);
        setTimeout(() => setIsNudging(false), 500);
      } else if (data.type === 'reaction' && data.payload === 'heart') {
        triggerHeart();
      } else if (data.type === 'change-video') {
        setCurrentVideoId(data.payload);
        setMessages(p => [...p, `🎬 Partner changed the video!`]);
      } else if (data.type === 'typing') {
        setIsPartnerTyping(data.payload);
      }
    });

    const handleLocalReaction = () => triggerHeart();
    window.addEventListener('date-night-reaction', handleLocalReaction);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('user-joined');
      socket.off('receive-interaction');
      window.removeEventListener('date-night-reaction', handleLocalReaction);
      socket.disconnect();
    };
  }, [roomId, triggerHeart]);

  const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    socket.emit('interaction', { type: 'typing', payload: e.target.value.length > 0, roomId });
  };

  const sendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      socket.emit('interaction', { type: 'chat', payload: input, roomId });
      socket.emit('interaction', { type: 'typing', payload: false, roomId }); // Clear typing status
      setMessages(p => [...p, `Me: ${input}`]);
      setInput('');
    }
  };

  const handleVideoUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrlInput.trim()) return;
    
    // Parse standard youtube url or youtu.be
    const match = videoUrlInput.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      const newId = match[1];
      setCurrentVideoId(newId);
      socket.emit('interaction', { type: 'change-video', payload: newId, roomId });
      setVideoUrlInput('');
      setMessages(p => [...p, `🎬 You changed the video!`]);
    } else {
      setMessages(p => [...p, `❌ Invalid YouTube URL`]);
    }
  };

  return (
    <div className={`min-h-dvh bg-black text-white p-4 md:p-8 font-sans selection:bg-cyan-900 transition-transform ${isNudging ? 'animate-shake' : ''}`}>
      


      {/* Floating Hearts Layer */}
      <div className="fixed inset-0 pointer-events-none z-100 overflow-hidden">
        {floatingHearts.map(heart => (
          <Heart 
            key={heart.id}
            className="absolute bottom-0 text-pink-500 fill-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)] animate-[ping_2s_ease-out_forwards]"
            style={{ 
              left: `${heart.left}%`,
              width: '40px', height: '40px',
              animation: 'floatUp 2.5s ease-out forwards'
            }}
          />
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html:`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 1; transform: translateY(-10vh) scale(1); }
          100% { transform: translateY(-80vh) scale(1.5); opacity: 0; }
        }
      `}} />

      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-white to-cyan-400">
              Date Night
            </h1>
            <span className="px-3 py-1 bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 rounded-full text-sm font-mono tracking-widest">
              ROOM: {roomId}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Controls roomId={roomId} />
            <div className="flex items-center space-x-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-white/5">
              <span className="text-xs text-zinc-400">Sync:</span>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'bg-red-500'}`} />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
          
          {/* Main Video Area */}
          <div className="lg:col-span-2 flex flex-col gap-4 relative">
            <div className="h-[400px] md:h-[600px] flex flex-col items-center justify-center relative w-full bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
              {currentVideoId ? (
                <VideoPlayer roomId={roomId} videoId={currentVideoId} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-cyan-900/20 rounded-full flex items-center justify-center border border-cyan-500/30 animate-pulse">
                    <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Start Watching Together</h3>
                  <p className="text-zinc-400 text-sm max-w-sm">Paste a YouTube link below to immediately sync it for you and your partner.</p>
                </div>
              )}
              {/* Ambient matching glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-cyan-400/10 blur-[100px] pointer-events-none -z-10" />
            </div>

            <form onSubmit={handleVideoUrlSubmit} className="flex w-full gap-2 relative z-10">
              <input 
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="Paste new YouTube link here..."
                className="grow bg-zinc-900/80 border border-cyan-900/50 px-4 py-3 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition-colors text-sm"
              />
              <button type="submit" disabled={!videoUrlInput.trim()} className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black font-semibold px-6 py-3 rounded-xl transition-colors text-sm shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                {currentVideoId ? 'Change Video' : 'Play'}
              </button>
            </form>
          </div>

          {/* Chat side panel */}
          <div className="flex flex-col h-[400px] md:h-[600px] bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="p-4 border-b border-white/5 bg-black/40">
              <h2 className="font-semibold text-cyan-100 flex items-center">
                <span>Room Activity</span>
              </h2>
            </div>
            <div className="grow p-4 space-y-3 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className="text-sm bg-black/40 p-3 rounded-xl border border-white/5 text-zinc-300">
                  {m}
                </div>
              ))}
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-sm italic space-y-2 pb-4">
                  <p>waiting for your partner...</p>
                  <div className="w-1.5 h-1.5 bg-cyan-900 rounded-full animate-ping" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {isPartnerTyping && (
              <div className="px-4 py-2 text-xs text-cyan-400 italic bg-black/40 border-t border-white/5 animate-pulse">
                Partner is typing...
              </div>
            )}

            <form onSubmit={sendMsg} className="p-4 bg-black/40 border-t border-white/5 gap-2 flex">
              <input 
                value={input} onChange={handleType}
                className="grow bg-black border border-white/10 px-4 py-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 transition-colors" 
                placeholder="Say something..."
              />
              <button 
                type="submit" 
                disabled={!input.trim() || !isConnected}
                className="bg-cyan-500 text-black hover:bg-cyan-400 px-6 py-2 rounded-xl font-bold transition-all disabled:opacity-50 transform active:scale-95"
              >
                Send
              </button>
            </form>
          </div>
        </div>

      </div>

      <VideoChat roomId={roomId} />
    </div>
  );
}
