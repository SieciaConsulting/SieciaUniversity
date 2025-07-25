from flask import Flask, render_template, request, session, jsonify, send_from_directory, request, url_for
from models import db
from db import init_db, scan_and_populate
import os, logging, sqlite3

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

@app.route("/")
def home():
    genre = request.args.get("genre", "Chill")
    exclude = {"Drone", "Extra"}
    genres = [d for d in os.listdir(MUSIC_ROOT)
              if os.path.isdir(os.path.join(MUSIC_ROOT, d)) and d not in exclude]

    genre_path = os.path.join(MUSIC_ROOT, genre)
    try:
        songs = [f for f in os.listdir(genre_path) if f.endswith((".mp3", ".mp4"))]
    except FileNotFoundError:
        songs = []

    # Init session variables
    if "played" not in session:
        session["played"] = []
    if "queue" not in session:
        session["queue"] = []

    # Filter out played songs
    played = session["played"]
    songs = [s for s in songs if s not in played]

    current_song = songs[0] if songs else None
    queue = session["queue"] or []

    log_session_state("home/index()")
    return render_template("index.html",
                           genre=genre,
                           genres=genres,
                           songs=songs,
                           queue=queue,
                           current_song=songs[0] if songs else None)

@app.route('/add_to_queue', methods=['POST'])
def add_to_queue():
    data = request.get_json()
    logger.debug("add_to_queue > Body: %s", data)

    song_id = str(data.get("id"))
    genre = data.get("genre")

    all_songs = get_all_songs()
    song = next((s for s in all_songs if str(s.get('id')) == song_id), None)

    if not song:
        return jsonify({'error': 'Song not found'}), 404

    filename = song['filename']

    queue = session.get("queue", [])
    if not any(s['filename'] == filename for s in queue):
        queue.append(song)
        session["queue"] = queue

    # Set current_song only if it's not already set
    current_song = session.get("current_song")
    is_first_song = False
    if not current_song:
        session["current_song"] = song
        current_song = song
        is_first_song = True

    # Build filtered list of available songs (excluding queue)
    queued_filenames = {s['filename'] for s in queue}
    available_songs = [
        s for s in all_songs
        if s['filename'] not in queued_filenames and (not genre or s.get('genre') == genre)
    ]

    queue_html = render_template('queue.html', queue=queue)
    songs_html = render_template('available_song_list.html', songs=available_songs)

    response = {
        "queue_html": queue_html,
        "songs_html": songs_html,
        "queue_length": len(queue)
    }

    if is_first_song:
        sheet_url = url_for('static', filename=current_song['filename'].replace(".mp4", ".png"))
        response["current_song"] = {
            "filename": current_song["filename"],
            "sheet_url": sheet_url
        }

    return jsonify(response)



def get_all_songs():
    db_path = os.path.join(os.path.dirname(__file__), "songs.db")
    excluded_dirs = {"Drone", "Extras"}

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, artist, genre, filename FROM songs")
    all_db_songs = cursor.fetchall()
    conn.close()

    songs = []

    for song in all_db_songs:
        filename = song["filename"]
        genre = song["genre"]

        if not filename:
            continue

        # Extract genre if missing
        if not genre:
            genre = filename.split('/')[0]

        if genre in excluded_dirs:
            continue

        filepath = os.path.join("static", filename)
        if os.path.exists(filepath):
            songs.append({
                "id": song["id"],
                "title": song["title"],
                "artist": song["artist"],
                "genre": genre,
                "filename": filename
            })
    songs.sort(key=lambda x: x["title"].lower())
    log_session_state("get_all_songs() with inferred genres")
    return songs

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

@app.route('/next_song', methods=['POST'])
def next_song():
    queue = session.get("queue", [])
    if not queue:
        session["current_song"] = None
        return jsonify({"current_song": None, "queue_html": render_template("queue.html", queue=[])})

    # Remove first song
    played_song = queue.pop(0)
    session["queue"] = queue

    # Set new current song
    next_song = queue[0] if queue else None
    session["current_song"] = next_song

    response = {
        "queue_html": render_template("queue.html", queue=queue),
        "current_song": None
    }

    if next_song:
        sheet_url = url_for("static", filename=next_song['filename'].replace(".mp4", ".png"))
        response["current_song"] = {
            "filename": next_song["filename"],
            "sheet_url": sheet_url
        }

    return jsonify(response)

@app.route('/current_song')
def current_song():
    song = session.get("current_song")
    if song:
        sheet_url = url_for("static", filename=song["filename"].replace(".mp4", ".png"))
        return jsonify({
            "current_song": {
                "filename": song["filename"],
                "sheet_url": sheet_url
            }
        })
    return jsonify({"current_song": None})


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

@app.route('/get_session_state')
def get_session_state():
    genre = request.args.get("genre")
    all_songs = get_all_songs()

    # Rehydrate full song dicts if session only stored filenames
    raw_queue = session.get("queue", [])
    queue = []

    for item in raw_queue:
        if isinstance(item, dict):
            queue.append(item)
        elif isinstance(item, str):
            song = next((s for s in all_songs if s["filename"] == item), None)
            if song:
                queue.append(song)

    # Save upgraded queue back into session
    session["queue"] = queue

    queued_filenames = {s["filename"] for s in queue}
    available_songs = [
        s for s in all_songs
        if s["filename"] not in queued_filenames and (not genre or s.get("genre") == genre)
    ]

    queue_html = render_template("queue.html", queue=queue)
    songs_html = render_template("available_song_list.html", songs=available_songs)

    current_song = session.get("current_song")

    print("Genre filter:", genre)
    print("Session Queue:", session.get("queue"))

    return jsonify({
        "queue_html": queue_html,
        "songs_html": songs_html,
        "current_song": current_song
    })

def log_session_state(label="SESSION STATE", genre=None):
    logger.debug(f"\n--- {label} ---")
    #logger.debug(f"Available: {session.get('available_songs')}")
    logger.debug(f"Genre: {genre}")
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
