"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, AlertTriangle, Minimize2, Maximize2 } from 'lucide-react';
import AgoraRTC, {
  AgoraRTCProvider,
  useRTCClient,
  LocalUser,
  RemoteUser,
  useJoin,
  useLocalCameraTrack,
  useLocalMicrophoneTrack,
  useRemoteUsers,
  usePublish,
} from 'agora-rtc-react';

const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '';

export default function VideoChat({ roomId }: { roomId: string }) {
  const [inCall, setInCall] = useState(false);
  const [minimized, setMinimized] = useState(false);
  
  // Agora Client Initialization
  const [client] = useState(() => AgoraRTC.createClient({ codec: "vp8", mode: "rtc" }));

  // --- Drag-to-reposition state ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 24, y: 24 }); // distance from bottom-right
  const isDragging = useRef(false);
  const dragStart = useRef({ pointerX: 0, pointerY: 0, startX: 0, startY: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Don't start drag if clicking a button or interactive element
    if ((e.target as HTMLElement).closest('button, input, [data-no-drag]')) return;
    isDragging.current = true;
    dragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [position]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = dragStart.current.pointerX - e.clientX;
    const dy = dragStart.current.pointerY - e.clientY;
    const el = containerRef.current;
    const maxX = window.innerWidth - (el?.offsetWidth || 288) - 4;
    const maxY = window.innerHeight - (el?.offsetHeight || 384) - 4;
    setPosition({
      x: Math.max(4, Math.min(maxX, dragStart.current.startX + dx)),
      y: Math.max(4, Math.min(maxY, dragStart.current.startY + dy)),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ right: position.x, bottom: position.y }}
      className={`fixed bg-zinc-950 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.15)] z-50 flex flex-col transition-shadow duration-300 ease-in-out group/pip select-none ${
        minimized ? 'w-14 h-14' : 'w-72 aspect-[3/4]'
      } ${isDragging.current ? '' : 'transition-all'}`}
    >
      {/* Drag handle indicator */}
      {!minimized && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-8 h-1 bg-white/20 rounded-full cursor-grab active:cursor-grabbing" />
      )}

      {/* Minimize / Maximize button */}
      <button
        onClick={() => setMinimized(prev => !prev)}
        className="absolute top-2 left-2 z-30 p-1.5 bg-black/60 hover:bg-black/80 border border-white/10 rounded-lg text-zinc-300 hover:text-white transition-all backdrop-blur-sm cursor-pointer"
        title={minimized ? 'Maximize' : 'Minimize'}
      >
        {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
      </button>

      {minimized ? (
        <div className="flex-grow flex items-center justify-center">
          <Video className="w-5 h-5 text-cyan-400" />
        </div>
      ) : !inCall ? (
        <div className="flex-grow flex flex-col items-center justify-center bg-black/80 space-y-4 p-4 text-center">
          <div className="p-3 bg-cyan-900/20 rounded-full border border-cyan-500/30">
            <Video className="w-6 h-6 text-cyan-400" />
          </div>
          
          {!appId ? (
            <div className="text-amber-500 text-xs bg-amber-900/20 p-3 border border-amber-900/50 rounded-lg flex flex-col items-center space-y-1">
              <div className="flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold">Agora Keys Missing</span>
              </div>
              <span>Add NEXT_PUBLIC_AGORA_APP_ID to your .env.local file</span>
            </div>
          ) : (
            <button 
              onClick={() => setInCall(true)}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold text-sm transition-all transform active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
            >
              Join Video Call
            </button>
          )}
        </div>
      ) : (
        <AgoraRTCProvider client={client}>
          <CallContainer roomId={roomId} onLeave={() => setInCall(false)} />
        </AgoraRTCProvider>
      )}
    </div>
  );
}

function CallContainer({ roomId, onLeave }: { roomId: string, onLeave: () => void }) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // Initialize Media Tracks
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
  const { localCameraTrack } = useLocalCameraTrack(camOn);

  // Join the specified room channel. 
  // We disable tokens for now by passing null (assuming your Agora app allows No-Certificate testing)
  useJoin({ appid: appId, channel: roomId, token: null }, true);

  // Publish our local tracks so the partner can see/hear us
  usePublish([localMicrophoneTrack, localCameraTrack]);

  // Read remote users
  const remoteUsers = useRemoteUsers();
  
  // Since this is a Couple app, we only care about the first remote user
  const partner = remoteUsers[0];

  return (
    <>
      <div className="flex-grow relative bg-zinc-900 flex items-center justify-center overflow-hidden">
        {/* Remote Video Area (Partner) */}
        <div className="absolute inset-0 bg-black">
          {partner ? (
            <RemoteUser user={partner} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              <span className="text-zinc-500 font-medium tracking-wide text-sm">Waiting for partner...</span>
            </div>
          )}
        </div>

        {/* Local Video PiP Area (You) */}
        <div className="absolute top-4 right-4 w-1/3 aspect-[3/4] bg-zinc-800 border-2 border-zinc-700/50 rounded-lg drop-shadow-2xl overflow-hidden flex items-center justify-center z-10 transition-transform hover:scale-105 origin-top-right">
          {camOn && localCameraTrack ? (
            <LocalUser 
              audioTrack={localMicrophoneTrack} 
              videoTrack={localCameraTrack} 
              cameraOn={camOn} 
              micOn={micOn} 
              playAudio={false /* Never play your own audio back to yourself */} 
              playVideo={camOn} 
            >
              {/* Optional fallback visual if camera takes a second */}
            </LocalUser>
          ) : (
            <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center">
              <VideoOff className="w-5 h-5 text-red-500/50 mb-1" />
              <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">YOU</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Controls Bar */}
      <div className="h-16 bg-black border-t border-white/5 flex items-center justify-center space-x-6 z-20">
        <button 
          onClick={() => setMicOn(p => !p)}
          className={`p-3 rounded-full transition-all ${micOn ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
          title={micOn ? "Mute Microphone" : "Unmute Microphone"}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button 
          onClick={() => setCamOn(p => !p)}
          className={`p-3 rounded-full transition-all ${camOn ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
          title={camOn ? "Turn off Camera" : "Turn on Camera"}
        >
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        
        <div className="w-px h-6 bg-zinc-800 mx-1" />
        
        <button 
          onClick={onLeave}
          className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all hover:scale-110 active:scale-95"
          title="Leave Call"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      </div>
    </>
  );
}
