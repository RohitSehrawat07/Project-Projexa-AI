"""
EduRank — app.py
Phase 1: SaaS Foundation
- Existing quiz/ELO/leaderboard/tournament APIs (preserved)
- New: user accounts, classes, join-code flow
"""
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os
import jwt as pyjwt
import socket
from datetime import datetime, timedelta
import uuid

from database import (
    # ── Original student DB ──
    load_db, save_db, get_all_students, get_student, update_student, add_student,
    get_tier, get_tournament, save_tournament, student_exists,
    # ── New user accounts ──
    load_users, get_user_by_email, get_user_by_id, create_user,
    # ── New class/institution ──
    create_class, get_class_by_id, get_classes_for_teacher,
    get_classes_for_student, join_class_with_code, get_students_in_class,
    # ── New student lookup ──
    get_student_by_user_id,
    # ── Attempt handling ──
    add_attempt,
)
from tournament import (
    generate_round_robin_matches, get_standings, check_tournament_complete,
    submit_match_result
)
from config import PLANS, SECRET_KEY

# ============================================================
# APP SETUP
# ============================================================

app = Flask(__name__)
CORS(app, origins="*")

JWT_SECRET = SECRET_KEY
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7  # 7 days


# ============================================================
# AUTH HELPERS
# ============================================================

def generate_token(user_id, role):
    """Generate a JWT token"""
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.utcnow(),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token):
    """Verify JWT and return payload, or None on failure"""
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None

