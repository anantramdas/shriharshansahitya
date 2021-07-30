/*!
 *  Howler.js Audio Player Demo
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

// Cache references to DOM elements.
var elms = ['togglePlayer','plus10','minus10','audioPlayer','seektime','controlsInner','trackInfo', 'timer', 'duration', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'volumeBtn', 'progress', 'bar', 'wave', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'playerWindow', 'seekbar'];
elms.forEach(function(elm) {
  window[elm] = document.getElementById(elm);
});

/**
 * Player class containing the state of our playlist and where we are in it.
 * Includes all methods for playing, skipping, updating the display, etc.
 * @param {Array} playlist Array of objects with playlist song details ({title, file, howl}).
 */
var Player = function(playlist) {
  this.playlist = playlist;
  this.index = 0;

  // Display the title of the first track.
  trackInfo.innerHTML = '1. ' + playlist[0].title;
};
Player.prototype = {
  /**
   * Play a song in the playlist.
   * @param  {Number} index Index of the song in the playlist (leave empty to play the first or current).
   */
  play: function(index) {
    var self = this;
    var sound;

    index = typeof index === 'number' ? index : self.index;
    var data = self.playlist[index];

    // If we already loaded this track, use the current one.
    // Otherwise, setup and load a new Howl.
    if (data.howl) {
      sound = data.howl;
    } else {
      sound = data.howl = new Howl({
        player: audioPlayer,
        src: data.weblink,
        duration: data.duration,
        html5: true, // Force to HTML5 so that the audio can stream in (best for large files).
        onplay: function() {
          // Display the duration.
          duration.innerHTML = self.formatTime(Math.round(sound.duration()));

          // Start updating the progress of the track.
          requestAnimationFrame(self.step.bind(self));

          // Start the wave animation if we have already loaded
          wave.container.style.display = 'block';
          bar.style.display = 'none';
          pauseBtn.style.display = 'block';
          changeIcon(self.index);
        },
        onload: function() {
          // Start the wave animation.
          wave.container.style.display = 'block';
          bar.style.display = 'none';
          loading.style.display = 'none';
        },
        onloading: function() {
          wave.container.style.display = 'none';
          loading.style.display = 'block';
          playBtn.style.display = 'none';
          pauseBtn.style.display = 'none';
          bar.style.display = 'block';
        },
        onplaying: function() {
          wave.container.style.display = 'block';
          loading.style.display = 'none';
          playBtn.style.display = 'none';
          pauseBtn.style.display = 'block';
          bar.style.display = 'none';
        },
        onend: function() {
          // Stop the wave animation.
          wave.container.style.display = 'none';
          bar.style.display = 'block';
          self.skip('next');
        },
        onpause: function() {
          // Stop the wave animation.
          playBtn.style.display = 'block';
          pauseBtn.style.display = 'none';
          wave.container.style.display = 'none';
          bar.style.display = 'block';
          changeIcon(self.index);
        },
        onstop: function() {
          // Stop the wave animation.
          wave.container.style.display = 'none';
          bar.style.display = 'block';
        },
        onseek: function() {
          // Start updating the progress of the track.
          requestAnimationFrame(self.step.bind(self));
        }
      });
    }

    // Begin playing the sound.
    sound.play();

    // Update the track display.
    trackInfo.innerHTML = (index + 1) + '. ' + data.title;

    // Show the pause button.
    if (sound.state() === 'loaded') {
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'block';
    } else {
      loading.style.display = 'block';
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'none';
    }

    // Keep track of the index we are currently playing.
    self.index = index;
  },

  /**
   * Pause the currently playing track.
   */
  pause: function() {
    var self = this;

    // Get the Howl we want to manipulate.
    var sound = self.playlist[self.index].howl;

    // Puase the sound.
    sound.pause();

    // Show the play button.
    playBtn.style.display = 'block';
    pauseBtn.style.display = 'none';
  },

  /**
   * Skip to the next or previous track.
   * @param  {String} direction 'next' or 'prev'.
   */
  skip: function(direction) {
    var self = this;

    // Get the next track based on the direction of the track.
    var index = 0;
    if (direction === 'prev') {
      index = self.index - 1;
      if (index < 0) {
        index = self.playlist.length - 1;
      }
    } else {
      index = self.index + 1;
      if (index >= self.playlist.length) {
        index = 0;
      }
    }
    listItems[index].scrollIntoView({behavior: "smooth", block: "center"});
    self.skipTo(index);
  },

  /**
   * Skip to a specific track based on its playlist index.
   * @param  {Number} index Index in the playlist.
   */
  skipTo: function(index) {
    var self = this;

    // Stop the current track.
    if (self.playlist[self.index].howl) {
      self.playlist[self.index].howl.stop();
      delete self.playlist[self.index].howl;
    }

    // Reset progress.
    progress.style.width = '0%';
    if (!isPlayerMouseDown) {
      seekbar.style.left = progress.style.width;
    }

    // Play the new track.
    self.play(index);
  },

  /**
   * Set the volume and update the volume slider display.
   * @param  {Number} val Volume between 0 and 1.
   */
  volume: function(val) {
    var self = this;

    // Update the global volume (affecting all Howls).
    Howler.volume(val);

    // Update the display on the slider.
    var barWidth = (val * 90) / 100;
    barFull.style.width = (barWidth * 100) + '%';
    sliderBtn.style.left = (window.innerWidth * barWidth + window.innerWidth * 0.05 - 25) + 'px';
  },

  /**
   * Seek to a new position in the currently playing track.
   * @param  {Number} per Percentage through the song to skip.
   */
  seek: function(per) {
    var self = this;

    // Get the Howl we want to manipulate.
    var sound = self.playlist[self.index].howl;

    // Convert the percent into a seek position.
    if (sound && sound.playing()) {
      sound.seek(sound.duration() * per);
    }
  },

  forward10s: function() {
    this.seekTo(10);
  },

  backward10s: function() {
    this.seekTo(-10);
  },

  seekTo: function(time = 10) {
    var self = this;

    // Get the Howl we want to manipulate.
    var sound = self.playlist[self.index].howl;

    //Convert the percent into a seek position.
    if (sound && sound.playing()) {
      // Determine our current seek position.
      var seek = (sound.seek() || 0) + time;
      seek = time >= 0 ? seek : Math.max(0, seek);
      sound.seek(seek);
      timer.innerHTML = self.formatTime(Math.round(seek));
      progress.style.width = (((seek / sound.duration()) * 100) || 0) + '%';
      if (!isPlayerMouseDown) {
        seekbar.style.left = progress.style.width;
      }
    }
  },

  /**
   * The step called within requestAnimationFrame to update the playback position.
   */
  step: function() {
    var self = this;

    // Get the Howl we want to manipulate.
    var sound = self.playlist[self.index].howl;

    // Determine our current seek position.
    var seek = sound.seek() || 0;
    timer.innerHTML = self.formatTime(Math.round(seek));
    progress.style.width = (((seek / sound.duration()) * 100) || 0) + '%';
    if (!isPlayerMouseDown) {
      seekbar.style.left = progress.style.width;
    }

    // If the sound is still playing, continue stepping.
    if (sound.playing()) {
      requestAnimationFrame(self.step.bind(self));
    }
  },

  /**
   * Format the time from seconds to M:SS.
   * @param  {Number} secs Seconds to format.
   * @return {String}      Formatted time.
   */
  formatTime: function(secs) {
    var minutes = Math.floor(secs / 60) || 0;
    var seconds = (secs - minutes * 60) || 0;

    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }
};

