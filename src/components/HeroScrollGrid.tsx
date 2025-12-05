import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { fetchPublicCoursePreviews, fillGridCourses } from '../lib/publicCourses';
import { ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { PublicCoursePreview } from '../types/database';

interface HeroScrollGridProps {
  className?: string;
}

// Grid configuration - responsive
const GRID_CONFIG = {
  desktop: { columns: 3, total: 9, holeIndex: 4 },  // 3x3, center is index 4
  mobile: { columns: 2, total: 10, holeIndex: 4 },  // 2x5, center-ish is index 4
};

const DESKTOP_BREAKPOINT = 1024;

// Uniform aspect ratio for both hero and grid items
const ASPECT_RATIO = 'aspect-[4/3]';

// Initial hero scale (how much bigger than grid cell it starts)
const HERO_INITIAL_SCALE = 2.5;

/**
 * HeroScrollGrid Component - "Hollow Grid" Architecture with Target Ref Strategy
 */
export function HeroScrollGrid({ className = '' }: HeroScrollGridProps) {
  const navigate = useNavigate();
  
  // State
  const [courses, setCourses] = useState<PublicCoursePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredCourse, setFeaturedCourse] = useState<PublicCoursePreview | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);
  
  // Target slot position relative to grid container
  const [targetSlotPosition, setTargetSlotPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const targetSlotRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Scroll progress
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Responsive breakpoint detection
  useEffect(() => {
    const checkBreakpoint = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  // Get current grid config based on viewport
  const gridConfig = isDesktop ? GRID_CONFIG.desktop : GRID_CONFIG.mobile;

  // Calculate target slot position relative to grid container
  const calculateTargetPosition = useCallback(() => {
    if (!targetSlotRef.current || !gridRef.current) return;
    
    const targetRect = targetSlotRef.current.getBoundingClientRect();
    const gridRect = gridRef.current.getBoundingClientRect();
    
    setTargetSlotPosition({
      top: targetRect.top - gridRect.top,
      left: targetRect.left - gridRect.left,
      width: targetRect.width,
      height: targetRect.height,
    });
  }, []);

  // Recalculate on mount, resize, and when content loads
  useEffect(() => {
    if (loading) return;
    
    const timeout = setTimeout(calculateTargetPosition, 100);
    window.addEventListener('resize', calculateTargetPosition);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', calculateTargetPosition);
    };
  }, [loading, courses, isDesktop, calculateTargetPosition]);

  // === HERO TRANSFORMS ===
  const heroScale = useTransform(scrollYProgress, [0, 1], [HERO_INITIAL_SCALE, 1]);
  const heroTextOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);

  // === GRID ITEM TRANSFORMS ===
  const gridItemScale = useTransform(scrollYProgress, [0, 0.7, 1], [1.3, 1.05, 1]);
  const gridItemOpacity = useTransform(scrollYProgress, [0, 0.5, 0.9], [0, 0, 1]);

  // Fetch courses on mount
  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        setError(null);
        const fetchedCourses = await fetchPublicCoursePreviews();
        setCourses(fetchedCourses);

        if (fetchedCourses.length > 0) {
          const randomIndex = Math.floor(Math.random() * fetchedCourses.length);
          setFeaturedCourse(fetchedCourses[randomIndex]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  // Fill grid with courses (excluding featured course)
  const gridCourses = fillGridCourses(
    courses.filter(c => c.id !== featuredCourse?.id),
    gridConfig.total - 1
  );

  const handleCardClick = () => {
    toast('Sign in to explore this course and start learning!', {
      icon: '🔐',
      duration: 4000,
    });
    navigate('/login');
  };

  // Hide section if no courses or error
  if (error || (!loading && courses.length === 0)) {
    return null;
  }

  return (
    <section className={`relative ${className}`}>
      {/* OUTER WRAPPER - 300vh scroll space */}
      <div
        ref={containerRef}
        className="relative"
        style={{ height: '300vh' }}
      >
        {/* STICKY CONTAINER */}
        <div
          className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden bg-neutral-bg"
          style={{ zIndex: 20 }}
        >
          {loading ? (
            <LoadingSkeleton isDesktop={isDesktop} />
          ) : (
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Section heading */}
              <div className="text-center mb-8">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-text mb-2">
                  Discover Community Courses
                </h2>
                <p className="font-body text-lg text-neutral-text-muted">
                  Explore courses created by our community
                </p>
              </div>

              {/* THE GRID WRAPPER - position relative for hero positioning */}
              <div 
                ref={gridRef}
                className={`relative grid gap-4 ${isDesktop ? 'grid-cols-3' : 'grid-cols-2'}`}
              >
                {Array.from({ length: gridConfig.total }).map((_, index) => {
                  // THE HOLE - invisible placeholder
                  if (index === gridConfig.holeIndex) {
                    return (
                      <div
                        key="hole"
                        ref={targetSlotRef}
                        className={`${ASPECT_RATIO} rounded-2xl`}
                        style={{ opacity: 0 }}
                        aria-hidden="true"
                      />
                    );
                  }

                  const courseIndex = index < gridConfig.holeIndex ? index : index - 1;
                  const course = gridCourses[courseIndex];

                  if (!course) {
                    return (
                      <motion.div
                        key={`empty-${index}`}
                        style={{ scale: gridItemScale, opacity: gridItemOpacity }}
                        className={`${ASPECT_RATIO} rounded-2xl bg-neutral-surface`}
                      />
                    );
                  }

                  return (
                    <motion.div
                      key={`${course.id}-${index}`}
                      style={{ scale: gridItemScale, opacity: gridItemOpacity }}
                      onClick={handleCardClick}
                      className="cursor-pointer"
                    >
                      <GridCourseCard course={course} aspectRatio={ASPECT_RATIO} />
                    </motion.div>
                  );
                })}

                {/* THE HERO - positioned absolutely within grid, starts at center slot */}
                {featuredCourse && targetSlotPosition && (
                  <HeroElement
                    course={featuredCourse}
                    targetSlotPosition={targetSlotPosition}
                    heroScale={heroScale}
                    heroTextOpacity={heroTextOpacity}
                    scrollYProgress={scrollYProgress}
                    onClick={handleCardClick}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Hero Element - positioned absolutely, animates from scaled-up center to grid slot
 */
interface HeroElementProps {
  course: PublicCoursePreview;
  targetSlotPosition: { top: number; left: number; width: number; height: number };
  heroScale: MotionValue<number>;
  heroTextOpacity: MotionValue<number>;
  scrollYProgress: MotionValue<number>;
  onClick: () => void;
}

function HeroElement({ 
  course, 
  targetSlotPosition, 
  heroScale, 
  heroTextOpacity,
  scrollYProgress,
  onClick 
}: HeroElementProps) {
  // Calculate the center offset needed when scaled up
  // At scale 2.5, the hero is 2.5x bigger, so we need to offset to keep it centered
  const scaledWidth = targetSlotPosition.width * HERO_INITIAL_SCALE;
  const scaledHeight = targetSlotPosition.height * HERO_INITIAL_SCALE;
  
  // Offset to center the scaled hero over the grid
  const startOffsetX = (scaledWidth - targetSlotPosition.width) / 2;
  const startOffsetY = (scaledHeight - targetSlotPosition.height) / 2;
  
  // At scroll 0: hero is centered (offset by startOffset)
  // At scroll 1: hero is at target slot position (no offset)
  const heroX = useTransform(scrollYProgress, [0, 1], [-startOffsetX, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [-startOffsetY, 0]);

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: targetSlotPosition.top,
        left: targetSlotPosition.left,
        width: targetSlotPosition.width,
        height: targetSlotPosition.height,
        scale: heroScale,
        x: heroX,
        y: heroY,
        transformOrigin: 'center center',
        zIndex: 30,
      }}
    >
      <HeroCard
        course={course}
        textOpacity={heroTextOpacity}
        onClick={onClick}
        aspectRatio={ASPECT_RATIO}
      />
    </motion.div>
  );
}

/**
 * Hero Card - the main animated card with instantly-fading text
 */
interface HeroCardProps {
  course: PublicCoursePreview;
  textOpacity: MotionValue<number>;
  onClick: () => void;
  aspectRatio: string;
}

function HeroCard({ course, textOpacity, onClick, aspectRatio }: HeroCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      className={`relative ${aspectRatio} w-full h-full rounded-2xl overflow-hidden cursor-pointer bg-neutral-bg border border-neutral-border shadow-soft`}
    >
      {course.thumbnail_url && !imgError ? (
        <img
          src={course.thumbnail_url}
          alt={course.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <ImageIcon className="w-12 h-12 text-primary/30" />
        </div>
      )}

      <motion.div
        style={{ opacity: textOpacity }}
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4 pointer-events-none"
      >
        <h3 className="font-display text-lg font-bold text-white line-clamp-2">
          {course.title}
        </h3>
        <p className="font-body text-sm text-white/80 line-clamp-2 mt-1">
          {course.description || 'Discover something new'}
        </p>
      </motion.div>
    </div>
  );
}

/**
 * Grid Course Card
 */
interface GridCourseCardProps {
  course: PublicCoursePreview;
  aspectRatio: string;
}

function GridCourseCard({ course, aspectRatio }: GridCourseCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`${aspectRatio} rounded-2xl overflow-hidden bg-neutral-bg border border-neutral-border shadow-soft hover:shadow-tile hover:scale-[1.02] transition-all duration-200`}>
      {course.thumbnail_url && !imgError ? (
        <img
          src={course.thumbnail_url}
          alt={course.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-primary/30" />
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton
 */
function LoadingSkeleton({ isDesktop }: { isDesktop: boolean }) {
  const total = isDesktop ? 9 : 10;
  
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <div className="h-10 w-64 bg-neutral-surface animate-pulse rounded-lg mx-auto mb-4" />
        <div className="h-6 w-96 bg-neutral-surface animate-pulse rounded-lg mx-auto" />
      </div>
      <div className={`grid gap-4 ${isDesktop ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={`${ASPECT_RATIO} bg-neutral-surface animate-pulse rounded-2xl`}
          />
        ))}
      </div>
    </div>
  );
}
