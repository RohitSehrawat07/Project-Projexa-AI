from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
from database import (
    load_db, save_db, get_all_students, get_student, update_student, add_student,
    get_tier, get_tournament, save_tournament, student_exists
)
from tournament import (
    generate_round_robin_matches, get_standings, check_tournament_complete,
    submit_match_result
)

app = Flask(__name__)
CORS(app, origins="*")

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def process_active_day(student):
    """Update daily streak and last active date logic"""
    today = datetime.now().date().isoformat()
    yesterday = (datetime.now().date() - timedelta(days=1)).isoformat()
    
    last_active = student.get("last_active_date")
    streak = student.get("streak", 0)
    
    if last_active == today:
        # Already played today, maintain streak
        pass
    elif last_active == yesterday:
        # Played yesterday, increment
        streak += 1
    else:
        # Missed a day (or new), reset streak
        streak = 1
        
    student["streak"] = streak
    student["last_active_date"] = today
    return student

# ============================================================
# STUDENT ENDPOINTS
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
    """Login existing user OR create new user"""
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

@app.route('/api/quiz/submit', methods=['POST'])
def submit_quiz():
    """Submit quiz result and recalculate global stats"""
    data = request.json if request.json else {}
    name = data.get("name", "").strip()
    
    if not name or not student_exists(name):
        return jsonify({"error": "Valid student name is required"}), 400
        
    try:
        total_q = float(data.get("total_questions", 1))
        correct = float(data.get("correct_answers", 0))
        avg_time = float(data.get("avg_time", 1.0))
        difficulty = data.get("difficulty", "medium").lower()
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid numerical data format"}), 400
        
    student = get_student(name)
    
    # Mathematical integrations
    old_quizzes = float(student.get("quizzes", 0))
    old_accuracy = float(student.get("accuracy", 0))
    old_speed = float(student.get("speed", 1.0))
    
    new_quizzes = old_quizzes + 1
    current_accuracy = (correct / total_q) * 100 if total_q > 0 else 0
    new_accuracy = ((old_accuracy * old_quizzes) + current_accuracy) / new_quizzes
    new_speed = ((old_speed * old_quizzes) + avg_time) / new_quizzes
    
    student["quizzes"] = int(new_quizzes)
    student["accuracy"] = round(new_accuracy, 1)
    student["speed"] = round(new_speed, 2)
    student["activity"] = student.get("activity", 0) + 1
    
    student = process_active_day(student)
    
    # Difficulty ELO adjustments
    player_elo = student.get("elo", 1000)
    diff_map = {"easy": 1000, "medium": 1400, "hard": 1800}
    opponent_elo = diff_map.get(difficulty, 1400)
    
    result = correct / total_q if total_q > 0 else 0
    expected = 1 / (1 + 10 ** ((opponent_elo - player_elo) / 400))
    k = 32
    
    new_elo = max(800, int(round(player_elo + k * (result - expected))))
    student["elo"] = new_elo
    student["tier"] = get_tier(new_elo)
    
    # Save back required keys
    update_student(name, {
        "elo": student["elo"],
        "tier": student["tier"],
        "accuracy": student["accuracy"],
        "quizzes": student["quizzes"],
        "speed": student["speed"],
        "activity": student["activity"],
        "streak": student["streak"],
        "last_active_date": student["last_active_date"]
    })
    
    return jsonify(get_student(name))

# ============================================================
# QUESTION BANK
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
# DAILY CHALLENGE ENDPOINTS
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
    
    # Check if already attempted this date
    completions = student.get("daily_completions", {})
    if date in completions:
        return jsonify({"error": "Already attempted this question", "already_attempted": True}), 400
    
    # Get the correct answer
    question = get_daily_question_for_date(date)
    correct = int(answer_index) == question["correct"]
    
    # Calculate ELO change
    today = datetime.now().date().isoformat()
    if correct:
        elo_change = 5 if is_old else 15  # +5 for old, +15 for today
    else:
        elo_change = -5
    
    new_elo = max(800, student.get("elo", 1000) + elo_change)
    
    # Update streak (only for today's question, not old ones)
    if not is_old:
        student = process_active_day(student)
    
    # Record completion
    completions[date] = {"correct": correct, "is_old": is_old, "elo_change": elo_change}
    
    # Update student
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
    
    for i in range(1, 8):  # Past 7 days
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
# TOURNAMENT ENDPOINTS
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
        
    # Standardize result if both players have played
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
            elo_p1 = p1.get("elo", 1000)
            elo_p2 = p2.get("elo", 1000)
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
    tournament = {
        "status": "not_started",
        "players": [],
        "matches": [],
        "results": []
    }
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
            
    return jsonify({}) # Empty object if no match

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
    
    # Update stats
    old_quizzes = float(student.get("quizzes", 0))
    old_accuracy = float(student.get("accuracy", 0))
    old_speed = float(student.get("speed", 1.0))
    
    new_quizzes = old_quizzes + 1
    current_accuracy = (correct / total_q) * 100 if total_q > 0 else 0
    new_accuracy = ((old_accuracy * old_quizzes) + current_accuracy) / new_quizzes
    new_speed = ((old_speed * old_quizzes) + avg_time) / new_quizzes
    
    # ELO calculation — practice uses medium difficulty baseline
    player_elo = student.get("elo", 1000)
    opponent_elo = 1400  # medium difficulty
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

@app.route('/', defaults={'page': 'index.html'})
@app.route('/<page>')
def serve_page(page):
    if page.endswith('.html'):
        try:
            return send_from_directory('.', page)
        except:
            pass
    return send_from_directory('.', 'index.html')

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
# RUN SERVER
# ============================================================

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