function toggleAudioPlayer() {
  $(playerWindow).toggleClass('mini');
  $(togglePlayer).toggleClass('mini');
}

// Setup our new audio player class and pass it the playlist.
var player = new Player(playlistItems);
var mapper = {
  mouseup: 'touchend',
  mousemove: 'touchmove',
  mousedown: 'touchstart',
  click: 'touchend',
  touchend: 'mouseup',
  touchmove: 'mousemove',
  touchstart: 'mousedown',
}
function touchMouse(element, eventName, funcMouse, funcTouch) {
  var events = eventName.split(' ');
  for (var eName of events) {
    element.addEventListener(eName, funcMouse);
    element.addEventListener(mapper[eName], funcTouch || function(event) {
      funcMouse(event);
      event.preventDefault();
    });
  }
}
touchMouse(controlsInner, 'mouseup mousemove mousedown', function(event) {
  event.stopPropagation();
  event.preventDefault();
});
// Bind our player controls.
touchMouse(playBtn, 'click', function(event) {
  player.play();
});
touchMouse(togglePlayer, 'click', function(event) {
  toggleAudioPlayer();
});
touchMouse(pauseBtn, 'click', function(event) {
  player.pause();
});
touchMouse(prevBtn, 'click', function(event) {
  player.skip('prev');
});
touchMouse(nextBtn, 'click', function(event) {
  player.skip('next');
});
touchMouse(minus10, 'click', function(event) {
  player.backward10s();
});
touchMouse(plus10, 'click', function(event) {
  player.forward10s();
});
var isPlayerMouseDown = false;
var playerWidth = 0;
var currentSound, soundDuration;

