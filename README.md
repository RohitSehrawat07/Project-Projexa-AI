# 📚 EduRank — AI-Powered Student Ranking System

A complete platform for first-year BCA students to compete in coding quizzes, participate in tournaments, and track their ELO rating across a dynamic ranking system.

---

## 🎯 Project Overview

**EduRank** is an educational gamification platform that:

- ✅ **Tracks Student Performance** — ELO-based rating system
- ✅ **Runs Tournaments** — Round-robin competition format
- ✅ **Manages Quizzes** — Ranked quizzes with difficulty levels
- ✅ **Displays Rankings** — Live leaderboard with tier system
- ✅ **Predicts Performance** — AI-based student predictions
- ✅ **Provides Analytics** — Teacher dashboard with insights

**Stack:**
- Frontend: Pure HTML, CSS, JavaScript (no frameworks)
- Backend: Flask + Flask-CORS
- Database: JSON files (no SQL)
- Hosting: Localhost only

---

## 📂 Project Structure

```
Project-Projexa-AI/
├── index.html                 # Login page
├── dashboard.html             # Main dashboard
├── quiz.html                  # Quiz interface
├── daily.html                 # Daily challenge
├── leaderboard.html           # Class rankings
├── predict.html               # Performance prediction
├── teacher.html               # Teacher analytics
├── review.html                # Quiz review (future)
├── tournament.html            # Tournament hub
├── tournament_match.html       # Match interface
│
├── css/
│   ├── styles.css             # Global styles
│   ├── dashboard.css          # Dashboard styling
│   ├── index.css              # Login styling
│   ├── leaderboard.css        # Leaderboard styling
│   ├── predict.css            # Prediction styling
│   ├── teacher.css            # Teacher view styling
│   ├── quiz.css               # Quiz styling
│   ├── review.css             # Review styling
│   ├── daily.css              # Daily challenge styling
│   └── tournament.css         # Tournament styling
│
├── js/
│   ├── storage.js             # API integration layer
│   ├── elo.js                 # ELO calculation engine
│   ├── index.js               # Login logic
│   ├── dashboard.js           # Dashboard logic
│   ├── leaderboard.js         # Leaderboard logic
│   ├── predict.js             # Prediction logic
│   ├── teacher.js             # Teacher dashboard logic
│   ├── daily.js               # Daily challenge logic
│   ├── tournament.js          # Tournament logic
│   └── tournament_match.js     # Match interface logic
│
├── app.py                     # Flask API server
├── database.py                # Database operations
├── tournament.py              # Tournament logic
├── data.json                  # JSON database
│
├── requirements.txt           # Python dependencies
├── start.bat                  # Windows startup script
├── start.sh                   # Linux/macOS startup script
└── README.md                  # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.8+** installed
- **pip** (Python package manager)
- Any modern web browser
- Code editor (VS Code recommended)

### Installation

1. **Navigate to project directory:**
   ```bash
   cd Project-Projexa-AI
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   
   Or let the startup script handle it automatically.

### Running the Server

#### **Windows Users:**
```bash
start.bat
```

#### **Linux/macOS Users:**
```bash
bash start.sh
```

#### **Manual Start:**
```bash
python app.py
```

**Expected Output:**
```
 * Serving Flask app 'app'
 * Debug mode: on
 * WARNING: This is a development server. Do not use it in production.
 * Running on http://localhost:5000
```

### Accessing the Platform

1. **Open your browser** and navigate to:
   ```
   http://localhost:5000 (in development, use file:// for HTML files)
   ```

2. **Or open `index.html`** directly in your browser

3. **Login** with any student name (auto-creates account)

---

## 📖 User Guide

### For Students

#### **1. Login & Dashboard**
- Enter your name to login (auto-creates account)
- View your ELO rating, tier, and progress
- See your class rank and prediction

#### **2. Take a Quiz**
- Navigate to "Take a Quiz"
- Answer 10 coding questions at your difficulty level
- ELO updates based on performance and difficulty

#### **3. Daily Challenge**
- One question per day
- Maintain your streak for badges
- Quick ELO boost

#### **4. Check Leaderboard**
- See all students ranked by ELO
- Find your position
- Challenge those above you

#### **5. View Prediction**
- See your performance prediction (Excellent, Good, Average, At Risk)
- View factors affecting your score
- Compare with classmates

#### **6. Join Tournament**
- Go to "Round Robin Tournament"
- Join the tournament (one per round)
- Wait for tournament to start
- Play your matches against other players
- Win points and earn ELO!

### For Teachers

#### **Teacher Dashboard**
- Click "Teacher View" to access analytics
- See total students and at-risk count
- View average ELO and accuracy
- Get alerts for struggling students
- See individual student performance

---

## 🎮 Tournament System

### How It Works

1. **Join Phase** — Students register for tournament
2. **Start Phase** — Admin starts tournament (generates round-robin matches)
3. **Play Phase** — Students play their matches
4. **Calculate** — Standings auto-update after each match
5. **Winner** — Top player gets Tournament Champion badge

### Round-Robin Rules

- **Everyone plays everyone** once
- **Win = 3 points**, **Draw = 1 point**, **Loss = 0 points**
- **Sorted by points**, then by ELO
- **ELO changes** based on match result and opponent rating

### Match Interface

- Click "Play" to enter match
- Submit result after answering 10 questions
- Result updates standings immediately
- Can view completed matches

---

