"use client";

import { useEffect, useState, useRef } from 'react';
import { socket } from '@/lib/socket';
import { MousePointer2 } from 'lucide-react';

export default function PartnerCursor({ roomId }: { roomId: string }) {
  const [partnerPos, setPartnerPos] = useState({ x: -100, y: -100 });
  const [active, setActive] = useState(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleInteraction = (data: any) => {
      if (data.type === 'cursor') {
        setPartnerPos({
          x: data.payload.xPct * window.innerWidth,
          y: data.payload.yPct * window.innerHeight,
        });
        setActive(true);
        
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = setTimeout(() => setActive(false), 2000); 
      }
    };

    socket.on('receive-interaction', handleInteraction);

    let lastEmit = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastEmit < 50) return; // Throttle to ~20fps to save socket bandwidth
      lastEmit = now;
      
      const xPct = e.clientX / window.innerWidth;
      const yPct = e.clientY / window.innerHeight;
      
      socket.emit('interaction', { type: 'cursor', payload: { xPct, yPct }, roomId });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      socket.off('receive-interaction', handleInteraction);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [roomId]);

  if (!active) return null;

  return (
    <div 
      className="pointer-events-none fixed z-[9999] transition-all duration-75 ease-out flex flex-col items-start"
      style={{ left: partnerPos.x, top: partnerPos.y }}
    >
      <MousePointer2 className="w-6 h-6 fill-pink-500 text-white drop-shadow-[0_0_8px_rgba(236,72,153,0.8)] -ml-2 -mt-2 rotate-[-15deg] animate-pulse" />
      <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full drop-shadow-md ml-3 mt-1 tracking-widest uppercase">
        Partner
      </span>
    </div>
  );
}
