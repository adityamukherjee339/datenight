"use client";

import { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
import { socket } from '@/lib/socket';

type VideoPlayerProps = {
  roomId: string;
  videoId?: string;
};

export default function VideoPlayer({ roomId, videoId }: VideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);

  // ── Anti-loop mechanism ──
  // Instead of a short timer, we count how many state-change events to ignore.
  // A single seekTo + playVideo can fire 2-3 state changes (BUFFERING → PLAYING),
  // so we absorb multiple events after each external command.
  const ignoreCountRef = useRef(0);

  // Cooldown: don't emit commands within 1s of the last emission
  const lastEmitTimeRef = useRef(0);

  const canEmit = () => {
    return Date.now() - lastEmitTimeRef.current > 1000;
  };

  const emitCommand = (action: string, time: number) => {
    lastEmitTimeRef.current = Date.now();
    socket.emit('video-command', { action, time, roomId });
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    // If we have pending ignores, consume one and skip
    if (ignoreCountRef.current > 0) {
      ignoreCountRef.current--;
      return;
    }

    // Don't emit if we're in cooldown (recently received a command)
    if (!canEmit()) return;

    const player = event.target;
    const currentTime = player.getCurrentTime();
    const state = event.data;

    // YT.PlayerState.PLAYING = 1
    if (state === 1) {
      emitCommand('play', currentTime);
    }
    // YT.PlayerState.PAUSED = 2
    else if (state === 2) {
      emitCommand('pause', currentTime);
    }
  };

  useEffect(() => {
    const handleCommand = (data: any) => {
      const player = playerRef.current;
      if (!player) return;

      const currentTime = player.getCurrentTime() || 0;

      if (data.action === 'play') {
        // Ignore the next 3 state changes (BUFFERING + PLAYING + possible extras)
        ignoreCountRef.current = 3;
        lastEmitTimeRef.current = Date.now();

        if (Math.abs(currentTime - data.time) > 1) {
          player.seekTo(data.time, true);
        }
        player.playVideo();
      } else if (data.action === 'pause') {
        ignoreCountRef.current = 2;
        lastEmitTimeRef.current = Date.now();

        if (Math.abs(currentTime - data.time) > 1) {
          player.seekTo(data.time, true);
        }
        player.pauseVideo();
      } else if (data.action === 'seek') {
        ignoreCountRef.current = 3;
        lastEmitTimeRef.current = Date.now();
        player.seekTo(data.time, true);
      }
    };

    socket.on('receive-video-command', handleCommand);

    return () => {
      socket.off('receive-video-command', handleCommand);
    };
  }, []);

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

