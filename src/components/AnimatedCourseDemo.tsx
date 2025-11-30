import { useState, useEffect, useRef } from 'react';
import { AnimatedBrowserWindow } from './AnimatedBrowserWindow';
import { DemoChatBubble } from './DemoChatBubble';
import { CourseGenerationStep } from './CourseGenerationStep';
import { DemoCourseCard } from './DemoCourseCard';
import { ConfettiEffect } from './ConfettiEffect';
import { Sparkles, Headphones } from 'lucide-react';

type AnimationPhase =
  | 'intro'
  | 'chat-conversation'
  | 'generating-outline'
  | 'generating-lessons'
  | 'publishing'
  | 'audio-generation'
  | 'celebration'
  | 'restart';

interface Message {
  id: number;
  type: 'assistant' | 'user';
  content: string;
}

interface Lesson {
  id: number;
  title: string;
  status: 'pending' | 'generating' | 'completed';
}

const conversationMessages: Array<{ type: 'assistant' | 'user'; content: string; delay: number }> = [
  { type: 'assistant', content: "Hi! I'm your AI course designer. What would you like to learn about?", delay: 500 },
  { type: 'user', content: 'Learning Python programming for people who know JavaScript and TypeScript', delay: 2000 },
  { type: 'assistant', content: 'Great choice! What level should this course be?', delay: 1500 },
  { type: 'user', content: 'Beginner', delay: 1800 },
  { type: 'assistant', content: "What's your educational background?", delay: 1500 },
  { type: 'user', content: "Bachelor's degree in Law School", delay: 1800 },
  { type: 'assistant', content: 'Perfect! What is the purpose of taking this course?', delay: 1500 },
  { type: 'user', content: 'Becoming a machine learning expert', delay: 2000 },
  { type: 'assistant', content: "Excellent! Ready to generate your personalized course?", delay: 1500 },
];

const initialLessons: Lesson[] = [
  { id: 1, title: 'Python Basics for JavaScript Developers', status: 'pending' },
  { id: 2, title: 'Variables and Data Types Comparison', status: 'pending' },
  { id: 3, title: 'Functions and Control Flow', status: 'pending' },
  { id: 4, title: 'Object-Oriented Programming in Python', status: 'pending' },
  { id: 5, title: 'Python Libraries and Package Management', status: 'pending' },
];

const courseModules = [
  { title: 'Introduction to Python', lessonCount: 2 },
  { title: 'Core Python Concepts', lessonCount: 3 },
  { title: 'Advanced Features', lessonCount: 2 },
];

