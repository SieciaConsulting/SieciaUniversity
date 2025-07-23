import sqlite3

from flask import Flask, render_template, request, session, jsonify, send_from_directory, request, url_for
from models import db
from db import init_db, scan_and_populate

import os, logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

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
def index(): #The index route should only show current state, not change it. -Relay

    played = session.get('played', [])
    queue = session.get('queue', [])
    if queue:
        current_song = session.get('current_song', None)

    current_song = None
    selected_genre = request.args.get("genre", "")
    all_songs = get_all_songs()  # This should return all rows as dicts
    queued_filenames = {q['filename'] for q in queue}
    genres = sorted(set(song['genre'] for song in all_songs if song.get('genre')))

    # Filter songs for display
    if selected_genre:
        songs = [s for s in all_songs if s.get("genre") == selected_genre]
    else:
        songs = all_songs

    songs = [s for s in songs if s['filename'].split('/')[-1] not in queued_filenames]

    log_session_state("index() call")
    return render_template(
        "index.html",
        songs=songs,
        queue=queue,
        genres=genres,
        genre=selected_genre,
        current_song=current_song if queue else None  # Safe conditional
    )


@app.route('/add-to-queue', methods=['POST'])
def add_to_queue():
    data = request.get_json()
    genre = data['genre']
    filename = data['filename']

    if filename.startswith(f"{genre}/"):
        filename = filename[len(genre) + 1:]

    queue = session.get('queue', [])
    was_empty = len(queue) == 0

    queue.append({'genre': genre, 'filename': filename})
    session['queue'] = queue

    # If it's the first item, mark it as current
    if was_empty:
        session['current_song'] = {'genre': genre, 'filename': filename}



    session.modified = True
    log_session_state("add_to_queue() call")
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

    log_session_state("remove_from_queue() call")
    return jsonify({"success": True})

@app.route("/music/<genre>/<filename>")
def serve_media(genre, filename):
    return send_from_directory(os.path.join(MUSIC_ROOT, genre), filename)

@app.route('/get-next-song', methods=['POST'])
def get_next_song():
    data = request.get_json()
    song_filename = data.get('filename')  # Should include .mp4

    song_filename = data.get('filename')
    if song_filename and not song_filename.endswith(".mp4"):
        song_filename += ".mp4"

    if not song_filename:
        return jsonify({'error': 'Missing filename'}), 400

    # Look up song in database
    conn = sqlite3.connect("songs.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM songs WHERE filename = ?", (song_filename,))
    song = cursor.fetchone()
    conn.close()

    if not song:
        return jsonify({'error': 'Song not found in database'}), 404

    genre = song['genre']
    base_filename = song['filename'].rsplit('.', 1)[0]

    log_session_state("get_next_song() call")
    return jsonify({
        'video': url_for('static', filename=f"{genre}/{song['filename']}"),
        'sheet': url_for('static', filename=f"{genre}/{base_filename}.png")
    })


@app.route('/songs')
def get_songs():
    conn = sqlite3.connect("songs.db")
    c = conn.cursor()
    c.execute("SELECT * FROM songs")
    rows = c.fetchall()
    conn.close()
    return jsonify(rows)

def get_all_songs():
    base_path = os.path.join("static")
    excluded_dirs = {"Drone", "Extras"}

    songs = []

    for genre_dir in os.listdir(base_path):
        genre_path = os.path.join(base_path, genre_dir)
        if not os.path.isdir(genre_path) or genre_dir in excluded_dirs:
            continue

        for filename in os.listdir(genre_path):
            if filename.endswith(".mp4"):
                # Parse song and artist from filename
                parts = filename.rsplit(" - ", 1)
                title = parts[0] if len(parts) > 0 else filename
                artist = parts[1].rsplit(".", 1)[0] if len(parts) > 1 else ""

                songs.append({
                    "filename": f"{genre_dir}/{filename}",
                    "genre": genre_dir,
                    "title": title,
                    "artist": artist,
                })
    log_session_state("get_all_songs() call")
    return songs


@app.route('/clear_queue', methods=['POST'])
def clear_queue():
    available = session.get('available_songs', [])
    queue = session.get('queue', [])

    # Restore queued songs to available_songs
    available += queue
    session['available_songs'] = available

    # Clear session state
    session['queue'] = []
    session['played'] = []
    session['current_song'] = None
    session.modified = True

    log_session_state("clear_queue_call()")
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
    log_session_state("next_song() call")
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

@app.route("/log_played", methods=["POST"])
def log_played():
    data = request.json
    filename = data.get("filename")
    if filename:
        # Optional: write to a "played_songs" table or append to a text log
        with open("played_log.txt", "a") as f:
            f.write(f"{filename}\n")
        return jsonify({"status": "success"})
    return jsonify({"status": "error"}), 400

@app.route('/show-queue')
def show_queue():
    return jsonify(session.get('queue', []))

@app.route('/played')
def show_played():
    played = session.get('played', [])
    return render_template('played.html', played=played)

def log_session_state(label="SESSION STATE"):
    logger.debug(f"\n--- {label} ---")
    # logger.debug(f"Available: {session.get('available_songs')}")
    logger.debug(f"Queue: {session.get('queue')}")
    logger.debug(f"Played: {session.get('played')}")
    logger.debug(f"Current Song: {session.get('current_song')}")
    logger.debug("--- END ---\n")

@app.route('/session-dump')
def session_dump():
    return jsonify({k: v for k, v in session.items()})


@app.route('/debug')
def debug_page():
    return render_template('debug.html', session_data=dict(session))

# @app.route('/queue-html')
# def queue_html():
#     queue = session.get('queue', [])
#     return render_template("partials/queue.html", queue=queue)



if __name__ == "__main__":
    app.run(debug=True)
