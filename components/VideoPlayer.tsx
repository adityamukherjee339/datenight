"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
import { socket } from '@/lib/socket';

type VideoPlayerProps = {
  roomId: string;
  videoId?: string;
};

export default function VideoPlayer({ roomId, videoId }: VideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Tracks the last time we emitted a play/pause so we don't echo back
  const isExternalCommandRef = useRef(false);
  const externalCommandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track last known time to detect user seeking via scrub bar
  const lastKnownTimeRef = useRef(0);

  // Helper: set the external-command guard with a short, auto-clearing window
  const setExternalGuard = useCallback(() => {
    isExternalCommandRef.current = true;
    if (externalCommandTimerRef.current) {
      clearTimeout(externalCommandTimerRef.current);
    }
    externalCommandTimerRef.current = setTimeout(() => {
      isExternalCommandRef.current = false;
      externalCommandTimerRef.current = null;
    }, 150); // 150ms is enough for the YouTube API to fire its state-change event
  }, []);

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (isExternalCommandRef.current) {
      return; // Swallow events triggered by incoming socket commands
    }

    const player = event.target;
    const currentTime = player.getCurrentTime();
    const state = event.data;

    // YT.PlayerState.PLAYING = 1
    if (state === 1) {
      // If the time jumped by more than 1s since last known, user scrubbed — emit seek first
      if (Math.abs(currentTime - lastKnownTimeRef.current) > 1) {
        socket.emit('video-command', { action: 'seek', time: currentTime, roomId });
      }
      socket.emit('video-command', { action: 'play', time: currentTime, roomId });
    }
    // YT.PlayerState.PAUSED = 2
    else if (state === 2) {
      socket.emit('video-command', { action: 'pause', time: currentTime, roomId });
    }

    lastKnownTimeRef.current = currentTime;
  };

  useEffect(() => {
    const handleCommand = (data: any) => {
      const player = playerRef.current;
      if (!player) return;

      setExternalGuard();
      const currentTime = player.getCurrentTime() || 0;

      if (data.action === 'play') {
        // Seek if drift exceeds 0.5s — keeps sync tight
        if (Math.abs(currentTime - data.time) > 0.5) {
          player.seekTo(data.time, true);
        }
        player.playVideo();
      } else if (data.action === 'pause') {
        if (Math.abs(currentTime - data.time) > 0.5) {
          player.seekTo(data.time, true);
        }
        player.pauseVideo();
      } else if (data.action === 'seek') {
        player.seekTo(data.time, true);
      } else if (data.action === 'sync') {
        // Heartbeat sync — correct drift silently without play/pause changes
        if (Math.abs(currentTime - data.time) > 0.5) {
          player.seekTo(data.time, true);
        }
      }
    };

    socket.on('receive-video-command', handleCommand);

    return () => {
      socket.off('receive-video-command', handleCommand);
    };
  }, [setExternalGuard]);

  // ── Periodic sync heartbeat ──
  // Every 3 seconds while playing, broadcast our current time so both sides stay in lock-step
  useEffect(() => {
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      try {
        const state = player.getPlayerState();
        // Only sync while playing (state === 1)
        if (state === 1) {
          const currentTime = player.getCurrentTime();
          lastKnownTimeRef.current = currentTime;
          socket.emit('video-command', { action: 'sync', time: currentTime, roomId });
        }
      } catch {
        // Player may not be ready yet — ignore
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [roomId]);

  return (
    <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.15)] border border-cyan-900/50 relative group">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
          <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      )}
      <YouTube
        videoId={videoId}
        onReady={(e) => {
          playerRef.current = e.target;
          setIsReady(true);
        }}
        onStateChange={onStateChange}
        opts={{
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            disablekb: 0,
          },
        }}
        className="absolute inset-0 w-full h-full pointer-events-auto"
        iframeClassName="w-full h-full border-0"
      />
    </div>
  );
}
