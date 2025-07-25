let player;

document.addEventListener("DOMContentLoaded", function () {

  player = document.getElementById("video-player");
  const genreSelect = document.getElementById("genreSelect");

  console.log("DOM > Genre: ", genreSelect);
  // Setup the event listener for when the user changes the genre
  genreSelect.addEventListener("change", () => {
    loadGenre(genreSelect.value);
    console.log("DOM > EventListener > genreSelectCHANGED > ", genreSelect.value);
  });

  // Initial load (use default genre from template or current value)
  loadGenre(genreSelect.value);
});

function loadGenre(selectedGenre) {
    fetch(`/get_session_state?genre=${encodeURIComponent(selectedGenre)}`)
        .then(res => {
            if (!res.ok) throw new Error("Network response was not ok");
            return res.json();
        })
        .then(data => {
            document.getElementById("queue").innerHTML = data.queue_html;
            if (data.songs_html) {
                document.getElementById("asl").innerHTML = data.songs_html;
            } else {
                document.getElementById("asl").innerHTML = "<p>No songs available</p>";
            }
        })
        .catch(err => {
            console.error("Error loading genre:", err);
        });
}


window.addToQueue = function (button) {
    const songId = button.dataset.id;
    const filename = button.dataset.filename;
    const title = button.dataset.title;
    const artist = button.dataset.artist;
    const genre = button.dataset.genre;
console.log("addToQueue:", genre, title, artist, filename);
    const data = {
        id: songId,
        filename: filename,
        title: title,
        artist: artist,
        genre: genre
    };

    fetch("/add_to_queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return response.json();
    })
    .then(data => {  // Something is off with this logic vvv
        if (data.queue_html && data.songs_html) {
            document.getElementById("queue").innerHTML = data.queue_html;
            document.getElementById("asl").innerHTML = data.songs_html;
        }

        if (data.current_song && data.queue_length === 1) {
            setMedia(data.current_song.filename);
            setSheet(data.current_song.sheet_url);
        } else {
            console.warn("No current_song returned from /add_to_queue");
        }
    })
    .catch(error => console.error("Error adding to queue:", error));
};

//player.onSongEnd(){
// remove song from q
// add song to PlayedSong list
// set current_song=q[0] <-- new first song  in q
// SetMedia > video.load()
// SetSheet > sheetUrl
// // Read from db
// // player.DroneTrack.play({music_key}.mp4)
// // metronome.set({BPM})
// }




  window.playSong = function () {
    const player = document.getElementById("player");
    if (!player) {
      console.error("playSong error: player element not found.");
      return;
    }

    console.log("Calling play() on player", player.src);
    player.play().catch(err => console.error("Error playing:", err));
  };

  window.togglePlayPause = function () {
    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
  };

  window.stopPlayback = function () {
    player.pause();
    player.currentTime = 0;
  };

  window.restartSong = function () {
    player.currentTime = 0;
    player.play();
  };

  window.clearQueue = function () {
    console.log("Clearing Queue");
    fetch("/clear_queue", { method: "POST" })
      .then(() => {
        const queueList = document.getElementById("queue-list");
        if (queueList) queueList.innerHTML = '';

        const playedList = document.getElementById("played-list");
        if (playedList) playedList.innerHTML = '';

        location.reload();
      });
  };

  window.removeFromQueue = function (filename) {
    console.log("Calling removeFromQueue with:", filename);
    fetch("/remove_from_queue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename: filename }),
    })
    .then((response) => {
      if (response.ok) {
        location.reload();
      } else {
        console.error("Failed to remove from queue");
      }
    });
  };

  window.refreshQueueUI = function () {
    fetch("/queue-html")
      .then((res) => res.text())
      .then((html) => {
        document.getElementById("queue-list").innerHTML = html;
      });
  };

  window.previousSong = function () {
    fetch("/previous", { method: "POST" })
      .then((response) => response.json())
      .then((data) => {
        if (data.video && data.sheet) {
          const source = document.getElementById("video-source");
          source.src = data.video;
          player.load();
          player.play();
          document.getElementById("sheet-display").src = data.sheet;
        }
      });
  };

  window.nextSong = function () {
    fetch("/next", { method: "POST" })
      .then((response) => response.json())
      .then((data) => {
        if (data.video && data.sheet) {
          const source = document.getElementById("video-source");
          source.src = data.video;
          player.load();
          player.play();
          document.getElementById("sheet-display").src = data.sheet;
        }
      });
  };

function setMedia(filename) {
    const video = document.getElementById("player");
    const source = document.getElementById("video-source");

    const videoPath = `/static/${filename}`;
    source.src = videoPath;
    video.load();  // Reload with new source
    //video.play()
    //    .then(() => console.log("Video playing:", filename))
    //    .catch(err => console.error("Error playing video:", err));
}

function setSheet(sheetUrl) {
    console.log("Setting sheet to:", sheetUrl); // <- DEBUG
    const sheetViewer = document.getElementById("sheet-display");
    if (sheetViewer) {
        sheetViewer.src = sheetUrl;
    } else {
        console.warn("Sheet viewer not found!");
    }
}







