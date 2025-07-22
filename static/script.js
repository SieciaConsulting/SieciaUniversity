<script>
let player;
document.addEventListener("DOMContentLoaded", function () {
  player = document.getElementById("video-player");

 if (typeof songs !== "undefined") {
    console.log("Songs array:", songs);
  } else {
    console.warn("Songs variable not found!");
  }

  console.log("DOM Ready");
  console.log("Queue snapshot from backend:", {{ queue | tojson }});
  console.log("Current song:", "{{ current_song }}");

  window.playSong = function (genre, filename) {
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

  window.clearQueue = function clearQueue() {
    console.log("Clearing Queue");
    fetch("/clear_queue", { method: "POST" }).then(() => location.reload());
  };

  window.addToQueue = function (genre, filename) {
   console.log("Adding to queue:", song);
  fetch("/add-to-queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ genre, filename }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        if (data.was_empty) {
          playSong(genre, filename); // Start immediately if it was the first song
        } else {
          location.reload();
        }
      }
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
    console.log("removeFromQueue called with:", filename);
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
</script>