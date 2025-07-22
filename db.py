import os
import sqlite3
import re

DB_PATH = "songs.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Create table with nullable fields
    c.execute("""
        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT UNIQUE,
            title TEXT,
            artist TEXT,
            genre TEXT,
            music_key TEXT,
            tuning TEXT,
            pickup TEXT,
            gain TEXT,
            bpm INTEGER,
            notes TEXT
        );
    """)

    conn.commit()
    conn.close()


def scan_and_populate(static_folder="static"):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Walk through static folder
    for root, dirs, files in os.walk(static_folder):
        for file in files:
            if file.endswith(".mp4"):
                filepath = os.path.join(root, file)
                filename = os.path.relpath(filepath, static_folder)

                # Parse "{title} - {artist}.mp4"
                match = re.match(r"(.+?) - (.+?)\.mp4$", file)
                if match:
                    title, artist = match.groups()
                else:
                    title = file.replace(".mp4", "")
                    artist = None

                # Insert if not already present
                c.execute("SELECT id FROM songs WHERE filename = ?", (filename,))
                if not c.fetchone():
                    c.execute("""
                        INSERT INTO songs (filename, title, artist)
                        VALUES (?, ?, ?)
                    """, (filename, title.strip(), artist.strip() if artist else None))

    conn.commit()
    conn.close()

