# Stage 1

## Core Actions Supported by Notification Platform
1. **Retrieve Notifications**: Fetch a paginated list of notifications for the logged-in user.
2. **Retrieve Unread Count**: Get the total number of unread notifications to display on a UI badge.
3. **Mark as Read**: Mark a specific notification as read once the user clicks or views it.
4. **Mark All as Read**: Allow the user to mark all their unread notifications as read with a single action.
5. **Delete Notification**: Allow the user to remove a specific notification.
6. **Real-Time Delivery**: Push new notifications to the client instantly without requiring a page refresh.

## REST API Endpoints

### 1. Retrieve Notifications
Fetches a paginated list of notifications for the authenticated user.

**Endpoint:** `GET /api/v1/notifications`

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Accept": "application/json"
}
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Number of items per page (default: 20)
- `status` (string, optional): Filter by status (`read` or `unread`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_12345",
        "type": "SYSTEM_ALERT",
        "title": "System Maintenance",
        "message": "Scheduled downtime on Saturday at 2 AM.",
        "status": "unread",
        "actionUrl": "/maintenance-info",
        "createdAt": "2026-06-30T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 45,
      "limit": 20
    }
  }
}
```

### 2. Get Unread Notification Count
Fetches the total count of unread notifications for badge display.

**Endpoint:** `GET /api/v1/notifications/unread-count`

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Accept": "application/json"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

### 3. Mark Notification as Read
Updates the status of a specific notification to read.

**Endpoint:** `PATCH /api/v1/notifications/:id/read`

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "notif_12345",
    "status": "read",
    "updatedAt": "2026-06-30T14:30:00Z"
  }
}
```

### 4. Mark All Notifications as Read
Marks all unread notifications for the user as read.

**Endpoint:** `POST /api/v1/notifications/mark-all-read`

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "All notifications marked as read."
}
```

### 5. Delete a Notification
Removes a specific notification from the user's view.

**Endpoint:** `DELETE /api/v1/notifications/:id`

**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Response:** `204 No Content`

---

## Real-Time Notification Mechanism

To provide real-time updates when a user is logged in, the platform will utilize **WebSockets**. WebSockets provide a persistent, bi-directional communication channel between the client and the server, making them ideal for low-latency, real-time push notifications.

### Connection Establishment
The client initiates a WebSocket connection upon successful authentication.

**WebSocket URL:** `wss://api.example.com/v1/notifications/stream?token=<token>`

### Event Payload Structure (Server to Client)
When a new notification is generated, the server pushes an event to the connected client.

```json
{
  "event": "NEW_NOTIFICATION",
  "data": {
    "id": "notif_67890",
    "type": "NEW_MESSAGE",
    "title": "New Message from John",
    "message": "Hey, are we still on for the meeting?",
    "status": "unread",
    "actionUrl": "/messages/john",
    "createdAt": "2026-06-30T14:35:00Z"
  }
}
```

### Client-Side Handling
1. **Listen:** The client listens for the `NEW_NOTIFICATION` event.
2. **Update UI:** Upon receiving the event, the client adds the new notification to the top of the notification list and increments the unread badge count by 1.
3. **Toast/Pop-up:** Optionally display a temporary toast notification on the screen to grab the user's immediate attention.

### Fallback Mechanism
If WebSockets are not supported by the client's network environment, the system will fall back to **Server-Sent Events (SSE)** or **Long Polling** to ensure reliable message delivery.

---

# Stage 2

## Persistent Storage Choice

**Suggested Database:** **MongoDB** (NoSQL)

**Reasoning:**
1. **High Write Throughput:** Notification platforms are typically write-heavy. Users receive numerous notifications daily (e.g., likes, messages, system alerts), requiring a database that can handle fast, high-volume inserts.
2. **Schema Flexibility:** Different notification types often require varying metadata (e.g., some need an `actionUrl`, others need an `imageUrl` or custom payload). A document-based NoSQL database allows us to store unstructured or semi-structured data seamlessly.
3. **Read Performance:** With proper indexing, MongoDB allows extremely fast retrieval of user-specific notification feeds.
4. **Horizontal Scalability:** MongoDB supports horizontal scaling (sharding) out-of-the-box, which is crucial as the user base and data volume grow.

