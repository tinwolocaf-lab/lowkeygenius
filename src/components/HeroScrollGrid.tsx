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

// Direction offsets for each grid position (relative to center)
// For 3x3 grid: positions 0-8, center is 4
// Each item flies in from outside the viewport from its respective direction
const getDirectionOffset = (index: number, columns: number): { x: number; y: number } => {
  // Calculate row and column position
  const row = Math.floor(index / columns);
  const col = index % columns;
  
  // Center position
  const centerRow = Math.floor((columns === 3 ? 3 : 5) / 2); // 1 for 3x3, 2 for 2x5
  const centerCol = Math.floor(columns / 2); // 1 for 3 cols, 1 for 2 cols
  
  // Calculate direction from center (normalized)
  const dirX = col - centerCol; // -1, 0, or 1
  const dirY = row - centerRow; // -1, 0, or 1
  
  // Distance to fly in from (in viewport units, will be multiplied by actual distance)
  const flyDistance = 150; // percentage of item size
  
  return {
    x: dirX * flyDistance,
    y: dirY * flyDistance,
  };
};

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
  
  // Animation positions calculated from DOM
  const [positions, setPositions] = useState<{
    targetTop: number;
    targetLeft: number;
    targetWidth: number;
    targetHeight: number;
    startTop: number;
    startLeft: number;
    startWidth: number;
  } | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const targetSlotRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

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

  // Calculate positions for animation
  const calculatePositions = useCallback(() => {
    if (!targetSlotRef.current || !contentRef.current || !titleRef.current) return;
    
    const targetRect = targetSlotRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const titleRect = titleRef.current.getBoundingClientRect();
    
    const targetTop = targetRect.top - contentRect.top;
    const targetLeft = targetRect.left - contentRect.left;
    const targetWidth = targetRect.width;
    const targetHeight = targetRect.height;
    
    const startWidth = isDesktop ? contentRect.width * 0.6 : contentRect.width * 0.85;
    const startLeft = (contentRect.width - startWidth) / 2;
    const startTop = titleRect.bottom - contentRect.top + 32;
    
    setPositions({
      targetTop,
      targetLeft,
      targetWidth,
      targetHeight,
      startTop,
      startLeft,
      startWidth,
    });
  }, [isDesktop]);

  // Recalculate on mount, resize, and when content loads
  useEffect(() => {
    if (loading) return;
    
    const timeout = setTimeout(calculatePositions, 100);
    window.addEventListener('resize', calculatePositions);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', calculatePositions);
    };
  }, [loading, courses, isDesktop, calculatePositions]);

  // === TRANSFORMS ===
  // Hero text: visible at start, fades out during animation, fades back in at end
  const heroTextOpacity = useTransform(scrollYProgress, [0, 0.05, 0.9, 1], [1, 0, 0, 1]);
  
  // Grid items opacity - fade in as they fly toward center
  const gridItemOpacity = useTransform(scrollYProgress, [0, 0.15, 0.6, 1], [0, 0.3, 0.7, 1]);

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
          ref={stickyRef}
          className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden bg-neutral-bg"
          style={{ zIndex: 20 }}
        >
          {loading ? (
            <LoadingSkeleton isDesktop={isDesktop} />
          ) : (
            <div ref={contentRef} className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative h-full flex flex-col justify-center">
              {/* Section heading */}
              <div ref={titleRef} className="text-center mb-8">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-text mb-2">
                  Discover Community Courses
                </h2>
                <p className="font-body text-lg text-neutral-text-muted">
                  Explore courses created by our community
                </p>
              </div>

              {/* THE GRID WRAPPER */}
              <div className={`relative grid gap-4 ${isDesktop ? 'grid-cols-3' : 'grid-cols-2'}`}>
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
                  const direction = getDirectionOffset(index, gridConfig.columns);

                  if (!course) {
                    return (
                      <GridItemAnimated
                        key={`empty-${index}`}
                        direction={direction}
                        scrollYProgress={scrollYProgress}
                        opacity={gridItemOpacity}
                      >
                        <div className={`${ASPECT_RATIO} rounded-2xl bg-neutral-surface`} />
                      </GridItemAnimated>
                    );
                  }

                  return (
                    <GridItemAnimated
                      key={`${course.id}-${index}`}
                      direction={direction}
                      scrollYProgress={scrollYProgress}
                      opacity={gridItemOpacity}
                    >
                      <div onClick={handleCardClick} className="cursor-pointer">
                        <GridCourseCard course={course} aspectRatio={ASPECT_RATIO} />
                      </div>
                    </GridItemAnimated>
                  );
                })}
              </div>

              {/* THE HERO - positioned absolutely within sticky container */}
              {featuredCourse && positions && (
                <HeroElement
                  course={featuredCourse}
                  positions={positions}
                  heroTextOpacity={heroTextOpacity}
                  scrollYProgress={scrollYProgress}
                  onClick={handleCardClick}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Grid Item with directional fly-in animation
 */
interface GridItemAnimatedProps {
  children: React.ReactNode;
  direction: { x: number; y: number };
  scrollYProgress: MotionValue<number>;
  opacity: MotionValue<number>;
}

function GridItemAnimated({ children, direction, scrollYProgress, opacity }: GridItemAnimatedProps) {
  // Animate from outside viewport to final position
  const x = useTransform(scrollYProgress, [0, 1], [direction.x, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [direction.y, 0]);
  
  return (
    <motion.div
      style={{
        x,
        y,
        opacity,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Hero Element - animates from centered position below title to grid slot
 */
interface HeroElementProps {
  course: PublicCoursePreview;
  positions: {
    targetTop: number;
    targetLeft: number;
    targetWidth: number;
    targetHeight: number;
    startTop: number;
    startLeft: number;
    startWidth: number;
  };
  heroTextOpacity: MotionValue<number>;
  scrollYProgress: MotionValue<number>;
  onClick: () => void;
}

function HeroElement({ 
  course, 
  positions, 
  heroTextOpacity,
  scrollYProgress,
  onClick 
}: HeroElementProps) {
  const heroTop = useTransform(
    scrollYProgress, 
    [0, 1], 
    [positions.startTop, positions.targetTop]
  );
  
  const heroLeft = useTransform(
    scrollYProgress, 
    [0, 1], 
    [positions.startLeft, positions.targetLeft]
  );
  
  const heroWidth = useTransform(
    scrollYProgress, 
    [0, 1], 
    [positions.startWidth, positions.targetWidth]
  );

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: heroTop,
        left: heroLeft,
        width: heroWidth,
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
      className={`relative ${aspectRatio} w-full rounded-2xl overflow-hidden cursor-pointer bg-neutral-bg border border-neutral-border shadow-soft`}
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
    <div className={`relative ${aspectRatio} rounded-2xl overflow-hidden bg-neutral-bg border border-neutral-border shadow-soft hover:shadow-tile hover:scale-[1.02] transition-all duration-200`}>
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
      
      {/* Title and description overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-3">
        <h3 className="font-display text-sm font-bold text-white line-clamp-1">
          {course.title}
        </h3>
        <p className="font-body text-xs text-white/80 line-clamp-1 mt-0.5">
          {course.description || 'Discover something new'}
        </p>
      </div>
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
