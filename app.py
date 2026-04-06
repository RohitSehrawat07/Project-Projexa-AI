from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import (
    load_db, save_db, get_all_students, get_student, update_student, add_student,
    get_tier, get_tournament, save_tournament, student_exists
)
from tournament import (
    generate_round_robin_matches, get_standings, check_tournament_complete,
    award_champion, submit_match_result
)

app = Flask(__name__)
CORS(app, origins="*")

# ============================================================
# STUDENT ENDPOINTS
# ============================================================

@app.route('/api/students', methods=['GET'])
def get_students():
    """Get all students"""
    students = get_all_students()
    return jsonify({
        "status": "success",
        "data": students,
        "count": len(students)
    })

@app.route('/api/students/<name>', methods=['GET'])
def get_student_api(name):
    """Get a specific student"""
    student = get_student(name)
    if student:
        return jsonify({
            "status": "success",
            "data": student
        })
    return jsonify({
        "status": "error",
        "message": f"Student '{name}' not found"
    }), 404

@app.route('/api/login', methods=['POST'])
def login():
    """Login existing user OR create new user"""
    data = request.json if request.json else {}
    name = data.get("name", "").strip()
    
    if not name:
        return jsonify({
            "status": "error",
            "message": "Name is required"
        }), 400
    
    student = get_student(name)
    
    # Login existing user
    if student:
        return jsonify({
            "status": "success",
            "message": "Login successful",
            "data": student
        })
    
    # Create new user if not exists
    if add_student(name):
        student = get_student(name)
        return jsonify({
            "status": "success",
            "message": "Account created successfully",
            "data": student
        }), 201
    else:
        return jsonify({
            "status": "error",
            "message": "Failed to create account"
        }), 500

@app.route('/api/students/<name>', methods=['PUT'])
def update_student_api(name):
    """Update a student"""
    if not student_exists(name):
        return jsonify({
            "status": "error",
            "message": f"Student '{name}' not found"
        }), 404
    
    data = request.json if request.json else {}
    if update_student(name, data):
        student = get_student(name)
        return jsonify({
            "status": "success",
            "message": "Student updated",
            "data": student
        })
    
    return jsonify({
        "status": "error",
        "message": "Failed to update student"
    }), 500

@app.route('/api/elo/update', methods=['POST'])
def update_elo():
    """Update ELO after a quiz/match"""
    data = request.json if request.json else {}
    name = data.get("name", "").strip()
    elo_change = data.get("elo_change", 0)
    
    if not student_exists(name):
        return jsonify({
            "status": "error",
            "message": f"Student '{name}' not found"
        }), 404
    
    student = get_student(name)
    new_elo = max(800, student.get("elo", 1200) + elo_change)
    
    update_student(name, {
        "elo": new_elo,
        "tier": get_tier(new_elo)
    })
    
    updated_student = get_student(name)
    return jsonify({
        "status": "success",
        "message": "ELO updated",
        "data": updated_student
    })

# ============================================================
# TOURNAMENT ENDPOINTS
# ============================================================

@app.route('/api/tournament', methods=['GET'])
def get_tournament_api():
    """Get tournament data"""
    tournament = get_tournament()
    return jsonify({
        "status": "success",
        "data": tournament
    })

@app.route('/api/tournament/join', methods=['POST'])
def join_tournament():
    """Join the tournament"""
    data = request.json if request.json else {}
    name = data.get("name", "").strip()
    
    if not student_exists(name):
        return jsonify({
            "status": "error",
            "message": f"Student '{name}' not found"
        }), 404
    
    tournament = get_tournament()
    
    if tournament.get("status") in ["running", "completed"]:
        return jsonify({
            "status": "error",
            "message": "Tournament is already running or completed"
        }), 400
    
    players = tournament.get("players", [])
    if name in players:
        return jsonify({
            "status": "error",
            "message": f"'{name}' already joined"
        }), 400
    
    players.append(name)
    tournament["players"] = players
    save_tournament(tournament)
    
    return jsonify({
        "status": "success",
        "message": f"'{name}' joined the tournament",
        "data": {
            "players": players,
            "total": len(players)
        }
    })