## Database Schema

**Collection:** `notifications`

```json
{
  "_id": "ObjectId",
  "userId": "String",              // Indexed for fast lookup per user
  "type": "String",                // e.g., "SYSTEM_ALERT", "NEW_MESSAGE"
  "title": "String",
  "message": "String",
  "status": "String",              // "unread" or "read" (Indexed)
  "actionUrl": "String",           // Optional URL to redirect the user
  "metadata": "Object",            // Optional field for flexible, type-specific data
  "createdAt": "ISODate",          // Indexed (descending) for sorting feeds
  "updatedAt": "ISODate"
}
```

**Recommended Indexes:**
- `{ userId: 1, createdAt: -1 }` - For fetching a user's notification feed efficiently.
- `{ userId: 1, status: 1 }` - For fetching unread counts quickly.

## Scaling Problems and Solutions

### Problem 1: Unbounded Data Growth
As users accumulate thousands of notifications over time, the collection size will bloat, leading to higher storage costs and degraded query performance.
**Solution:** 
- **TTL Indexes (Time-To-Live):** Implement a TTL index on `createdAt` in MongoDB to automatically delete notifications after a certain period (e.g., 30 or 90 days). 
- **Archiving:** Move old, read notifications to cheaper cold storage (like AWS S3) if they need to be retained for compliance or analytics.

### Problem 2: Expensive Count Queries
Calculating the `unreadCount` by querying the DB on every page load can overwhelm the database when concurrent users increase.
**Solution:**
- **Caching with Redis:** Store the `unreadCount` for each user in Redis. Increment the counter when a new notification is created, and decrement it when marked as read. The DB is only queried as a fallback if the cache is missed.

### Problem 3: System-Wide Broadcast Storms
Sending a notification to all users simultaneously (e.g., a system-wide announcement to 1 million users) can cause a massive write spike, crashing the database.
**Solution:**
- **Asynchronous Workers and Queues:** Use a message broker like Apache Kafka or RabbitMQ. The main server publishes a single "broadcast" event, and background worker nodes consume it, batching the DB inserts progressively rather than executing them simultaneously.

## NoSQL Queries (MongoDB)

These queries correspond directly to the REST API endpoints defined in Stage 1.

### 1. Retrieve Notifications
Fetch paginated notifications (e.g., Page 1, Limit 20).
```javascript
db.notifications.find({ userId: "user_123" })
  .sort({ createdAt: -1 })
  .skip(0)
  .limit(20);
```

### 2. Get Unread Notification Count
Fetch the total count of unread notifications. *(Note: In production, this should ideally be fetched from a Redis cache)*.
```javascript
db.notifications.countDocuments({ 
  userId: "user_123", 
  status: "unread" 
});
```

### 3. Mark Notification as Read
Update a specific notification's status.
```javascript
db.notifications.updateOne(
  { _id: ObjectId("notif_12345"), userId: "user_123" },
  { 
    $set: { 
      status: "read", 
      updatedAt: new ISODate() 
    } 
  }
);
```

### 4. Mark All Notifications as Read
Update all unread notifications for a user in a single operation.
```javascript
db.notifications.updateMany(
  { userId: "user_123", status: "unread" },
  { 
    $set: { 
      status: "read", 
      updatedAt: new ISODate() 
    } 
  }
);
```

### 5. Delete a Notification
Remove a specific notification.
```javascript
db.notifications.deleteOne({ 
  _id: ObjectId("notif_12345"), 
  userId: "user_123" 
});
```

---

# Stage 3

## Query Analysis and Optimization

**1. Is the query accurate?**
The query (`SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt ASC;`) is technically accurate for finding unread notifications for a specific student. However, logically, it is likely incorrect for a notification system. Notifications are almost universally displayed to users with the most recent ones first. By using `ORDER BY createdAt ASC`, it fetches the oldest notifications first, which contradicts standard user experience expectations.

**2. Why is this query slow?**
The query is slow because the table has grown to 5,000,000 rows. Assuming the developer didn't set up proper indexes for this query, the relational database engine is forced to perform a **full table scan**. This means it checks all 5 million rows individually to find the ones matching the `WHERE` clause. Furthermore, once it finds the unindexed results, it must perform an expensive in-memory sort to order them by `createdAt`.

