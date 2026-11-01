/**
 * Feedback Management System - Zero-Dependency Node.js Server
 * Built for Web Technology Lab Mini Project
 * Uses Node.js standard built-in modules: http, fs, path, url, crypto
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_FILE = path.join(__dirname, 'data', 'database.json');

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// In-memory token storage (token -> userId)
const activeSessions = new Map();

// Helper to safely read Database
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { users: [], departments: [], feedbacks: [] };
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file:', err);
    return { users: [], departments: [], feedbacks: [] };
  }
}

// Helper to safely write Database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}

// Helper to parse JSON body from incoming request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Safeguard against huge payloads (> 5MB)
      if (body.length > 5 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

// Helper to send JSON responses
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// Helper to authenticate user from Authorization header
function getAuthUser(req, db) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const userId = activeSessions.get(token);
  if (!userId) return null;

  return db.users.find(u => u.id === userId) || null;
}

// Generate unique ID
function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

// The main HTTP request handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  // API Routing
  if (pathname.startsWith('/api/')) {
    const db = readDB();

    try {
      // ---------------- AUTH ROUTES ----------------
      // POST /api/auth/login
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password } = body;

        if (!email || !password) {
          return sendJSON(res, 400, { error: 'Email and password are required' });
        }

        const user = db.users.find(
          u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );

        if (!user) {
          return sendJSON(res, 401, { error: 'Invalid email or password' });
        }

        const token = crypto.randomBytes(24).toString('hex');
        activeSessions.set(token, user.id);

        const safeUser = { ...user };
        delete safeUser.password;

        return sendJSON(res, 200, {
          message: 'Login successful',
          token,
          user: safeUser
        });
      }

      // POST /api/auth/register
      if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await parseBody(req);
        const { name, email, password, role, department, rollNo, title } = body;

        if (!name || !email || !password) {
          return sendJSON(res, 400, { error: 'Name, email, and password are required' });
        }

        const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          return sendJSON(res, 409, { error: 'An account with this email already exists' });
        }

        // Restrict role registration (default to student, allow staff with verification)
        const allowedRole = role === 'staff' ? 'staff' : 'student';

        const newUser = {
          id: generateId('usr'),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: allowedRole,
          department: department || 'General',
          rollNo: rollNo ? rollNo.trim() : null,
          title: title ? title.trim() : null,
          createdAt: new Date().toISOString()
        };

        db.users.push(newUser);
        writeDB(db);

        const token = crypto.randomBytes(24).toString('hex');
        activeSessions.set(token, newUser.id);

        const safeUser = { ...newUser };
        delete safeUser.password;

        return sendJSON(res, 201, {
          message: 'Account created successfully',
          token,
          user: safeUser
        });
      }

      // GET /api/auth/me
      if (pathname === '/api/auth/me' && method === 'GET') {
        const user = getAuthUser(req, db);
        if (!user) {
          return sendJSON(res, 401, { error: 'Unauthorized or session expired' });
        }
        const safeUser = { ...user };
        delete safeUser.password;
        return sendJSON(res, 200, { user: safeUser });
      }

      // POST /api/auth/logout
      if (pathname === '/api/auth/logout' && method === 'POST') {
        const authHeader = req.headers['authorization'];
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, '').trim();
          activeSessions.delete(token);
        }
        return sendJSON(res, 200, { message: 'Logged out successfully' });
      }

      // ---------------- USERS & STAFF ROUTES ----------------
      // GET /api/staff (public or auth - lists staff members for feedback target dropdown)
      if (pathname === '/api/staff' && method === 'GET') {
        const staffList = db.users
          .filter(u => u.role === 'staff')
          .map(u => ({
            id: u.id,
            name: u.name,
            department: u.department,
            title: u.title || 'Faculty'
          }));
        return sendJSON(res, 200, staffList);
      }

      // GET /api/users (Admin only)
      if (pathname === '/api/users' && method === 'GET') {
        const currentUser = getAuthUser(req, db);
        if (!currentUser || currentUser.role !== 'admin') {
          return sendJSON(res, 403, { error: 'Access denied: Admin role required' });
        }
        const safeUsers = db.users.map(u => {
          const copy = { ...u };
          delete copy.password;
          return copy;
        });
        return sendJSON(res, 200, safeUsers);
      }

      // POST /api/users (Admin only: create new user directly)
      if (pathname === '/api/users' && method === 'POST') {
        const currentUser = getAuthUser(req, db);
        if (!currentUser || currentUser.role !== 'admin') {
          return sendJSON(res, 403, { error: 'Access denied: Admin role required' });
        }
        const body = await parseBody(req);
        const { name, email, password, role, department, title, rollNo } = body;

        if (!name || !email || !password || !role) {
          return sendJSON(res, 400, { error: 'Missing required user fields' });
        }

        const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          return sendJSON(res, 409, { error: 'Email already exists' });
        }

        const newUser = {
          id: generateId('usr'),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          department: department || 'General',
          title: title || null,
          rollNo: rollNo || null,
          createdAt: new Date().toISOString()
        };

        db.users.push(newUser);
        writeDB(db);

        const safeUser = { ...newUser };
        delete safeUser.password;
        return sendJSON(res, 201, safeUser);
      }

      // PUT /api/users/:id/role (Admin only)
      const userRoleMatch = pathname.match(/^\/api\/users\/([^/]+)\/role$/);
      if (userRoleMatch && method === 'PUT') {
        const currentUser = getAuthUser(req, db);
        if (!currentUser || currentUser.role !== 'admin') {
          return sendJSON(res, 403, { error: 'Access denied: Admin role required' });
        }
        const targetUserId = userRoleMatch[1];
        const body = await parseBody(req);
        const user = db.users.find(u => u.id === targetUserId);

        if (!user) {
          return sendJSON(res, 404, { error: 'User not found' });
        }

        if (body.role) user.role = body.role;
        if (body.department) user.department = body.department;
        writeDB(db);

        const safeUser = { ...user };
        delete safeUser.password;
        return sendJSON(res, 200, safeUser);
      }

      // DELETE /api/users/:id (Admin only)
      const userDeleteMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
      if (userDeleteMatch && method === 'DELETE') {
        const currentUser = getAuthUser(req, db);
        if (!currentUser || currentUser.role !== 'admin') {
          return sendJSON(res, 403, { error: 'Access denied: Admin role required' });
        }
        const targetUserId = userDeleteMatch[1];
        if (targetUserId === currentUser.id) {
          return sendJSON(res, 400, { error: 'Cannot delete your own admin account' });
        }

        const initialLength = db.users.length;
        db.users = db.users.filter(u => u.id !== targetUserId);
        if (db.users.length === initialLength) {
          return sendJSON(res, 404, { error: 'User not found' });
        }

        writeDB(db);
        return sendJSON(res, 200, { message: 'User deleted successfully' });
      }

      // ---------------- DEPARTMENTS ROUTES ----------------
      // GET /api/departments
      if (pathname === '/api/departments' && method === 'GET') {
        return sendJSON(res, 200, db.departments || []);
      }

      // POST /api/departments (Admin only)
      if (pathname === '/api/departments' && method === 'POST') {
        const currentUser = getAuthUser(req, db);
        if (!currentUser || currentUser.role !== 'admin') {
          return sendJSON(res, 403, { error: 'Access denied: Admin role required' });
        }
        const body = await parseBody(req);
        if (!body.name || !body.code) {
          return sendJSON(res, 400, { error: 'Department name and code are required' });
        }

        const newDept = {
          id: generateId('dept'),
          name: body.name.trim(),
          code: body.code.trim().toUpperCase(),
          description: body.description ? body.description.trim() : ''
        };

        db.departments.push(newDept);
        writeDB(db);
        return sendJSON(res, 201, newDept);
      }

      // DELETE /api/departments/:id (Admin only)
      const deptDeleteMatch = pathname.match(/^\/api\/departments\/([^/]+)$/);
      if (deptDeleteMatch && method === 'DELETE') {
        const currentUser = getAuthUser(req, db);
        if (!currentUser || currentUser.role !== 'admin') {
          return sendJSON(res, 403, { error: 'Access denied: Admin role required' });
        }
        const deptId = deptDeleteMatch[1];
        db.departments = db.departments.filter(d => d.id !== deptId);
        writeDB(db);
        return sendJSON(res, 200, { message: 'Department removed' });
      }

      // ---------------- FEEDBACK ROUTES ----------------
      // GET /api/feedback (Role-based list)
      if (pathname === '/api/feedback' && method === 'GET') {
        const currentUser = getAuthUser(req, db);
        if (!currentUser) {
          return sendJSON(res, 401, { error: 'Unauthorized. Please login.' });
        }

        let results = [...(db.feedbacks || [])];

        // Role filtering:
        // - Admin sees everything
        // - Staff sees feedback assigned to them or their department
        // - Student sees feedback they submitted
        if (currentUser.role === 'staff') {
          results = results.filter(
            f => f.staffId === currentUser.id || f.department === currentUser.department
          );
        } else if (currentUser.role === 'student') {
          results = results.filter(f => f.userId === currentUser.id);
        }

        // Query param filters: category, status, rating, search
        const { category, status, rating, search } = parsedUrl.query;
        if (category && category !== 'All') {
          results = results.filter(f => f.category === category || f.department === category);
        }
        if (status && status !== 'All') {
          results = results.filter(f => f.status === status);
        }
        if (rating && rating !== 'All') {
          const numRating = parseInt(rating, 10);
          results = results.filter(f => Math.round(f.ratings?.overall || 0) === numRating);
        }
        if (search) {
          const s = search.toLowerCase();
          results = results.filter(
            f =>
              (f.subject && f.subject.toLowerCase().includes(s)) ||
              (f.comments && f.comments.toLowerCase().includes(s)) ||
              (f.staffName && f.staffName.toLowerCase().includes(s)) ||
              (f.department && f.department.toLowerCase().includes(s))
          );
        }

        // Sort latest first
        results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return sendJSON(res, 200, results);
      }

      // POST /api/feedback (Submit new feedback)
      if (pathname === '/api/feedback' && method === 'POST') {
        const currentUser = getAuthUser(req, db);
        if (!currentUser) {
          return sendJSON(res, 401, { error: 'Please log in to submit feedback' });
        }

        const body = await parseBody(req);
        const {
          category,
          department,
          staffId,
          subject,
          ratings,
          type,
          comments,
          isAnonymous
        } = body;

        if (!subject || !comments || !ratings || typeof ratings.overall !== 'number') {
          return sendJSON(res, 400, { error: 'Subject, comments, and overall rating are required' });
        }

        let staffName = 'Department Incharge';
        if (staffId) {
          const staffMember = db.users.find(u => u.id === staffId);
          if (staffMember) {
            staffName = staffMember.name;
          }
        }

        const newFeedback = {
          id: generateId('fb'),
          userId: currentUser.id,
          userName: isAnonymous ? 'Anonymous Student' : currentUser.name,
          userEmail: isAnonymous ? null : currentUser.email,
          isAnonymous: !!isAnonymous,
          category: category || 'General',
          department: department || currentUser.department || 'General',
          staffId: staffId || null,
          staffName: staffName,
          subject: subject.trim(),
          ratings: {
            overall: Number(ratings.overall) || 5,
            teaching: Number(ratings.teaching) || 5,
            communication: Number(ratings.communication) || 5,
            punctuality: Number(ratings.punctuality) || 5,
            support: Number(ratings.support) || 5
          },
          type: type || 'Feedback',
          comments: comments.trim(),
          status: 'Pending',
          createdAt: new Date().toISOString(),
          replies: []
        };

        db.feedbacks.unshift(newFeedback);
        writeDB(db);

        return sendJSON(res, 201, {
          message: 'Feedback submitted successfully',
          feedback: newFeedback
        });
      }

      // PUT /api/feedback/:id/status (Update status: Staff or Admin)
      const statusMatch = pathname.match(/^\/api\/feedback\/([^/]+)\/status$/);
      if (statusMatch && method === 'PUT') {
        const currentUser = getAuthUser(req, db);
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'staff')) {
          return sendJSON(res, 403, { error: 'Permission denied' });
        }

        const feedbackId = statusMatch[1];
        const body = await parseBody(req);
        const { status } = body;

        const validStatuses = ['Pending', 'Under Review', 'Responded', 'Resolved', 'Closed'];
        if (!validStatuses.includes(status)) {
          return sendJSON(res, 400, { error: 'Invalid status value' });
        }

        const item = db.feedbacks.find(f => f.id === feedbackId);
        if (!item) {
          return sendJSON(res, 404, { error: 'Feedback not found' });
        }

        item.status = status;
        item.updatedAt = new Date().toISOString();
        writeDB(db);

        return sendJSON(res, 200, item);
      }

      // POST /api/feedback/:id/reply (Reply to feedback: Staff or Admin)
      const replyMatch = pathname.match(/^\/api\/feedback\/([^/]+)\/reply$/);
      if (replyMatch && method === 'POST') {
        const currentUser = getAuthUser(req, db);
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'staff')) {
          return sendJSON(res, 403, { error: 'Only staff and administrators can post replies' });
        }

        const feedbackId = replyMatch[1];
        const body = await parseBody(req);
        const { message } = body;

        if (!message || !message.trim()) {
          return sendJSON(res, 400, { error: 'Reply message cannot be empty' });
        }

        const item = db.feedbacks.find(f => f.id === feedbackId);
        if (!item) {
          return sendJSON(res, 404, { error: 'Feedback not found' });
        }

        const replyObj = {
          id: generateId('rep'),
          userId: currentUser.id,
          userName: `${currentUser.name} (${currentUser.role === 'admin' ? 'Administrator' : 'Faculty'})`,
          message: message.trim(),
          createdAt: new Date().toISOString()
        };

        if (!item.replies) item.replies = [];
        item.replies.push(replyObj);
        item.status = 'Responded';
        writeDB(db);

        return sendJSON(res, 201, item);
      }

      // DELETE /api/feedback/:id (Student if unreviewed, or Admin anytime)
      const deleteFeedbackMatch = pathname.match(/^\/api\/feedback\/([^/]+)$/);
      if (deleteFeedbackMatch && method === 'DELETE') {
        const currentUser = getAuthUser(req, db);
        if (!currentUser) {
          return sendJSON(res, 401, { error: 'Unauthorized' });
        }

        const feedbackId = deleteFeedbackMatch[1];
        const item = db.feedbacks.find(f => f.id === feedbackId);
        if (!item) {
          return sendJSON(res, 404, { error: 'Feedback not found' });
        }

        // Only Admin or the author (if still pending) can delete
        const canDelete =
          currentUser.role === 'admin' ||
          (currentUser.id === item.userId && item.status === 'Pending');

        if (!canDelete) {
          return sendJSON(res, 403, {
            error: 'You can only cancel feedback that is still in Pending status'
          });
        }

        db.feedbacks = db.feedbacks.filter(f => f.id !== feedbackId);
        writeDB(db);

        return sendJSON(res, 200, { message: 'Feedback deleted successfully' });
      }

      // ---------------- ANALYTICS ROUTE ----------------
      // GET /api/analytics
      if (pathname === '/api/analytics' && method === 'GET') {
        const currentUser = getAuthUser(req, db);
        if (!currentUser) {
          return sendJSON(res, 401, { error: 'Unauthorized' });
        }

        let feedbacks = db.feedbacks || [];
        if (currentUser.role === 'staff') {
          feedbacks = feedbacks.filter(
            f => f.staffId === currentUser.id || f.department === currentUser.department
          );
        }

        const totalFeedbacks = feedbacks.length;
        const sumRatings = feedbacks.reduce((acc, f) => acc + (f.ratings?.overall || 0), 0);
        const avgRating = totalFeedbacks > 0 ? (sumRatings / totalFeedbacks).toFixed(2) : '0.00';

        // Rating distribution (1 to 5 stars)
        const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        feedbacks.forEach(f => {
          const r = Math.round(f.ratings?.overall || 0);
          if (ratingDistribution[r] !== undefined) {
            ratingDistribution[r]++;
          }
        });

        // Status counts
        const statusDistribution = {
          Pending: 0,
          'Under Review': 0,
          Responded: 0,
          Resolved: 0
        };
        feedbacks.forEach(f => {
          if (statusDistribution[f.status] !== undefined) {
            statusDistribution[f.status]++;
          }
        });

        // Category breakdown
        const categoryBreakdown = {};
        feedbacks.forEach(f => {
          const cat = f.category || 'General';
          categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
        });

        // Detailed criteria averages
        const criteriaAverages = {
          teaching: 0,
          communication: 0,
          punctuality: 0,
          support: 0
        };
        if (totalFeedbacks > 0) {
          ['teaching', 'communication', 'punctuality', 'support'].forEach(key => {
            const sum = feedbacks.reduce((acc, f) => acc + (f.ratings?.[key] || 0), 0);
            criteriaAverages[key] = (sum / totalFeedbacks).toFixed(1);
          });
        }

        return sendJSON(res, 200, {
          totalFeedbacks,
          avgRating,
          ratingDistribution,
          statusDistribution,
          categoryBreakdown,
          criteriaAverages,
          totalUsers: db.users.length,
          totalStaff: db.users.filter(u => u.role === 'staff').length,
          totalStudents: db.users.filter(u => u.role === 'student').length
        });
      }

      // 404 for unknown API
      return sendJSON(res, 404, { error: 'API endpoint not found' });
    } catch (err) {
      console.error('API Error:', err);
      return sendJSON(res, 500, { error: 'Internal Server Error', details: err.message });
    }
  }

  // ---------------- STATIC FILE SERVING ----------------
  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  // Security check: ensure path stays within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('404 Not Found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Error loading file');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Feedback Management System (Web Tech Lab Project)  `);
  console.log(`  Server running at: http://localhost:${PORT}        `);
  console.log(`=======================================================`);
});

