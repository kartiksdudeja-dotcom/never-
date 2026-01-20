# EMS Hanger Backend API

Flask-based REST API for the EMS Hanger Activity Log System.

## Setup

1. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**

   - Copy `.env` and update with your MySQL credentials:

   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=ems_hanger
   JWT_SECRET_KEY=your-secret-key
   ```

3. **Initialize database:**

   ```bash
   python database.py
   ```

4. **Run the server:**
   ```bash
   python app.py
   ```

The server will start at `http://localhost:5000`

## Default Credentials

- **Admin:** `admin` / `admin123`
- **Operator:** `operator1` / `operator123`

## API Endpoints

### Authentication

| Method | Endpoint           | Description      |
| ------ | ------------------ | ---------------- |
| POST   | `/api/auth/login`  | User login       |
| POST   | `/api/auth/logout` | User logout      |
| GET    | `/api/auth/verify` | Verify JWT token |

### Users (Admin only)

| Method | Endpoint         | Description     |
| ------ | ---------------- | --------------- |
| GET    | `/api/users`     | Get all users   |
| POST   | `/api/users`     | Create new user |
| PUT    | `/api/users/:id` | Update user     |
| DELETE | `/api/users/:id` | Delete user     |

### Hangers

| Method | Endpoint                   | Description           |
| ------ | -------------------------- | --------------------- |
| GET    | `/api/hangers`             | Get all hangers       |
| GET    | `/api/hangers/stats`       | Get hanger statistics |
| GET    | `/api/hangers/:no`         | Get specific hanger   |
| PUT    | `/api/hangers/:no`         | Update hanger status  |
| PUT    | `/api/hangers/bulk-update` | Bulk update hangers   |

### Service Checklist

| Method | Endpoint                     | Description            |
| ------ | ---------------------------- | ---------------------- |
| GET    | `/api/checklist/master`      | Get checklist template |
| GET    | `/api/checklist/hanger/:no`  | Get hanger checklist   |
| POST   | `/api/checklist/hanger/:no`  | Save hanger checklist  |
| GET    | `/api/checklist/history/:no` | Get checklist history  |

### Activity

| Method | Endpoint                    | Description            |
| ------ | --------------------------- | ---------------------- |
| POST   | `/api/activity/log`         | Log new activity       |
| GET    | `/api/activity/today`       | Get today's activities |
| GET    | `/api/activity/today/stats` | Get today's stats      |
| GET    | `/api/activity/history`     | Get activity history   |

### Dashboard

| Method | Endpoint               | Description           |
| ------ | ---------------------- | --------------------- |
| GET    | `/api/dashboard/admin` | Admin dashboard stats |
| GET    | `/api/dashboard/user`  | User dashboard stats  |

## Database Schema

### Tables

- `users` - User accounts with roles
- `hangers` - 112 hangers with status tracking
- `service_checklist_master` - Checklist template items
- `service_checklist` - Actual service records
- `activity_logs` - Activity logging
- `sessions` - Session tracking
