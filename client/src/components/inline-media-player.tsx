import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InlineMediaPlayerProps {
  youtubeUrl?: string | null;
  spotifyUrl?: string | null;
  postId: number;
  onPlay?: () => void;
  isActive?: boolean;
}

// Global audio manager to ensure only one plays at a time
class AudioManager {
  private static instance: AudioManager;
  private currentPlayer: HTMLAudioElement | null = null;
  private currentPostId: number | null = null;
  private listeners: Set<(postId: number | null) => void> = new Set();

  static getInstance() {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  subscribe(callback: (postId: number | null) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  play(audio: HTMLAudioElement, postId: number) {
    // Stop current player if different
    if (this.currentPlayer && this.currentPostId !== postId) {
      this.currentPlayer.pause();
      this.currentPlayer.currentTime = 0;
    }
    
    this.currentPlayer = audio;
    this.currentPostId = postId;
    
    // Notify all listeners
    this.listeners.forEach(callback => callback(postId));
  }

  stop() {
    if (this.currentPlayer) {
      this.currentPlayer.pause();
      this.currentPlayer.currentTime = 0;
    }
    this.currentPlayer = null;
    this.currentPostId = null;
    
    // Notify all listeners
    this.listeners.forEach(callback => callback(null));
  }

  getCurrentPostId() {
    return this.currentPostId;
  }
}

export default function InlineMediaPlayer({ youtubeUrl, spotifyUrl, postId, onPlay, isActive }: InlineMediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentActivePost, setCurrentActivePost] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioManager = AudioManager.getInstance();

  useEffect(() => {
    const unsubscribe = audioManager.subscribe((activePostId) => {
      setCurrentActivePost(activePostId);
      if (activePostId !== postId) {
        setIsPlaying(false);
      }
    });

    return () => unsubscribe();
  }, [postId]);

  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const getSpotifyTrackId = (url: string) => {
    const regExp = /spotify\.com\/track\/([a-zA-Z0-9]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const handlePlayPause = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    onPlay?.();
    
    if (youtubeUrl) {
      handleYouTubePlay();
    } else if (spotifyUrl) {
      handleSpotifyPlay();
    }
  };

  const handleYouTubePlay = () => {
    const videoId = getYouTubeVideoId(youtubeUrl!);
    if (!videoId) return;

    if (isPlaying) {
      // Stop current video
      if (iframeRef.current) {
        iframeRef.current.src = '';
      }
      setIsPlaying(false);
      audioManager.stop();
    } else {
      // Stop any other playing media
      audioManager.play(null as any, postId);
      
      // Start playing this video
      if (iframeRef.current) {
        iframeRef.current.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
      }
      setIsPlaying(true);
    }
  };

  const handleSpotifyPlay = async () => {
    const trackId = getSpotifyTrackId(spotifyUrl!);
    if (!trackId) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      audioManager.stop();
    } else {
      // Stop any other playing media
      if (audioRef.current) {
        audioManager.play(audioRef.current, postId);
        
        try {
          setIsLoading(true);
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Failed to play audio:', error);
          // Fallback: open Spotify in new tab
          window.open(spotifyUrl, '_blank');
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const isCurrentlyActive = currentActivePost === postId;

  return (
    <div className="relative">
      {/* Spotify Audio Element */}
      {spotifyUrl && (
        <audio
          ref={audioRef}
          src={`https://open.spotify.com/embed/track/${getSpotifyTrackId(spotifyUrl)}?utm_source=generator&autoplay=1`}
          onEnded={() => {
            setIsPlaying(false);
            audioManager.stop();
          }}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          style={{ display: 'none' }}
        />
      )}

      {/* YouTube Iframe (hidden, for audio only) */}
      {youtubeUrl && isCurrentlyActive && isPlaying && (
        <iframe
          ref={iframeRef}
          width="0"
          height="0"
          style={{ position: 'absolute', left: '-9999px' }}
          allow="autoplay"
          onLoad={() => setIsLoading(false)}
        />
      )}

      {/* Play/Pause Button */}
      <Button
        onClick={handlePlayPause}
        disabled={isLoading}
        className={`w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${
          isCurrentlyActive && isPlaying 
            ? 'bg-green-600/80 hover:bg-green-700/90 text-white' 
            : 'bg-black/60 hover:bg-black/80 text-white'
        }`}
        size="lg"
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isCurrentlyActive && isPlaying ? (
          <Pause className="h-6 w-6" />
        ) : (
          <Play className="h-6 w-6 ml-1" />
        )}
      </Button>

      {/* Volume Control (for Spotify) */}
      {spotifyUrl && isCurrentlyActive && isPlaying && (
        <Button
          onClick={handleMute}
          className="absolute -right-12 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm"
          size="sm"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      )}

      {/* Playing Indicator */}
      {isCurrentlyActive && isPlaying && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
          {youtubeUrl ? 'Playing Video' : 'Playing Music'}
        </div>
      )}
    </div>
  );
}