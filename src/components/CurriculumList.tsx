import { useState } from 'react';
import { ChevronDown, ChevronRight, Volume2, Lock, Eye } from 'lucide-react';

interface LessonSummary {
  id: string;
  title: string;
  moduleIndex: number;
  lessonIndex: number;
  hasAudio: boolean;
}

interface ModuleWithLessons {
  title: string;
  description: string;
  lessons: LessonSummary[];
}

interface CurriculumListProps {
  modules: ModuleWithLessons[];
  isEnrolled: boolean;
  isOwner: boolean;
  onLessonClick: (lessonId: string, moduleIndex: number, lessonIndex: number) => void;
}

function isFirstLesson(moduleIndex: number, lessonIndex: number): boolean {
  return moduleIndex === 0 && lessonIndex === 0;
}

export function CurriculumList({
  modules,
  isEnrolled,
  isOwner,
  onLessonClick,
}: CurriculumListProps) {
  // Track which modules are expanded (all expanded by default)
  const [expandedModules, setExpandedModules] = useState<Set<number>>(
    () => new Set(modules.map((_, index) => index))
  );

  const toggleModule = (moduleIndex: number) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleIndex)) {
        next.delete(moduleIndex);
      } else {
        next.add(moduleIndex);
      }
      return next;
    });
  };

  const canAccessLesson = (moduleIndex: number, lessonIndex: number): boolean => {
    // Owner and enrolled users can access all lessons
    if (isOwner || isEnrolled) {
      return true;
    }
    // Non-enrolled users can only access the first lesson (free preview)
    return isFirstLesson(moduleIndex, lessonIndex);
  };

  const handleLessonClick = (
    lessonId: string,
    moduleIndex: number,
    lessonIndex: number
  ) => {
    // Only allow click if user has access AND we have a valid lesson ID
    if (lessonId && canAccessLesson(moduleIndex, lessonIndex)) {
      onLessonClick(lessonId, moduleIndex, lessonIndex);
    }
  };

  if (modules.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-text-muted">
        <p className="font-body">No curriculum available for this course.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((module, moduleIndex) => {
        const isExpanded = expandedModules.has(moduleIndex);
        const lessonCount = module.lessons.length;

        return (
          <div
            key={moduleIndex}
            className="border border-neutral-border rounded-lg overflow-hidden"
          >
            {/* Module Header */}
            <button
              onClick={() => toggleModule(moduleIndex)}
              className="w-full flex items-center justify-between p-4 bg-neutral-surface hover:bg-neutral-surface/80 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-neutral-text-muted flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-neutral-text-muted flex-shrink-0" />
                )}
                <div>
                  <h3 className="font-display font-semibold text-neutral-text">
                    Module {moduleIndex + 1}: {module.title}
                  </h3>
                  <p className="font-body text-sm text-neutral-text-muted mt-1">
                    {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
                  </p>
                </div>
              </div>
            </button>

            {/* Lessons List */}
            {isExpanded && (
              <div className="border-t border-neutral-border">
                {module.lessons.map((lesson, lessonIndex) => {
                  const isFreePreview = isFirstLesson(moduleIndex, lessonIndex);
                  const hasAccess = canAccessLesson(moduleIndex, lessonIndex);

                  return (
                    <div
                      key={lesson.id || `${moduleIndex}-${lessonIndex}`}
                      onClick={() => handleLessonClick(lesson.id, moduleIndex, lessonIndex)}
                      className={`flex items-center justify-between p-4 border-b border-neutral-border last:border-b-0 ${
                        hasAccess
                          ? 'cursor-pointer hover:bg-neutral-surface/50 transition-colors'
                          : 'cursor-not-allowed opacity-60'
                      }`}
                      role="button"
                      tabIndex={hasAccess ? 0 : -1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleLessonClick(lesson.id, moduleIndex, lessonIndex);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-body text-sm text-neutral-text-muted flex-shrink-0">
                          {moduleIndex + 1}.{lessonIndex + 1}
                        </span>
                        <span className="font-body text-neutral-text truncate">
                          {lesson.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {/* Audio indicator - Requirement 1.2 */}
                        {lesson.hasAudio && (
                          <span title="Audio available">
                            <Volume2 className="w-4 h-4 text-primary" />
                          </span>
                        )}

                        {/* Free Preview badge - Requirement 2.1 */}
                        {isFreePreview && !isOwner && !isEnrolled && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-green/20 text-accent-green rounded text-xs font-body font-semibold">
                            <Eye className="w-3 h-3" />
                            Free Preview
                          </span>
                        )}

                        {/* Lock icon for non-accessible lessons - Requirement 2.3 */}
                        {!hasAccess && (
                          <span title="Enrollment required">
                            <Lock className="w-4 h-4 text-neutral-text-muted" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Enrollment message for non-enrolled users */}
      {!isOwner && !isEnrolled && (
        <p className="text-center text-sm text-neutral-text-muted font-body mt-4">
          Enroll in this course to access all lessons
        </p>
      )}
    </div>
  );
}
