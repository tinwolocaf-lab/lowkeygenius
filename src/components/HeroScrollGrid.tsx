import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { fetchPublicCoursePreviews, fillGridCourses } from '../lib/publicCourses';
import { ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { PublicCoursePreview } from '../types/database';

interface HeroScrollGridProps {
  className?: string;
}

// Grid configuration - 3x3 grid with center slot (index 4) as "The Hole"
const GRID_CONFIG = {
  columns: 3,
  total: 9,
  holeIndex: 4, // Center slot (0-indexed: row 1, col 1)
};

/**
 * HeroScrollGrid Component - "Hollow Grid" Architecture
 * 
 * A scroll-linked animation where a hero card shrinks from full-screen
 * into the center slot of a 3x3 grid as the user scrolls.
 */
export function HeroScrollGrid({ className = '' }: HeroScrollGridProps) {
  const navigate = useNavigate();
  
  // State
  const [courses, setCourses] = useState<PublicCoursePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredCourse, setFeaturedCourse] = useState<PublicCoursePreview | null>(null);
  
  // Refs for position calculation
  const containerRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  // Scroll progress of the outer 300vh wrapper
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // === HERO TRANSFORMS ===
  // Hero starts scaled up (3x) to fill screen, shrinks to 1x at end
  const heroScale = useTransform(scrollYProgress, [0, 1], [2.5, 1]);
  
  // Hero text fades out quickly (within first 20% of scroll)
  const heroTextOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  
  // Hero position - starts centered, moves to hole position
  const [holePosition, setHolePosition] = useState({ x: 0, y: 0 });
  
  const heroX = useTransform(scrollYProgress, [0, 1], [0, holePosition.x]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, holePosition.y]);

  // === GRID ITEM TRANSFORMS ===
  // Grid items start scaled up and invisible, animate to normal
  const gridItemScale = useTransform(scrollYProgress, [0, 0.8, 1], [1.3, 1.1, 1]);
  const gridItemOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [0, 0, 1]);

  // Calculate hole position relative to viewport center
  useEffect(() => {
    const calculateHolePosition = () => {
      if (!holeRef.current || !stickyRef.current) return;
      
      const holeRect = holeRef.current.getBoundingClientRect();
      const stickyRect = stickyRef.current.getBoundingClientRect();
      
      // Calculate offset from center of sticky container to center of hole
      const stickyCenterX = stickyRect.width / 2;
      const stickyCenterY = stickyRect.height / 2;
      
      const holeCenterX = holeRect.left - stickyRect.left + holeRect.width / 2;
      const holeCenterY = holeRect.top - stickyRect.top + holeRect.height / 2;
      
      setHolePosition({
        x: holeCenterX - stickyCenterX,
        y: holeCenterY - stickyCenterY,
      });
    };

    // Calculate after render and on resize
    const timeout = setTimeout(calculateHolePosition, 100);
    window.addEventListener('resize', calculateHolePosition);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', calculateHolePosition);
    };
  }, [loading, courses]);

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
    GRID_CONFIG.total - 1 // -1 because center is the hole
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
      {/* 1. OUTER WRAPPER - 300vh scroll space */}
      <div
        ref={containerRef}
        className="relative"
        style={{ height: '300vh' }}
      >
        {/* 2. STICKY CONTAINER - stays in viewport, high z-index */}
        <div
          ref={stickyRef}
          className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden bg-neutral-bg"
          style={{ zIndex: 20 }}
        >
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              {/* Section heading */}
              <div className="text-center mb-8">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-text mb-2">
                  Discover Community Courses
                </h2>
                <p className="font-body text-lg text-neutral-text-muted">
                  Explore courses created by our community
                </p>
              </div>

              {/* 3. THE GRID WRAPPER - 3 columns */}
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: GRID_CONFIG.total }).map((_, index) => {
                  // Grid Item 5 (index 4) is THE HOLE
                  if (index === GRID_CONFIG.holeIndex) {
                    return (
                      <div
                        key="hole"
                        ref={holeRef}
                        className="aspect-video rounded-2xl"
                        style={{ visibility: 'hidden' }}
                        aria-hidden="true"
                      />
                    );
                  }

                  // Calculate course index (accounting for the hole)
                  const courseIndex = index < GRID_CONFIG.holeIndex ? index : index - 1;
                  const course = gridCourses[courseIndex];

                  if (!course) {
                    return (
                      <motion.div
                        key={`empty-${index}`}
                        style={{ scale: gridItemScale, opacity: gridItemOpacity }}
                        className="aspect-video rounded-2xl bg-neutral-surface"
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
                      <GridCourseCard course={course} />
                    </motion.div>
                  );
                })}
              </div>

              {/* 4. THE HERO - absolute positioned, animates from center to hole */}
              {featuredCourse && (
                <motion.div
                  style={{
                    scale: heroScale,
                    x: heroX,
                    y: heroY,
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 z-30"
                >
                  <HeroCard
                    course={featuredCourse}
                    textOpacity={heroTextOpacity}
                    onClick={handleCardClick}
                  />
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Hero Card - the main animated card with fading text
 */
interface HeroCardProps {
  course: PublicCoursePreview;
  textOpacity: MotionValue<number>;
  onClick: () => void;
}

function HeroCard({ course, textOpacity, onClick }: HeroCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer bg-neutral-bg border border-neutral-border shadow-soft"
    >
      {/* Thumbnail */}
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

      {/* Text overlay - fades out during scroll */}
      <motion.div
        style={{ opacity: textOpacity }}
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4"
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
 * Grid Course Card - simple image-only card for grid items
 */
interface GridCourseCardProps {
  course: PublicCoursePreview;
}

function GridCourseCard({ course }: GridCourseCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="aspect-video rounded-2xl overflow-hidden bg-neutral-bg border border-neutral-border shadow-soft hover:shadow-tile hover:scale-[1.02] transition-all duration-200">
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
function LoadingSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <div className="h-10 w-64 bg-neutral-surface animate-pulse rounded-lg mx-auto mb-4" />
        <div className="h-6 w-96 bg-neutral-surface animate-pulse rounded-lg mx-auto" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className="aspect-video bg-neutral-surface animate-pulse rounded-2xl"
          />
        ))}
      </div>
    </div>
  );
}