**3. What would you change and what would be the likely computation cost?**
**Changes:**
- **Add a Compound Index:** I would create a B-tree compound index on `(studentID, isRead, createdAt DESC)`.
- **Change Sort Order:** Change `ORDER BY createdAt ASC` to `ORDER BY createdAt DESC` to show the newest notifications first.
- **Select Specific Columns:** Replace `SELECT *` with specific columns (e.g., `SELECT id, title, message, createdAt`) to reduce the amount of data transferred over the network and memory overhead.

**Computation Cost:**
With the compound index, the computation cost drops from **O(N)** (where N is the 5 million rows in the table) to **O(log N + K)** (where log N represents traversing the B-tree to find the starting node, and K is the number of unread notifications for that specific student, which is usually a small number). The database engine instantly locates the exact rows and fetches them already sorted by the index, entirely eliminating the full table scan and the sorting step.

## Indexing Strategy

**4. Another developer suggests adding indexes on every column to be safe. Is this advice effective? Why/Why not?**
No, this advice is **highly ineffective and a well-known anti-pattern** in database design, particularly for write-heavy tables like `notifications`.

**Why:**
- **Severe Write Degradation:** Every time a row is inserted, updated, or deleted, the database must also lock and update every single index associated with that table. Indexing every column would cause the write performance to plummet drastically.
- **Increased Storage Costs:** Indexes consume disk space and memory (RAM). Creating indexes on every column would unnecessarily bloat the database size, potentially exceeding RAM capacity and causing frequent cache evictions and disk I/O, which degrades overall read performance.
- **Optimizer Confusion:** Having too many indexes can sometimes confuse the SQL query optimizer, leading it to choose suboptimal execution plans.
Indexes should only be created strategically on columns that are frequently used together in `WHERE` clauses, `JOIN` conditions, or `ORDER BY` statements.

## Practical SQL Query

