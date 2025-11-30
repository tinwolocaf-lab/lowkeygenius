import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, List, X, Clock, Settings } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  module_index: number;
  lesson_index: number;
}

interface AudioPlayerProps {
  lessons: Lesson[];
  currentLessonId: string;
  onLessonChange: (lessonId: string) => void;
  onClose?: () => void;
}

export function AudioPlayer({ lessons, currentLessonId, onLessonChange }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState<number | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const currentLesson = lessons.find((l) => l.id === currentLessonId);
  const currentIndex = lessons.findIndex((l) => l.id === currentLessonId);
  const lessonsWithAudio = lessons.filter((l) => l.audio_url);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentLesson?.audio_url) return;

    audio.src = currentLesson.audio_url;
    audio.load();

    if (isPlaying) {
      audio.play().catch((err) => console.error('Play error:', err));
    }
  }, [currentLessonId, currentLesson?.audio_url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      if (autoPlayNext) {
        handleNext();
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [autoPlayNext, currentLessonId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (sleepTimer === null) {
      setSleepTimeRemaining(null);
      return;
    }

    setSleepTimeRemaining(sleepTimer * 60);
    const interval = setInterval(() => {
      setSleepTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          handlePause();
          setSleepTimer(null);
          return null;
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
      audio.play().catch((err) => console.error('Play error:', err));
    }
    setIsPlaying(!isPlaying);
  };

  const handlePause = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    const nextLesson = lessonsWithAudio[lessonsWithAudio.findIndex((l) => l.id === currentLessonId) + 1];
    if (nextLesson) {
      onLessonChange(nextLesson.id);
      setIsPlaying(true);
    }
  };

  const handlePrevious = () => {
    const audio = audioRef.current;
    if (audio && currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const prevLesson = lessonsWithAudio[lessonsWithAudio.findIndex((l) => l.id === currentLessonId) - 1];
    if (prevLesson) {
      onLessonChange(prevLesson.id);
      setIsPlaying(true);
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

  const toggleMute = () => {
    setIsMuted(!isMuted);
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

  const getModuleTitle = (moduleIndex: number) => {
    return `Module ${moduleIndex + 1}`;
  };

  if (!currentLesson || !currentLesson.audio_url) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-3 px-4 py-3 bg-primary rounded-full shadow-xl hover:bg-primary-dark transition-colors"
        >
          {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
          <span className="text-white font-body font-semibold">{currentLesson.title}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-bg border-t-2 border-neutral-border shadow-xl z-50">
      <audio ref={audioRef} preload="metadata" />

      {/* Playlist Overlay */}
      {showPlaylist && (
        <div className="absolute bottom-full left-0 right-0 bg-neutral-bg border-t-2 border-neutral-border max-h-96 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-neutral-text">Playlist</h3>
              <button onClick={() => setShowPlaylist(false)} className="p-2 hover:bg-neutral-surface rounded-lg">
                <X className="w-5 h-5 text-neutral-text-muted" />
              </button>
            </div>
            <div className="space-y-2">
              {lessonsWithAudio.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => {
                    onLessonChange(lesson.id);
                    setIsPlaying(true);
                    setShowPlaylist(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    lesson.id === currentLessonId
                      ? 'bg-primary-light/20 border-2 border-primary'
                      : 'hover:bg-neutral-surface'
                  }`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
                    <span className="font-body font-bold text-sm text-primary">{lesson.lesson_index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-neutral-text-muted">{getModuleTitle(lesson.module_index)}</p>
                    <p className="font-body font-semibold text-neutral-text truncate">{lesson.title}</p>
                  </div>
                  {lesson.audio_duration_seconds && (
                    <span className="text-sm text-neutral-text-muted">{formatTime(lesson.audio_duration_seconds)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Overlay */}
      {showSettings && (
        <div className="absolute bottom-full right-0 bg-neutral-bg border-2 border-neutral-border rounded-t-xl shadow-xl p-4 min-w-64">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-body font-bold text-neutral-text">Settings</h3>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-neutral-surface rounded">
              <X className="w-4 h-4 text-neutral-text-muted" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-body text-sm font-semibold text-neutral-text mb-2">Playback Speed</label>
              <div className="flex gap-2">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackRate(speed)}
                    className={`px-3 py-1 rounded-lg font-body text-sm font-semibold transition-colors ${
                      playbackRate === speed
                        ? 'bg-primary text-white'
                        : 'bg-neutral-surface text-neutral-text hover:bg-neutral-border'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-body text-sm font-semibold text-neutral-text mb-2">Sleep Timer</label>
              <div className="flex gap-2">
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setSleepTimer(sleepTimer === mins ? null : mins)}
                    className={`px-3 py-1 rounded-lg font-body text-sm font-semibold transition-colors ${
                      sleepTimer === mins
                        ? 'bg-primary text-white'
                        : 'bg-neutral-surface text-neutral-text hover:bg-neutral-border'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
                {sleepTimer && (
                  <button
                    onClick={() => setSleepTimer(null)}
                    className="px-3 py-1 rounded-lg font-body text-sm font-semibold bg-accent-red/20 text-accent-red hover:bg-accent-red/30"
                  >
                    Off
                  </button>
                )}
              </div>
              {sleepTimeRemaining !== null && (
                <p className="text-sm text-neutral-text-muted mt-2">
                  Stops in: {formatSleepTime(sleepTimeRemaining)}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoPlayNext}
                  onChange={(e) => setAutoPlayNext(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="font-body text-sm font-semibold text-neutral-text">Auto-play next lesson</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Player */}
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-3">
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

          {/* Controls */}
          <div className="flex items-center justify-between">
            {/* Left: Lesson Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center">
                <span className="font-body font-bold text-primary">{currentLesson.lesson_index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-neutral-text-muted">{getModuleTitle(currentLesson.module_index)}</p>
                <p className="font-body font-semibold text-neutral-text truncate">{currentLesson.title}</p>
              </div>
            </div>

            {/* Center: Playback Controls */}
            <div className="flex items-center gap-4 mx-8">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="p-2 hover:bg-neutral-surface rounded-lg transition-colors disabled:opacity-50"
              >
                <SkipBack className="w-5 h-5 text-neutral-text" />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-3 bg-primary hover:bg-primary-dark rounded-full transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white" />}
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === lessonsWithAudio.length - 1}
                className="p-2 hover:bg-neutral-surface rounded-lg transition-colors disabled:opacity-50"
              >
                <SkipForward className="w-5 h-5 text-neutral-text" />
              </button>
            </div>

            {/* Right: Extra Controls */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-neutral-surface rounded-lg transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-neutral-text" /> : <Volume2 className="w-5 h-5 text-neutral-text" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-neutral-surface rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
              />
              {sleepTimeRemaining !== null && (
                <div className="flex items-center gap-1 px-2 py-1 bg-primary-light/20 rounded-lg">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-body text-sm font-semibold text-primary">{formatSleepTime(sleepTimeRemaining)}</span>
                </div>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-neutral-surface rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5 text-neutral-text" />
              </button>
              <button
                onClick={() => setShowPlaylist(!showPlaylist)}
                className="p-2 hover:bg-neutral-surface rounded-lg transition-colors"
              >
                <List className="w-5 h-5 text-neutral-text" />
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 hover:bg-neutral-surface rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-text" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
