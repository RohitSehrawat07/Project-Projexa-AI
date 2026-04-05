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
CORS(app)

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
    """Login or create a student"""
    data = request.json
    name = data.get("name", "").strip()
    
    if not name:
        return jsonify({
            "status": "error",
            "message": "Name is required"
        }), 400
    
    student = get_student(name)
    
    if student:
        return jsonify({
            "status": "success",
            "message": "Login successful",
            "data": student
        })
    else:
        return jsonify({
            "status": "error",
            "message": "Account not found. Please create an account."
        }), 404

@app.route('/api/signup', methods=['POST'])
def signup():
    """Create a new student account"""
    data = request.json
    name = data.get("name", "").strip()
    
    if not name:
        return jsonify({
            "status": "error",
            "message": "Name is required"
        }), 400
    
    if student_exists(name):
        return jsonify({
            "status": "error",
            "message": "Account already exists. Please login."
        }), 400
        
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
    
    data = request.json
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
    data = request.json
    name = data.get("name", "").strip()
    elo_change = data.get("elo_change", 0)
    
    if not student_exists(name):
        return jsonify({
            "status": "error",
            "message": f"Student '{name}' not found"
        }), 404
    
    student = get_student(name)
    new_elo = max(800, student["elo"] + elo_change)
    
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
    data = request.json
    name = data.get("name", "").strip()
    
    if not student_exists(name):
        return jsonify({
            "status": "error",
            "message": f"Student '{name}' not found"
        }), 404
    
    tournament = get_tournament()
    
    # Check if tournament is already running
    if tournament.get("status") == "running":
        return jsonify({
            "status": "error",
            "message": "Tournament is already running"
        }), 400
    
    # Check if player already joined
    players = tournament.get("players", [])
    if any(p == name for p in players):
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
    """Start the tournament"""
    tournament = get_tournament()
    
    if tournament.get("status") == "running":
        return jsonify({
            "status": "error",
            "message": "Tournament is already running"
        }), 400
    
    players_names = tournament.get("players", [])
    if len(players_names) < 2:
        return jsonify({
            "status": "error",
            "message": "Need at least 2 players to start tournament"
        }), 400
    
    # Get player objects
    tournament["status"] = "running"
    if "scores" not in tournament:
        tournament["scores"] = {}
    
    save_tournament(tournament)
    
    return jsonify({
        "status": "success",
        "message": "Tournament started"
    })

@app.route('/api/tournament/play', methods=['POST'])
def play_tournament():
    """Submit a single player tournament run score"""
    data = request.json
    name = data.get("name")
    score = data.get("score", 0)
    
    tournament = get_tournament()
    if tournament.get("status") != "running":
        return jsonify({"status": "error", "message": "Tournament not running"}), 400
        
    scores = tournament.get("scores", {})
    scores[name] = scores.get(name, 0) + score
    tournament["scores"] = scores
    
    student = get_student(name)
    if student:
        new_elo = student["elo"] + (score * 15)
        update_student(name, {"elo": new_elo, "tier": get_tier(new_elo)})
        
    save_tournament(tournament)
    return jsonify({"status": "success", "message": "Score submitted"})

@app.route('/api/tournament/standings', methods=['GET'])
def standings():
    """Get tournament standings"""
    tournament = get_tournament()
    scores = tournament.get("scores", {})
    players_names = tournament.get("players", [])
    
    all_students = get_all_students()
    players_dict = {p["name"]: p for p in all_students}
    
    standing_list = []
    for p in players_names:
        student = players_dict.get(p, {})
        standing_list.append({
            "name": p,
            "points": scores.get(p, 0),
            "elo": student.get("elo", 1200)
        })
        
    standing_list.sort(key=lambda x: (-x["points"], -x["elo"]))
    
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
    
    # Find first pending match for this student
    for match in matches:
        if (match["player1"] == name or match["player2"] == name) and match["result"] is None:
            return jsonify({
                "status": "success",
                "data": match
            })
    
    # No pending match
    return jsonify({
        "status": "success",
        "message": "No pending matches",
        "data": None
    })

# ============================================================
# STATIC FILE SERVING
# ============================================================

# Serve static files (CSS, JS)
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('js', filename)

# Serve HTML pages
@app.route('/', defaults={'page': 'index.html'})
@app.route('/<page>')
def serve_page(page):
    if page.endswith('.html'):
        try:
            return send_from_directory('.', page)
        except:
            return send_from_directory('.', 'index.html')
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
    app.run(debug=True, host='localhost', port=5000)
