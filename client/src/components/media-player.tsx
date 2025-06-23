import { useState } from "react";
import { Play, Pause, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaPlayerProps {
  youtubeUrl?: string;
  spotifyUrl?: string;
  youtubeLabel?: string;
  spotifyLabel?: string;
  className?: string;
}

export default function MediaPlayer({ youtubeUrl, spotifyUrl, youtubeLabel, spotifyLabel, className = "" }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Extract Spotify track ID from URL
  const getSpotifyTrackId = (url: string) => {
    const regex = /spotify\.com\/track\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  if (!youtubeUrl && !spotifyUrl) {
    return null;
  }

  const youtubeVideoId = youtubeUrl ? getYouTubeVideoId(youtubeUrl) : null;
  const spotifyTrackId = spotifyUrl ? getSpotifyTrackId(spotifyUrl) : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* YouTube Player */}
      {youtubeUrl && youtubeVideoId && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-white text-sm font-medium">{youtubeLabel || "Link"}</span>
            </div>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          
          {isPlaying ? (
            <div className="relative">
              <iframe
                width="100%"
                height="240"
                src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full"
              />
              <Button
                onClick={() => setIsPlaying(false)}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2"
                size="sm"
              >
                <Pause className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="relative h-48 bg-gray-900 flex items-center justify-center">
              <img
                src={`https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`}
                alt="YouTube thumbnail"
                className="w-full h-full object-cover"
              />
              <Button
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
                size="lg"
              >
                <Play className="h-6 w-6 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Spotify Player */}
      {spotifyUrl && spotifyTrackId && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-white text-sm font-medium">{spotifyLabel || "Link"}</span>
            </div>
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          
          <div className="h-80">
            <iframe
              src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}