import json
import os
import uuid
import random
import string
from datetime import datetime

# ── File paths (absolute, resolved from this file's directory) ──
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(_BASE_DIR, "data.json")
USERS_FILE = os.path.join(_BASE_DIR, "users.json")
CLASSES_FILE = os.path.join(_BASE_DIR, "classes.json")


# ============================================================
# ORIGINAL STUDENT DB (JSON) — Preserved for compatibility
# ============================================================

def load_db():
    """Load student database from JSON file"""
    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r') as f:
            return json.load(f)
    return {"students": [], "tournament": {"status": "not_started", "matches": [], "results": []}}

def save_db(data):
    """Save student database to JSON file"""
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

def add_student(name, user_id=None):
    """Add a new student with default values. Optionally link a user_id.
    Returns True if created, False if already exists.
    """
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
        "daily_completions": {},
        "user_id": user_id  # link to auth user if provided
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
            allowed_fields = [
                "elo", "tier", "accuracy", "streak", "speed",
                "activity", "quizzes", "badge", "last_active_date",
                "daily_completions"
            ]
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


# ============================================================
# NEW: USER ACCOUNTS (Phase 1 SaaS)
# ============================================================

def load_users():
    """Load user accounts"""
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return {"users": []}

def save_users(data):
    """Save user accounts"""
    with open(USERS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def get_user_by_email(email):
    """Find user by email"""
    users = load_users().get("users", [])
    for u in users:
        if u["email"].lower() == email.lower():
            return u
    return None

def get_user_by_id(user_id):
    """Find user by ID"""
    users = load_users().get("users", [])
    for u in users:
        if u["id"] == user_id:
            return u
    return None

def create_user(name, email, password_hash, role):
    """
    Create a new user account.
    Role must be 'teacher' or 'student' — enforced server-side.
    Returns the created user dict, or None if email already exists.
    """
    if get_user_by_email(email):
        return None  # email already taken

    db = load_users()
    new_user = {
        "id": str(uuid.uuid4()),
        "name": name.strip(),
        "email": email.lower().strip(),
        "password_hash": password_hash,
        "role": role,          # 'teacher' or 'student'
        "created_at": datetime.utcnow().isoformat(),
        "class_ids": [],       # classes this user belongs to
        "institution": None,   # optional institution name for teachers
    }
    db["users"].append(new_user)
    save_users(db)

    # Also add to the student game DB if role is student, linking user_id
    if role == "student":
        # Create student profile with linked user_id
        add_student(name.strip(), user_id=new_user["id"])  # store linkage

    return new_user

def update_user(user_id, data):
    """Update allowed user fields"""
    db = load_users()
    users = db.get("users", [])
    allowed = ["name", "institution", "class_ids"]
    for i, u in enumerate(users):
        if u["id"] == user_id:
            for f in allowed:
                if f in data:
                    users[i][f] = data[f]
            db["users"] = users
            save_users(db)
            return users[i]
    return None


# ============================================================
# NEW: CLASSES (Phase 1 SaaS)
# ============================================================

def load_classes():
    """Load classes"""
    if os.path.exists(CLASSES_FILE):
        with open(CLASSES_FILE, 'r') as f:
            return json.load(f)
    return {"classes": []}

def save_classes(data):
    """Save classes"""
    with open(CLASSES_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def generate_join_code():
    """Generate a unique 8-char join code like 'ABC-PY24'"""
    while True:
        letters = ''.join(random.choices(string.ascii_uppercase, k=3))
        digits = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        code = f"{letters}-{digits}"
        # Ensure uniqueness
        classes = load_classes().get("classes", [])
        if not any(c["join_code"] == code for c in classes):
            return code

def create_class(teacher_id, class_name, institution_name, subject=""):
    """
    Create a new class. Returns the class dict.
    Only teachers can call this (enforced at route level).
    """
    db = load_classes()
    join_code = generate_join_code()
    new_class = {
        "id": str(uuid.uuid4()),
        "name": class_name.strip(),
        "institution": institution_name.strip() if institution_name else "",
        "subject": subject.strip(),
        "teacher_id": teacher_id,
        "join_code": join_code,
        "student_ids": [],
        "created_at": datetime.utcnow().isoformat(),
    }
    db["classes"].append(new_class)
    save_classes(db)

    # Add class to teacher's class list
    update_user(teacher_id, {"class_ids": get_user_class_ids(teacher_id) + [new_class["id"]]})

    return new_class

def get_class_by_id(class_id):
    """Get class by ID"""
    classes = load_classes().get("classes", [])
    for c in classes:
        if c["id"] == class_id:
            return c
    return None

def get_class_by_join_code(code):
    """Get class by join code (case-insensitive)"""
    classes = load_classes().get("classes", [])
    for c in classes:
        if c["join_code"].upper() == code.upper():
            return c
    return None

def get_classes_for_teacher(teacher_id):
    """Get all classes owned by a teacher"""
    classes = load_classes().get("classes", [])
    return [c for c in classes if c["teacher_id"] == teacher_id]

def get_classes_for_student(student_id):
    """Get all classes a student is enrolled in"""
    classes = load_classes().get("classes", [])
    return [c for c in classes if student_id in c.get("student_ids", [])]

def get_user_class_ids(user_id):
    """Get list of class IDs for a user"""
    user = get_user_by_id(user_id)
    return user.get("class_ids", []) if user else []


def get_student_by_user_id(user_id):
    """Retrieve a student profile given the linked user_id"""
    students = get_all_students()
    for s in students:
        if s.get("user_id") == user_id:
            return s
    return None

def join_class_with_code(student_id, join_code):
    """
    Add a student to a class using a join code.
    Returns (class_dict, error_message).
    """
    klass = get_class_by_join_code(join_code)
    if not klass:
        return None, "Invalid join code"

    if student_id in klass.get("student_ids", []):
        return klass, "already_joined"

    db = load_classes()
    classes = db.get("classes", [])
    for i, c in enumerate(classes):
        if c["id"] == klass["id"]:
            classes[i]["student_ids"].append(student_id)
            db["classes"] = classes
            save_classes(db)
            # Update user's class list
            update_user(student_id, {"class_ids": get_user_class_ids(student_id) + [klass["id"]]})
            return classes[i], None
    return None, "Error joining class"

def get_students_in_class(class_id):
    """Get full student game data for all students in a class"""
    klass = get_class_by_id(class_id)
    if not klass:
        return []

    result = []
    users_db = load_users().get("users", [])
    student_map = {u["id"]: u for u in users_db if u["role"] == "student"}

    for sid in klass.get("student_ids", []):
        user = student_map.get(sid)
        if user:
            # Also get their game data
            game_data = get_student(user["name"])
            if game_data:
                result.append({**game_data, "user_id": sid, "email": user["email"]})
            else:
                result.append({"name": user["name"], "user_id": sid, "email": user["email"], "elo": 1000, "tier": "Bronze"})
    return result

# ============================================================
# ATTEMPTS (new for class-aware quiz submissions)
# ============================================================

ATTEMPTS_FILE = "attempts.json"

def load_attempts():
    """Load attempts list from JSON file"""
    if os.path.exists(ATTEMPTS_FILE):
        with open(ATTEMPTS_FILE, "r") as f:
            return json.load(f)
    return []

def save_attempts(attempts):
    """Save attempts list to JSON file"""
    with open(ATTEMPTS_FILE, "w") as f:
        json.dump(attempts, f, indent=2)

def add_attempt(attempt):
    """Append a new attempt record"""
    attempts = load_attempts()
    attempts.append(attempt)
    save_attempts(attempts)

