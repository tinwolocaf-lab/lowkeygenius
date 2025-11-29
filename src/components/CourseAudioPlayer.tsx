import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Timer,
  RotateCcw,
  X,
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  audio_url: string | null;
  module_index: number;
  lesson_index: number;
}

interface CourseAudioPlayerProps {
  lessons: Lesson[];
  currentLessonIndex: number;
  onLessonChange: (index: number) => void;
  onClose?: () => void;
}

const SLEEP_TIMER_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
];

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function CourseAudioPlayer({
  lessons,
  currentLessonIndex,
  onLessonChange,
  onClose,
}: CourseAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [autoNext, setAutoNext] = useState(true);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState(0);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const currentLesson = lessons[currentLessonIndex];

  // Find next lesson with audio
  const findNextAudioLesson = useCallback(() => {
    for (let i = currentLessonIndex + 1; i < lessons.length; i++) {
      if (lessons[i].audio_url) return i;
    }
    return -1;
  }, [currentLessonIndex, lessons]);

  // Find previous lesson with audio
  const findPrevAudioLesson = useCallback(() => {
    for (let i = currentLessonIndex - 1; i >= 0; i--) {
      if (lessons[i].audio_url) return i;
    }
    return -1;
  }, [currentLessonIndex, lessons]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    
    const handleEnded = () => {
      setIsPlaying(false);
      if (autoNext) {
        const nextIndex = findNextAudioLesson();
        if (nextIndex !== -1) {
          onLessonChange(nextIndex);
          // Auto-play next lesson after a short delay
          setTimeout(() => {
            audioRef.current?.play().catch(console.error);
            setIsPlaying(true);
          }, 500);
        }
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [autoNext, findNextAudioLesson, onLessonChange]);

  // Handle lesson change - reset and optionally auto-play
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentLesson?.audio_url) return;

    audio.load();
    setCurrentTime(0);
    setDuration(0);
  }, [currentLesson?.audio_url]);

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Playback speed control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Sleep timer
  useEffect(() => {
    if (sleepTimer === 0) {
      setSleepTimeRemaining(0);
      return;
    }

    setSleepTimeRemaining(sleepTimer * 60);

    const interval = setInterval(() => {
      setSleepTimeRemaining((prev) => {
        if (prev <= 1) {
          // Timer expired - pause playback
          audioRef.current?.pause();
          setIsPlaying(false);
          setSleepTimer(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const goToNextLesson = () => {
    const nextIndex = findNextAudioLesson();
    if (nextIndex !== -1) {
      onLessonChange(nextIndex);
    }
  };

  const goToPrevLesson = () => {
    const prevIndex = findPrevAudioLesson();
    if (prevIndex !== -1) {
      onLessonChange(prevIndex);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSleepTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentLesson?.audio_url) {
    return null;
  }

  const nextAudioIndex = findNextAudioLesson();
  const prevAudioIndex = findPrevAudioLesson();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-bg border-t-2 border-neutral-border shadow-lg z-30">
      <audio ref={audioRef} src={currentLesson.audio_url} preload="metadata" />

      {/* Progress bar at top */}
      <div className="h-1 bg-neutral-surface">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Lesson info */}
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="text-xs text-neutral-text-muted">
              Module {currentLesson.module_index + 1}, Lesson {currentLesson.lesson_index + 1}
            </p>
            <p className="font-body font-semibold text-neutral-text truncate text-sm">
              {currentLesson.title}
            </p>
          </div>

          {/* Main controls */}
          <div className="flex items-center gap-2">
            {/* Previous lesson */}
            <button
              onClick={goToPrevLesson}
              disabled={prevAudioIndex === -1}
              className="p-2 hover:bg-neutral-surface rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous lesson"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-text" />
            </button>

            {/* Rewind */}
            <button
              onClick={() => skip(-10)}
              className="p-2 hover:bg-neutral-surface rounded-lg transition-colors"
              title="Rewind 10s"
            >
              <SkipBack className="w-5 h-5 text-neutral-text" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className="p-3 bg-primary hover:bg-primary-dark rounded-full transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-0.5" />
              )}
            </button>

            {/* Forward */}
            <button
              onClick={() => skip(10)}
              className="p-2 hover:bg-neutral-surface rounded-lg transition-colors"
              title="Forward 10s"
            >
              <SkipForward className="w-5 h-5 text-neutral-text" />
            </button>

            {/* Next lesson */}
            <button
              onClick={goToNextLesson}
              disabled={nextAudioIndex === -1}
              className="p-2 hover:bg-neutral-surface rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next lesson"
            >
              <ChevronRight className="w-5 h-5 text-neutral-text" />
            </button>
          </div>

          {/* Time display */}
          <div className="hidden md:flex items-center gap-2 text-sm text-neutral-text-muted min-w-[100px]">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Seek bar - desktop */}
          <div className="hidden lg:block flex-1 max-w-md">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-neutral-surface rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>

          {/* Secondary controls */}
          <div className="flex items-center gap-1">
            {/* Playback speed */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowSleepMenu(false);
                }}
                className="px-2 py-1 text-sm font-semibold text-neutral-text hover:bg-neutral-surface rounded-lg transition-colors"
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-neutral-bg border-2 border-neutral-border rounded-xl shadow-lg py-2 min-w-[80px]">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-sm text-left hover:bg-neutral-surface ${
                        playbackSpeed === speed ? 'text-primary font-semibold' : 'text-neutral-text'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auto-next toggle */}
            <button
              onClick={() => setAutoNext(!autoNext)}
              className={`p-2 rounded-lg transition-colors ${
                autoNext ? 'bg-primary-light text-primary' : 'hover:bg-neutral-surface text-neutral-text-muted'
              }`}
              title={autoNext ? 'Auto-next: ON' : 'Auto-next: OFF'}
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Sleep timer */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSleepMenu(!showSleepMenu);
                  setShowSpeedMenu(false);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  sleepTimer > 0 ? 'bg-primary-light text-primary' : 'hover:bg-neutral-surface text-neutral-text-muted'
                }`}
                title="Sleep timer"
              >
                <Timer className="w-5 h-5" />
              </button>
              {sleepTimeRemaining > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs px-1 rounded">
                  {formatSleepTime(sleepTimeRemaining)}
                </span>
              )}
              {showSleepMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-neutral-bg border-2 border-neutral-border rounded-xl shadow-lg py-2 min-w-[100px]">
                  {SLEEP_TIMER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSleepTimer(option.value);
                        setShowSleepMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-sm text-left hover:bg-neutral-surface ${
                        sleepTimer === option.value ? 'text-primary font-semibold' : 'text-neutral-text'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 hover:bg-neutral-surface rounded-lg transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-neutral-text" />
                ) : (
                  <Volume2 className="w-5 h-5 text-neutral-text" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-2 bg-neutral-surface rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>

            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-surface rounded-lg transition-colors ml-2"
                title="Close player"
              >
                <X className="w-5 h-5 text-neutral-text" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile seek bar */}
        <div className="lg:hidden mt-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-neutral-surface rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <div className="flex justify-between text-xs text-neutral-text-muted mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
