import React from 'react';
import { Card, CardContent, Typography, Box, Badge, Chip } from '@mui/material';
import { format } from 'date-fns';

const getTypeColor = (type) => {
  switch (type) {
    case 'Placement': return 'success';
    case 'Result': return 'warning';
    case 'Event': return 'info';
    default: return 'default';
  }
};

export const NotificationCard = ({ notification, isViewed, onClick }) => {
  const { ID, Type, Message, Timestamp } = notification;

  return (
    <Card 
      onClick={() => onClick(ID)}
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        opacity: isViewed ? 0.7 : 1,
        transition: '0.2s',
        '&:hover': {
          boxShadow: 3,
          opacity: 1
        },
        borderLeft: isViewed ? '4px solid transparent' : '4px solid #1976d2',
        bgcolor: isViewed ? 'background.default' : 'action.hover'
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            {!isViewed && (
              <Badge color="primary" variant="dot" />
            )}
            <Chip 
              label={Type} 
              color={getTypeColor(Type)} 
              size="small" 
              variant={isViewed ? 'outlined' : 'filled'}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {format(new Date(Timestamp), 'MMM dd, yyyy HH:mm')}
          </Typography>
        </Box>
        <Typography 
          variant="body1" 
          fontWeight={isViewed ? 'normal' : 'bold'}
          color={isViewed ? 'text.secondary' : 'text.primary'}
        >
          {Message}
        </Typography>
      </CardContent>
    </Card>
  );
};
