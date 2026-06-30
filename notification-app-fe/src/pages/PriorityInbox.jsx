import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { fetchNotifications } from '../api/notifications';
import { NotificationCard } from '../components/NotificationCard';
import { useViewedState } from '../hooks/useViewedState';
import { Log } from 'logging-middleware';

const WEIGHTS = {
  'Placement': 3,
  'Result': 2,
  'Event': 1
};

export const PriorityInbox = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [limit, setLimit] = useState(10);
  const [filterType, setFilterType] = useState('All');

  const { isViewed, markAsViewed } = useViewedState();

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { limit };
        if (filterType !== 'All') {
          params.notification_type = filterType;
        }

        const data = await fetchNotifications(params);
        
        if (mounted) {
          // Client-side Priority Sorting
          // We use spread [...] to avoid mutating the original array from the API
          const sorted = [...data].sort((a, b) => {
            const weightA = WEIGHTS[a.Type] || 0;
            const weightB = WEIGHTS[b.Type] || 0;
            
            if (weightA !== weightB) {
              return weightB - weightA; // sort by weight descending
            }
            
            const timeA = new Date(a.Timestamp).getTime();
            const timeB = new Date(b.Timestamp).getTime();
            return timeB - timeA;
          });

          setNotifications(sorted);
          Log('frontend', 'debug', 'page', `Loaded Priority Inbox with limit ${limit} and filter ${filterType}`);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load priority notifications.');
          Log('frontend', 'error', 'page', `Failed to load on Priority page: ${err.message}`);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    
    return () => { mounted = false; };
  }, [limit, filterType]);

  return (
    <Box maxWidth="800px" mx="auto">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5" fontWeight="bold">Priority Inbox</Typography>
        
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type Filter</InputLabel>
            <Select
              value={filterType}
              label="Type Filter"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Placement">Placement</MenuItem>
              <MenuItem value="Result">Result</MenuItem>
              <MenuItem value="Event">Event</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Top 'n'</InputLabel>
            <Select
              value={limit}
              label="Top 'n'"
              onChange={(e) => setLimit(e.target.value)}
            >
              <MenuItem value={5}>Top 5</MenuItem>
              <MenuItem value={10}>Top 10</MenuItem>
              <MenuItem value={15}>Top 15</MenuItem>
              <MenuItem value={20}>Top 20</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {notifications.length === 0 && !error ? (
            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
              No priority notifications found.
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
        </>
      )}
    </Box>
  );
};
