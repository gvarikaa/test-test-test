'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, ScreenShare, Monitor, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { api } from '@/lib/trpc/api';
import { clientPusher, getChatChannel, PusherEvents } from '@/lib/pusher';
import { CallType, CallStatus } from '@prisma/client';

// Define peer connection configuration with STUN servers
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface CallParticipant {
  participantId: string;
  userId: string;
  user?: User;
  hasVideo: boolean;
  hasAudio: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
  connectionQuality?: string;
}

interface VoiceCallProps {
  chatId: string;
  callId?: string;
  callType: CallType;
  participants: User[];
  onClose: () => void;
  isIncoming?: boolean;
  initiatedBy?: User;
}

export function VoiceCall({
  chatId,
  callId: initialCallId,
  callType,
  participants,
  onClose,
  isIncoming = false,
  initiatedBy,
}: VoiceCallProps) {
  const [callId, setCallId] = useState<string | undefined>(initialCallId);
  const [callStatus, setCallStatus] = useState<CallStatus>(isIncoming ? 'RINGING' : 'ONGOING');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callParticipants, setCallParticipants] = useState<CallParticipant[]>([]);
  const [hasVideo, setHasVideo] = useState<boolean>(callType.includes('VIDEO'));
  const [hasAudio, setHasAudio] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [isTranscriptionEnabled, setIsTranscriptionEnabled] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const callTimer = useRef<NodeJS.Timeout | null>(null);
  const { data: session } = useSession();
  
  // TRPC mutations
  const { mutate: initiateCall } = api.chat.initiateCall.useMutation({
    onSuccess: (data) => {
      setCallId(data.id);
      setCallStatus('RINGING');
    },
  });
  
  const { mutate: joinCall } = api.chat.joinCall.useMutation();
  const { mutate: leaveCall } = api.chat.leaveCall.useMutation();
  
  // Get user's chat preferences for transcription settings
  const { data: userPreferences } = api.chat.getUserChatPreferences.useQuery();
  
  useEffect(() => {
    // Set transcription setting based on user preferences
    if (userPreferences) {
      setIsTranscriptionEnabled(!!userPreferences.voiceCallTranscription);
    }
  }, [userPreferences]);
  
  // Initialize local media stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        // Get user media based on call type
        const mediaConstraints = {
          audio: true,
          video: callType.includes('VIDEO') ? { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } : false,
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        setLocalStream(stream);
        
        // Display local video
        if (localVideoRef.current && stream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = stream;
        }
        
        // If incoming call, we need to wait for user to accept
        if (!isIncoming && !initialCallId) {
          // Initiate call
          initiateCall({ 
            chatId, 
            type: callType 
          });
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };
    
    initializeMedia();
    
    // Cleanup function to stop all tracks
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Clear any peer connections
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
      
      // Clear call timer
      if (callTimer.current) {
        clearInterval(callTimer.current);
      }
    };
  }, [chatId, callType, initiateCall, isIncoming, initialCallId]);
  
  // Set up Pusher subscription for call events
  useEffect(() => {
    if (!session?.user?.id || !chatId) return;
    
    const channel = clientPusher.subscribe(getChatChannel(chatId));
    
    // Handle call starting (for other participants)
    channel.bind(PusherEvents.CALL_STARTED, (data: { callId: string, type: CallType, initiatedBy: string }) => {
      if (!isIncoming && !callId && data.initiatedBy !== session.user.id) {
        setCallId(data.callId);
      }
    });
    
    // Handle call ending
    channel.bind(PusherEvents.CALL_ENDED, (data: { callId: string, duration: number }) => {
      if (callId === data.callId) {
        setCallStatus('ENDED');
        onClose();
      }
    });
    
    // Handle participant joining
    channel.bind(PusherEvents.CALL_PARTICIPANT_JOINED, (data: { 
      callId: string, 
      userId: string,
      hasVideo: boolean,
      hasAudio: boolean,
      isScreenSharing: boolean
    }) => {
      if (callId === data.callId && data.userId !== session.user.id) {
        // Add participant to the list
        const newParticipant: CallParticipant = {
          participantId: data.userId, // Using userId as participantId for simplicity
          userId: data.userId,
          hasVideo: data.hasVideo,
          hasAudio: data.hasAudio,
          isScreenSharing: data.isScreenSharing,
          user: participants.find(p => p.id === data.userId),
        };
        
        setCallParticipants(prev => {
          // Check if participant already exists
          const exists = prev.some(p => p.userId === data.userId);
          if (exists) {
            return prev.map(p => p.userId === data.userId ? newParticipant : p);
          }
          return [...prev, newParticipant];
        });
        
        // Establish WebRTC connection with the new participant
        createPeerConnection(data.userId);
      }
    });
    
    // Handle participant leaving
    channel.bind(PusherEvents.CALL_PARTICIPANT_LEFT, (data: { callId: string, userId: string }) => {
      if (callId === data.callId) {
        // Remove participant from the list
        setCallParticipants(prev => prev.filter(p => p.userId !== data.userId));
        
        // Close and remove peer connection
        if (peerConnections.current[data.userId]) {
          peerConnections.current[data.userId].close();
          delete peerConnections.current[data.userId];
        }
      }
    });
    
    // Clean up on unmount
    return () => {
      channel.unbind_all();
      clientPusher.unsubscribe(getChatChannel(chatId));
    };
  }, [session?.user?.id, chatId, callId, isIncoming, onClose, participants]);
  
  // Start call timer when call is active
  useEffect(() => {
    if (callStatus === 'ONGOING' && !callTimer.current) {
      callTimer.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (callTimer.current) {
        clearInterval(callTimer.current);
        callTimer.current = null;
      }
    };
  }, [callStatus]);
  
  // WebRTC functions
  const createPeerConnection = (participantId: string) => {
    if (peerConnections.current[participantId]) return;
    
    // Create a new RTCPeerConnection
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current[participantId] = pc;
    
    // Add local tracks to the connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // In a real implementation, we would send this to the other peer via signaling server
        // For now, we'll simulate this with Pusher
        clientPusher.channel(getChatChannel(chatId)).trigger(
          `ice-candidate-${participantId}-${session?.user?.id}`,
          { candidate: event.candidate }
        );
      }
    };
    
    // Handle incoming tracks
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      
      setCallParticipants(prev => {
        return prev.map(p => {
          if (p.userId === participantId) {
            return { ...p, stream: remoteStream };
          }
          return p;
        });
      });
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        console.log(`Connected to ${participantId}`);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log(`Disconnected from ${participantId}`);
      }
    };
    
    // Create and send an offer if we're the initiator
    if (session?.user?.id && (!isIncoming || callStatus === 'ONGOING')) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          // Send offer to remote peer via signaling server (Pusher in this case)
          clientPusher.channel(getChatChannel(chatId)).trigger(
            `offer-${participantId}-${session.user.id}`,
            { sdp: pc.localDescription }
          );
        })
        .catch(console.error);
    }
    
    return pc;
  };
  
  // Handle accepting incoming call
  const acceptCall = () => {
    if (!callId || !session?.user?.id) return;
    
    setCallStatus('ONGOING');
    
    // Join call in the backend
    joinCall({
      callId,
      hasVideo,
      hasAudio,
      isScreenSharing,
      deviceInfo: navigator.userAgent,
    });
    
    // Start connections with all participants
    participants.forEach(participant => {
      if (participant.id !== session.user.id) {
        createPeerConnection(participant.id);
      }
    });
    
    // Start call timer
    if (!callTimer.current) {
      callTimer.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
  };
  
  // Handle rejecting incoming call
  const rejectCall = () => {
    if (callId) {
      leaveCall({ callId });
    }
    onClose();
  };
  
  // Handle hanging up
  const hangUp = () => {
    if (callId) {
      leaveCall({ callId });
    }
    
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Close all peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    
    // Clear call timer
    if (callTimer.current) {
      clearInterval(callTimer.current);
      callTimer.current = null;
    }
    
    onClose();
  };
  
  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setHasAudio(!hasAudio);
      setIsMuted(!isMuted);
      
      // Update participant state in call
      if (callId) {
        joinCall({
          callId,
          hasVideo,
          hasAudio: !hasAudio,
          isScreenSharing,
        });
      }
    }
  };
  
  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setHasVideo(!hasVideo);
      
      // Update participant state in call
      if (callId) {
        joinCall({
          callId,
          hasVideo: !hasVideo,
          hasAudio,
          isScreenSharing,
        });
      }
    }
  };
  
  // Toggle screen sharing
  const toggleScreenSharing = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (localStream) {
        const screenTracks = localStream.getVideoTracks();
        screenTracks.forEach(track => track.stop());
      }
      
      // Get back to webcam if it was a video call
      if (callType.includes('VIDEO')) {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          
          setLocalStream(newStream);
          
          // Replace tracks in all peer connections
          Object.values(peerConnections.current).forEach(pc => {
            const senders = pc.getSenders();
            senders.forEach(sender => {
              if (sender.track?.kind === 'video') {
                const videoTrack = newStream.getVideoTracks()[0];
                if (videoTrack) {
                  sender.replaceTrack(videoTrack);
                }
              }
            });
          });
          
          // Display local video
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream;
          }
        } catch (error) {
          console.error('Error accessing webcam:', error);
        }
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        
        // Keep audio from the original stream if it exists
        if (localStream) {
          const audioTrack = localStream.getAudioTracks()[0];
          if (audioTrack) {
            screenStream.addTrack(audioTrack);
          }
        }
        
        setLocalStream(screenStream);
        
        // Replace video tracks in all peer connections
        Object.values(peerConnections.current).forEach(pc => {
          const senders = pc.getSenders();
          senders.forEach(sender => {
            if (sender.track?.kind === 'video') {
              const videoTrack = screenStream.getVideoTracks()[0];
              if (videoTrack) {
                sender.replaceTrack(videoTrack);
              }
            }
          });
        });
        
        // Display local screen
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        // Handle the user stopping screen sharing through the browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          toggleScreenSharing();
        };
      } catch (error) {
        console.error('Error starting screen sharing:', error);
        return;
      }
    }
    
    setIsScreenSharing(!isScreenSharing);
    
    // Update participant state in call
    if (callId) {
      joinCall({
        callId,
        hasVideo: true, // Screen sharing implies video is on
        hasAudio,
        isScreenSharing: !isScreenSharing,
      });
    }
  };
  
  // Toggle transcription
  const toggleTranscription = () => {
    setIsTranscriptionEnabled(!isTranscriptionEnabled);
  };
  
  // Format seconds to mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Render incoming call UI
  if (isIncoming && callStatus === 'RINGING') {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70">
        <div className="bg-gray-900 rounded-lg p-6 shadow-lg max-w-md w-full">
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold text-white mb-4">
              Incoming {callType.includes('VIDEO') ? 'Video' : 'Audio'} Call
            </h2>
            {initiatedBy && (
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <Image
                    src={initiatedBy.image || '/placeholder-avatar.png'}
                    alt={initiatedBy.name || 'Caller'}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full object-cover border-2 border-blue-500"
                  />
                </div>
                <p className="mt-3 text-white font-medium text-lg">
                  {initiatedBy.name || 'User'}
                </p>
              </div>
            )}
            <p className="text-gray-300 mb-8">
              {formatTime(duration)}
            </p>
            <div className="flex justify-center gap-8">
              <button
                onClick={rejectCall}
                className="p-4 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
              >
                <PhoneOff className="h-6 w-6 text-white" />
              </button>
              <button
                onClick={acceptCall}
                className="p-4 bg-green-600 rounded-full hover:bg-green-700 transition-colors"
              >
                <Phone className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Render active call UI
  return (
    <div className="fixed inset-0 flex flex-col z-50 bg-gray-900">
      {/* Call header */}
      <div className="flex justify-between items-center p-4 bg-gray-800">
        <div className="flex items-center">
          <h2 className="text-white font-medium">
            {callType.includes('VIDEO') ? 'Video' : 'Audio'} Call
          </h2>
          <span className="ml-4 text-gray-300">{formatTime(duration)}</span>
        </div>
        <button
          onClick={hangUp}
          className="p-2 hover:bg-gray-700 rounded-full"
        >
          <X className="h-5 w-5 text-gray-300" />
        </button>
      </div>
      
      {/* Call content */}
      <div className="flex-1 flex flex-wrap overflow-auto bg-black p-4 gap-4">
        {/* Local video */}
        {(hasVideo || isScreenSharing) && (
          <div className="relative rounded-lg overflow-hidden bg-gray-800">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded-md">
              You {isMuted && '(Muted)'} {isScreenSharing && '(Screen)'}
            </div>
          </div>
        )}
        
        {/* Remote videos */}
        {callParticipants.map((participant) => (
          <div key={participant.userId} className="relative rounded-lg overflow-hidden bg-gray-800">
            {participant.stream && participant.hasVideo ? (
              <video
                autoPlay
                playsInline
                srcObject={participant.stream}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full min-h-40 flex items-center justify-center bg-gray-800">
                <div className="flex flex-col items-center">
                  <Image
                    src={participant.user?.image || '/placeholder-avatar.png'}
                    alt={participant.user?.name || 'Participant'}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                  <p className="mt-2 text-white">
                    {participant.user?.name || 'Participant'}
                  </p>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded-md">
              {participant.user?.name || 'User'} {!participant.hasAudio && '(Muted)'} {participant.isScreenSharing && '(Screen)'}
            </div>
            
            {/* Transcription */}
            {isTranscriptionEnabled && transcripts[participant.userId] && (
              <div className="absolute bottom-10 left-0 right-0 text-white text-sm bg-black bg-opacity-70 p-2">
                {transcripts[participant.userId]}
              </div>
            )}
          </div>
        ))}
        
        {/* Audio-only participants */}
        {callParticipants.length === 0 && !hasVideo && !isScreenSharing && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="animate-pulse mb-4">
                <Phone className="h-16 w-16 mx-auto text-blue-500" />
              </div>
              <p className="text-lg font-medium text-white">Call in progress</p>
              <p className="mt-2">Waiting for others to join...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Call controls */}
      <div className="bg-gray-800 p-4 flex justify-center items-center gap-6">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full ${hasAudio ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
        >
          {hasAudio ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}
        </button>
        
        {callType.includes('VIDEO') && (
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${hasVideo ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {hasVideo ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
          </button>
        )}
        
        <button
          onClick={toggleScreenSharing}
          className={`p-3 rounded-full ${isScreenSharing ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          {isScreenSharing ? <ScreenShare className="h-5 w-5 text-white" /> : <Monitor className="h-5 w-5 text-white" />}
        </button>
        
        <button
          onClick={hangUp}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700"
        >
          <PhoneOff className="h-5 w-5 text-white" />
        </button>
        
        <button
          onClick={toggleTranscription}
          className={`p-3 rounded-full ${isTranscriptionEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
            <path d="M21 15c0-4.625-3.51-8.45-8-8.95M3 15c0-1.73.51-3.35 1.413-4.712M3 15c0 5 3.589 9 8 9a7.98 7.98 0 0 0 4.706-1.53M21 15c0 1.73-.51 3.35-1.413 4.712" />
            <path d="M11 15c0 2.21 1.79 4 4 4s4-1.79 4-4-1.79-4-4-4-4 1.79-4 4Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}