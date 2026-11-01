# 🎓 Feedback Management System (FeedbackHub)
### A Full-Stack Multi-Role Web Application for Web Technology Laboratory Mini Project

---

## 📌 1. Project Overview & Abstract

The **Feedback Management System (FeedbackHub)** is an end-to-end web application developed to modernize institutional feedback, evaluation, and grievance resolution. In academic and organizational settings, timely and transparent feedback between students, faculty members, and administrators is crucial for quality improvement.

This system implements **Role-Based Access Control (RBAC)** across **3 distinct roles (2 users + 1 administrator)**:
1. **User 1 (Student / Submitter)**: Registers, browses academic departments, evaluates faculty members across multi-criteria metrics (Teaching Quality, Communication, Punctuality, Support), submits anonymous or identified feedback, and tracks resolution status in real time.
2. **User 2 (Faculty / Staff / Evaluator)**: Accesses a dedicated performance console, reviews student submissions and ratings, analyzes criteria progress bars, and posts official replies/clarifications.
3. **Administrator (Governance)**: Manages users (students & faculty), configures departments and categories, monitors institutional analytics via visual charts, updates feedback status, and exports data to CSV/JSON reports.

---

## 🚀 2. Key Features

- **Multi-Role Authentication**: Secure login & registration with role-based dashboard redirection.
- **Interactive Multi-Criteria Rating**: 5-star rating system with granular scores for Teaching, Communication, Punctuality, and Support.
- **Anonymous Submission Mode**: Privacy-preserving feedback option that hides student identity while keeping feedback actionable.
- **Bi-Directional Response Threads**: Allows faculty and administrators to directly respond to feedback with full conversation history.
- **Real-Time Analytics & KPI Dashboard**: Institutional average ratings, rating distribution charts (1 to 5 stars), and category breakdown.
- **Data Export Capabilities**: One-click export of feedback records to CSV and JSON formats.
- **1-Click Demo Logins**: Pre-configured buttons on the login screen to demonstrate all 3 roles during lab examination / viva.
- **Zero-Dependency Architecture**: Runs on standard Node.js without requiring third-party package downloads.

---

## 🏗️ 3. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (Client)                    │
│   • HTML5 Semantic Elements                            │
│   • Responsive CSS3 (Flexbox, Grid, CSS Variables)     │
│   • Vanilla JavaScript (Fetch API, DOM, State Manager) │
└──────────────────────────▲─────────────────────────────┘
                           │ HTTP / JSON REST APIs
┌──────────────────────────▼─────────────────────────────┐
│                   Backend (Server)                     │
│   • Node.js Built-in HTTP & File System Modules        │
│   • RESTful API Endpoints & Request Routing            │
│   • Token-based Session Management                     │
└──────────────────────────▲─────────────────────────────┘
                           │ Read / Write
┌──────────────────────────▼─────────────────────────────┐
│                 Database Layer (Data)                  │
│   • JSON Persistent Store (data/database.json)         │
│   • Pre-seeded Users, Departments & Feedback Samples   │
└────────────────────────────────────────────────────────┘
```

| Layer | Technologies Used |
|---|---|
| **Frontend** | HTML5, CSS3 (Modern Glassmorphic / Clean UI), Vanilla JavaScript (ES6+) |
| **Backend** | Node.js (`http`, `fs`, `path`, `crypto`, `url`) |
| **Database** | Persistent JSON Store (`data/database.json`) |
| **Protocol** | RESTful HTTP with JSON Payloads |

---

## 🔑 4. Demo Login Credentials (Ready for Viva)

| Role | Name | Email | Password |
|---|---|---|---|
| **Administrator** | System Administrator | `admin@example.com` | `admin123` |
| **User 2 (Faculty)** | Dr. Alan Turing | `faculty@example.com` | `faculty123` |
| **User 2 (Faculty)** | Prof. Grace Hopper | `grace@example.com` | `grace123` |
| **User 1 (Student)** | John Doe | `student@example.com` | `student123` |
| **User 1 (Student)** | Emily Watson | `emily@example.com` | `emily123` |

> 💡 **Viva Tip**: On the login screen, click any of the 3 quick demo buttons (**Admin**, **User 2: Faculty**, or **User 1: Student**) to log in with one click without typing!

---

## 💻 5. How to Run the Project

### Prerequisites
- Node.js (v14 or higher)

### Start the Application
1. Open your terminal and navigate to the project directory:
   ```bash
   cd /Users/jerry/.gemini/antigravity/scratch/feedback-management-system
   ```
2. Run the server:
   ```bash
   npm start
   # or
   node server.js
   ```
3. Open your browser and visit:
   ```
   http://localhost:3000
   ```

---

## 📡 6. REST API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - Authenticate user & generate session token
- `POST /api/auth/register` - Create new Student or Faculty account
- `GET /api/auth/me` - Retrieve current authenticated profile
- `POST /api/auth/logout` - Invalidate current session

### Feedback Endpoints
- `GET /api/feedback` - List feedback (filtered by user role)
- `POST /api/feedback` - Submit new feedback with ratings and criteria
- `PUT /api/feedback/:id/status` - Update status (`Under Review`, `Responded`, `Resolved`)
- `POST /api/feedback/:id/reply` - Add an official faculty/admin response
- `DELETE /api/feedback/:id` - Delete feedback (Admin or author if still pending)

### Administrative Endpoints
- `GET /api/analytics` - Institutional metrics, rating distribution & category counts
- `GET /api/users` - View all registered users
- `POST /api/users` - Create a new user directly
- `DELETE /api/users/:id` - Remove a user account
- `GET /api/departments` - List all departments & academic units
- `POST /api/departments` - Add new department
- `DELETE /api/departments/:id` - Remove a department

---

## 🎯 7. Web Tech Lab Viva Voce Questions & Answers

#### Q1: What is the architecture of your web application?
> **Answer**: It follows a 3-tier Client-Server architecture. The presentation tier is built with HTML5, CSS3, and JavaScript running in the browser. The logic tier is an asynchronous Node.js HTTP server exposing RESTful APIs. The data tier uses a persistent JSON file storage for record retention.

#### Q2: How does the frontend communicate with the backend?
> **Answer**: The frontend uses the standard asynchronous JavaScript `Fetch API` to send HTTP requests (`GET`, `POST`, `PUT`, `DELETE`) with JSON payloads to `/api/...` endpoints and updates the DOM dynamically without reloading the entire page (Single Page Application architecture).

#### Q3: How is Role-Based Access Control (RBAC) enforced?
> **Answer**: Upon login, a secure session token is generated and passed via the HTTP `Authorization: Bearer <token>` header. The backend decodes the token, checks the user's role (`admin`, `staff`, `student`), and restricts API responses and actions accordingly (e.g., students cannot access user management, and faculty can only view feedback relevant to them).

#### Q4: Why is a zero-dependency Node.js implementation advantageous?
> **Answer**: It demonstrates deep understanding of foundational web technologies (HTTP headers, status codes, JSON streaming, MIME types, CORS) using native Node.js libraries (`http`, `fs`, `crypto`) without relying on heavy third-party abstractions.

#### Q5: How is responsiveness achieved?
> **Answer**: Using CSS3 Flexbox, CSS Grid layout systems, and CSS Media Queries (`@media (max-width: 768px)`). The interface automatically reflows cards, tables, and navigation across mobile, tablet, and desktop screens.

