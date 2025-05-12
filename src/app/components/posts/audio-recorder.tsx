'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Pause, Play, Trash2, Upload, Loader2 } from 'lucide-react';

interface AudioRecorderProps {
  onAudioRecorded: (recording: {
    url: string;
    duration: number;
    transcript?: string;
    waveform?: string;
  }) => void;
  onCancel: () => void;
}

export default function AudioRecorder({ onAudioRecorded, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Set up audio context for visualization
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 128;
      } catch (err) {
        console.error('Audio context setup failed:', err);
        setError('Your browser does not support audio recording or visualization');
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Start recording
  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordingTime(0);
    setError(null);
    setWaveformData([]);
    setTranscript(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio visualization
      if (audioContextRef.current && analyserRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        const updateWaveform = () => {
          if (!analyserRef.current || !isRecording) return;

          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Sample down to a smaller array for display
          const sampledData = Array.from(dataArray).filter((_, i) => i % 4 === 0);
          setWaveformData(sampledData);
          
          animationFrameRef.current = requestAnimationFrame(updateWaveform);
        };
        
        updateWaveform();
      }

      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
        
        // Create a normalized waveform from the recorded data
        const normalizedWaveform = waveformData.map(value => value / 255).join(',');
        
        // Stop tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Permission denied or microphone not available');
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  // Toggle audio playback
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Upload the recording
  const uploadRecording = async () => {
    if (!audioUrl) return;

    setIsProcessing(true);
    
    try {
      // Convert audio blob to File
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const file = new File([blob], `audio-recording-${Date.now()}.webm`, { type: 'audio/webm' });
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload to server
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio file');
      }
      
      const uploadResult = await uploadResponse.json();
      
      // Optional: Generate transcript
      let transcriptText = null;
      if (uploadResult.url) {
        setIsTranscribing(true);
        try {
          const transcriptResponse = await fetch('/api/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audioUrl: uploadResult.url }),
          });
          
          if (transcriptResponse.ok) {
            const transcriptResult = await transcriptResponse.json();
            transcriptText = transcriptResult.transcript;
            setTranscript(transcriptText);
          }
        } catch (err) {
          console.error('Failed to transcribe audio:', err);
          // Continue even if transcription fails
        } finally {
          setIsTranscribing(false);
        }
      }
      
      // Generate simplified waveform representation
      const simplifiedWaveform = waveformData
        .filter((_, i) => i % 2 === 0) // Sample every other point
        .map(v => (v / 255).toFixed(2))
        .join(',');
      
      // Notify parent component
      onAudioRecorded({
        url: uploadResult.url,
        duration: recordingTime,
        transcript: transcriptText || undefined,
        waveform: simplifiedWaveform,
      });
      
    } catch (err) {
      console.error('Error uploading recording:', err);
      setError('Failed to upload audio recording');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render waveform visualization
  const renderWaveform = () => {
    const height = 40; // Height of the waveform
    
    return (
      <div className="w-full h-10 mt-2 mb-2 bg-gray-800 rounded overflow-hidden flex items-center">
        {waveformData.length > 0 ? (
          <div className="flex h-full w-full items-center justify-center gap-px px-1">
            {waveformData.map((value, index) => (
              <div
                key={index}
                className={`w-1 ${isRecording && !isPaused ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ height: `${Math.max(2, (value / 255) * height)}px` }}
              ></div>
            ))}
          </div>
        ) : (
          <div className="w-full text-center text-gray-400 text-xs">
            {audioUrl ? 'Recording completed' : 'Waveform will appear while recording'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
      <h3 className="text-white text-lg font-medium mb-3">Audio Recording</h3>
      
      {/* Audio preview */}
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
      
      {/* Waveform visualization */}
      {renderWaveform()}
      
      {/* Time display */}
      <div className="text-center text-white font-mono text-xl mb-4">
        {formatTime(recordingTime)}
      </div>
      
      {/* Recording controls */}
      {!audioUrl ? (
        <div className="flex justify-center gap-3">
          {isRecording ? (
            <>
              <button
                onClick={pauseRecording}
                className={`p-3 rounded-full ${isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
              >
                {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
              </button>
              <button
                onClick={stopRecording}
                className="p-3 rounded-full bg-red-600 hover:bg-red-700"
              >
                <Square className="h-6 w-6" />
              </button>
            </>
          ) : (
            <button
              onClick={startRecording}
              className="p-3 rounded-full bg-red-600 hover:bg-red-700"
            >
              <Mic className="h-6 w-6" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Playback controls */}
          <div className="flex justify-center gap-3">
            <button
              onClick={togglePlayback}
              className="p-3 rounded-full bg-blue-600 hover:bg-blue-700"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>
            <button
              onClick={() => {
                setAudioUrl(null);
                if (audioRef.current) {
                  audioRef.current.pause();
                }
                setIsPlaying(false);
              }}
              className="p-3 rounded-full bg-gray-600 hover:bg-gray-700"
            >
              <Trash2 className="h-6 w-6" />
            </button>
          </div>
          
          {/* Transcript display */}
          {transcript && (
            <div className="p-3 bg-gray-800 rounded-md text-gray-200 text-sm">
              <p className="text-xs text-gray-400 mb-1">Transcript:</p>
              <p>{transcript}</p>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-900/40 border border-red-800 rounded-md text-red-200 text-sm">
              {error}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex justify-between">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={uploadRecording}
              disabled={isProcessing || isTranscribing}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing || isTranscribing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> 
                  {isProcessing ? 'Uploading...' : 'Transcribing...'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Save Recording
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}