from flask import Flask, render_template, request, session, jsonify, send_from_directory, request, url_for
import os

app = Flask(__name__)
app.secret_key = "your_secret_key_here"  # Required for session
MUSIC_ROOT = os.path.join("static")

# @app.route('/')
# def index():
#     global queue, available_songs, current_song
#     if queue:
#         current_song = queue[0]
#     else:
#         current_song = None  # No song in queue
#     # return render_template('index.html',
#     #                        available_songs=available_songs,
#     #                        queue=queue,
#     #                        current_song=current_song)
#
#     genre = request.args.get("genre", "Chill")
#     genres = [d for d in os.listdir(MUSIC_ROOT) if os.path.isdir(os.path.join(MUSIC_ROOT, d))]
#
#     genre_path = os.path.join(MUSIC_ROOT, genre)
#     try:
#         songs = [f for f in os.listdir(genre_path) if f.endswith((".mp3", ".mp4"))]
#     except FileNotFoundError:
#         songs = []
#
#     # Init session variables
#     if "played" not in session:
#         session["played"] = []
#     if "queue" not in session:
#         session["queue"] = []
#
#     # Filter out played songs
#     played = session["played"]
#     songs = [s for s in songs if s not in played]
#
#     current_song = songs[0] if songs else None
#     queue = session["queue"] or []
#
#
#     return render_template("index.html",
#                            genre=genre,
#                            genres=genres,
#                            songs=songs,
#                            queue=queue,
#                            current_song=songs[0] if songs else None)
@app.route('/')
def index():
    genre = request.args.get("genre", "Chill")
    genres = [d for d in os.listdir(MUSIC_ROOT) if os.path.isdir(os.path.join(MUSIC_ROOT, d))]

    genre_path = os.path.join(MUSIC_ROOT, genre)
    try:
        songs = [f for f in os.listdir(genre_path) if f.endswith((".mp3", ".mp4"))]
    except FileNotFoundError:
        songs = []

    # Init session variables
    session.setdefault("played", [])
    session.setdefault("queue", [])

    # Filter out played songs
    played = session["played"]
    songs = [s for s in songs if s not in played]

    queue = session["queue"]
    current_song = queue[0] if queue else (songs[0] if songs else None)
    session['current_song'] = current_song

    # Debug output
    print("=== index() called ===")
    print("Genre:", genre)
    print("Session queue:", queue)
    print("Session played:", played)
    print("Available songs:", songs)
    print("Resolved current_song:", current_song)
    print("======================")

    return render_template("index.html",
                           genre=genre,
                           genres=genres,
                           songs=songs,
                           queue=queue,
                           current_song=current_song)


@app.route("/add-to-queue", methods=["POST"])
def add_to_queue():
    data = request.json
    genre = data.get("genre")
    filename = data.get("filename")
    session.setdefault("queue", [])
    session.setdefault("played", [])

    if filename not in session["queue"]:
        session["queue"].append(filename)
    if filename not in session["played"]:
        session["played"].append(filename)
    session.modified = True
    return jsonify(success=True)

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
        'video': url_for('static', filename=f"{genre}/{song_filename}.mp4"),
        'sheet': url_for('static', filename=f"{genre}/{song_filename}.png")
    })

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
