# =============================================
#  EduRank — config.py
#  Centralized configuration: Plans, Limits, Settings
#  Phase 1: SaaS Foundation
# =============================================

import os

# ── Plan definitions (single source of truth) ──
# Prices are placeholder — update before going live
PLANS = {
    "free": {
        "name": "Free",
        "tagline": "Try EduRank at no cost",
        "price_monthly": 0,
        "price_yearly": 0,
        "price_label": "Free forever",
        "price_note": "",
        "max_classes": 1,
        "max_students_per_class": 30,
        "max_teachers": 1,
        "features": [
            "1 class",
            "Up to 30 students",
            "Basic quizzes",
            "ELO rankings & leaderboard",
            "Daily challenges",
            "Student dashboard",
        ],
        "cta": "Get Started Free",
        "highlighted": False,
    },
    "basic": {
        "name": "Basic",
        "tagline": "For small institutes and individual teachers",
        "price_monthly": 999,       # INR placeholder — not final
        "price_yearly": 9999,       # INR placeholder — not final
        "price_label": "₹999/mo",
        "price_note": "Placeholder — pricing not finalised",
        "max_classes": 10,
        "max_students_per_class": 100,
        "max_teachers": 3,
        "features": [
            "Up to 10 classes",
            "Up to 100 students per class",
            "3 teacher accounts",
            "Full quiz & tournament system",
            "Teacher analytics dashboard",
            "At-risk student alerts",
            "Class leaderboards",
            "Advanced quiz review",
        ],
        "cta": "Start Basic",
        "highlighted": True,       # Recommended plan
    },
    "pro": {
        "name": "Pro",
        "tagline": "For institutions requiring full control",
        "price_monthly": 2999,      # INR placeholder — not final
        "price_yearly": 29999,      # INR placeholder — not final
        "price_label": "₹2,999/mo",
        "price_note": "Placeholder — pricing not finalised",
        "max_classes": -1,          # -1 = unlimited
        "max_students_per_class": -1,
        "max_teachers": -1,
        "features": [
            "Unlimited classes",
            "Unlimited students",
            "Unlimited teacher accounts",
            "All Basic features",
            "Advanced performance analytics",
            "Custom quiz categories",
            "Tournament management",
            "Priority email support",
        ],
        "cta": "Contact Us",
        "highlighted": False,
    },
}

# ── App Settings ──
SECRET_KEY = os.getenv("SECRET_KEY", "edurank-dev-secret-change-in-production")
DATABASE_FILE = os.getenv("DATABASE_FILE", "data.json")
USERS_FILE = os.getenv("USERS_FILE", "users.json")
CLASSES_FILE = os.getenv("CLASSES_FILE", "classes.json")

# ── Join code settings ──
JOIN_CODE_LENGTH = 8   # e.g. "ABC-PY24"

# ── Phase tracking (for internal use) ──
CURRENT_PHASE = 1
PHASE_NOTES = """
Phase 1 — Foundation
- Landing page + pricing
- User accounts (teacher/student) with hashed passwords
- Institution + Class concept + join code flow
- Existing quiz/ELO/leaderboard/tournament preserved
- JSON database (migration to PostgreSQL: Phase 2)
"""
