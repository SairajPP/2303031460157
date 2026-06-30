// priority_inbox.js
// Script to fetch and sort the top priority notifications for the campus feed.
// TODO: Consider migrating this sorting logic to the DB layer later for better performance if volume grows.

import fetch from 'node-fetch';

const WEIGHTS = {
  'Placement': 3,
  'Result': 2,
  'Event': 1
};

async function getTopNotifications(n = 10) {
  try {
    const url = 'http://4.224.186.213/evaluation-service/notifications';
    
    // In a real environment, this token would be injected securely via env variables
    const token = process.env.API_TOKEN || 'test-token'; 
    
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`API returned status ${response.status} - ${await response.text()}`);
    }
    
    const data = await response.json();
    let notifications = data.notifications || [];
    
    // Sort primarily by weight (highest first)
    // If weights are equal, fallback to recency (newest first)
    notifications.sort((a, b) => {
        const weightA = WEIGHTS[a.Type] || 0;
        const weightB = WEIGHTS[b.Type] || 0;
        
        if (weightA !== weightB) {
            return weightB - weightA; // Higher weight comes first
        }
        
        const timeA = new Date(a.Timestamp).getTime();
        const timeB = new Date(b.Timestamp).getTime();
        return timeB - timeA; // More recent time comes first
    });
    
    // slice the top N items for the inbox view
    const topN = notifications.slice(0, n);
    
    // just some nice console formatting for debugging
    console.log('\n=== TOP 10 PRIORITY NOTIFICATIONS ===');
    let output = `=== TOP ${n} PRIORITY NOTIFICATIONS ===\n`;
    topN.forEach((notif, index) => {
        output += `${index + 1}. [${notif.Type}] ${notif.Message} (${notif.Timestamp})\n`;
    });
    
    console.log(output);
    return topN;
  } catch (error) {
    console.error("Error fetching notifications:\n", error.message);
  }
}

getTopNotifications(10);