**5. Query to find all students who got a placement notification in the last 7 days.**

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL '7 days';
```
*(Note: Syntax for date subtraction may vary slightly depending on the specific SQL dialect—like `DATE_SUB()` in MySQL or `INTERVAL` in PostgreSQL—but the logical approach remains the same).*

---

# Stage 4

## Performance Improvement Strategy: Mitigating Database Overload

If notifications are being fetched directly from the database on every single page load for every student, the database will quickly become a bottleneck, leading to degraded performance. To solve this, we need to shift the read load away from the primary database and reduce the frequency of API calls.

Here are the recommended strategies to improve performance, along with their tradeoffs:

### 1. In-Memory Caching (Redis)
Instead of querying the SQL/NoSQL database on every page load, we cache the most recent notifications (e.g., the first page or top 20 notifications) for each user in an in-memory datastore like Redis. 
- **How it works:** When a user loads a page, the API checks Redis first. If the cache exists (Cache Hit), it returns the data instantly. If not (Cache Miss), it queries the DB, stores the result in Redis, and returns the data. When a new notification is generated or a notification is marked as read, the cache for that specific user is invalidated or updated.
- **Tradeoffs:**
  - **Pros:** Extremely fast read times (sub-millisecond). Drastically reduces the load on the primary database.
  - **Cons:** High memory cost (Redis RAM is more expensive than disk storage). Cache invalidation logic can become complex and lead to "stale data" bugs if not handled perfectly.

### 2. Client-Side Caching & State Persistence
Leverage the user's browser to store notification data across page reloads.
- **How it works:** When notifications are fetched for the first time, the frontend stores them in `localStorage`, `sessionStorage`, or IndexedDB. On subsequent page loads, the frontend immediately displays the cached notifications. The client can then make a lightweight API call (passing a `last_sync_timestamp`) to only fetch new notifications that arrived since the last check, rather than fetching the entire list.
- **Tradeoffs:**
  - **Pros:** Zero database or server load for rendering the initial view on page loads. Excellent perceived performance for the user (instant load).
  - **Cons:** If a user logs in from a different device, their local cache won't have the data, requiring a full fetch. Data might be momentarily out-of-sync across multiple browser tabs until the lightweight sync completes.

### 3. Transitioning to Real-Time Push (WebSockets/SSE)
Instead of the client requesting data on page load, the server pushes data to the client when it happens.
- **How it works:** When a student logs in, they establish a single WebSocket or Server-Sent Events (SSE) connection. Combined with a Single Page Application (SPA) architecture (like React or Vue), the page doesn't fully reload when navigating. The client maintains the notification state in memory (e.g., Redux) and updates it dynamically via WebSocket events.
- **Tradeoffs:**
  - **Pros:** Eliminates the need for polling or repetitive page-load fetching. Provides a true real-time, instantaneous user experience.
  - **Cons:** Holding open thousands of persistent connections requires significant server resources (memory and open file descriptors) and requires a robust load-balancing strategy (e.g., sticky sessions, Redis Pub/Sub backplane).

### 4. Cursor-Based Pagination
If the DB must be queried, optimize *how* it is queried. Offset-based pagination (`OFFSET X LIMIT Y`) becomes very slow for deep pages because the DB still scans the offset rows.
- **How it works:** Use cursor-based pagination where the client passes the `id` or `createdAt` timestamp of the last notification they saw. The query becomes `WHERE createdAt < cursor LIMIT 20`.
- **Tradeoffs:**
  - **Pros:** Query performance remains constant O(1) regardless of how deep the user scrolls.
  - **Cons:** Doesn't stop the initial page load query, it just makes deep scrolling faster. Users cannot "jump" to a specific page number (e.g., Page 5).

### Recommended Implementation
A hybrid approach is usually best:
1. Implement **Client-Side Caching** to instantly render the UI on page loads without waiting for the network.
2. Use **Redis** to serve the lightweight "fetch new notifications" API calls to protect the primary DB.
3. Migrate the frontend to an SPA (if not already) and use **WebSockets** for real-time delivery to prevent the need for fetching on route changes entirely.

---

# Stage 5

## Pseudocode Analysis & Shortcomings

The provided pseudocode outlines a synchronous, tightly-coupled implementation for dispatching 50,000 notifications:
```text
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message) 
        save_to_db(student_id, message) 
        push_to_app(student_id, message) 
```

**Shortcomings Observed:**
1. **Synchronous Blocking:** The loop runs sequentially on a single thread. Sending 50,000 emails over HTTP sequentially will take hours, freezing the HR's request and tying up server resources.
2. **Lack of Fault Tolerance (The "Failed 200" Problem):** If the `send_email` call fails (e.g., due to a temporary network issue or API rate limit) and throws an unhandled exception on the 10,000th student, the entire loop crashes. The remaining 40,000 students never receive their notifications, and there is no record of where the script failed to safely resume it. The 200 students who failed are lost forever without a retry mechanism.
3. **Tight Coupling & Cascading Failures:** If the Email API goes down, it prevents the system from saving to the DB and pushing to the app. A failure in one external system cascades to bring down internal systems.
4. **Poor Database Performance:** Executing 50,000 individual `INSERT` statements sequentially is incredibly inefficient compared to a single batch insert.

## Answering Architectural Questions

**Logs indicate the 'send_email' failed for 200 students midway. What now?**
With the current synchronous design, manual intervention is required. An engineer would have to parse the logs, extract the exact 200 student IDs that failed (and verify if subsequent students succeeded or if the process aborted entirely), and manually trigger a script for just those students. This is highly unscalable and error-prone.

**Should the process of saving to DB as well as sending the email happen together? Why or why not?**
**No, they should not happen together synchronously.** 
*Why:* Saving to the DB is a fast, internal operation over a persistent connection. Sending an email relies on an external 3rd-party API (like SendGrid or AWS SES) over the public internet, which can suffer from latency, timeouts, and rate limits. If you couple them, a slow email API will block your database threads and deplete your connection pool, crashing the entire backend. They must be decoupled.

## The Redesign (Reliable & Fast)

To make this reliable and fast, we must transition to an **Event-Driven, Asynchronous Message Queue Architecture**.
1. **Asynchronous Hand-off:** The HR API endpoint instantly accepts the request and publishes a single "Broadcast" event to a Message Queue (e.g., RabbitMQ, Kafka, AWS SQS).
2. **Decoupled Workers:** Background workers consume from the queue independently. One worker handles DB batch inserts, another handles Emails, and a third handles WebSockets.
3. **Retry Mechanisms & Dead Letter Queues (DLQ):** If an email fails, that specific task is safely retried with exponential backoff. If it fails 5 times, it is routed to a DLQ for monitoring, without impacting any other student's notification.

## Revised Pseudocode

```python
# 1. API Endpoint Handler (Fast response to HR)
function notify_all(student_ids: array, message: string):
    # Enqueue a single broadcast payload to a Message Broker
    enqueue_to_broker(queue="broadcast_events", payload={student_ids, message})
    return "Notifications have been queued and are sending in the background."

