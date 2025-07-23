let player;
document.addEventListener("DOMContentLoaded", function () {
  player = document.getElementById("video-player");

  if (typeof songs !== "undefined") {
    console.log("Songs array:", songs);
  } else {
    console.warn("Songs variable not found!");
  }


window.addToQueue = function addToQueue(genre, filename) {
  console.log("script.js > addToQueue: genre:", genre, " filename:", filename);

  if (!genre || !filename) {
    alert("Missing genre or filename!");
    return;
  }
   console.log("body: ", JSON.stringify({ genre, filename }));

//debugger;
  fetch('/add_to_queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ genre, filename })

  })
  .then(response => response.json())
  .then(data => {
    console.log("Added to queue:", data);

    // ✅ Append song to queue UI
    const queueDiv = document.getElementById("queue");
    if (queueDiv) {
      const songDiv = document.createElement("div");
      songDiv.className = "mb-1";
      songDiv.innerHTML = `
        ${filename}
        <button class="btn btn-danger btn-sm ms-2" onclick="removeFromQueue('${genre}', '${filename}')">🗑</button>
      `;
      queueDiv.appendChild(songDiv);
    }

    // ✅ Remove song from ASL UI
    const songId = `${genre}_${filename}`.replace(/[^\w\-]/g, '_');
    const aslLi = document.getElementById(songId);
    if (aslLi && aslLi.parentNode) {
      aslLi.parentNode.removeChild(aslLi);
    }

    // ✅ Set video/sheet
    const videoPath = `/static/${genre}/${filename}`;
    const sheetPath = videoPath.replace('.mp4', '.png');

    const player = document.getElementById("player");
    const source = document.getElementById("video-source");
    const sheet = document.getElementById("sheet-display");

    if (player && source) {
      source.src = videoPath;
      player.load();
    }

    if (sheet) {
      sheet.src = sheetPath;
    }
  })
  .catch(error => {
    console.error('Error adding to queue:', error);
  });
};

// 🔥 Future drone/metronome calls:
        // const musicKey = data.key;
        // const bpm = data.bpm;
        // dronePlayer.src = `/static/drones/${musicKey}.mp4`;
        // dronePlayer.play();
        // metronome.BPM(bpm);


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


//window.onload = function() {
//      console.log("script.js > window.onload: genre:", genre, " filename:", filename);
//      const genre = {{ genre|tojson }};
//      const filename = {{ filename|tojson }};
//      const videoPath = `/static/${genre}/${filename}`;
//      const sheetPath = `/static/${genre}/${filename.replace(".mp4", ".png")}`;
//
//      const source = document.getElementById("video-source");
//      source.src = videoPath;
//      player.load();
//      document.getElementById("sheet-display").src = sheetPath;
//};