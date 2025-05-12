'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  transcript?: string;
  waveform?: string;
  duration?: number;
  downloadable?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
}

export default function AudioPlayer({
  src,
  transcript,
  waveform,
  duration,
  downloadable = false,
  onPlay,
  onPause,
  onEnd,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [waveformArray, setWaveformArray] = useState<number[]>([]);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Parse waveform data if available
  useEffect(() => {
    if (waveform) {
      try {
        const waveformData = waveform.split(',').map(v => parseFloat(v));
        setWaveformArray(waveformData);
      } catch (err) {
        console.error('Error parsing waveform data:', err);
        // Use default waveform if parsing fails
        setWaveformArray(Array(50).fill(0).map(() => Math.random() * 0.8 + 0.2));
      }
    } else {
      // Generate a random waveform if none provided
      setWaveformArray(Array(50).fill(0).map(() => Math.random() * 0.8 + 0.2));
    }
  }, [waveform]);
  
  // Update audio state when source changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setIsLoading(true);
    }
  }, [src]);
  
  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const onLoadedMetadata = () => {
      setAudioDuration(audio.duration);
      setIsLoading(false);
    };
    
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onEnd) onEnd();
    };
    
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [onEnd]);
  
  // Handle play/pause
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (onPause) onPause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
      });
      setIsPlaying(true);
      if (onPlay) onPlay();
    }
  };
  
  // Handle mute toggle
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };
  
  // Handle seeking
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current) return;
    
    const progressBar = progressBarRef.current;
    const rect = progressBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const newTime = (offsetX / rect.width) * audioDuration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  // Format time in mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Download audio file
  const downloadAudio = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `audio-${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="w-full rounded-lg bg-gray-800 p-3 shadow">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <button
          onClick={togglePlayback}
          disabled={isLoading}
          className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        
        <div className="flex-1">
          {/* Waveform progress bar */}
          <div 
            ref={progressBarRef}
            onClick={handleSeek}
            className="h-10 bg-gray-700 rounded overflow-hidden cursor-pointer"
          >
            {/* Waveform bars */}
            <div className="flex h-full items-end justify-evenly gap-px">
              {waveformArray.map((height, index) => {
                const barPosition = index / waveformArray.length;
                const isActive = barPosition <= (currentTime / audioDuration);
                
                return (
                  <div
                    key={index}
                    className={`w-1 transition-all ${isActive ? 'bg-blue-500' : 'bg-gray-500'}`}
                    style={{ height: `${Math.max(15, height * 100)}%` }}
                  ></div>
                );
              })}
            </div>
          </div>
          
          {/* Time display */}
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(audioDuration)}</span>
          </div>
        </div>
        
        {/* Volume control */}
        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className="text-gray-300 hover:text-white">
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 rounded-full appearance-none bg-gray-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
          />
        </div>
        
        {/* Download button (optional) */}
        {downloadable && (
          <button 
            onClick={downloadAudio}
            className="text-gray-300 hover:text-white"
            title="Download audio"
          >
            <Download size={18} />
          </button>
        )}
      </div>
      
      {/* Transcript (if available) */}
      {transcript && (
        <div className="mt-3 text-sm text-gray-300 bg-gray-700/50 p-2 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Transcript:</p>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
}