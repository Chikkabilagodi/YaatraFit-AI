import { useEffect, useState, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  reconnected: boolean;
  dismissed: boolean;
  dismissNotification: () => void;
  resetDismissed: () => void;
}

/**
 * Custom React hook that monitors the browser's 'online' and 'offline' network events.
 * Provides real-time network connectivity state, a temporary reconnected indicator when
 * connection is restored, and user dismiss controls.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  });
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [reconnected, setReconnected] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setReconnected(false);
      setDismissed(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
      setWasOffline((prevWasOffline) => {
        if (prevWasOffline) {
          setReconnected(true);
        }
        return false;
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Automatically clear the "back online" confirmation badge after 4 seconds
  useEffect(() => {
    if (reconnected) {
      const timer = setTimeout(() => {
        setReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [reconnected]);

  const dismissNotification = useCallback(() => {
    setDismissed(true);
  }, []);

  const resetDismissed = useCallback(() => {
    setDismissed(false);
  }, []);

  return {
    isOnline,
    wasOffline,
    reconnected,
    dismissed,
    dismissNotification,
    resetDismissed,
  };
}
