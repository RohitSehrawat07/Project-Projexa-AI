import json
import os
from datetime import datetime

DB_FILE = "data.json"

def load_db():
    """Load database from JSON file"""
    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r') as f:
            return json.load(f)
    return {"students": [], "tournament": {"status": "not_started", "matches": [], "results": []}}

def save_db(data):
    """Save database to JSON file"""
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def get_all_students():
    """Get all students"""
    db = load_db()
    return db.get("students", [])

def get_student(name):
    """Get a specific student by name"""
    students = get_all_students()
    for student in students:
        if student["name"].lower() == name.lower():
            return student
    return None

def student_exists(name):
    """Check if student exists"""
    return get_student(name) is not None

def add_student(name):
    """Add a new student with default values"""
    if student_exists(name):
        return False
    
    db = load_db()
    new_student = {
        "name": name,
        "elo": 1000,
        "tier": "Bronze",
        "accuracy": 0.0,
        "streak": 0,
        "speed": 0.0,
        "activity": 0,
        "quizzes": 0,
        "badge": "None",
        "last_active_date": None,
        "daily_completions": {}
    }
    db["students"].append(new_student)
    save_db(db)
    return True

def update_student(name, data):
    """Update a student's data"""
    db = load_db()
    students = db.get("students", [])
    
    for i, student in enumerate(students):
        if student["name"].lower() == name.lower():
            # Update allowed fields
            allowed_fields = ["elo", "tier", "accuracy", "streak", "speed", "activity", "quizzes", "badge", "last_active_date", "daily_completions"]
            for field in allowed_fields:
                if field in data:
                    student[field] = data[field]
            students[i] = student
            db["students"] = students
            save_db(db)
            return True
    return False

def get_tier(elo):
    """Get tier based on ELO rating"""
    if elo < 1200:
        return "Bronze"
    elif elo < 1400:
        return "Silver"
    elif elo < 1600:
        return "Gold"
    elif elo < 1800:
        return "Platinum"
    else:
        return "Diamond"

def get_tournament():
    """Get tournament data"""
    db = load_db()
    return db.get("tournament", {"status": "not_started", "matches": [], "results": []})

def save_tournament(tournament_data):
    """Save tournament data"""
    db = load_db()
    db["tournament"] = tournament_data
    save_db(db)

def get_student_rating(elo):
    """Get rating percentage based on ELO"""
    base = 1200
    if elo >= base:
        return min(100, (elo - base) / 10 + 50)
    else:
        return max(0, 50 - (base - elo) / 10)
