import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, ArrowUpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { Button } from './Button';
import { useEnrollment, CanEnrollResult } from '../hooks/useEnrollment';
import { useSubscription } from '../hooks/useSubscription';
import type { CourseLevel } from '../types/database';
import toast from 'react-hot-toast';

interface PublicCourse {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  level: CourseLevel;
  estimated_duration_hours: number | null;
  creator_display_name: string | null;
  published_at: string | null;
  enrollment_count: number;
}

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: PublicCourse;
  onEnrollmentComplete: () => void;
}

export function EnrollmentModal({
  isOpen,
  onClose,
  course,
  onEnrollmentComplete,
}: EnrollmentModalProps) {
  const navigate = useNavigate();
  const { enrollInCourse, canEnroll, isLoading: enrollmentLoading } = useEnrollment();
  const { planType } = useSubscription();
  
  const [enrollCheck, setEnrollCheck] = useState<CanEnrollResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  const isProMax = planType === 'PRO_MAX';


  useEffect(() => {
    async function checkEnrollment() {
      if (!isOpen) return;
      
      setCheckingEligibility(true);
      const result = await canEnroll(course.id);
      setEnrollCheck(result);
      setCheckingEligibility(false);
    }

    checkEnrollment();
  }, [isOpen, course.id, canEnroll]);

  const handleEnroll = async () => {
    setIsSubmitting(true);
    
    const result = await enrollInCourse(course.id);
    
    if (result.success) {
      toast.success('Successfully enrolled in course!');
      onEnrollmentComplete();
    } else {
      toast.error(result.error || 'Failed to enroll');
    }
    
    setIsSubmitting(false);
  };

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  if (checkingEligibility) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Enroll in Course" size="sm">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
          <p className="font-body text-neutral-text-muted mt-4">Checking eligibility...</p>
        </div>
      </Modal>
    );
  }

  if (enrollCheck?.reason === 'already_enrolled') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Already Enrolled" size="sm">
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <p className="font-body text-neutral-text mb-6">
            You're already enrolled in <strong>{course.title}</strong>
          </p>
          <Button onClick={onClose} className="w-full">
            Got it
          </Button>
        </div>
      </Modal>
    );
  }


  if (!enrollCheck?.canEnroll && enrollCheck?.reason === 'limit_reached') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Course Limit Reached" size="sm">
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-yellow/20 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-accent-yellow" />
          </div>
          <p className="font-body text-neutral-text mb-2">
            You've reached your course limit
          </p>
          <p className="font-body text-sm text-neutral-text-muted mb-6">
            You currently have {enrollCheck.currentCount} of {enrollCheck.limit} courses.
            Upgrade your plan to enroll in more courses.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleUpgrade} className="w-full flex items-center justify-center gap-2">
              <ArrowUpCircle className="w-5 h-5" />
              Upgrade Plan
            </Button>
            <Button variant="secondary" onClick={onClose} className="w-full">
              Maybe Later
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enroll in Course" size="sm">
      <div className="py-2">
        <h3 className="font-display text-lg font-bold text-neutral-text mb-2">
          {course.title}
        </h3>
        <p className="font-body text-sm text-neutral-text-muted mb-4">
          {course.description || 'No description available'}
        </p>

        <div className="flex items-center gap-4 mb-6">
          <span className="px-3 py-1 bg-primary-light text-primary rounded-full font-body font-semibold text-xs capitalize">
            {course.level}
          </span>
          <span className="px-3 py-1 bg-neutral-surface text-neutral-text rounded-full font-body text-xs">
            {course.topic}
          </span>
        </div>

        {!isProMax && enrollCheck && (
          <div className="bg-neutral-surface rounded-xl p-4 mb-6">
            <p className="font-body text-sm text-neutral-text">
              <span className="font-semibold">Course limit:</span>{' '}
              {enrollCheck.currentCount} / {enrollCheck.limit === Infinity ? '∞' : enrollCheck.limit}
            </p>
            <p className="font-body text-xs text-neutral-text-muted mt-1">
              Enrolling will use 1 course slot
            </p>
          </div>
        )}

        {isProMax && (
          <div className="bg-primary-light/30 rounded-xl p-4 mb-6">
            <p className="font-body text-sm text-primary">
              <span className="font-semibold">PRO MAX:</span> Unlimited enrollments
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleEnroll}
            disabled={isSubmitting || enrollmentLoading}
            className="w-full"
          >
            {isSubmitting ? 'Enrolling...' : 'Confirm Enrollment'}
          </Button>
          <Button variant="secondary" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
