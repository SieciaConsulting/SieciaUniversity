let player;
document.addEventListener("DOMContentLoaded", function () {
  player = document.getElementById("video-player");

  if (typeof songs !== "undefined") {
    console.log("Songs array:", songs);
  } else {
    console.warn("Songs variable not found!");
  }

window.onload = function() {
  // your definitions
};


  window.addToQueue = function addToQueue(genre, filename) {
  debugger;
  console.log("script.js > window.addToQueue: genre:", genre, " filename:", filename);

  if (!genre || !filename) {
    alert("Missing genre or filename!");
    return;
  }

  fetch("/add-to-queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ genre, filename }),
  })
  .then((response) => {
    if (!response.ok) throw new Error("Network response was not OK");
    return response.json();
  })
  .then((data) => {
    console.log("Response from server:", data);
    if (data.was_empty) {
      const videoPath = `/static/${genre}/${filename}`;
      const sheetPath = `/static/${genre}/${filename.replace(".mp4", ".png")}`;

      const source = document.getElementById("video-source");
      source.src = videoPath;
      player.load();
      document.getElementById("sheet-display").src = sheetPath;

      // 🔥 Future drone call here:
      // dronePlayer.src = `/static/drones/${musicKey}.mp4`; dronePlayer.play();
      // metronome.BPM({BPM});
    }
    location.reload();
  })
  .catch((err) => {
    console.error("addToQueue error:", err);
    alert("Failed to queue song. Check console for details.");
  });
}



  player.onended = function () {
    const currentSong = queue[currentSongIndex]; // Update this based on your current queue logic
    if (currentSong) {
      fetch("/log_played", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename: currentSong.filename }),
      });
    }

    playNext(); // Optional: Automatically advance to next song
  };

  window.togglePlayPause = function () {
    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
  };

  window.playSong = function (genre, filename) {
    console.log("playSong calling with:", genre, filename);
    fetch("/get-next-song", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genre: genre, filename: filename }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.video && data.sheet) {
          const source = document.getElementById("video-source");
          source.src = data.video;
          player.load(); // reload video source
          player.play(); // optionally auto-play
          document.getElementById("sheet-display").src = data.sheet;
          console.log("playSong called with:", genre, filename);
        }
      });
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
