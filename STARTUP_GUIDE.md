# 🚀 EduRank Startup Guide

## Quick Start (2 Steps)

### Step 1: Install Python Dependencies
```bash
pip install -r requirements.txt
```

Required packages:
- **flask** - Web server framework
- **flask-cors** - Enable CORS for API calls

### Step 2: Start the Backend Server
```bash
python app.py
```

Expected output:
```
 * Serving Flask app 'app'
 * Running on http://localhost:5000
 * WARNING in development mode. Use a production WSGI server instead.
```

---

## Then Open in Web Browser

Once the server is running, open your browser and visit:
```
http://localhost:5000
```

Or directly navigate to:
```
http://localhost:5000/index.html
```

---

## System Architecture

### Frontend (No Installation Required)
- **Pure HTML5, CSS3, JavaScript** - Works in any modern browser
- **Location:** All `.html` files in project root
- **Running on:** Browser renders local files + calls API on `localhost:5000`

### Backend (Requires Python)
- **Framework:** Flask with CORS support
- **Port:** `localhost:5000`
- **API Base:** `http://localhost:5000/api`

### Database
- **Type:** JSON files (no database server needed)
- **Location:** `data.json` (auto-created on first run)
- **Contains:** Students, ELO ratings, tournament data

---

## Features and Pages

### 📱 Public Pages (No Login Required)
- **index.html** - Login / Sign up interface

### 🔒 Protected Pages (Login Required)
- **dashboard.html** - Main dashboard with stats and leaderboard
- **leaderboard.html** - Full class leaderboard (ranked by ELO)
- **predict.html** - AI performance predictions for all students
- **teacher.html** - Teacher analytics and at-risk student alerts
- **daily.html** - Daily challenge (placeholder for now)
- **quiz.html** - Ranked quiz system (placeholder for now)
- **review.html** - Quiz review interface (placeholder for now)

### 🏆 Tournament Pages
- **tournament.html** - Tournament registration and standings
- **tournament_match.html** - Match interface for tournament play

---

## API Endpoints

### Authentication
- `POST /api/login` - Login or create new student
  ```json
  {
    "name": "Alice"
  }
  ```

### Students
- `GET /api/students` - Get all students
- `GET /api/students/{name}` - Get student by name
- `PUT /api/students/{name}` - Update student data

### ELO & Tiers
- `POST /api/elo/update` - Update student ELO after quiz
- `GET /api/tiers` - Get tier definitions

### Tournament
- `GET /api/tournament` - Get tournament status
- `POST /api/tournament/join` - Join tournament
- `POST /api/tournament/start` - Start tournament (generate matches)
- `POST /api/tournament/submit` - Submit match result
- `GET /api/tournament/standings` - Get current standings
- `GET /api/tournament/mymatch?name=Student` - Get student's pending match
- `POST /api/tournament/reset` - Reset tournament

---

## Troubleshooting

### ❌ "Cannot GET /index.html"
**Problem:** Backend server not running
**Solution:** Run `python app.py` in terminal

### ❌ "API call failed" or "Network error"
**Problem:** Backend server crashed or port 5000 is in use
**Solution:** 
1. Stop any other processes on port 5000
2. Restart Flask server: `python app.py`

### ❌ "Failed to login"
**Problem:** Backend API responding with error
**Solution:** Check Flask server output for errors

### ❌ Page shows "Invalid name" error
**Problem:** Name validation failed
**Solution:** 
- Name must be at least 2 characters
- Special characters may cause issues
- Try "Alice" or "John"

### ❌ "CORS error" in browser console
**Problem:** CORS headers not configured
**Solution:** Verify `from flask_cors import CORS; CORS(app)` is in app.py

---

## Development Notes

### File Organization
```
FRONTEND (Static - No build needed)
└── HTML files + CSS files + JS files → Work directly in browser

BACKEND (Dynamic - Needs Python)
└── app.py → Flask server
└── database.py → JSON operations
└── tournament.py → ELO & match logic
└── requirements.txt → Dependencies
└── data.json → Database (auto-created)
```

### Data Flow
```
Browser (HTML/CSS/JS)
        ↓ fetch() calls
Backend API (Flask)
        ↓ CRUD operations
Database (data.json)
```

### Session Management
- **localStorage key:** `edurank_current` - Stores current student name
- **No session tokens or authentication** - Name-based for simplicity
- **Client-side storage:** Used ONLY for session state (not business logic)

---

## Testing Workflow

### 1. Login as Student
- Go to http://localhost:5000
- Enter name: "Alice"
- Click "Login / Signup"
- Redirected to dashboard.html

### 2. View Dashboard
- See ELO rating, tier, and stats
- Mini leaderboard showing top 5 students

### 3. Browse Pages
- Leaderboard - See all students ranked by ELO
- Predict - See performance predictions
- Teacher - See analytics (if logged in as teacher name)

### 4. Join Tournament
- Go to tournament.html
- Click "Join Tournament"
- (Simulate another user joining for round-robin match)
- Start tournament to generate matches
- Submit match results

---

## Performance Tips

### Browser
- Use Chrome/Firefox/Edge for best compatibility
- Clear cache if UI doesn't update
- Open Developer Tools (F12) to see API requests/responses

### Backend
- Flask runs in debug mode (auto-reload on code changes)
- Check console output for detailed error messages
- Database file (data.json) can be examined/edited directly

---

## What's Working ✅

- [x] Login / Signup with API
- [x] Student profile and ELO tracking
- [x] Leaderboard (ranked by ELO)
- [x] Student prediction system
- [x] Tournament (registration, matches, standings)
- [x] ELO calculation and tier system
- [x] Teacher analytics dashboard
- [x] Protection redirects (login required)

## What's Coming 🔜

- [ ] Quiz engine with timer
- [ ] AI-powered question generation
- [ ] Match review and blunder analysis
- [ ] Real-time notifications
- [ ] Chat system for collaboration
- [ ] Badges and achievements

---

## Support

If you encounter issues:
1. Check the terminal/console output for errors
2. Verify data.json exists in project root
3. Ensure port 5000 is available
4. Restart both server and browser

Happy learning! 🎓
