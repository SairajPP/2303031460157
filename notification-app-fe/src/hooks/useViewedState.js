import { useState } from 'react';
import { Log } from 'logging-middleware';

export const useViewedState = () => {
  // lazy initialize state to avoid hitting localStorage on every render cycle
  const [viewedIds, setViewedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('viewed_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      Log('frontend', 'error', 'hook', `Error parsing viewed notifications from localStorage: ${e.message}`);
      return [];
    }
  });

  const markAsViewed = (id) => {
    if (!viewedIds.includes(id)) {
      const newViewed = [...viewedIds, id];
      setViewedIds(newViewed);
      try {
        localStorage.setItem('viewed_notifications', JSON.stringify(newViewed));
        Log('frontend', 'debug', 'hook', `Notification marked as viewed: ${id}`);
      } catch (e) {
        Log('frontend', 'error', 'hook', `Error saving viewed notifications to localStorage: ${e.message}`);
      }
    }
  };

  const isViewed = (id) => viewedIds.includes(id);

  return { viewedIds, markAsViewed, isViewed };
};
