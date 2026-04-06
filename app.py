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
        initial_data = {
            "elo": 1000,
            "accuracy": 0,
            "streak": 0,
            "quizzes": 0,
            "speed": 1,
            "activity": 0,
            "tier": get_tier(1000),
            "last_active_date": None
        }
        update_student(name, initial_data)
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