export function AnimatedCourseDemo() {
  const [phase, setPhase] = useState<AnimationPhase>('intro');
  const [messages, setMessages] = useState<Message[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [showModules, setShowModules] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => {
        setPhase('chat-conversation');
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (phase === 'chat-conversation') {
      if (messageIndex < conversationMessages.length) {
        const currentMessage = conversationMessages[messageIndex];
        const timer = setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: messageIndex,
              type: currentMessage.type,
              content: currentMessage.content,
            },
          ]);
          setMessageIndex(messageIndex + 1);
        }, currentMessage.delay);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setPhase('generating-outline');
        }, 2000);
        return () => clearTimeout(timer);
      }
    }

    if (phase === 'generating-outline') {
      const timer = setTimeout(() => {
        setMessages([]);
        setPhase('generating-lessons');
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (phase === 'generating-lessons') {
      if (currentLessonIndex < lessons.length) {
        setLessons((prev) =>
          prev.map((lesson, idx) =>
            idx === currentLessonIndex ? { ...lesson, status: 'generating' } : lesson
          )
        );

        const timer = setTimeout(() => {
          setLessons((prev) =>
            prev.map((lesson, idx) =>
              idx === currentLessonIndex ? { ...lesson, status: 'completed' } : lesson
            )
          );
          setCurrentLessonIndex((prev) => prev + 1);
        }, 1000);

        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setPhase('publishing');
        }, 500);
        return () => clearTimeout(timer);
      }
    }

    if (phase === 'publishing') {
      const timer = setTimeout(() => {
        setShowModules(true);
        setPhase('audio-generation');
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (phase === 'audio-generation') {
      const timer = setTimeout(() => {
        setPhase('celebration');
        setShowConfetti(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (phase === 'celebration') {
      const timer = setTimeout(() => {
        setPhase('restart');
      }, 3000);
      return () => clearTimeout(timer);
    }

    if (phase === 'restart') {
      setMessages([]);
      setLessons(initialLessons);
      setShowModules(false);
      setShowConfetti(false);
      setCurrentLessonIndex(0);
      setMessageIndex(0);
      const timer = setTimeout(() => {
        setPhase('intro');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, currentLessonIndex, messageIndex, lessons.length]);

  return (
    <div className="w-full relative h-[600px] md:h-[650px] lg:h-[700px]">
      <AnimatedBrowserWindow>
        <div className="overflow-y-auto p-4 md:p-6 relative h-[552px] md:h-[602px] lg:h-[652px]">
          {/* Debug indicator - remove in production */}
          <div className="absolute top-2 right-2 bg-neutral-bg/90 px-3 py-1 rounded-full text-xs font-mono text-neutral-text-muted z-50">
            {phase} | msg: {messageIndex}/{conversationMessages.length}
          </div>
          {(phase === 'chat-conversation' || phase === 'intro') && (
            <div className="max-w-2xl mx-auto min-h-[500px] md:min-h-[550px] lg:min-h-[600px]">
              {messages.map((message) => (
                <DemoChatBubble
                  key={message.id}
                  type={message.type}
                  content={message.content}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {phase === 'generating-outline' && (
            <div className="flex flex-col items-center justify-center min-h-[500px] md:min-h-[550px] lg:min-h-[600px]">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center animate-bounce-soft">
                    <Sparkles className="w-10 h-10 text-white animate-pulse" />
                  </div>
                </div>
              </div>
              <h3 className="font-display text-xl font-bold text-neutral-text mb-2 animate-pulse">
                Generating Course Outline...
              </h3>
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          )}

          {phase === 'generating-lessons' && (
            <div className="max-w-2xl mx-auto min-h-[500px] md:min-h-[550px] lg:min-h-[600px]">
              <div className="mb-6 animate-fade-in">
                <h2 className="font-display text-2xl font-bold text-neutral-text mb-2">
                  Python for JS/TS Developers
                </h2>
                <p className="font-body text-sm text-neutral-text-muted">
                  Generating {lessons.length} personalized lessons...
                </p>
              </div>
              <div className="space-y-2">
                {lessons.map((lesson) => (
                  <CourseGenerationStep
                    key={lesson.id}
                    lessonNumber={lesson.id}
                    lessonTitle={lesson.title}
                    status={lesson.status}
                  />
                ))}
              </div>
            </div>
          )}

          {(phase === 'publishing' || phase === 'audio-generation' || phase === 'celebration') && (
            <div className="max-w-2xl mx-auto min-h-[500px] md:min-h-[550px] lg:min-h-[600px]">
              {!showModules && (
                <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
                  <div className="w-16 h-16 bg-accent-green rounded-full flex items-center justify-center mb-4 animate-bounce-soft">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-neutral-text animate-pulse">
                    Publishing Course...
                  </h3>
                </div>
              )}

              {showModules && !showConfetti && (
                <div className="animate-fade-in">
                  <div className="mb-6">
                    <h2 className="font-display text-2xl font-bold text-neutral-text mb-2">
                      Course Published Successfully!
                    </h2>
                    <p className="font-body text-sm text-neutral-text-muted">
                      {courseModules.length} modules ready to learn
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-6">
                    {courseModules.map((module, index) => (
                      <DemoCourseCard
                        key={index}
                        moduleTitle={module.title}
                        lessonCount={module.lessonCount}
                      />
                    ))}
                  </div>

                  {phase === 'audio-generation' && (
                    <div className="bg-primary/10 border border-primary rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center animate-pulse">
                        <Headphones className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-body text-sm font-bold text-neutral-text">
                          Generating Audio...
                        </p>
                        <div className="w-full bg-neutral-border rounded-full h-2 mt-2">
                          <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '75%' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showConfetti && <ConfettiEffect />}
            </div>
          )}
        </div>
      </AnimatedBrowserWindow>
    </div>
  );
}