def get_current_user():
    """Extract and verify the Bearer token from request, return user dict or None"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    payload = verify_token(token)
    if not payload:
        return None
    return get_user_by_id(payload["sub"])

def require_auth():
    """Return (user, error_response). Call at top of protected routes."""
    user = get_current_user()
    if not user:
        return None, (jsonify({"error": "Authentication required"}), 401)
    return user, None

def require_teacher():
    """Return (teacher_user, error_response). Only allows teacher role."""
    user, err = require_auth()
    if err:
        return None, err
    if user.get("role") != "teacher":
        return None, (jsonify({"error": "Teacher access required"}), 403)
    return user, None

def safe_user(user):
    """Return user dict without password_hash"""
    return {k: v for k, v in user.items() if k != "password_hash"}


# ============================================================
# HELPER FUNCTIONS (original)
# ============================================================

def process_active_day(student):
    """Update daily streak and last active date logic"""
    today = datetime.now().date().isoformat()
    yesterday = (datetime.now().date() - timedelta(days=1)).isoformat()

    last_active = student.get("last_active_date")
    streak = student.get("streak", 0)

    if last_active == today:
        pass
    elif last_active == yesterday:
        streak += 1
    else:
        streak = 1

    student["streak"] = streak
    student["last_active_date"] = today
    return student


# ============================================================
# NEW AUTH ENDPOINTS (Phase 1)
# ============================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new teacher or student account"""
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "").strip().lower()

    # Validate inputs
    if not name or len(name) < 2:
        return jsonify({"error": "Name must be at least 2 characters"}), 400
    if not email or "@" not in email:
        return jsonify({"error": "Valid email is required"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Role must be explicitly teacher or student — never trust frontend blindly
    if role not in ("teacher", "student"):
        return jsonify({"error": "Role must be 'teacher' or 'student'"}), 400

    # Hash password server-side — never store plain text
    pw_hash = generate_password_hash(password)

    user = create_user(name, email, pw_hash, role)
    if not user:
        return jsonify({"error": "An account with this email already exists"}), 409

    token = generate_token(user["id"], user["role"])
    return jsonify({
        "token": token,
        "user": safe_user(user),
        "message": f"Welcome to EduRank, {name}!"
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    """Login with email + password"""
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = get_user_by_email(email)
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = generate_token(user["id"], user["role"])
    return jsonify({
        "token": token,
        "user": safe_user(user),
    })


@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    """Get current logged-in user info"""
    user, err = require_auth()
    if err:
        return err
    return jsonify(safe_user(user))


# ============================================================
# NEW PLANS / PRICING ENDPOINT
# ============================================================

@app.route('/api/plans', methods=['GET'])
def get_plans():
    """Return plan definitions (for landing page pricing section)"""
    return jsonify(PLANS)


# ============================================================
# NEW CLASS / INSTITUTION ENDPOINTS (Phase 1)
# ============================================================

@app.route('/api/classes', methods=['POST'])
def create_class_route():
    """Teacher creates a new class"""
    teacher, err = require_teacher()
    if err:
        return err

    data = request.json or {}
    class_name = data.get("name", "").strip()
    institution = data.get("institution", "").strip()
    subject = data.get("subject", "").strip()

    if not class_name:
        return jsonify({"error": "Class name is required"}), 400

    klass = create_class(teacher["id"], class_name, institution, subject)
    return jsonify(klass), 201


@app.route('/api/classes', methods=['GET'])
def get_my_classes():
    """Get classes for the logged-in user (teacher sees owned, student sees enrolled)"""
    user, err = require_auth()
    if err:
        return err

    if user["role"] == "teacher":
        classes = get_classes_for_teacher(user["id"])
    else:
        classes = get_classes_for_student(user["id"])

    return jsonify(classes)


@app.route('/api/classes/<class_id>', methods=['GET'])
def get_class_detail(class_id):
    """Get class details — only accessible to enrolled students and the teacher"""
    user, err = require_auth()
    if err:
        return err

    klass = get_class_by_id(class_id)
    if not klass:
        return jsonify({"error": "Class not found"}), 404

    # Authorise: must be teacher of class or enrolled student
    is_teacher = klass["teacher_id"] == user["id"]
    is_student = user["id"] in klass.get("student_ids", [])
    if not (is_teacher or is_student):
        return jsonify({"error": "Access denied"}), 403

    return jsonify(klass)


@app.route('/api/classes/<class_id>/students', methods=['GET'])
def get_class_students(class_id):
    """Get students in a class with their game data — teacher only"""
    teacher, err = require_teacher()
    if err:
        return err

    klass = get_class_by_id(class_id)
    if not klass:
        return jsonify({"error": "Class not found"}), 404

    if klass["teacher_id"] != teacher["id"]:
        return jsonify({"error": "Access denied"}), 403

    students = get_students_in_class(class_id)
    return jsonify(students)


@app.route('/api/classes/join', methods=['POST'])
def join_class_route():
    """Student joins a class using a join code"""
    user, err = require_auth()
    if err:
        return err

    if user["role"] != "student":
        return jsonify({"error": "Only students can join classes"}), 403

    data = request.json or {}
    code = data.get("join_code", "").strip()
    if not code:
        return jsonify({"error": "Join code is required"}), 400

    klass, error = join_class_with_code(user["id"], code)
    if error == "already_joined":
        return jsonify({"message": "Already a member of this class", "class": klass})
    if error:
        return jsonify({"error": error}), 400

    return jsonify({"message": "Successfully joined class!", "class": klass})


# ============================================================
# STUDENT ENDPOINTS (original — preserved)
# ============================================================

@app.route('/api/students', methods=['GET'])
def get_students():
    """Get all students"""
    return jsonify(get_all_students())

@app.route('/api/students/<name>', methods=['GET'])
def get_student_api(name):
    """Get a specific student"""
    student = get_student(name)
    if student:
        return jsonify(student)
    return jsonify({"error": f"Student '{name}' not found"}), 404

@app.route('/api/login', methods=['POST'])
def login():
    """Legacy name-only login — preserved for backwards compatibility with existing frontend"""
    data = request.json if request.json else {}
    name = data.get("name", "").strip()

    if not name:
        return jsonify({"error": "Name is required"}), 400

    student = get_student(name)
    if student:
        return jsonify(student)

    if add_student(name):
        return jsonify(get_student(name)), 201

    return jsonify({"error": "Failed to create account"}), 500

@app.route('/api/students/<name>', methods=['PUT'])
def update_student_api(name):
    """Update a student"""
    if not student_exists(name):
        return jsonify({"error": f"Student '{name}' not found"}), 404

    data = request.json if request.json else {}
    if update_student(name, data):
        return jsonify(get_student(name))

    return jsonify({"error": "Failed to update student"}), 500


# ============================================================
# ELO ENDPOINT (original — preserved)
# ============================================================

@app.route('/api/elo/update', methods=['POST'])
def update_elo():
    """Update ELO with full formula"""
    data = request.json if request.json else {}
    if "name" not in data:
        return jsonify({"error": "Name is required"}), 400

    name = data.get("name", "").strip()

    if not student_exists(name):
        return jsonify({"error": f"Student '{name}' not found"}), 404

    student = get_student(name)
    player_elo = student.get("elo", 1000)

    if "opponent_elo" in data and "result" in data:
        try:
            opponent_elo = float(data["opponent_elo"])
            result = float(data["result"])
            k = float(data.get("k", 32))
            expected = 1 / (1 + 10 ** ((opponent_elo - player_elo) / 400))
            new_elo = player_elo + k * (result - expected)
            new_elo = max(800, int(round(new_elo)))
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid ELO calculation parameters"}), 400
    else:
        try:
            elo_change = int(data.get("elo_change", 0))
            new_elo = max(800, player_elo + elo_change)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid elo_change"}), 400

    student["elo"] = new_elo
    student["tier"] = get_tier(new_elo)
    student = process_active_day(student)

    update_student(name, {
        "elo": student["elo"],
        "tier": student["tier"],
        "streak": student.get("streak", 0),
        "last_active_date": student.get("last_active_date"),
        "activity": student.get("activity", 0)
    })
    return jsonify(get_student(name))


# ============================================================
# QUESTION BANK (original — preserved)
# ============================================================

QUESTION_BANK = [
    {"id": 0, "question": "What is the output of `console.log(typeof NaN)`?", "options": ["'number'", "'NaN'", "'undefined'", "'string'"], "correct": 0, "difficulty": "medium"},
    {"id": 1, "question": "Which data structure uses LIFO (Last In First Out)?", "options": ["Queue", "Stack", "Tree", "Graph"], "correct": 1, "difficulty": "easy"},
    {"id": 2, "question": "What is the time complexity of binary search?", "options": ["O(n)", "O(n log n)", "O(log n)", "O(1)"], "correct": 2, "difficulty": "easy"},
    {"id": 3, "question": "Which sorting algorithm is generally fastest in practice?", "options": ["Bubble Sort", "Insertion Sort", "Selection Sort", "Quick Sort"], "correct": 3, "difficulty": "medium"},
    {"id": 4, "question": "What does SQL stand for?", "options": ["Structured Query Language", "Simple Query Language", "System Query Logic", "Standard Query Loop"], "correct": 0, "difficulty": "easy"},
    {"id": 5, "question": "Which of these is NOT a valid Python data type?", "options": ["list", "tuple", "array", "dict"], "correct": 2, "difficulty": "medium"},
    {"id": 6, "question": "What is the worst-case time complexity of Quick Sort?", "options": ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], "correct": 2, "difficulty": "medium"},
    {"id": 7, "question": "Which protocol is used for secure web communication?", "options": ["HTTP", "FTP", "HTTPS", "SMTP"], "correct": 2, "difficulty": "easy"},
    {"id": 8, "question": "What is a foreign key in a database?", "options": ["A key that locks the database", "A primary key from another table", "An encrypted key", "A key for external access"], "correct": 1, "difficulty": "medium"},
    {"id": 9, "question": "Which of the following is a NoSQL database?", "options": ["MySQL", "PostgreSQL", "MongoDB", "Oracle"], "correct": 2, "difficulty": "easy"},
    {"id": 10, "question": "What does OOP stand for?", "options": ["Object Oriented Programming", "Open Online Platform", "Ordered Operation Process", "Output Oriented Protocol"], "correct": 0, "difficulty": "easy"},
    {"id": 11, "question": "Which data structure is best for implementing a priority queue?", "options": ["Array", "Linked List", "Heap", "Stack"], "correct": 2, "difficulty": "hard"},
    {"id": 12, "question": "What is the output of `print(2 ** 3 ** 2)` in Python?", "options": ["64", "512", "8", "81"], "correct": 1, "difficulty": "hard"},
    {"id": 13, "question": "Which CSS property is used to make text bold?", "options": ["text-style", "font-weight", "text-weight", "font-bold"], "correct": 1, "difficulty": "easy"},
    {"id": 14, "question": "What is the purpose of the `finally` block in exception handling?", "options": ["Runs only on error", "Runs only on success", "Always runs", "Catches exceptions"], "correct": 2, "difficulty": "medium"},
    {"id": 15, "question": "Which algorithm is used to find the shortest path in a weighted graph?", "options": ["BFS", "DFS", "Dijkstra's", "Bubble Sort"], "correct": 2, "difficulty": "hard"},
    {"id": 16, "question": "What is the default port for HTTP?", "options": ["21", "25", "80", "443"], "correct": 2, "difficulty": "easy"},
    {"id": 17, "question": "In Git, what does `git merge` do?", "options": ["Deletes a branch", "Combines two branches", "Creates a new repo", "Pushes changes"], "correct": 1, "difficulty": "easy"},
    {"id": 18, "question": "What is the space complexity of merge sort?", "options": ["O(1)", "O(log n)", "O(n)", "O(n²)"], "correct": 2, "difficulty": "hard"},
    {"id": 19, "question": "Which HTML tag is used for the largest heading?", "options": ["<head>", "<h6>", "<h1>", "<header>"], "correct": 2, "difficulty": "easy"},
    {"id": 20, "question": "What is polymorphism in OOP?", "options": ["Hiding data", "Multiple inheritance", "Same interface different behavior", "Code reuse"], "correct": 2, "difficulty": "medium"},
    {"id": 21, "question": "Which of these is a valid HTTP status code for 'Not Found'?", "options": ["200", "301", "404", "500"], "correct": 2, "difficulty": "easy"},
    {"id": 22, "question": "What is a deadlock in operating systems?", "options": ["Fast execution", "Processes waiting for each other", "Memory overflow", "CPU overload"], "correct": 1, "difficulty": "hard"},
    {"id": 23, "question": "Which JavaScript method converts JSON string to object?", "options": ["JSON.stringify()", "JSON.parse()", "JSON.convert()", "JSON.decode()"], "correct": 1, "difficulty": "medium"},
    {"id": 24, "question": "What does FIFO stand for?", "options": ["First In First Out", "Final Input Final Output", "First Index First Output", "File In File Out"], "correct": 0, "difficulty": "easy"},
    {"id": 25, "question": "What is the Big-O complexity of accessing an element in a hash table?", "options": ["O(n)", "O(log n)", "O(1)", "O(n²)"], "correct": 2, "difficulty": "medium"},
    {"id": 26, "question": "Which layer of the OSI model handles routing?", "options": ["Transport", "Network", "Data Link", "Session"], "correct": 1, "difficulty": "hard"},
    {"id": 27, "question": "What is an API?", "options": ["Application Programming Interface", "Automated Program Integration", "Application Process Input", "Advanced Programming Instruction"], "correct": 0, "difficulty": "easy"},
    {"id": 28, "question": "Which Python keyword is used to define a function?", "options": ["func", "define", "def", "function"], "correct": 2, "difficulty": "easy"},
    {"id": 29, "question": "What is the purpose of normalization in databases?", "options": ["Speed up queries", "Reduce redundancy", "Add more tables", "Encrypt data"], "correct": 1, "difficulty": "medium"},
]

def get_daily_question_for_date(date_str):
    """Get a deterministic question for a given date"""
    import hashlib
    h = int(hashlib.md5(date_str.encode()).hexdigest(), 16)
    idx = h % len(QUESTION_BANK)
    return QUESTION_BANK[idx]


# ============================================================
# DAILY CHALLENGE ENDPOINTS (original — preserved)
# ============================================================

@app.route('/api/daily/question', methods=['GET'])
def get_daily_question():
    """Get today's daily question + check if already attempted"""
    name = request.args.get("name", "").strip()
    date = request.args.get("date", "").strip()

    if not name:
        return jsonify({"error": "Name is required"}), 400

    if not date:
        date = datetime.now().date().isoformat()

    student = get_student(name)
    if not student:
        return jsonify({"error": f"Student '{name}' not found"}), 404

    question = get_daily_question_for_date(date)
    completions = student.get("daily_completions", {})
    already_done = date in completions

    result = {
        "date": date,
        "question": question["question"],
        "options": question["options"],
        "difficulty": question["difficulty"],
        "question_id": question["id"],
        "already_attempted": already_done,
        "streak": student.get("streak", 0)
    }

    if already_done:
        result["previous_result"] = completions[date]

    return jsonify(result)


@app.route('/api/daily/submit', methods=['POST'])
def submit_daily():
    """Submit daily challenge answer"""
    data = request.json if request.json else {}
    name = data.get("name", "").strip()
    date = data.get("date", "").strip()
    answer_index = data.get("answer_index")
    is_old = data.get("is_old", False)

    if not name:
        return jsonify({"error": "Name is required"}), 400
    if answer_index is None:
        return jsonify({"error": "answer_index is required"}), 400

    if not date:
        date = datetime.now().date().isoformat()

    student = get_student(name)
    if not student:
        return jsonify({"error": f"Student '{name}' not found"}), 404

    completions = student.get("daily_completions", {})
    if date in completions:
        return jsonify({"error": "Already attempted this question", "already_attempted": True}), 400

    question = get_daily_question_for_date(date)
    correct = int(answer_index) == question["correct"]

    if correct:
        elo_change = 5 if is_old else 15
    else:
        elo_change = -5

    new_elo = max(800, student.get("elo", 1000) + elo_change)

    if not is_old:
        student = process_active_day(student)

    completions[date] = {"correct": correct, "is_old": is_old, "elo_change": elo_change}

    update_data = {
        "elo": new_elo,
        "tier": get_tier(new_elo),
        "daily_completions": completions,
        "activity": student.get("activity", 0) + 1
    }

    if not is_old:
        update_data["streak"] = student.get("streak", 0)
        update_data["last_active_date"] = student.get("last_active_date")

    update_student(name, update_data)

    updated = get_student(name)
    return jsonify({
        "correct": correct,
        "elo_change": elo_change,
        "new_elo": updated["elo"],
        "streak": updated.get("streak", 0),
        "correct_answer": question["correct"],
        "student": updated
    })


@app.route('/api/daily/old', methods=['GET'])
def get_old_questions():
    """Get past 7 days' questions that user hasn't completed yet"""
    name = request.args.get("name", "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400

    student = get_student(name)
    if not student:
        return jsonify({"error": f"Student '{name}' not found"}), 404

    completions = student.get("daily_completions", {})
    today = datetime.now().date()
    old_questions = []

    for i in range(1, 8):
        past_date = (today - timedelta(days=i)).isoformat()
        if past_date not in completions:
            q = get_daily_question_for_date(past_date)
            old_questions.append({
                "date": past_date,
                "question": q["question"],
                "options": q["options"],
                "difficulty": q["difficulty"],
                "question_id": q["id"],
                "is_old": True
            })

    return jsonify(old_questions)


# ============================================================
# TOURNAMENT ENDPOINTS (original — preserved)
# ============================================================

@app.route('/api/tournament', methods=['GET'])
def get_tournament_api():
    """Get tournament data"""
    return jsonify(get_tournament())

@app.route('/api/tournament/join', methods=['POST'])
def join_tournament():
    """Join the tournament"""
    data = request.json if request.json else {}
    if "name" not in data:
        return jsonify({"error": "Name is required"}), 400

    name = data["name"].strip()
    if not student_exists(name):
        return jsonify({"error": f"Student '{name}' not found"}), 404

    tournament = get_tournament()
    if tournament.get("status") in ["running", "completed"]:
        return jsonify({"error": "Tournament is already running or completed"}), 400

    players = tournament.get("players", [])
    if name in players:
        return jsonify({"error": f"'{name}' already joined"}), 400

    players.append(name)
    tournament["players"] = players
    save_tournament(tournament)
    return jsonify(tournament)

@app.route('/api/tournament/start', methods=['POST'])
def start_tournament():
    """Start the tournament and generate matches"""
    tournament = get_tournament()
    if tournament.get("status") in ["running", "completed"]:
        return jsonify({"error": "Tournament is already running or completed"}), 400

    players_names = tournament.get("players", [])
    if len(players_names) < 2:
        return jsonify({"error": "Need at least 2 players to start tournament"}), 400

    all_students = get_all_students()
    players_data = [p for p in all_students if p["name"] in players_names]

    matches = generate_round_robin_matches(players_data)
    for i, match in enumerate(matches):
        match["match_id"] = i
        match["played_p1"] = False
        match["played_p2"] = False

    tournament["status"] = "running"
    tournament["matches"] = matches
    save_tournament(tournament)
    return jsonify(tournament)

@app.route('/api/tournament/submit', methods=['POST'])
def submit_match():
    """Submit a tournament match result"""
    data = request.json if request.json else {}

    if "match_id" not in data or "player" not in data or "score" not in data:
        return jsonify({"error": "match_id, player, and score are required"}), 400

    match_id = data["match_id"]
    player = data["player"].strip()

    try:
        score = int(data["score"])
    except (ValueError, TypeError):
        return jsonify({"error": "Score must be an integer"}), 400

    if not (0 <= score <= 10):
        return jsonify({"error": "Score must be between 0 and 10"}), 400

    tournament = get_tournament()
    if tournament.get("status") != "running":
        return jsonify({"error": "Tournament not running"}), 400

    matches = tournament.get("matches", [])
    if not isinstance(match_id, int) or match_id < 0 or match_id >= len(matches):
        return jsonify({"error": "Invalid match_id"}), 400

    match = matches[match_id]

    if match["player1"] == player:
        if match.get("played_p1"):
            return jsonify({"error": "Player already submitted score for this match"}), 400
        match["points_p1"] = score
        match["played_p1"] = True
    elif match["player2"] == player:
        if match.get("played_p2"):
            return jsonify({"error": "Player already submitted score for this match"}), 400
        match["points_p2"] = score
        match["played_p2"] = True
    else:
        return jsonify({"error": "Player not in this match"}), 400

    if match.get("played_p1") and match.get("played_p2") and match.get("result") is None:
        p1_score = match.get("points_p1", 0)
        p2_score = match.get("points_p2", 0)

        if p1_score > p2_score:
            match["result"] = match["player1"]
            res_p1, res_p2 = 1.0, 0.0
        elif p2_score > p1_score:
            match["result"] = match["player2"]
            res_p1, res_p2 = 0.0, 1.0
        else:
            match["result"] = "draw"
            res_p1, res_p2 = 0.5, 0.5

        p1 = get_student(match["player1"])
        p2 = get_student(match["player2"])

        if p1 and p2:
            elo_p1, elo_p2 = p1.get("elo", 1000), p2.get("elo", 1000)
            k = 32
            exp_p1 = 1 / (1 + 10 ** ((elo_p2 - elo_p1) / 400))
            exp_p2 = 1 / (1 + 10 ** ((elo_p1 - elo_p2) / 400))
            new_elo_p1 = elo_p1 + k * (res_p1 - exp_p1)
            new_elo_p2 = elo_p2 + k * (res_p2 - exp_p2)
            update_student(p1["name"], {"elo": max(800, int(round(new_elo_p1))), "tier": get_tier(max(800, int(round(new_elo_p1))))})
            update_student(p2["name"], {"elo": max(800, int(round(new_elo_p2))), "tier": get_tier(max(800, int(round(new_elo_p2))))})

    tournament["matches"] = matches

    if check_tournament_complete(tournament):
        tournament["status"] = "completed"
        standings = get_standings(get_all_students(), matches)
        if standings:
            winner_name = standings[0]["name"]
            winner = get_student(winner_name)
            if winner:
                new_elo = winner.get("elo", 1000) + 200
                update_student(winner_name, {
                    "elo": new_elo,
                    "tier": get_tier(new_elo),
                    "badge": "Champion"
                })

    save_tournament(tournament)

    return jsonify({
        "match_id": match_id,
        "player1": match["player1"],
        "player2": match["player2"],
        "score1": match.get("points_p1", 0),
        "score2": match.get("points_p2", 0),
        "result": match.get("result")
    })

@app.route('/api/tournament/standings', methods=['GET'])
def standings():
    """Get tournament standings"""
    tournament = get_tournament()
    matches = tournament.get("matches", [])
    players_names = tournament.get("players", [])
    all_students = get_all_students()
    tournament_players = [p for p in all_students if p["name"] in players_names]
    standing_list = get_standings(tournament_players, matches)
    return jsonify(standing_list)

@app.route('/api/tournament/reset', methods=['POST'])
def reset_tournament():
    """Reset the tournament"""
    tournament = {"status": "not_started", "players": [], "matches": [], "results": []}
    save_tournament(tournament)
    return jsonify(tournament)

@app.route('/api/tournament/mymatch', methods=['GET'])
def get_my_match():
    """Get the next pending match for a student"""
    name = request.args.get("name", "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400
    if not student_exists(name):
        return jsonify({"error": f"Student '{name}' not found"}), 404

    tournament = get_tournament()
    matches = tournament.get("matches", [])

    for match in matches:
        if match["player1"] == name and not match.get("played_p1"):
            return jsonify(match)
        if match["player2"] == name and not match.get("played_p2"):
            return jsonify(match)

    return jsonify({})


# ============================================================
# QUIZ ENDPOINTS (original — preserved, now deprecated)
# ============================================================

@app.route('/api/quiz/submit', methods=['POST'])
def submit_quiz_api():
    """Submit a single player quiz result"""
    data = request.json if request.json else {}
    name = data.get("name", "").strip()

    if not name or not student_exists(name):
        return jsonify({"error": "Valid student name is required"}), 400

    try:
        total_q = int(data.get("total_questions", 1))
        correct = int(data.get("correct_answers", 0))
        avg_time = float(data.get("avg_time", 1.0))
        difficulty = data.get("difficulty", "medium")
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid data format"}), 400

    student = get_student(name)
    old_quizzes = int(student.get("quizzes", 0))
    old_accuracy = float(student.get("accuracy", 0))

    new_quizzes = old_quizzes + 1
    current_accuracy = (correct / total_q) * 100 if total_q > 0 else 0
    new_accuracy = ((old_accuracy * old_quizzes) + current_accuracy) / new_quizzes

    player_elo = student.get("elo", 1000)
    opponent_elo = 1200
    if difficulty == "easy": opponent_elo = 800
    if difficulty == "hard": opponent_elo = 1600

    result = correct / total_q if total_q > 0 else 0
    expected = 1 / (1 + 10 ** ((opponent_elo - player_elo) / 400))
    k = 40 if old_quizzes < 10 else 32
    elo_change = int(round(k * (result - expected)))
    new_elo = max(800, player_elo + elo_change)

    process_active_day(student)

    update_student(name, {
        "elo": new_elo,
        "tier": get_tier(new_elo),
        "accuracy": round(new_accuracy, 1),
        "quizzes": int(new_quizzes),
        "activity": student.get("activity", 0) + 1,
        "streak": student.get("streak", 0),
        "last_active_date": student.get("last_active_date")
    })

    updated = get_student(name)
    return jsonify({
        "score": correct,
        "elo_change": elo_change,
        "new_elo": new_elo,
        "student": updated
    })


@app.route('/api/tournament/practice', methods=['POST'])
def tournament_practice():
    """Submit a practice mode result (solo quiz inside tournament)"""
    data = request.json if request.json else {}
    name = data.get("name", "").strip()

    if not name or not student_exists(name):
        return jsonify({"error": "Valid student name is required"}), 400

    try:
        total_q = int(data.get("total_questions", 1))
        correct = int(data.get("correct_answers", 0))
        avg_time = float(data.get("avg_time", 1.0))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid data format"}), 400

    student = get_student(name)
    old_quizzes = float(student.get("quizzes", 0))
    old_accuracy = float(student.get("accuracy", 0))
    old_speed = float(student.get("speed", 1.0))

    new_quizzes = old_quizzes + 1
    current_accuracy = (correct / total_q) * 100 if total_q > 0 else 0
    new_accuracy = ((old_accuracy * old_quizzes) + current_accuracy) / new_quizzes
    new_speed = ((old_speed * old_quizzes) + avg_time) / new_quizzes

    player_elo = student.get("elo", 1000)
    opponent_elo = 1400
    result = correct / total_q if total_q > 0 else 0
    expected = 1 / (1 + 10 ** ((opponent_elo - player_elo) / 400))
    k = 32
    new_elo = max(800, int(round(player_elo + k * (result - expected))))

    student = process_active_day(student)

    update_student(name, {
        "elo": new_elo,
        "tier": get_tier(new_elo),
        "accuracy": round(new_accuracy, 1),
        "quizzes": int(new_quizzes),
        "speed": round(new_speed, 2),
        "activity": student.get("activity", 0) + 1,
        "streak": student.get("streak", 0),
        "last_active_date": student.get("last_active_date")
    })

    updated = get_student(name)
    return jsonify({
        "score": correct,
        "total": total_q,
        "elo_change": new_elo - player_elo,
        "new_elo": new_elo,
        "student": updated
    })


# ============================================================
# STATIC FILE SERVING
# ============================================================

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('js', filename)

@app.route('/', defaults={'page': 'landing.html'})
@app.route('/<page>')
def serve_page(page):
    if page.endswith('.html'):
        try:
            return send_from_directory('.', page)
        except Exception:
            pass
    return send_from_directory('.', 'landing.html')


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error"}), 500


# ============================================================
# SYSTEM ENDPOINTS
# ============================================================

def get_server_ip():
    """Detect server IP — used for display only, not hardcoded"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

@app.route('/api/system/status', methods=['GET'])
def system_status():
    """Get system status"""
    return jsonify({
        "status": "online",
        "phase": 1,
        "version": "1.0.0-phase1"
    })

@app.route('/api/system/reset', methods=['POST'])
def system_reset():
    """Reset the database for demo/testing purposes"""
    db = load_db()
    db["students"] = []
    save_db(db)
    save_tournament({
        "status": "not_started",
        "players": [],
        "matches": [],
        "results": []
    })
    return jsonify({"success": True, "message": "Database successfully reset."})


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == '__main__':
    ip = get_server_ip()
    port = int(os.getenv("PORT", 5000))
    print(f"\n{'='*50}")
    print(f" EduRank — Phase 1 SaaS Foundation")
    print(f"{'='*50}")
    print(f" Landing page: http://127.0.0.1:{port}/landing.html")
    print(f" App (local):  http://127.0.0.1:{port}/")
    print(f" Network:      http://{ip}:{port}/")
    print(f"{'='*50}\n")
    app.run(host='0.0.0.0', debug=True, port=port)