@app.route('/api/tournament/start', methods=['POST'])
def start_tournament():
    """Start the tournament and generate round robin matches"""
    tournament = get_tournament()
    
    if tournament.get("status") in ["running", "completed"]:
        return jsonify({
            "status": "error",
            "message": "Tournament is already running or completed"
        }), 400
    
    players_names = tournament.get("players", [])
    if len(players_names) < 2:
        return jsonify({
            "status": "error",
            "message": "Need at least 2 players to start tournament"
        }), 400
    
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
    
    return jsonify({
        "status": "success",
        "message": "Tournament started"
    })

@app.route('/api/tournament/submit', methods=['POST'])
def submit_match():
    """Submit a tournament match result"""
    data = request.json if request.json else {}
    match_id = data.get("match_id")
    player = data.get("player")
    score = data.get("score", 0)
    
    tournament = get_tournament()
    if tournament.get("status") != "running":
        return jsonify({"status": "error", "message": "Tournament not running"}), 400
        
    matches = tournament.get("matches", [])
    if match_id is None or not isinstance(match_id, int) or match_id < 0 or match_id >= len(matches):
        return jsonify({"status": "error", "message": "Invalid match_id"}), 400
        
    match = matches[match_id]
    
    if match["player1"] == player:
        match["points_p1"] = score
        match["played_p1"] = True
    elif match["player2"] == player:
        match["points_p2"] = score
        match["played_p2"] = True
    else:
        return jsonify({"status": "error", "message": "Player not in this match"}), 400
        
    # Standardize result if both players have played
    if match.get("played_p1") and match.get("played_p2") and match.get("result") is None:
        if match["points_p1"] > match["points_p2"]:
            match["result"] = match["player1"]
            submit_match_result(match["player1"], match["player2"], "player1_wins")
        elif match["points_p2"] > match["points_p1"]:
            match["result"] = match["player2"]
            submit_match_result(match["player1"], match["player2"], "player2_wins")
        else:
            match["result"] = "draw"
            submit_match_result(match["player1"], match["player2"], "draw")
            
    tournament["matches"] = matches
    
    if check_tournament_complete(tournament):
        tournament["status"] = "completed"
        standings = get_standings(get_all_students(), matches)
        if standings:
            winner = standings[0]["name"]
            award_champion(winner)
            
    save_tournament(tournament)
    return jsonify({"status": "success", "message": "Score submitted"})

@app.route('/api/tournament/standings', methods=['GET'])
def standings():
    """Get tournament standings"""
    tournament = get_tournament()
    matches = tournament.get("matches", [])
    players_names = tournament.get("players", [])
    
    all_students = get_all_students()
    tournament_players = [p for p in all_students if p["name"] in players_names]
    
    standing_list = get_standings(tournament_players, matches)
    return jsonify({
        "status": "success",
        "data": standing_list
    })

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
    return jsonify({
        "status": "success",
        "message": "Tournament reset"
    })

@app.route('/api/tournament/mymatch', methods=['GET'])
def get_my_match():
    """Get the next pending match for a student"""
    name = request.args.get("name", "").strip()
    
    if not student_exists(name):
        return jsonify({
            "status": "error",
            "message": f"Student '{name}' not found"
        }), 404
        
    tournament = get_tournament()
    matches = tournament.get("matches", [])
    
    for match in matches:
        if match["player1"] == name and not match.get("played_p1"):
            return jsonify({"status": "success", "data": match})
        if match["player2"] == name and not match.get("played_p2"):
            return jsonify({"status": "success", "data": match})
            
    return jsonify({
        "status": "success",
        "message": "No pending matches",
        "data": None
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
    return jsonify({
        "status": "error",
        "message": "Endpoint not found"
    }), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({
        "status": "error",
        "message": "Internal server error"
    }), 500

# ============================================================
# RUN SERVER
# ============================================================

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
