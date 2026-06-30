import { Logger } from 'logging-middleware';

const logger = new Logger('FrontendAPI');

const API_BASE_URL = '/evaluation-service';
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

/**
 * Fetch notifications from the API with optional query parameters.
 * @param {Object} params - { limit, page, notification_type }
 */
export const fetchNotifications = async (params = {}) => {
  // Use relative URL to leverage the Vite proxy (fixes CORS issues!)
  const url = new URL(`${API_BASE_URL}/notifications`, window.location.origin);
  
  // append our filters if they exist
  if (params.limit) url.searchParams.append('limit', params.limit);
  if (params.page) url.searchParams.append('page', params.page);
  if (params.notification_type) url.searchParams.append('notification_type', params.notification_type);

  logger.info(`Fetching notifications: ${url.toString()}`, params);
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const duration = Date.now() - start;

    if (!response.ok) {
      logger.error(`API Error ${response.status} fetching notifications - ${duration}ms`);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`Successfully fetched ${data.notifications?.length || 0} notifications - ${duration}ms`);
    return data.notifications || [];
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Network or parse error fetching notifications - ${duration}ms`, { error: error.message });
    throw error;
  }
};
