# IBM Leicester Parking Portal

A web-based parking management system for booking parking spaces up to 24 hours in advance.

---

## 🛠️ Technology Stack

**Frontend:** React, React Router, Axios  
**Backend:** Node.js, Express, PostgreSQL  
**Security:** JWT, bcrypt, CORS, Helmet

---

## 📦 Prerequisites

Before you start, make sure you have these installed:

- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **PostgreSQL** (version 14 or higher) - [Download here](https://www.postgresql.org/download/)

---

## 🚀 Installation Steps

### Step 1: Get the Code

If you received the code as a ZIP file or folder, extract it and navigate to it:
```bash
cd ibm-leicester-parking-portal
```

If you're cloning from a Git repository:
```bash
git clone <repository-url>
cd ibm-leicester-parking-portal
```

---

### Step 2: Setup the Database

**Start PostgreSQL** (choose the method for your system):
```bash
# macOS (if you installed via Homebrew):
brew services start postgresql

# macOS (if you use Postgres.app):
# Just open the Postgres.app

# Windows:
# PostgreSQL runs automatically as a service after installation

# Linux:
sudo systemctl start postgresql
```

**Create an empty database:**
```bash
createdb parking_portal_db
```

**OR using psql:**
```bash
psql -U postgres
CREATE DATABASE parking_portal_db;
CREATE USER parking_admin;
GRANT ALL PRIVILEGES ON DATABASE parking_portal_db TO parking_admin;
\q
```

---

### Step 3: Setup the Backend
```bash
cd server
npm install
```

**Create a `.env` file** inside the `server` folder with these settings:
```env
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=parking_portal_db
DB_USER=parking_admin
DB_PASSWORD=
JWT_SECRET=your-secret-key-change-this
NODE_ENV=development
```

**Important:** 
- If your PostgreSQL user has a password, add it to `DB_PASSWORD=`
- Change `JWT_SECRET` to something secure in production

**Initialize the database** (creates tables and adds sample data):
```bash
node migrations/initDatabase.js
```

You should see: ✅ Database initialized successfully!

---

### Step 4: Setup the Frontend
```bash
cd ../client
npm install
```

---

## ▶️ Running the Application

You need **TWO terminal windows** open at the same time:

### Terminal 1: Start the Backend
```bash
cd server
npm run dev
```

**You should see:**
```
✅ Connected to PostgreSQL database
🚀 Server running on port 5001
```

### Terminal 2: Start the Frontend
```bash
cd client
npm start
```

**You should see:**
```
Compiled successfully!
Local: http://localhost:3000
```

Your browser should automatically open. If not, go to: **http://localhost:3000**

---

## 👥 Test Accounts

The system comes with ready-to-use test accounts:

### Regular User Accounts

| Email | Password |
|-------|----------|
| john.doe@ibm.com | Password123! |
| jane.smith@ibm.com | Password123! |
| mike.johnson@ibm.com | Password123! |

### Administrator Account

| Email | Password |
|-------|----------|
| admin@ibm.com | Admin123! |

**Use these to login and test all features!**

---

## ✨ What You Can Do

### As a Regular User:
- ✅ Register and login
- ✅ Book parking for today or tomorrow
- ✅ Check real-time availability
- ✅ View your bookings
- ✅ Cancel bookings

### As an Administrator:
- ✅ View system statistics
- ✅ Filter stats by date range
- ✅ Search all bookings
- ✅ Cancel multiple bookings at once
- ✅ Manage users
- ✅ Update parking capacity

---

## 📁 Project Structure
```
ibm-leicester-parking-portal/
│
├── client/                    # Frontend (React)
│   ├── public/               # Static files
│   ├── src/
│   │   ├── pages/           # Login, Dashboard, Admin pages
│   │   ├── services/        # API calls
│   │   └── context/         # Authentication
│   └── package.json
│
├── server/                    # Backend (Node.js)
│   ├── config/              # Database connection
│   ├── controllers/         # Business logic
│   ├── routes/              # API endpoints
│   ├── middleware/          # Security & auth
│   ├── migrations/          # Database migrations
│   ├── scripts/             # Database setup scripts
│   ├── .env                 # Configuration (you create this)
│   └── package.json
│
└── README.md                 # This file
```

---

## 🔌 API Endpoints

**Authentication:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

**Bookings:**
- `GET /api/bookings` - Get your bookings
- `POST /api/bookings` - Create booking
- `DELETE /api/bookings/:id` - Cancel booking
- `GET /api/bookings/availability/:date` - Check availability

**Admin Only:**
- `GET /api/admin/stats` - View statistics
- `GET /api/admin/bookings` - View all bookings
- `PUT /api/admin/capacity` - Update capacity

---

## 🔒 Security Features

- Password encryption (bcrypt)
- Secure authentication (JWT tokens)
- Protection against SQL injection
- Protection against XSS attacks
- CSRF token protection
- Rate limiting on login attempts
- Role-based access control

---

## 🛑 Troubleshooting

**Problem:** Database connection error  
**Solution:** Check your `.env` file has correct PostgreSQL credentials. Make sure `DB_NAME=parking_portal_db` and `DB_USER=parking_admin`

**Problem:** Port 3000 or 5001 already in use  
**Solution:** Stop any other applications using these ports

**Problem:** "Cannot find module" errors  
**Solution:** Run `npm install` again in both `server` and `client` folders

**Problem:** Database initialization fails  
**Solution:** Make sure you created the database first with `createdb parking_portal_db`

**Problem:** Favicon not updating  
**Solution:** Hard refresh browser (`Cmd+Shift+R` on Mac, `Ctrl+Shift+R` on Windows)

---

**Last Updated:** November 2025  
**Status:** ✅ Complete and Ready

---

## ⚠️ Known Issues

### OneDrive Sync Conflicts

If you're storing this project in OneDrive, you may encounter sync errors with files named `~` inside `node_modules`. This is caused by the `postcss-initial` package which contains folders with the `~` character that OneDrive doesn't support.

**Solution:**

After running `npm install` in the client folder, rename the problematic folder:
```bash
cd client/node_modules/postcss-initial
mv "~" "tilde_config"
cd ../../..
```

**Better Solution:**

Store the project outside of OneDrive (e.g., in `~/Documents` or `~/Desktop` directly) to avoid cloud sync issues with `node_modules` folders.

---
