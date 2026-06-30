import { useState, useEffect } from 'react';
import { Logger } from 'logging-middleware';

const logger = new Logger('FrontendHooks');

export const useViewedState = () => {
  const [viewedIds, setViewedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('viewed_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      logger.error('Error parsing viewed notifications from localStorage', { error: e.message });
      return [];
    }
  });

  const markAsViewed = (id) => {
    if (!viewedIds.includes(id)) {
      const newViewed = [...viewedIds, id];
      setViewedIds(newViewed);
      try {
        localStorage.setItem('viewed_notifications', JSON.stringify(newViewed));
        logger.debug(`Notification marked as viewed: ${id}`);
      } catch (e) {
        logger.error('Error saving viewed notifications to localStorage', { error: e.message });
      }
    }
  };

  const isViewed = (id) => viewedIds.includes(id);

  return { viewedIds, markAsViewed, isViewed };
};
