import fetch from 'isomorphic-fetch';

let API_TOKEN = '';
const isBrowser = typeof window !== 'undefined';
const EVALUATION_URL = isBrowser 
  ? '/evaluation-service/logs' 
  : 'http://4.224.186.213/evaluation-service/logs';

export const setLogToken = (token) => {
  API_TOKEN = token;
};

export const Log = async (stack, level, pkg, message) => {
  if (!API_TOKEN) {
    console.warn('[Logging Middleware] Cannot send log. Token is missing.');
    return;
  }

  try {
    const response = await fetch(EVALUATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify({
        stack,
        level,
        package: pkg,
        message
      })
    });

    if (!response.ok) {
      console.error(`[Logging Middleware] Failed to dispatch log. Status: ${response.status}`);
    } else {
      const data = await response.json();
      // Optional: console.log(`[Logging Middleware] successfully logged:`, data);
    }
  } catch (error) {
    console.error(`[Logging Middleware] Network error during log dispatch: ${error.message}`);
  }
};