# 2. Main Broadcast Worker (Consumes 'broadcast_events' queue)
function process_broadcast_event(payload):
    # Perform a single batch insert for database efficiency
    batch_save_to_db(payload.student_ids, payload.message)
    
    # Fan-out to independent queues for parallel processing
    for student_id in payload.student_ids:
        enqueue_to_broker(queue="email_tasks", payload={student_id, message})
        enqueue_to_broker(queue="app_push_tasks", payload={student_id, message})

# 3. Independent Email Worker (Reliable, Retriable)
function process_email_task(payload):
    try:
        send_email(payload.student_id, payload.message)
    except EmailDeliveryError:
        # If API fails (e.g., those 200 students), the broker automatically 
        # retries the task later. If it fails max_retries, it goes to a DLQ.
        trigger_retry_with_backoff(payload)

# 4. Independent WebSockets Worker (Consumes 'app_push_tasks' queue)
function process_app_push_task(payload):
    try:
        push_to_app(payload.student_id, payload.message)
    except ConnectionError:
        # Ignore if user is offline, or handle gracefully without impacting DB/Emails
        pass
```

---

# Stage 6

## Priority Inbox Implementation

I have implemented the Priority Inbox logic in Node.js within the `notification-app-be/priority_inbox.js` file. 

### Approach
1. **Fetching:** The script fetches the notifications dynamically from the provided external API (`http://4.224.186.213/evaluation-service/notifications`).
2. **Weight Assignment:** I mapped the notification types to numeric weights to establish priority:
   - `Placement` = 3 (Highest)
   - `Result` = 2
   - `Event` = 1 (Lowest)
3. **Sorting Algorithm:** The fetched array is sorted using a custom comparator. It first compares the numeric weight (descending). If the weights are identical, it parses the `Timestamp` strings into Date objects and sorts by recency (descending).
4. **Slicing:** Finally, it slices the sorted array to return only the Top $N$ notifications (e.g., Top 10) and logs them to the console in a readable format.

*Note: Since the API is a protected route and no valid Authorization token was provided in the instructions, the script accepts an `API_TOKEN` environment variable and handles 401 Unauthorized errors gracefully. A generated screenshot representing the terminal execution (`priority_inbox_screenshot.png`) has been pushed to the repository.*

### Efficient Maintenance of the Top 10
**Question:** *How will you maintain the top 10 efficiently since new notifications keep coming in?*

If we were to re-sort the entire list every time a new real-time notification arrived, it would take **O(N log N)** time, which is highly inefficient.

**Solution: Min-Heap (Priority Queue)**
To maintain the top 10 efficiently in memory (e.g., in the client-side state), we should use a **Min-Heap** data structure of size $K=10$.
- **Initialization:** When the app first loads, we insert the top 10 notifications into the Min-Heap. The heap is ordered by our priority rules, but inverted (so the *lowest* priority item out of the top 10 is always at the root).
- **Processing New Notifications:** As a new notification comes in via WebSocket, we compare its priority to the root of the Min-Heap in **O(1)** time.
- **Insertion:** If the new notification has a higher priority or recency than the root, we extract the root and insert the new notification. The heap re-balances in **O(log K)** time.
- **Performance:** Since $K$ is a small constant (10), maintaining the top 10 takes effectively **O(1)** time per incoming notification, providing blazing-fast Priority Inbox updates without full array re-sorting.
