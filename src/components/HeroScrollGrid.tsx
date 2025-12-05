import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { fetchPublicCoursePreviews, fillGridCourses } from '../lib/publicCourses';
import { HomepageCourseCard } from './HomepageCourseCard';
import type { PublicCoursePreview } from '../types/database';

interface HeroScrollGridProps {
  className?: string;
}

// Animation constants from design document
const ANIMATION_CONFIG = {
  scrollSpacerHeight: '300vh',
  heroStartScale: 1,
  heroEndScale: 0.33,
  gridOpacityStart: 0,
  gridOpacityEnd: 1,
  opacityTransitionStart: 0.3,
};

// Grid configuration
const GRID_CONFIG = {
  desktop: { columns: 3, rows: 3, total: 9 },
  mobile: { columns: 2, rows: 5, total: 10 },
};

// Breakpoint for responsive layout (matches Tailwind's lg)
const DESKTOP_BREAKPOINT = 1024;

/**
 * HeroScrollGrid Component
 * 
 * Displays a scroll-linked animation showcasing public courses.
 * A randomly selected "hero" course card scales down and joins a grid
 * of other courses as the user scrolls.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.3, 2.4, 2.5, 5.1, 5.2, 5.4, 6.1, 6.2, 6.3, 6.4
 */
export function HeroScrollGrid({ className = '' }: HeroScrollGridProps) {
  // State management - Requirement 2.1, 2.5
  const [courses, setCourses] = useState<PublicCoursePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredCourse, setFeaturedCourse] = useState<PublicCoursePreview | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);

  // Refs for scroll animation
  const containerRef = useRef<HTMLDivElement>(null);


  // Scroll animation setup - Requirement 6.1, 6.2
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Transform values for hero card animation - Requirement 6.3
  const heroScale = useTransform(
    scrollYProgress,
    [0, 1],
    [ANIMATION_CONFIG.heroStartScale, ANIMATION_CONFIG.heroEndScale]
  );

  // Grid opacity animation - Requirement 6.4
  const gridOpacity = useTransform(
    scrollYProgress,
    [0, ANIMATION_CONFIG.opacityTransitionStart, 1],
    [ANIMATION_CONFIG.gridOpacityStart, ANIMATION_CONFIG.gridOpacityStart, ANIMATION_CONFIG.gridOpacityEnd]
  );

  // Responsive breakpoint detection - Requirement 5.4
  useEffect(() => {
    const checkBreakpoint = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  // Fetch courses on mount - Requirement 2.1
  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        setError(null);
        const fetchedCourses = await fetchPublicCoursePreviews();
        setCourses(fetchedCourses);

        // Select random featured course - Requirement 2.3
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

  // Get grid courses count based on viewport - Requirement 5.1, 5.2
  const gridConfig = isDesktop ? GRID_CONFIG.desktop : GRID_CONFIG.mobile;
  
  // Fill grid with courses, repeating if necessary - Requirement 2.4
  const gridCourses = fillGridCourses(courses, gridConfig.total);

  // Hide section if no courses or error - Requirement 2.5
  if (error || (!loading && courses.length === 0)) {
    return null;
  }

  return (
    <section className={`relative ${className}`}>
      {/* Scroll spacer container - Requirement 1.5 */}
      <div
        ref={containerRef}
        style={{ height: ANIMATION_CONFIG.scrollSpacerHeight }}
        className="relative"
      >
        {/* Sticky container - Requirement 1.1 */}
        <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
          {loading ? (
            // Loading skeleton - Requirement 2.5
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-8">
                <div className="h-10 w-64 bg-neutral-surface animate-pulse rounded-lg mx-auto mb-4" />
                <div className="h-6 w-96 bg-neutral-surface animate-pulse rounded-lg mx-auto" />
              </div>
              <div
                className={`grid gap-4 ${
                  isDesktop ? 'grid-cols-3' : 'grid-cols-2'
                }`}
              >
                {Array.from({ length: gridConfig.total }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-video bg-neutral-surface animate-pulse rounded-2xl"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              {/* Section heading */}
              <div className="text-center mb-8">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-text mb-2">
                  Discover Community Courses
                </h2>
                <p className="font-body text-lg text-neutral-text-muted">
                  Explore courses created by our community
                </p>
              </div>

              {/* Grid container - Requirement 1.4, 5.1, 5.2 */}
              <motion.div
                style={{ opacity: gridOpacity }}
                className={`grid gap-4 ${
                  isDesktop ? 'grid-cols-3' : 'grid-cols-2'
                }`}
              >
                {gridCourses.map((course, index) => (
                  <HomepageCourseCard
                    key={`${course.id}-${index}`}
                    course={course}
                    className="w-full"
                  />
                ))}
              </motion.div>

              {/* Hero card overlay - Requirement 1.2, 1.3, 6.3 */}
              {featuredCourse && (
                <motion.div
                  style={{ scale: heroScale }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                >
                  <div
                    className="pointer-events-auto w-full max-w-2xl"
                    style={{
                      transformOrigin: 'center center',
                    }}
                  >
                    <HomepageCourseCard
                      course={featuredCourse}
                      className="shadow-2xl"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
