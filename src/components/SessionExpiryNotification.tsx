/**
 * Session Expiry Notification Component
 * Shows a fade-out message when JWT expires
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface SessionExpiryNotificationProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  autoHideDuration?: number; // milliseconds
}

export const SessionExpiryNotification: React.FC<SessionExpiryNotificationProps> = ({
  message,
  isVisible,
  onClose,
  autoHideDuration = 5000 // 5 seconds default
}) => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
      
      // Auto-hide after duration
      const timer = setTimeout(() => {
        setShouldShow(false);
        setTimeout(onClose, 300); // Wait for fade-out animation
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHideDuration, onClose]);

  if (!isVisible && !shouldShow) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        shouldShow ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px]">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium">{message}</span>
        <button
          onClick={() => {
            setShouldShow(false);
            setTimeout(onClose, 300);
          }}
          className="text-white/80 hover:text-white transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Hook for managing session expiry notifications
 */
export const useSessionExpiryNotification = () => {
  const [notification, setNotification] = useState<{
    message: string;
    isVisible: boolean;
  }>({
    message: '',
    isVisible: false
  });

  const showNotification = (message: string) => {
    setNotification({
      message,
      isVisible: true
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      isVisible: false
    }));
  };

  return {
    notification,
    showNotification,
    hideNotification
  };
};