var eventMap = {
  mousedown: function (clientX) {
    var self = player;
    currentSound = player.playlist[player.index].howl;
    //Convert the percent into a seek position.
    if (currentSound && currentSound.playing()) {
      soundDuration = currentSound.duration();
      isPlayerMouseDown = true;
      playerWidth = window.innerWidth;
      seekbar.style.left = (clientX * 100 / playerWidth) + '%';
    }
    event.stopPropagation();
    event.preventDefault();
  },
  mouseup: function(clientX) {
    event.stopPropagation();
    event.preventDefault();
    if (isPlayerMouseDown) {
      isPlayerMouseDown = false;
      player.seek((clientX / window.innerWidth));
      currentSound.play();
      seektime.style.display = 'none';
    }
  },
  mousemove: function (clientX) {
    if (isPlayerMouseDown) {
      event.stopPropagation();
      event.preventDefault();
      seekbar.style.left = (clientX * 100 / playerWidth) + '%';
      var seekPercent = clientX / playerWidth;
      seektime.style.display = 'inline-block';
      if (seekPercent > 0.2) {
        seektime.classList.add('to-right');
      } else {
        seektime.classList.remove('to-right');
      }
      seektime.innerHTML = player.formatTime(Math.round((seekPercent) * soundDuration));
    }
  },
}
touchMouse(playerWindow, 'mousedown mousemove mouseup', function(event, eventName) {
  eventMap[event.type](event.clientX);
}, function(event) {
  if (event.type == 'touchend') {
    eventMap[mapper[event.type]](event.changedTouches[0].clientX);
  } else {
    eventMap[mapper[event.type]](event.touches[0].clientX);
  }
});

// Setup the "waveform" animation.
var wave = new SiriWave({
  container: waveform,
  width: window.innerWidth,
  height: window.innerHeight * 0.3,
  cover: true,
  speed: 0.03,
  amplitude: 0.7,
  frequency: 2
});
wave.start();

// Update the height of the wave animation.
// These are basically some hacks to get SiriWave.js to do what we want.
var resize = function() {
  var height = window.innerHeight * 0.3;
  var width = window.innerWidth;
  wave.height = height;
  wave.height_2 = height / 2;
  wave.MAX = wave.height_2 - 4;
  wave.width = width;
  wave.width_2 = width / 2;
  wave.width_4 = width / 4;
  wave.canvas.height = height;
  wave.canvas.width = width;

  // Update the position of the slider.
  var sound = player.playlist[player.index].howl;
  if (sound) {
    var vol = sound.volume();
    var barWidth = (vol * 0.9);
    // sliderBtn.style.left = (window.innerWidth * barWidth + window.innerWidth * 0.05 - 25) + 'px';
  }
};
window.addEventListener('resize', resize);
resize();