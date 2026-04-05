import itertools
from database import get_all_students, update_student, get_tournament, save_tournament

def calculate_elo_change(winner_elo, loser_elo, k=32):
    """Calculate ELO change using standard chess formula"""
    expected_winner = 1 / (1 + 10 ** ((loser_elo - winner_elo) / 400))
    expected_loser = 1 / (1 + 10 ** ((winner_elo - loser_elo) / 400))
    
    winner_change = k * (1 - expected_winner)
    loser_change = -k * (1 - expected_loser)
    
    return int(round(winner_change)), int(round(loser_change))

def generate_round_robin_matches(players):
    """Generate all matches for round-robin tournament"""
    matches = []
    player_names = [p["name"] for p in players]
    
    for player1, player2 in itertools.combinations(player_names, 2):
        match = {
            "player1": player1,
            "player2": player2,
            "result": None,
            "points_p1": 0,
            "points_p2": 0
        }
        matches.append(match)
    
    return matches

def get_standings(players, results):
    """Calculate standings based on match results"""
    standings = {}
    
    for player in players:
        standings[player["name"]] = {
            "name": player["name"],
            "elo": player["elo"],
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "points": 0
        }
    
    for result in results:
        if result["result"] is None:
            continue
            
        p1 = result["player1"]
        p2 = result["player2"]
        
        if result["result"] == "draw":
            standings[p1]["draws"] += 1
            standings[p2]["draws"] += 1
            standings[p1]["points"] += 1
            standings[p2]["points"] += 1
        elif result["result"] == p1:
            standings[p1]["wins"] += 1
            standings[p2]["losses"] += 1
            standings[p1]["points"] += 3
        elif result["result"] == p2:
            standings[p2]["wins"] += 1
            standings[p1]["losses"] += 1
            standings[p2]["points"] += 3
    
    # Sort by points (descending), then by ELO
    sorted_standings = sorted(
        standings.values(),
        key=lambda x: (-x["points"], -x["elo"])
    )
    
    return sorted_standings

def check_tournament_complete(tournament):
    """Check if all matches are completed"""
    matches = tournament.get("matches", [])
    
    if not matches:
        return False
    
    for match in matches:
        if match.get("result") is None:
            return False
    
    return True

def award_champion(name):
    """Award champion badge and bonus ELO"""
    update_student(name, {
        "badge": "Tournament Champion",
        "elo": None  # Will be updated in app.py after ELO calculation
    })

def submit_match_result(player1, player2, result_type):
    """
    Submit a match result and update ELO ratings
    result_type: 'player1_wins', 'player2_wins', or 'draw'
    """
    players = get_all_students()
    p1_data = next((p for p in players if p["name"] == player1), None)
    p2_data = next((p for p in players if p["name"] == player2), None)
    
    if not p1_data or not p2_data:
        return False
    
    # Calculate ELO changes
    if result_type == "player1_wins":
        elo_change_p1, elo_change_p2 = calculate_elo_change(p1_data["elo"], p2_data["elo"])
    elif result_type == "player2_wins":
        elo_change_p2, elo_change_p1 = calculate_elo_change(p2_data["elo"], p1_data["elo"])
    else:  # draw
        # In a draw, both players gain/lose equally
        k = 32
        expected_p1 = 1 / (1 + 10 ** ((p2_data["elo"] - p1_data["elo"]) / 400))
        elo_change_p1 = int(round(k * (0.5 - expected_p1)))
        elo_change_p2 = -elo_change_p1
    
    # Update ELO
    new_elo_p1 = max(800, p1_data["elo"] + elo_change_p1)
    new_elo_p2 = max(800, p2_data["elo"] + elo_change_p2)
    
    # Update students
    from database import get_tier
    update_student(player1, {
        "elo": new_elo_p1,
        "tier": get_tier(new_elo_p1)
    })
    update_student(player2, {
        "elo": new_elo_p2,
        "tier": get_tier(new_elo_p2)
    })
    
    return True
