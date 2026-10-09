from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime
import json

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student')  # student or teacher

    # Gamification fields
    elo = db.Column(db.Integer, default=1000)
    tier = db.Column(db.String(20), default='Bronze')
    accuracy = db.Column(db.Float, default=0.0)
    streak = db.Column(db.Integer, default=0)
    speed = db.Column(db.Float, default=0.0)
    activity = db.Column(db.Integer, default=0)
    quizzes = db.Column(db.Integer, default=0)
    badge = db.Column(db.String(30), default='None')
    last_active_date = db.Column(db.Date, nullable=True)
    daily_completions = db.Column(db.Text, nullable=True)  # JSON string of daily challenge completions

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'elo': self.elo,
            'tier': self.tier,
            'accuracy': self.accuracy,
            'streak': self.streak,
            'speed': self.speed,
            'activity': self.activity,
            'quizzes': self.quizzes,
            'badge': self.badge,
            'last_active_date': self.last_active_date.isoformat() if self.last_active_date else None,
            'daily_completions': json.loads(self.daily_completions) if self.daily_completions else {},
        }
