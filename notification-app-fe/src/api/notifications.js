import { Log } from 'logging-middleware';

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

  Log('frontend', 'info', 'api', `Fetching notifications: ${url.toString()}`);
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
      Log('frontend', 'error', 'api', `API Error ${response.status} fetching notifications - ${duration}ms`);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    Log('frontend', 'info', 'api', `Successfully fetched ${data.notifications?.length || 0} notifications - ${duration}ms`);
    return data.notifications || [];
  } catch (error) {
    const duration = Date.now() - start;
    Log('frontend', 'error', 'api', `Network or parse error fetching notifications - ${duration}ms. ${error.message}`);
    throw error;
  }
};
