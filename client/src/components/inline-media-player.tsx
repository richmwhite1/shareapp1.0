import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InlineMediaPlayerProps {
  youtubeUrl?: string | null;
  spotifyUrl?: string | null;
  postId: number;
  thumbnailUrl?: string;
  onPostClick?: () => void;
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

  play(audio: HTMLAudioElement | null, postId: number) {
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
    this.listeners.forEach(callback => callback(null));
  }

  getCurrentPostId() {
    return this.currentPostId;
  }
}

export default function InlineMediaPlayer({ youtubeUrl, spotifyUrl, postId, thumbnailUrl, onPostClick }: InlineMediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioManager = AudioManager.getInstance();

  useEffect(() => {
    const unsubscribe = audioManager.subscribe((activePostId) => {
      if (activePostId !== postId) {
        setIsPlaying(false);
        setShowPlayer(false);
      }
    });

    return unsubscribe;
  }, [postId]);

  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handlePlayClick = () => {
    if (youtubeUrl) {
      handleYouTubePlay();
    } else if (spotifyUrl) {
      handleSpotifyPlay();
    }
  };

  const handleYouTubePlay = () => {
    const videoId = getYouTubeVideoId(youtubeUrl!);
    if (!videoId) {
      window.open(youtubeUrl || '', '_blank');
      return;
    }

    if (showPlayer && isPlaying) {
      setIsPlaying(false);
      setShowPlayer(false);
      audioManager.stop();
    } else {
      audioManager.play(null, postId);
      setShowPlayer(true);
      setIsPlaying(true);
    }
  };

  const getSpotifyEmbedUrl = (url: string) => {
    // Convert Spotify URLs to embed format
    const trackMatch = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
    const albumMatch = url.match(/spotify\.com\/album\/([a-zA-Z0-9]+)/);
    const playlistMatch = url.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    
    if (trackMatch) {
      return `https://open.spotify.com/embed/track/${trackMatch[1]}`;
    } else if (albumMatch) {
      return `https://open.spotify.com/embed/album/${albumMatch[1]}`;
    } else if (playlistMatch) {
      return `https://open.spotify.com/embed/playlist/${playlistMatch[1]}`;
    }
    return null;
  };

  const handleSpotifyPlay = () => {
    const embedUrl = getSpotifyEmbedUrl(spotifyUrl!);
    if (!embedUrl) {
      window.open(spotifyUrl || '', '_blank');
      return;
    }

    if (showPlayer && isPlaying) {
      setIsPlaying(false);
      setShowPlayer(false);
      audioManager.stop();
    } else {
      audioManager.play(null, postId);
      setShowPlayer(true);
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative w-full h-96">
      {showPlayer && youtubeUrl ? (
        // YouTube iframe player
        <iframe
          src={`https://www.youtube.com/embed/${getYouTubeVideoId(youtubeUrl!)}?autoplay=1&enablejsapi=1&controls=1&modestbranding=1&rel=0`}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : showPlayer && spotifyUrl ? (
        // Spotify iframe player
        <iframe
          src={getSpotifyEmbedUrl(spotifyUrl!)}
          className="w-full h-full"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      ) : (
        // Thumbnail with play button
        <div 
          className="relative w-full h-full cursor-pointer group"
          onClick={onPostClick}
        >
          <img
            src={thumbnailUrl}
            alt="Media thumbnail"
            className="w-full h-full object-cover"
          />
          
          {/* Play button overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handlePlayClick();
              }}
              variant="secondary"
              size="lg"
              className="bg-white/90 hover:bg-white rounded-full p-4 shadow-lg"
            >
              <Play className="w-8 h-8 text-black" />
            </Button>
          </div>
          
          {/* Media type indicator */}
          <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <Play className="w-3 h-3" />
            {youtubeUrl ? 'Video' : 'Music'}
          </div>
          
          {/* Player controls overlay when playing */}
          {isPlaying && !showPlayer && (
            <div className="absolute bottom-3 right-3">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  audioManager.stop();
                }}
                variant="secondary"
                size="sm"
                className="bg-black/70 text-white hover:bg-black/90"
              >
                <Pause className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}