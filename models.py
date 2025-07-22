from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Song(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), unique=True, nullable=False)
    title = db.Column(db.String(200))
    genre = db.Column(db.String(100))
    music_key = db.Column(db.String(10))  # like F#, A, etc.
    tuning = db.Column(db.String(20))     # like EADGBE, DADGAD

    def to_dict(self):
        return {
            "filename": self.filename,
            "title": self.title,
            "genre": self.genre,
            "music_key": self.music_key,
            "tuning": self.tuning
        }
