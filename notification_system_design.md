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
