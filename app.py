import sqlite3

from flask import Flask, render_template, request, session, jsonify, send_from_directory, request, url_for
from models import db
from db import init_db, scan_and_populate

import os

# Initialize the database
init_db()
scan_and_populate("static")

app = Flask(__name__)
app.secret_key = "your_secret_key_here"  # Required for session
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///songs.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
MUSIC_ROOT = os.path.join("static")

db.init_app(app)
# Create tables once
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    conn = sqlite3.connect("songs.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM songs ORDER BY title ASC')
    rows = c.fetchall()
    conn.close()

    selected_genre = request.args.get("genre", "")  # or None

    if selected_genre:
        songs = [s for s in get_songs if s.get("genre") == selected_genre]
    else:
        songs = get_songs

    songs = get_all_songs(selected_genre)
    genres = sorted(set(song['genre'] for song in songs if song['genre']))

    return render_template("index.html", songs=songs, queue=[], genres=genres, genre=selected_genre)


@app.route('/add-to-queue', methods=['POST'])
def add_to_queue():

    data = request.get_json()
    genre = data['genre']
    filename = data['filename']
    was_empty = len(session.get('queue', [])) == 0

    # session['genre'] = genre
    # session['queue'].append(filename)
    # session.modified = True
    return jsonify(success=True, was_empty=was_empty)


@app.route("/remove_from_queue", methods=["POST"])
def remove_from_queue():
    data = request.get_json()
    print("Received remove_from_queue POST with:", data)
    filename = data.get("filename")
    if "queue" not in session:
        session["queue"] = []
    if filename in session["queue"]:
        print(f"Removing {filename} from queue")
        session["queue"].remove(filename)
        session.modified = True
    return jsonify({"success": True})

@app.route("/music/<genre>/<filename>")
def serve_media(genre, filename):
    return send_from_directory(os.path.join(MUSIC_ROOT, genre), filename)

@app.route('/get-next-song', methods=['POST'])
def get_next_song():
    data = request.get_json()
    genre = data.get('genre')
    song_filename = data.get('filename')

    if not genre or not song_filename:
        return jsonify({'error': 'Missing genre or filename'}), 400

    return jsonify({
        'video': url_for('static', filename=f"{session['genre']}/{song_filename}.mp4"),
        'sheet': url_for('static', filename=f"{genre}/{song_filename}.png")
    })

@app.route('/songs')
def get_songs():
    conn = sqlite3.connect("songs.db")
    c = conn.cursor()
    c.execute("SELECT * FROM songs")
    rows = c.fetchall()
    conn.close()
    return jsonify(rows)

def get_all_songs(genre): # <-- updated to pass in genre
    conn = sqlite3.connect("songs.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM songs ORDER BY title")
    songs = c.fetchall()
    conn.close()
    return songs


@app.route('/clear_queue', methods=['POST'])
def clear_queue():
    # global queue, available_songs, current_song
    session['available_songs'] = session.get('available_songs', []) + session.get('queue', [])
    queue = []
    session['current_song'] = None
    session['queue'] = []
    session['played'] = []
    return ('', 204)

@app.route('/next', methods=['POST'])
def next_song():
    if session["queue"]:
        session["played"].append(session["queue"].pop(0))
    next_song = session["queue"][0] if session["queue"] else None
    if next_song:
        video = url_for('static', filename=f"{session['genre']}/{next_song}")
        sheet = url_for('static', filename=f"{session['genre']}/{next_song[:-4]}.png")
        return jsonify(video=video, sheet=sheet)
    return jsonify(video="", sheet="")

@app.route('/previous', methods=['POST'])
def previous_song():
    if session["played"]:
        previous = session["played"].pop()
        session["queue"].insert(0, previous)
        video = url_for('static', filename=f"{session['genre']}/{previous}")
        sheet = url_for('static', filename=f"{session['genre']}/{previous[:-4]}.png")
        return jsonify(video=video, sheet=sheet)
    return jsonify(video="", sheet="")



if __name__ == "__main__":
    app.run(debug=True)
