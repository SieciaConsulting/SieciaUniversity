let player;
document.addEventListener("DOMContentLoaded", function () {
  player = document.getElementById("video-player");

  if (typeof songs !== "undefined") {
    console.log("Songs array:", songs);
  } else {
    console.warn("Songs variable not found!");
  }

window.addToQueue = function(songId) {
    const currentGenre = document.getElementById("genre-select")?.value || "";

    fetch(`/add_to_queue?song_id=${songId}&genre=${encodeURIComponent(currentGenre)}`)
        .then(response => response.json())
        .then(data => {
            if (data.queue_html) {
                document.getElementById('queue').innerHTML = data.queue_html;
            }
            if (data.songs_html) {
                document.getElementById('asl').innerHTML = data.songs_html;
            }
        });
};


window.onload = function () {
  fetch('/get_session_state')
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      document.getElementById('queue').innerHTML = data.queue_html;
      if (data.current_song) {
        setMedia(data.current_song.filename);
        setSheet(data.current_song.sheet_url);
      }
    })
    .catch(err => {
      console.error('Error loading session state:', err);
    });
};


window.playSong = function () {
  const player = document.getElementById("player");
  if (!player) {
    console.error("playSong error: player element not found.");
    return;
  }

  console.log("Calling play() on player");
  player.play().catch(err => console.error("Error playing:", err));
};


//player.onended = function () {
//    const currentSong = queue[currentSongIndex];
//    if (currentSong) {
//      fetch("/log_played", {
//        method: "POST",
//        headers: {
//          "Content-Type": "application/json",
//        },
//        body: JSON.stringify({ filename: currentSong.filename }),
//      });
//    }
//    // # get next song data #
//    //start drone track
//    //start metronome
//    //queue up video
//    //queue up song sheet
//};

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
      if (queueList) {
        queueList.innerHTML = '';
      }
      // Optional: also clear played list display if visible
      const playedList = document.getElementById("played-list");
      if (playedList) {
        playedList.innerHTML = '';
      }

      // Optional: reload *after* DOM update
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
});


