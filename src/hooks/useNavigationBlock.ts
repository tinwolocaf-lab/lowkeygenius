import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseNavigationBlockOptions {
  when: boolean;
  message?: string;
  onBlock?: () => Promise<void> | void;
}

interface UseNavigationBlockReturn {
  isBlocked: boolean;
  setIsBlocked: (blocked: boolean) => void;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
  pendingPath: string | null;
  navigateWithConfirmation: (path: string) => void;
}

/**
 * Hook to block navigation and show a confirmation dialog when the user tries to leave.
 * Handles browser navigation (beforeunload) and provides utilities for in-app navigation blocking.
 * 
 * Note: This hook doesn't use useBlocker since the app uses BrowserRouter.
 * For in-app navigation, use navigateWithConfirmation or check isBlocked before navigating.
 */
export function useNavigationBlock({
  when,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  onBlock,
}: UseNavigationBlockOptions): UseNavigationBlockReturn {
  const navigate = useNavigate();
  const [isBlocked, setIsBlocked] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // Handle browser beforeunload event (refresh, close tab, external navigation)
  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages, but we still need to set returnValue
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [when, message]);

  // Navigate with confirmation - shows modal if blocked
  const navigateWithConfirmation = useCallback(
    (path: string) => {
      if (when) {
        setPendingPath(path);
        setIsBlocked(true);
      } else {
        navigate(path);
      }
    },
    [when, navigate]
  );

  // Confirm navigation - execute onBlock callback and navigate
  const confirmNavigation = useCallback(async () => {
    if (onBlock) {
      await onBlock();
    }
    setIsBlocked(false);
    if (pendingPath) {
      navigate(pendingPath);
      setPendingPath(null);
    }
  }, [onBlock, pendingPath, navigate]);

  // Cancel navigation - close modal and stay on page
  const cancelNavigation = useCallback(() => {
    setIsBlocked(false);
    setPendingPath(null);
  }, []);

  return {
    isBlocked,
    setIsBlocked,
    confirmNavigation,
    cancelNavigation,
    pendingPath,
    navigateWithConfirmation,
  };
}
