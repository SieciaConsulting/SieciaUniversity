let player;

document.addEventListener("DOMContentLoaded", function () {
  player = document.getElementById("player");
  const genreSelect = document.getElementById("genreSelect");
  console.log("DOM > ContentLoaded: ", genreSelect.value);

    // get current song, if there is one.
  fetch("/current_song")
  .then(res => res.json())
  .then(data => {
    if (data.current_song) {
      setMedia(data.current_song.filename);
      setSheet(data.current_song.sheet_url);
      console.log("DOM > ContentLoaded > Current Song: ", data.current_song);
    }
  });

  // User changes the genre
  genreSelect.addEventListener("change", () => {
    loadGenre(genreSelect.value);
    console.log("DOM > EventListener > genreSelectCHANGED > ", genreSelect.value);
  });
  loadGenre(genreSelect.value);

  // Song Ends
  if (player) {
    player.addEventListener("ended", () => {
      console.log("Video has ended.");
        fetch("/next_song", {
        method: "POST"
    })
    .then(res => res.json())
    .then(data => {
        if (data.current_song) {

            setMedia(data.current_song.filename);
            setSheet(data.current_song.sheet_url);
        } else {
            console.log("Queue is empty.");
        }

        // Always update the queue display
        if (data.queue_html) {
            document.getElementById("queue").innerHTML = data.queue_html;
        }
    })
    .catch(err => console.error("Error advancing queue:", err));
    })};
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
    .then(data => {
    if (data.queue_html && data.songs_html) {
        document.getElementById("queue").innerHTML = data.queue_html;
        document.getElementById("asl").innerHTML = data.songs_html;
    }

   x = data;
   console.log(x);
   //debugger;


    if (data.current_song) {
        console.log("Setting current song:", data.current_song.filename);
        setMedia(data.current_song.filename);
        setSheet(data.current_song.sheet_url);
    } else {
       // console.warn("No current_song returned from /add_to_queue");
    }
})

    .catch(error => console.error("Error adding to queue:", error));
};

window.togglePlayPause = function () {
  const player = document.getElementById("player");
  const source = document.getElementById("video-source");
  const button = document.getElementById("playPauseBtn");

  console.log("Attempting to play, player is:", player);

  if (!player || !source) {
    console.error("No video player or source element found.");
    return;
  }

  const videoSrc = source.getAttribute("src");
  console.log("Video source is:", videoSrc);

  if (!videoSrc || videoSrc.trim() === "") {
    console.warn("No video loaded yet.");
    return;
  }

  if (!button) {
    console.error("Play/pause button not found.");
    return;
  }

  // Ensure browser recognizes new video source if it's dynamic
  if (player.readyState < 2) {
    console.warn("Player not ready. Reloading...");
    player.load(); // Forces re-evaluation of <source>
  }

  if (player.paused || player.ended) {
    player.play();
    button.textContent = "⏸ Pause";
  } else {
    player.pause();
    button.textContent = "▶ Play";
  }
};



  window.stopPlayback = function () {

  const player = document.getElementById("player");
    if (!player) {
      console.error("playSong error: player element not found.");
      return;
    }

    console.log("Calling stop() on player", player.src);
    player.pause();
    player.currentTime = 0;
  };

  window.restartSong = function () {
    player.currentTime = 0;
    player.play(); // <-- this one works.
  };

  window.clearQueue = function () {
    console.log("Clearing Queue");
    fetch("/clear_queue", { method: "POST" })
      .then(() => {
        const queueList = document.getElementById("queue");
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
        document.getElementById("queue").innerHTML = html;
      });
  };



window.previousSong = function () {
  fetch("/previous_song", { method: "POST" })
    .then((response) => response.json())
    .then((data) => {
      if (data.song?.video) {
        const player = document.getElementById("player");
        player.src = data.song.video;
        player.load();
        player.play();
      }

      if (data.song?.sheet) {
        document.getElementById("sheet-display").src = data.song.sheet;
      }

      // Update the queue UI
      if (data.queue_html) {
        document.getElementById("queue").innerHTML = data.queue_html;
      }
    })
    .catch((error) => console.error("Previous song error:", error));
};



async function nextSong() {
  console.log("nextSong called");
  const response = await fetch("/next_song", { method: "POST" });

  const data = await response.json();
//   debugger;
    console.log("api response: ", data)
  if (!data || !data.current_song) {
    console.warn("No song returned from /next");

    return;
  }

  const player = document.getElementById("player");
  const sheet = document.getElementById("sheet-display");

 const videoPath = "/static/" + data.current_song.filename;
 const sheetPath = data.current_song.sheet_url;

 console.log("Updating player to:", videoPath);
 console.log("Updating sheet to:", sheetPath);

  // KEEP! Cache-busting.
  const timestampedSrc = videoPath + "?t=" + new Date().getTime();
  player.src = timestampedSrc;
  player.load();

  if (sheet) {
    sheet.src = sheetPath;
  } else {
    console.warn("No #sheet element found.");
  }

  // ✅ Update queue UI
  const queueDiv = document.getElementById("queue");
  if (queueDiv && data.queue_html) {
    console.log("Updating Queue: " + data.queue_html)
    queueDiv.innerHTML = data.queue_html;
  }
}

function setMedia(filename) {
    const video = document.getElementById("player");
    const source = document.getElementById("video-source");
    const autoplayToggle = document.getElementById("autoplay-toggle");

    if (!filename || !video || !source) return;

    const videoPath = `/static/${filename}`;
    source.src = videoPath;
    video.load();

   if (autoplayToggle && autoplayToggle.checked) {
        video.play();
    }

    console.log("setMedia > ", filename, " loaded in video player.");
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







