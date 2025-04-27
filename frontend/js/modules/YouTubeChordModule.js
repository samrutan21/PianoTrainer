/**
 * YouTubeChordModule - YouTube chord detection functionality
 * Handles YouTube URL input, chord detection, and visualization
 */
const YouTubeChordModule = {
    // WebSocket connection
    socket: null,
    
    // Currently detected chord sequence
    chordSequence: [],
    
    // Current video info
    currentVideo: {
      id: null,
      title: null,
      channel: null,
      thumbnailUrl: null
    },
    
    // Playback state
    playback: {
      isPlaying: false,
      startTime: 0,
      currentChordIndex: -1
    },
    
    /**
     * Initialize the YouTube chord module
     */
    init() {
      console.log('YouTubeChordModule: Initializing');
      
      // Set up event listeners
      this.setupEventListeners();
      
      console.log('YouTubeChordModule: Initialized');
      return this;
    },
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
      // Close panel button
      const closeButton = document.getElementById('close-youtube-panel');
      if (closeButton) {
        EventManager.on(closeButton, 'click', () => {
          // Stop any active playback
          this.stopPlayback();
          
          // Hide the YouTube panel
          const youtubePanel = document.getElementById('youtube-panel');
          if (youtubePanel) {
            youtubePanel.style.display = 'none';
            console.log('Hiding YouTube Chord Detection panel');
            
            // Remove active class from the corresponding menu item
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
              if (item.getAttribute('data-target') === 'youtube-panel') {
                item.classList.remove('active');
                console.log('Removed active class from YouTube Chord Detection menu item');
              }
            });
            
            // Update the visible panels state
            const currentPanels = AppState.get('ui.visiblePanels') || [];
            const updatedPanels = currentPanels.filter(id => id !== 'youtube-panel');
            AppState.set('ui.visiblePanels', updatedPanels);
          }
        });
      }
      
      // Detect chords button
      const detectButton = document.getElementById('detect-chords');
      if (detectButton) {
        EventManager.on(detectButton, 'click', () => this.startChordDetection());
      }
      
      // Play detected chords button
      const playButton = document.getElementById('play-detected-chords');
      if (playButton) {
        EventManager.on(playButton, 'click', () => this.togglePlayback());
      }
      
      // Save to song builder button
      const saveButton = document.getElementById('save-detected-chords');
      if (saveButton) {
        EventManager.on(saveButton, 'click', () => this.saveToSongBuilder());
      }
      
      // URL input field - detect on Enter key
      const urlInput = document.getElementById('youtube-url');
      if (urlInput) {
        EventManager.on(urlInput, 'keyup', (e) => {
          if (e.key === 'Enter') {
            this.startChordDetection();
          }
        });
        
        // YouTube ID extraction on paste/input
        EventManager.on(urlInput, 'input', () => {
          const videoId = this.extractYouTubeId(urlInput.value);
          if (videoId) {
            this.previewYouTubeVideo(videoId);
          }
        });
      }
      
      // Add event delegation for chord segment clicks
      const chordTimeline = document.getElementById('chord-timeline');
      if (chordTimeline) {
        EventManager.on(chordTimeline, 'click', (e) => {
          const chordSegment = e.target.closest('.chord-segment');
          if (chordSegment) {
            const index = parseInt(chordSegment.getAttribute('data-index'));
            if (!isNaN(index)) {
              this.playChord(index);
            }
          }
        });
      }
    },
    
    /**
     * Extract YouTube ID from URL
     * @param {string} url - YouTube URL
     * @returns {string|null} YouTube video ID or null if invalid
     */
    extractYouTubeId(url) {
      if (!url) return null;
      
      // Regular expression to extract YouTube ID from various URL formats
      const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
      const match = url.match(regExp);
      
      return (match && match[1].length === 11) ? match[1] : null;
    },
    
    /**
     * Show preview for a YouTube video
     * @param {string} videoId - YouTube video ID
     */
    previewYouTubeVideo(videoId) {
      if (this.currentVideo.id === videoId) return;
      
      this.currentVideo.id = videoId;
      
      // Get video info using oEmbed API (doesn't require API key)
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        .then(response => response.json())
        .then(data => {
          this.currentVideo.title = data.title;
          this.currentVideo.channel = data.author_name;
          this.currentVideo.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
          
          // Update preview
          this.updateVideoPreview();
        })
        .catch(error => {
          console.error('Failed to fetch video information:', error);
        });
    },
    
    /**
     * Update the video preview section
     */
    updateVideoPreview() {
      const previewElement = document.getElementById('youtube-preview');
      if (!previewElement) return;
      
      if (!this.currentVideo.id) {
        previewElement.style.display = 'none';
        return;
      }
      
      // Create preview HTML
      previewElement.innerHTML = `
        <div class="youtube-video-info">
          <div class="youtube-video-title">${this.currentVideo.title || 'Unknown Title'}</div>
          <div class="youtube-channel">by ${this.currentVideo.channel || 'Unknown Channel'}</div>
        </div>
        <img class="youtube-thumbnail" src="${this.currentVideo.thumbnailUrl}" alt="Video thumbnail">
      `;
      
      // Show the preview
      previewElement.style.display = 'flex';
    },
    
    /**
     * Start chord detection for the current YouTube URL
     */
    startChordDetection() {
      const urlInput = document.getElementById('youtube-url');
      const url = urlInput ? urlInput.value.trim() : '';
      
      if (!url) {
        UIManager.showFeedback('Please enter a YouTube URL', 'error');
        return;
      }
      
      const videoId = this.extractYouTubeId(url);
      if (!videoId) {
        UIManager.showFeedback('Invalid YouTube URL', 'error');
        return;
      }
      
      // Show loading state
      document.getElementById('detection-progress').style.display = 'block';
      document.getElementById('youtube-results').style.display = 'none';
      
      // Reset chord data
      this.chordSequence = [];
      
      // Connect to WebSocket server and send detection request
      this.connectWebSocket(videoId);
    },
    
    /**
     * Connect to the Python WebSocket server for chord detection
     * @param {string} videoId - YouTube video ID to analyze
     */
    connectWebSocket(videoId) {
      // Close existing socket if open
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
      
      const wsUrl = this.getWebSocketUrl();
      
      // Set up status
      this.setDetectionStatus('Connecting to chord detection server...');
      this.updateProgressBar(5);
      
      // Ensure audio context is running before proceeding
      if (AudioEngine.context && AudioEngine.context.state === 'suspended') {
        AudioEngine.context.resume().then(() => {
          this.establishWebSocketConnection(wsUrl, videoId);
        }).catch(error => {
          console.error('Failed to resume audio context:', error);
          this.handleWebSocketError();
        });
      } else {
        this.establishWebSocketConnection(wsUrl, videoId);
      }
    },
    
    /**
     * Establish WebSocket connection
     * @param {string} wsUrl - WebSocket URL
     * @param {string} videoId - YouTube video ID
     */
    establishWebSocketConnection(wsUrl, videoId) {
      try {
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          this.setDetectionStatus('Connection established. Sending detection request...');
          this.updateProgressBar(10);
          
          // Send detection request
          this.socket.send(JSON.stringify({
            type: 'detection_request',
            youtube_id: videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`
          }));
        };
        
        this.socket.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.handleWebSocketError();
        };
        
        this.socket.onclose = () => {
          console.log('WebSocket connection closed');
          // Only show error if we were in the middle of detection
          if (this.playback.isPlaying) {
            this.handleWebSocketError();
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        this.handleWebSocketError();
      }
    },
    
    /**
     * Handle WebSocket errors
     */
    handleWebSocketError() {
      this.setDetectionStatus('Error connecting to chord detection server');
      document.getElementById('detection-progress').style.display = 'none';
      UIManager.showFeedback('Failed to connect to chord detection service. Please try again later.', 'error');
      
      // Fall back to local detection if WebSocket fails
      this.simulateChordDetection(this.currentVideo.id);
    },
    
    /**
     * Get the WebSocket server URL
     * @returns {string} WebSocket URL
     */
    getWebSocketUrl() {
      // Default to localhost:8080 for development
      // In production, this would be configured based on deployment environment
      return 'ws://localhost:8080/chords';
    },
    
    /**
     * Handle WebSocket messages from the Python chord detection server
     * @param {MessageEvent} event - WebSocket message event
     */
    handleWebSocketMessage(event) {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'detection_status':
            this.setDetectionStatus(message.status);
            this.updateProgressBar(message.progress || 0);
            break;
            
          case 'metadata':
            // Store song metadata (key, tempo, etc.)
            this.songMetadata = message;
            this.setDetectionStatus(`Detected key: ${message.key}`);
            this.updateProgressBar(60);
            break;
            
          case 'chord_sequence':
            // Process and display detected chords
            this.handleChordSequenceData(message.chords);
            this.updateProgressBar(90);
            break;
            
          case 'detection_complete':
            // Hide progress and show results
            document.getElementById('detection-progress').style.display = 'none';
            document.getElementById('youtube-results').style.display = 'block';
            this.updateProgressBar(100);
            
            // Show success message
            UIManager.showFeedback('Chord detection completed successfully!', 'success');
            break;
            
          case 'error':
            document.getElementById('detection-progress').style.display = 'none';
            this.setDetectionStatus(message.error || 'Error detecting chords');
            UIManager.showFeedback(message.error || 'Error detecting chords', 'error');
            break;
            
          case 'playback_event':
            this.handlePlaybackEvent(message);
            break;
            
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    },
    
    /**
     * Simulate chord detection for testing without the Python backend
     * @param {string} videoId - YouTube video ID
     */
    simulateChordDetection(videoId) {
      this.setDetectionStatus('Simulating chord detection (demo mode)...');
      this.updateProgressBar(10);
      
      // Simulate waiting for download
      setTimeout(() => {
        this.setDetectionStatus('Downloading audio...');
        this.updateProgressBar(30);
        
        // Simulate audio analysis
        setTimeout(() => {
          this.setDetectionStatus('Analyzing audio features...');
          this.updateProgressBar(60);
          
          // Simulate chord detection
          setTimeout(() => {
            this.setDetectionStatus('Identifying chords...');
            this.updateProgressBar(80);
            
            // Generate sample chord data
            const sampleChords = this.generateSampleChordData();
            
            // Process the sample chord data
            this.handleChordSequenceData(sampleChords);
            
            // Hide progress and show results
            document.getElementById('detection-progress').style.display = 'none';
            document.getElementById('youtube-results').style.display = 'block';
            this.updateProgressBar(100);
            
            // Show demo mode notice
            UIManager.showFeedback('Demo mode: Using simulated chord data', 'info', 5000);
          }, 1500);
        }, 1500);
      }, 1500);
    },
    
    /**
     * Generate sample chord data for testing
     * @returns {Array} Sample chord sequence
     */
    generateSampleChordData() {
      // C major chord progression: C - G - Am - F
      return [
        {
          time: 0.0,
          duration: 4.0,
          notes: [60, 64, 67],
          chord: "C:maj"
        },
        {
          time: 4.0,
          duration: 4.0,
          notes: [67, 71, 74],
          chord: "G:maj"
        },
        {
          time: 8.0,
          duration: 4.0,
          notes: [69, 72, 76],
          chord: "A:min"
        },
        {
          time: 12.0,
          duration: 4.0,
          notes: [65, 69, 72],
          chord: "F:maj"
        },
        // Repeat progression
        {
          time: 16.0,
          duration: 4.0,
          notes: [60, 64, 67],
          chord: "C:maj"
        },
        {
          time: 20.0,
          duration: 4.0,
          notes: [67, 71, 74],
          chord: "G:maj"
        },
        {
          time: 24.0,
          duration: 4.0,
          notes: [69, 72, 76],
          chord: "A:min"
        },
        {
          time: 28.0,
          duration: 4.0,
          notes: [65, 69, 72],
          chord: "F:maj"
        }
      ];
    },
    
    /**
     * Handle detected chord sequence data
     * @param {Array} chords - Chord sequence data
     */
    handleChordSequenceData(chords) {
      // Store the chord sequence
      this.chordSequence = chords;
      
      // Update the UI with the detected chords
      this.updateChordTimeline();
      
      // Update status
      const chordCount = chords.length;
      this.setDetectionStatus(
        `Detection complete! Found ${chordCount} chord${chordCount !== 1 ? 's' : ''}.`
      );
    },
    
    /**
     * Handle playback events from the WebSocket server
     * @param {Object} event - Playback event data
     */
    handlePlaybackEvent(event) {
      switch (event.event) {
        case 'playback_started':
          // Update playback UI
          this.playback.isPlaying = true;
          this.playback.startTime = Date.now() - (event.time * 1000);
          break;
          
        case 'chord_active':
          // Highlight active chord
          this.highlightActiveChord(event.chord_index);
          // Play the chord
          this.playChord(event.chord_index, true);
          break;
          
        case 'playback_ended':
          // End playback
          this.stopPlayback();
          break;
      }
    },
    
    /**
     * Update the chord timeline display
     */
    updateChordTimeline() {
      const timelineElement = document.getElementById('chord-timeline');
      if (!timelineElement) return;
      
      if (!this.chordSequence || this.chordSequence.length === 0) {
        timelineElement.innerHTML = '<div class="status-message">No chords detected</div>';
        return;
      }
      
      // Clear existing content
      timelineElement.innerHTML = '';
      
      // Add chord segments
      this.chordSequence.forEach((chord, index) => {
        // Parse the chord name into components
        let rootNote, chordType;
        if (chord.chord === "N") {
          rootNote = "N/A";
          chordType = "No Chord";
        } else if (chord.chord.includes(':')) {
          [rootNote, chordType] = chord.chord.split(':');
        } else {
          rootNote = chord.chord;
          chordType = "major";
        }
        
        // Format time display
        const startTimeFormatted = this.formatTime(chord.time);
        const endTimeFormatted = this.formatTime(chord.time + chord.duration);
        
        // Create chord segment element
        const chordSegment = document.createElement('div');
        chordSegment.className = 'chord-segment';
        chordSegment.setAttribute('data-index', index);
        chordSegment.innerHTML = `
          <button class="chord-play-button">▶</button>
          <div class="chord-name">${rootNote}</div>
          <div class="chord-type">${chordType}</div>
          <div class="chord-time">${startTimeFormatted} - ${endTimeFormatted}</div>
        `;
        
        timelineElement.appendChild(chordSegment);
      });
    },
    
    /**
     * Format time in seconds to MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time (MM:SS)
     */
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    /**
     * Set detection status message
     * @param {string} message - Status message
     */
    setDetectionStatus(message) {
      const statusElement = document.getElementById('detection-status');
      if (statusElement) {
        statusElement.textContent = message;
      }
      
      const progressStatus = document.querySelector('.progress-status');
      if (progressStatus) {
        progressStatus.textContent = message;
      }
    },
    
    /**
     * Update progress bar percentage
     * @param {number} percent - Progress percentage (0-100)
     */
    updateProgressBar(percent) {
      const progressBar = document.getElementById('progress-bar-fill');
      if (progressBar) {
        progressBar.style.width = `${percent}%`;
      }
    },
    
    /**
     * Toggle playback of chord progression
     */
    togglePlayback() {
      if (this.playback.isPlaying) {
        this.stopPlayback();
      } else {
        this.startPlayback();
      }
    },
    
    /**
     * Start playback of detected chord progression
     */
    startPlayback() {
      if (!this.chordSequence || this.chordSequence.length === 0) {
        UIManager.showFeedback('No chord progression to play', 'error');
        return;
      }
      
      // Update button text
      const playButton = document.getElementById('play-detected-chords');
      if (playButton) {
        playButton.innerHTML = '<i class="icon-stop"></i> Stop Playback';
      }
      
      // Set playback state
      this.playback.isPlaying = true;
      this.playback.startTime = Date.now();
      this.playback.currentChordIndex = -1;
      
      // Start playback loop
      this.playbackLoop();
    },
    
    /**
     * Main playback loop
     */
    playbackLoop() {
      if (!this.playback.isPlaying) return;
      
      // Calculate current time in the sequence
      const currentTime = (Date.now() - this.playback.startTime) / 1000;
      
      // Find the chord that should be playing at this time
      let currentChordIndex = -1;
      for (let i = 0; i < this.chordSequence.length; i++) {
        const chord = this.chordSequence[i];
        if (currentTime >= chord.time && currentTime < chord.time + chord.duration) {
          currentChordIndex = i;
          break;
        }
      }
      
      // If a new chord should be playing
      if (currentChordIndex !== -1 && currentChordIndex !== this.playback.currentChordIndex) {
        this.playback.currentChordIndex = currentChordIndex;
        this.highlightActiveChord(currentChordIndex);
        this.playChord(currentChordIndex, true);
      }
      
      // Check if we've reached the end of the sequence
      const lastChord = this.chordSequence[this.chordSequence.length - 1];
      if (lastChord && currentTime >= lastChord.time + lastChord.duration) {
        // End of playback
        this.stopPlayback();
        return;
      }
      
      // Continue the loop
      requestAnimationFrame(() => this.playbackLoop());
    },
    
    /**
     * Stop playback
     */
    stopPlayback() {
      // Update playback state
      this.playback.isPlaying = false;
      
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      
      // Update button text
      const playButton = document.getElementById('play-detected-chords');
      if (playButton) {
        playButton.innerHTML = '<i class="icon-play"></i> Play Chord Progression';
      }
      
      // Remove highlights
      this.highlightActiveChord(-1);
    },
    
    /**
     * Play a specific chord
     * @param {number} index - Index of the chord to play
     * @param {boolean} [isSequence=false] - Whether this is part of a sequence playback
     */
    playChord(index, isSequence = false) {
      if (index < 0 || index >= this.chordSequence.length) return;
      
      // Stop any currently playing notes if not part of a sequence
      if (!isSequence) {
        PianoModule.stopAllNotes();
      }
      
      const chord = this.chordSequence[index];
      
      // Skip "no chord" segments
      if (chord.chord === "N") return;
      
      // Use notes array if available, otherwise calculate from chord name
      let notes = [];
      if (chord.notes && chord.notes.length) {
        // Convert MIDI note numbers to note names
        notes = chord.notes.map(midiNote => {
          return this.midiNoteToName(midiNote);
        }).filter(Boolean); // Remove any null values
      } else {
        // Parse the chord name into components
        const [rootNote, chordType] = chord.chord.split(':');
        
        // Get chord pattern based on type
        const chordPattern = this.getChordPattern(chordType || 'maj');
        
        // Calculate notes using PracticeModule's function
        notes = PracticeModule.calculateNotesFromPattern(rootNote, chordPattern);
      }
      
      if (notes.length === 0) {
        console.warn('No playable notes for chord:', chord.chord);
        return;
      }
      
      // Calculate chord duration (use 2 seconds for one-off plays)
      const duration = isSequence ? chord.duration * 1000 : 2000;
      
      // Play the chord
      PianoModule.playChord(notes, {
        duration: duration
      });
      
      // Highlight keys
      PianoModule.highlightNotes(notes, 'chord-highlight', duration);
      
      if (!isSequence) {
        // Briefly highlight the chord in the UI
        this.highlightActiveChord(index, true);
        setTimeout(() => {
          if (this.playback.currentChordIndex !== index) {
            this.highlightActiveChord(-1);
          }
        }, duration);
      }
    },
    
    /**
     * Convert MIDI note number to note name
     * @param {number} midiNote - MIDI note number (e.g., 60 for C4)
     * @returns {string|null} Note name or null if not in our range
     */
    midiNoteToName(midiNote) {
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const octave = Math.floor(midiNote / 12) - 1;
      const noteIndex = midiNote % 12;
      const noteName = noteNames[noteIndex];
      
      // Construct the note name with octave
      const fullNoteName = `${noteName}${octave}`;
      
      // Check if this note exists on our piano
      const noteFreqs = AudioEngine.noteFrequencies;
      return noteFreqs && noteFreqs[fullNoteName] ? fullNoteName : null;
    },
    
    /**
     * Get chord pattern (intervals) from chord type
     * @param {string} chordType - Type of chord (e.g., 'maj', 'min7')
     * @returns {number[]} Array of semitone intervals
     */
    getChordPattern(chordType) {
      // Common chord patterns (semitone intervals from root)
      const patterns = {
        'maj': [0, 4, 7],                  // Major triad
        'min': [0, 3, 7],                  // Minor triad
        'dim': [0, 3, 6],                  // Diminished triad
        'aug': [0, 4, 8],                  // Augmented triad
        'sus2': [0, 2, 7],                 // Suspended 2nd
        'sus4': [0, 5, 7],                 // Suspended 4th
        '7': [0, 4, 7, 10],                // Dominant 7th
        'maj7': [0, 4, 7, 11],             // Major 7th
        'min7': [0, 3, 7, 10],             // Minor 7th
        'dim7': [0, 3, 6, 9],              // Diminished 7th
        'hdim7': [0, 3, 6, 10],            // Half-diminished 7th
      };
      
      return patterns[chordType] || patterns['maj'];
    },
    
    /**
     * Highlight the active chord in the UI
     * @param {number} index - Index of the chord to highlight (-1 to clear all)
     * @param {boolean} [temporary=false] - Whether this is just a temporary highlight
     */
    highlightActiveChord(index, temporary = false) {
      // Remove active class from all chords
      const chordSegments = document.querySelectorAll('.chord-segment');
      chordSegments.forEach(segment => {
        segment.classList.remove('active');
        segment.classList.remove('playing');
      });
      
      // Add active class to the current chord
      if (index >= 0) {
        const activeSegment = document.querySelector(`.chord-segment[data-index="${index}"]`);
        if (activeSegment) {
          activeSegment.classList.add('active');
          if (!temporary) {
            activeSegment.classList.add('playing');
          }
          
          // Scroll to make the active chord visible
          activeSegment.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    },
    
    /**
     * Save detected chord progression to Song Builder
     */
    saveToSongBuilder() {
      if (!this.chordSequence || this.chordSequence.length === 0) {
        UIManager.showFeedback('No chord progression to save', 'error');
        return;
      }
      
      // Get the song builder module
      const songBuilder = SongBuilderModule;
      
      // Create a new song with the video title
      let songName = this.currentVideo.title || 'YouTube Song';
      // Limit name length
      if (songName.length > 30) {
        songName = songName.substring(0, 30) + '...';
      }
      
      // Generate a unique ID for the song
      const songId = 'song_' + Date.now();
      
      // Create sections based on chord patterns
      const sections = this.createSectionsFromChords();
      
      // Add song to song builder
      const songs = AppState.get('songBuilder.songs');
      songs[songId] = {
        name: songName,
        sections: sections.sectionMap,
        order: sections.sectionOrder
      };
      
      // Update state and save
      AppState.set('songBuilder.songs', songs);
      AppState.set('songBuilder.currentSongId', songId);
      songBuilder.saveSongsToStorage();
      
      // Update UI
      UIManager.updateSongDropdown(songs, songId);
      songBuilder.updateSongSectionsDisplay();
      
      // Show feedback and open progression panel
      UIManager.showFeedback(`Saved "${songName}" to Song Builder`, 'success');
      UIManager.showPanel('progression-panel');
    },
    
    /**
     * Create song sections from chord sequence
     * @returns {Object} Section data for song builder
     */
    createSectionsFromChords() {
      // Initialize variables
      const sectionMap = {};
      const sectionOrder = [];
      
      // Group chords into logical sections
      // For example: 4 or 8 chord sequences could be verses, choruses, etc.
      // This is a simplified approach - a real implementation would detect repeating patterns
      
      // For now, just create sections of 4 chords each
      const chunkSize = 4;
      const sectionTypes = ['intro', 'verse', 'chorus', 'outro'];
      
      for (let i = 0; i < this.chordSequence.length; i += chunkSize) {
        // Get a chunk of chords
        const chordChunk = this.chordSequence.slice(i, i + chunkSize);
        if (chordChunk.length === 0) continue;
        
        // Determine section type based on position
        let sectionType;
        if (i === 0) {
          sectionType = 'intro';
        } else if (i + chunkSize >= this.chordSequence.length) {
          sectionType = 'outro';
        } else {
          // Alternate between verse and chorus
          sectionType = sectionTypes[Math.floor(i / chunkSize) % 4];
        }
        
        // Format section name
        const sectionName = sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
        
        // Generate section ID
        const sectionId = `section_${Date.now()}_${i}`;
        
        // Create section with chord data
        const sectionChords = chordChunk.map(chord => {
          // Parse the chord name
          let rootNote, chordType;
          if (chord.chord === "N") return null; // Skip "no chord"
          
          if (chord.chord.includes(':')) {
            [rootNote, chordType] = chord.chord.split(':');
          } else {
            rootNote = chord.chord;
            chordType = "maj";
          }
          
          // Get or calculate notes
          let notes = [];
          if (chord.notes && chord.notes.length) {
            notes = chord.notes.map(midiNote => this.midiNoteToName(midiNote)).filter(Boolean);
          } else {
            const chordPattern = this.getChordPattern(chordType);
            notes = PracticeModule.calculateNotesFromPattern(rootNote, chordPattern);
          }
          
          if (notes.length === 0) return null;
          
          return {
            name: chord.chord,
            notes: notes
          };
        }).filter(Boolean); // Remove null items
        
        // Only add section if it has chords
        if (sectionChords.length > 0) {
          sectionMap[sectionId] = {
            name: sectionName,
            chords: sectionChords
          };
          
          sectionOrder.push(sectionId);
        }
      }
      
      return { sectionMap, sectionOrder };
    }
  }