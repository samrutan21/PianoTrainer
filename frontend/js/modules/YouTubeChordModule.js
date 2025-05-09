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
    
    // Detection state
    detection: {
      isDetecting: false,
      progress: 0,
      status: ''
    },
    
    /**
     * Initialize the YouTube chord module
     */
    init() {
      console.log('YouTubeChordModule: Initializing');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize WebSocket connection
      this.initWebSocket();
      
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
     * Initialize WebSocket connection
     */
    initWebSocket() {
      // Close existing connection if it exists
      if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
        console.log('Closing existing WebSocket connection');
        this.socket.close();
      }
      const wsUrl = this.getWebSocketUrl();
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.updateConnectionStatus(true);
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
        this.updateConnectionStatus(false);
        
        // Try to reconnect after a delay
        setTimeout(() => this.initWebSocket(), 5000);
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateConnectionStatus(false);
      };
      
      this.socket.onmessage = (event) => this.handleWebSocketMessage(event);
    },
    
    /**
     * Update connection status UI
     */
    updateConnectionStatus(isConnected) {
      const statusElement = document.getElementById('connection-status');
      if (statusElement) {
        statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
        statusElement.className = isConnected ? 'status-connected' : 'status-disconnected';
      }
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
      
      // Immediately disable the button to prevent double clicks
      const detectButton = document.getElementById('detect-chords');
      if (detectButton) {
        detectButton.disabled = true;
      }
      
      // Reset detection state
      this.detection.isDetecting = true;
      this.detection.progress = 0;
      this.detection.status = 'Starting chord detection...';
      
      // Immediately show progress bar and hide results
      const detectionProgress = document.getElementById('detection-progress');
      const youtubeResults = document.getElementById('youtube-results');
      
      if (detectionProgress) detectionProgress.style.display = 'flex';
      if (youtubeResults) youtubeResults.style.display = 'none';
      
      // Update UI through the normal function
      this.updateDetectionUI();
      
      // Clear previous results
      this.chordSequence = [];
      this.updateChordTimeline();
      
      // Send detection request
      this.socket.send(JSON.stringify({
        type: 'detect_chords',
        url: url
      }));
      
      // Update UI
      if (detectButton) {
        detectButton.textContent = 'Cancel Detection';
        detectButton.disabled = false; // Re-enable for cancellation
        detectButton.onclick = () => this.cancelDetection();
      }
    },
    
    /**
     * Cancel ongoing chord detection
     */
    cancelDetection() {
      if (this.detection.isDetecting) {
        this.socket.send(JSON.stringify({
          type: 'cancel_detection'
        }));
        
        this.detection.isDetecting = false;
        this.updateDetectionUI();
        
        // Reset detect button
        const detectButton = document.getElementById('detect-chords');
        if (detectButton) {
          detectButton.textContent = 'Detect Chords';
          detectButton.onclick = () => this.startChordDetection();
        }
      }
    },
    
    /**
     * Start model training
     */
    startModelTraining() {
      // Send training request
      this.socket.send(JSON.stringify({
        type: 'train_model'
      }));
      
      // Update UI
      const trainButton = document.getElementById('train-model');
      if (trainButton) {
        trainButton.disabled = true;
        trainButton.textContent = 'Training...';
      }
    },
    
    /**
     * Update detection UI elements
     */
    updateDetectionUI() {
      // Update progress bar
      const progressBar = document.getElementById('progress-bar-fill');
      if (progressBar) {
        progressBar.style.width = `${this.detection.progress}%`;
      }
      
      // Update status text
      const statusText = document.getElementById('detection-status');
      if (statusText) {
        statusText.textContent = this.detection.status;
      }
      
      // Show/hide elements based on detection state
      const detectionProgress = document.getElementById('detection-progress');
      const youtubeResults = document.getElementById('youtube-results');
      
      if (this.detection.isDetecting) {
        if (detectionProgress) detectionProgress.style.display = 'block';
      } else {
        if (detectionProgress) detectionProgress.style.display = 'none';
        if (youtubeResults && this.chordSequence.length > 0) {
          youtubeResults.style.display = 'block';
        }
      }
      
      // Update buttons
      if (!this.detection.isDetecting) {
        const detectButton = document.getElementById('detect-chords');
        if (detectButton) {
          detectButton.disabled = this.detection.isDetecting;
        }
      }
    },
    
    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(event) {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data); // Add for debugging
        
        switch (data.type) {
          // Change this to match server's message type
          case 'detection_status':  // Changed from 'status'
            this.detection.status = data.status;  // Changed from data.message
            this.detection.progress = data.progress;
            this.updateDetectionUI();
            break;
            
          case 'error':
            UIManager.showFeedback(data.error, 'error');  // Changed from data.message
            this.detection.isDetecting = false;
            this.updateDetectionUI();
            break;
            
          // The rest of your message handlers...
          case 'metadata':
            this.updateMetadata(data);
            break;
            
          case 'chord_sequence':
            console.log('Received chord sequence:', data.chords);
            // Check the first chord's structure
            if (data.chords && data.chords.length > 0) {
                console.log('First chord:', data.chords[0]);
                console.log('Last chord:', data.chords[data.chords.length - 1]);
            }
            this.chordSequence = data.chords;
            this.updateChordTimeline();
            break;
            
          case 'chord_progressions':  // Add handler for progression data
            console.log('Received chord progressions:', data.progressions);
            // You could display these progressions in the UI
            break;
            
          case 'detection_complete':
            this.detection.isDetecting = false;
            this.detection.progress = 100;
            this.detection.status = 'Complete';
            this.updateDetectionUI();
            
            // Reset detect button
            const detectButton = document.getElementById('detect-chords');
            if (detectButton) {
              detectButton.textContent = 'Detect Chords';
              detectButton.onclick = () => this.startChordDetection();
            }
            break;
        }
        
      } catch (error) {
        console.error('Error handling WebSocket message:', error, event.data);
      }
    },
    
    /**
     * Update song metadata UI
     */
    updateMetadata(data) {
      const keyElement = document.getElementById('song-key');
      if (keyElement) {
        keyElement.textContent = `Key: ${data.key}`;
      }
      
      const tempoElement = document.getElementById('song-tempo');
      if (tempoElement) {
        tempoElement.textContent = `Tempo: ${Math.round(data.tempo)} BPM`;
      }
    },
    
    /**
     * Get the WebSocket server URL
     * @returns {string} WebSocket URL
     */
    getWebSocketUrl() {
      // Default to localhost:8080 for development
      // In production, this would be configured based on deployment environment
      return 'ws://localhost:8080';
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
     * Toggle playback of chord progression
     */
    togglePlayback() {
      if (this.playback.isPlaying) {
        this.stopPlayback();
      } else {
        // Instead of directly starting playback, use a setTimeout to separate
        // the click event from the actual playback start
        setTimeout(() => {
          this.startPlayback();
        }, 100);
      }
    },
    
    
    /**
     * Start playback of detected chord progression
     */
    startPlayback() {
      // Prevent multiple starts
      if (this.playback.isPlaying) {
        console.log('Playback already in progress');
        return;
      }

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
      this.playback.currentChordIndex = 0;
      
      console.log('Starting chord progression playback with', this.chordSequence.length, 'chords');
      
      // Start playing the chord sequence
      this.processChordSequence();
    },

    /**
     * Process the chord sequence one chord at a time
     */
    processChordSequence() {
      // Make sure we're still in playback mode
      if (!this.playback.isPlaying) {
        console.log('Playback was stopped');
        return;
      }
      
      // Check if we've reached the end
      if (this.playback.currentChordIndex >= this.chordSequence.length) {
        console.log('Reached end of chord sequence');
        this.stopPlayback();
        return;
      }
      
      // Get the current chord
      const chord = this.chordSequence[this.playback.currentChordIndex];
      console.log(`Playing chord ${this.playback.currentChordIndex + 1}/${this.chordSequence.length}: ${chord.chord}`);
      
      // Highlight current chord in UI
      this.highlightActiveChord(this.playback.currentChordIndex);
      
      // Skip no-chord segments
      if (chord.chord === "N") {
        this.playback.currentChordIndex++;
        setTimeout(() => this.processChordSequence(), 0);
        return;
      }
      
      // Try to get the notes for this chord
      let notes = [];
      
      try {
        if (chord.notes && chord.notes.length) {
          // Use pre-calculated notes
          notes = chord.notes.map(midiNote => this.midiNoteToName(midiNote)).filter(Boolean);
        } else {
          // Parse chord name
          let rootNote, chordType;
          if (chord.chord.includes(':')) {
            [rootNote, chordType] = chord.chord.split(':');
          } else {
            rootNote = chord.chord;
            chordType = "maj";
          }
          
          // Get chord pattern
          const chordPattern = this.getChordPattern(chordType || 'maj');
          
          // Calculate notes
          notes = PracticeModule.calculateNotesFromPattern(rootNote, chordPattern);
        }
      } catch (e) {
        console.error('Error calculating chord notes:', e);
      }
      
      if (!notes || notes.length === 0) {
        console.warn(`No playable notes for chord: ${chord.chord}`);
        this.playback.currentChordIndex++;
        setTimeout(() => this.processChordSequence(), 0);
        return;
      }
      
      // Calculate duration (minimum 1 second)
      const duration = Math.max(chord.duration * 1000, 1000);
      console.log(`Playing chord ${chord.chord} with notes:`, notes, `duration: ${duration}ms`);
      
      try {
        // Play the notes without using PianoModule.playChord which might have issues
        notes.forEach(note => {
          PianoModule.playNote(note);
        });
        
        // Schedule stopping these notes and moving to the next chord
        this.playback.nextChordTimeout = setTimeout(() => {
          // Stop the current notes
          notes.forEach(note => {
            PianoModule.stopNote(note);
          });
          
          // Move to the next chord
          this.playback.currentChordIndex++;
          
          // Process the next chord
          this.processChordSequence();
        }, duration);
      } catch (e) {
        console.error('Error playing chord:', e);
        this.playback.currentChordIndex++;
        setTimeout(() => this.processChordSequence(), 0);
      }
    },

    /**
     * Play the next chord in the sequence and schedule the following one
     */
    playNextChord() {
      if (!this.playback.isPlaying || 
          this.playback.currentChordIndex >= this.chordSequence.length) {
        this.stopPlayback();
        return;
      }
      
      // Get the current chord
      const chord = this.chordSequence[this.playback.currentChordIndex];
      
      // Play the current chord
      console.log(`Playing chord ${this.playback.currentChordIndex+1}/${this.chordSequence.length}: ${chord.chord}`);
      this.highlightActiveChord(this.playback.currentChordIndex);
      
      // IMPORTANT: Make sure ignoreFocus is still true before playing each chord
      if (!AppState.get('piano.ignoreFocus')) {
        console.log('Restoring ignoreFocus flag to protect chord progression');
        AppState.set('piano.ignoreFocus', true);
      }
      
      // Play the chord
      const notes = this.getChordNotes(chord);
      if (notes.length === 0) {
        console.warn('No playable notes for chord:', chord.chord);
        // Skip to next chord
        this.playback.currentChordIndex++;
        setTimeout(() => this.playNextChord(), 0);
        return;
      }
      
      // Log the notes and duration
      const duration = Math.max(chord.duration * 1000, 1000); // minimum 1 second
      console.log(`Playing chord ${chord.chord} with notes:`, notes, `duration: ${duration}ms`);
      
      // Play chord directly using PianoModule with the ignoreFocus option
      PianoModule.playChord(notes, {
        duration: duration,
        ignoreFocus: true // Always ignore focus events during chord progression
      });
      
      // Schedule the next chord
      this.playback.nextChordTimeout = setTimeout(() => {
        if (this.playback.isPlaying) {
          // Advance to next chord
          this.playback.currentChordIndex++;
          // Continue to next chord if available
          this.playNextChord();
        }
      }, duration);
    },

    /**
     * Get playable notes for a chord
     * @param {Object} chord - Chord object
     * @returns {string[]} Array of note names
     */
    getChordNotes(chord) {
      // Skip "no chord" segments
      if (chord.chord === "N") return [];
      
      // Use notes array if available, otherwise calculate from chord name
      let notes = [];
      if (chord.notes && chord.notes.length) {
        // Convert MIDI note numbers to note names
        notes = chord.notes.map(midiNote => {
          return this.midiNoteToName(midiNote);
        }).filter(Boolean); // Remove any null values
      } else {
        // Parse the chord name into components
        let rootNote, chordType;
        if (chord.chord.includes(':')) {
          [rootNote, chordType] = chord.chord.split(':');
        } else {
          rootNote = chord.chord;
          chordType = "maj";
        }
        
        // Get chord pattern based on type
        const chordPattern = this.getChordPattern(chordType || 'maj');
        
        // Calculate notes using PracticeModule's function
        notes = PracticeModule.calculateNotesFromPattern(rootNote, chordPattern);
      }
      
      return notes;
    },

    /**
     * Stop playback
     */
    stopPlayback() {
      console.log('Stopping chord progression playback');
      
      // Clear any pending timeouts
      if (this.playback.nextChordTimeout) {
        clearTimeout(this.playback.nextChordTimeout);
        this.playback.nextChordTimeout = null;
      }
      
      // Update playback state
      this.playback.isPlaying = false;
      
      // Stop any currently playing notes
      if (PianoModule && typeof PianoModule.stopAllNotes === 'function') {
        PianoModule.stopAllNotes();
      }
      
      // Update button text
      const playButton = document.getElementById('play-detected-chords');
      if (playButton) {
        playButton.innerHTML = '<i class="icon-play"></i> Play Chord Progression';
      }
      
      // Remove highlights
      this.highlightActiveChord(-1);
      
      console.log('Playback stopped');
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
        let rootNote, chordType;
        if (chord.chord.includes(':')) {
          [rootNote, chordType] = chord.chord.split(':');
        } else {
          rootNote = chord.chord;
          chordType = "maj";
        }
        
        // Get chord pattern based on type
        const chordPattern = this.getChordPattern(chordType || 'maj');
        
        // Calculate notes using PracticeModule's function
        notes = PracticeModule.calculateNotesFromPattern(rootNote, chordPattern);
      }
      
      if (notes.length === 0) {
        console.warn('No playable notes for chord:', chord.chord);
        return;
      }
      
      // Calculate chord duration (use 1.5 seconds for one-off plays)
      const duration = isSequence ? (chord.duration * 1000) : 1500;
      
      // Log the notes and duration
      console.log(`Playing chord ${chord.chord} with notes:`, notes, `duration: ${duration}ms`);
      
      // Play the chord
      PianoModule.playChord(notes, {
        duration: duration,
        ignoreFocus: isSequence // Add flag to ignore focus events during sequence playback
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