## 🔄 API Endpoints

All endpoints return JSON responses with `status` field (`success` or `error`).

### **STUDENTS**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/students` | Get all students |
| GET | `/api/students/<name>` | Get specific student |
| POST | `/api/login` | Login/create student |
| PUT | `/api/students/<name>` | Update student data |
| POST | `/api/elo/update` | Update ELO rating |

### **TOURNAMENT**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/tournament` | Get tournament data |
| POST | `/api/tournament/join` | Join tournament |
| POST | `/api/tournament/start` | Start tournament |
| POST | `/api/tournament/submit` | Submit match result |
| GET | `/api/tournament/standings` | Get standings |
| POST | `/api/tournament/reset` | Reset tournament |
| GET | `/api/tournament/mymatch` | Get student's pending match |

---

## 📊 Database Schema

### **Students**
```json
{
  "name": "string",
  "elo": 1200,
  "tier": "Bronze|Silver|Gold|Platinum|Diamond",
  "accuracy": 0-100,
  "streak": 0+,
  "speed": 0-10,
  "activity": 0-100,
  "quizzes": 0+,
  "badge": "string"
}
```

### **Tournament**
```json
{
  "status": "not_started|running|completed",
  "players": ["player1", "player2", ...],
  "matches": [
    {
      "player1": "name",
      "player2": "name",
      "result": "name|draw|null",
      "points_p1": 0,
      "points_p2": 0
    }
  ],
  "results": []
}
```

---

## 🏅 Tier System

| Tier | ELO Range | Color |
|------|-----------|-------|
| Bronze | 0-1199 | Orange |
| Silver | 1200-1399 | Blue |
| Gold | 1400-1599 | Green |
| Platinum | 1600-1799 | Cyan |
| Diamond | 1800+ | Purple |

---

## ⚙️ ELO Calculation

Uses standard chess ELO formula:

```
Expected = 1 / (1 + 10^((opponent_elo - your_elo) / 400))
New_ELO = Current_ELO + K * (Result - Expected)
```

**K-Factor (learning rate):**
- Bronze (ELO < 1200): K = 40 (fast changes)
- Silver (1200-1599): K = 30 (medium)
- Gold (1600-1799): K = 20 (slow)
- Platinum+ (1800+): K = 15 (very stable)

---

## 🔧 Development

### Adding Features

1. **New Page** — Create `feature.html` and `css/feature.css`
2. **Frontend Logic** — Add `js/feature.js` with async/await
3. **Backend Endpoint** — Add route in `app.py`
4. **Database** — Extend `database.py` if needed

### Testing API

Use any REST client (Postman, curl, etc.):

```bash
# Get all students
curl http://localhost:5000/api/students

# Login
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'

# Join tournament
curl -X POST http://localhost:5000/api/tournament/join \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'
```

---

## 📝 Troubleshooting

### **Server Won't Start**

**Error:** `ModuleNotFoundError: No module named 'flask'`
- **Solution:** Run `pip install -r requirements.txt`

**Error:** `Address already in use: ('127.0.0.1', 5000)`
- **Solution:** Port 5000 is in use. Change port in `app.py` line 410

### **Frontend Can't Connect**

**Error:** `Failed to login. Please try again.`
- **Check:** Is Flask server running? (Should see message in terminal)
- **Check:** Are you on `http://localhost` or using `file://` protocol?
- **Check:** Browser network tab for CORS errors

### **Tournament Not Starting**

**Error:** `Need at least 2 players to start tournament`
- **Solution:** Join tournament with at least 2 students first

**Matches Not Showing**
- **Check:** Click "Refresh" button
- **Check:** Server status in terminal
- **Wait:** Allow 2-3 seconds for data to load

### **ELO Not Updating**

**Check:**
1. Is student logged in?
2. Did quiz/match complete successfully?
3. Check browser console for errors (F12)
4. Check Flask server logs

---

## 🎓 Educational Features

### Implemented
- ✅ ELO Rating System
- ✅ Tier System (Ranking)
- ✅ Quiz System
- ✅ Daily Challenge
- ✅ Leaderboard
- ✅ Performance Prediction
- ✅ Teacher Analytics
- ✅ Round-Robin Tournaments
- ✅ Match-based competition

### Future (Not Implemented Yet)
- WebSockets for real-time updates
- User authentication (JWT)
- Database migration (PostgreSQL)
- Advanced analytics
- Mobile app
- Backup system

---

## 👥 Team & Credits

**Project:** EduRank AI
**For:** First-year BCA students
**Language:** Python (Backend), JavaScript (Frontend)
**Status:** In Development

---

## 📄 License

Educational use only. All rights reserved.

---

## 💬 Support

For issues or questions:
1. Check the Troubleshooting section above
2. Check browser console (F12) for errors
3. Check Flask server terminal for logs
4. Check GitHub issues (if available)

---

## 🔐 Security Notes

**This application:**
- ✅ Runs on localhost only (no internet exposure)
- ✅ Has no authentication (for educational use only)
- ✅ Uses JSON files (no user data protection)
- ⚠️ **Should NOT be used in production**
- ⚠️ **Should NOT contain sensitive student data**
- ⚠️ **Should NOT be deployed to internet**

For production use, implement:
- JWT-based authentication
- PostgreSQL database
- HTTPS/TLS encryption
- Request validation
- Rate limiting
- Access control

---

**Happy Ranking! 🏆**