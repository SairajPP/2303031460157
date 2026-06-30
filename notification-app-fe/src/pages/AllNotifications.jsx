import React, { useEffect, useState } from 'react';
import { Box, Typography, Pagination, CircularProgress, Alert } from '@mui/material';
import { fetchNotifications } from '../api/notifications';
import { NotificationCard } from '../components/NotificationCard';
import { useViewedState } from '../hooks/useViewedState';
import { Log } from 'logging-middleware';

export const AllNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const { isViewed, markAsViewed } = useViewedState();

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchNotifications({ page, limit });
        if (mounted) {
          setNotifications(data);
          Log('frontend', 'debug', 'page', `Loaded page ${page} with ${data.length} items`);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load notifications. Please try again.');
          Log('frontend', 'error', 'page', `Failed to load notifications on All page: ${err.message}`);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    
    return () => { mounted = false; };
  }, [page]);

  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box maxWidth="800px" mx="auto">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {notifications.length === 0 && !error ? (
            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
              No notifications available.
            </Typography>
          ) : (
            notifications.map(notif => (
              <NotificationCard 
                key={notif.ID} 
                notification={notif} 
                isViewed={isViewed(notif.ID)}
                onClick={(id) => markAsViewed(id)}
              />
            ))
          )}

          {notifications.length > 0 && (
            <Box display="flex" justifyContent="center" mt={4} pb={2}>
              <Pagination 
                count={10} // Assuming 10 pages for demonstration as backend total isn't provided in metadata
                page={page} 
                onChange={handlePageChange} 
                color="primary" 
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
