/**
 * AppState - Central state management system for the piano application
 * Consolidates global state variables and provides change notification functionality
 */
const AppState = {
    // Audio state
    audio: {
      currentInstrument: 'acoustic_grand_piano',
      instrumentMapping: {
        'grand-piano': 'acoustic_grand_piano',
        'synth': 'lead_1_square',
        'guitar': 'acoustic_guitar_nylon'
      },
      volume: 0.5,
      midiConnected: false,
      midiDeviceName: ''
    },
    
    // Piano state
    piano: {
      showNoteLabels: true,
      activeNotes: [], // Tracks currently playing notes
      keysPressed: new Set() // Tracks keyboard keys currently pressed
    },
    
    // Practice mode state
    practice: {
      mode: 'none', // 'none', 'scale', 'chord'
      isActive: false,
      currentChallenge: [],
      playedNotes: [],
      optionsVisible: false,
      stats: {
        totalChallenges: 0,
        correctResponses: 0,
        incorrectResponses: 0,
        currentStreak: 0,
        bestStreak: 0
      },
      // Configuration
      config: {
        difficulty: 'medium', // 'easy', 'medium', 'hard', 'expert'
        feedbackMode: 'active', // 'active', 'unplugged'
        keySelection: 'random', // 'random', 'specific'
        specificKey: '',
        repetitions: 2, // How many times to show each challenge
        displayDuration: 7000, // ms
      },
      // Duration values
      durations: {
        chord: 2000, // ms
        scale: 3000  // ms
      }
    },
    
    // Song builder state
    songBuilder: {
      songs: {},
      currentSongId: null,
      currentSectionId: null
    },
    
    // Patterns for scales and chords
    patterns: {
      scales: {
        'major': [0, 2, 4, 5, 7, 9, 11],
        'minor': [0, 2, 3, 5, 7, 8, 10],
        'dorian': [0, 2, 3, 5, 7, 9, 10],
        'phrygian': [0, 1, 3, 5, 7, 8, 10],
        'lydian': [0, 2, 4, 6, 7, 9, 11],
        'mixolydian': [0, 2, 4, 5, 7, 9, 10],
        'locrian': [0, 1, 3, 5, 6, 8, 10],
        'harmonic_minor': [0, 2, 3, 5, 7, 8, 11],
        'melodic_minor': [0, 2, 3, 5, 7, 9, 11],
        'pentatonic_major': [0, 2, 4, 7, 9],
        'pentatonic_minor': [0, 3, 5, 7, 10],
        'blues': [0, 3, 5, 6, 7, 10]
      },
      chords: {
        'maj': [0, 4, 7],
        'min': [0, 3, 7],
        '7': [0, 4, 7, 10],
        'maj7': [0, 4, 7, 11],
        'min7': [0, 3, 7, 10],
        'dim': [0, 3, 6],
        'dim7': [0, 3, 6, 9],
        'half_dim7': [0, 3, 6, 10],
        'aug': [0, 4, 8],
        'sus2': [0, 2, 7],
        'sus4': [0, 5, 7],
        'maj9': [0, 4, 7, 11, 14],
        'min9': [0, 3, 7, 10, 14]
      }
    },
    
    // Scheduled timeouts
    timeouts: {
      scale: [],
      chord: null,
      progression: [],
      feedback: null
    },
    
    // Keyboard mapping for computer keyboard
    keyboardMap: {
      'q': 'A3', '2': 'A#3', 'w': 'B3', 'e': 'C4', '4': 'C#4', 'r': 'D4', '5': 'D#4', 't': 'E4', 
      'y': 'F4', '7': 'F#4', 'u': 'G4', '8': 'G#4', 'i': 'A4', '9': 'A#4', 'o': 'B4', 'p': 'C5', 
      '-': 'C#5', '[': 'D5', '=': 'D#5', ']': 'E5', 'z': 'F5', 's': 'F#5', 'x': 'G5', 'd': 'G#5',
      'c': 'A5', 'f': 'A#5', 'v': 'B5'
    },
    
    // UI state
    ui: {
      currentPanel: null, // Currently displayed panel
      isMenuExpanded: false,
      explorerExpanded: false,
      activeDragItem: null // For drag and drop operations
    },
    
    // Sound explorer
    soundExplorer: {
      selectedCategory: 'all',
      selectedInstrument: '',
      instrumentCategories: {
        piano: ['acoustic_grand_piano', 'bright_acoustic_piano', 'electric_grand_piano', 'honkytonk_piano', 'electric_piano_1', 'electric_piano_2', 'harpsichord', 'clavinet'],
        chromatic: ['celesta', 'glockenspiel', 'music_box', 'vibraphone', 'marimba', 'xylophone', 'tubular_bells', 'dulcimer'],
        organ: ['drawbar_organ', 'percussive_organ', 'rock_organ', 'church_organ', 'reed_organ', 'accordion', 'harmonica', 'tango_accordion'],
        guitar: ['acoustic_guitar_nylon', 'acoustic_guitar_steel', 'electric_guitar_jazz', 'electric_guitar_clean', 'electric_guitar_muted', 'overdriven_guitar', 'distortion_guitar', 'guitar_harmonics'],
        bass: ['acoustic_bass', 'electric_bass_finger', 'electric_bass_pick', 'fretless_bass', 'slap_bass_1', 'slap_bass_2', 'synth_bass_1', 'synth_bass_2'],
        strings: ['violin', 'viola', 'cello', 'contrabass', 'tremolo_strings', 'pizzicato_strings', 'orchestral_harp', 'timpani'],
        ensemble: ['string_ensemble_1', 'string_ensemble_2', 'synth_strings_1', 'synth_strings_2', 'choir_aahs', 'voice_oohs', 'synth_choir', 'orchestra_hit'],
        brass: ['trumpet', 'trombone', 'tuba', 'muted_trumpet', 'french_horn', 'brass_section', 'synth_brass_1', 'synth_brass_2'],
        reed: ['soprano_sax', 'alto_sax', 'tenor_sax', 'baritone_sax', 'oboe', 'english_horn', 'bassoon', 'clarinet'],
        pipe: ['piccolo', 'flute', 'recorder', 'pan_flute', 'blown_bottle', 'shakuhachi', 'whistle', 'ocarina'],
        synth_lead: ['lead_1_square', 'lead_2_sawtooth', 'lead_3_calliope', 'lead_4_chiff', 'lead_5_charang', 'lead_6_voice', 'lead_7_fifths', 'lead_8_bass_lead'],
        synth_pad: ['pad_1_new_age', 'pad_2_warm', 'pad_3_polysynth', 'pad_4_choir', 'pad_5_bowed', 'pad_6_metallic', 'pad_7_halo', 'pad_8_sweep'],
        synth_effects: ['fx_1_rain', 'fx_2_soundtrack', 'fx_3_crystal', 'fx_4_atmosphere', 'fx_5_brightness', 'fx_6_goblins', 'fx_7_echoes', 'fx_8_sci_fi'],
        ethnic: ['sitar', 'banjo', 'shamisen', 'koto', 'kalimba', 'bag_pipe', 'fiddle', 'shanai'],
        percussive: ['tinkle_bell', 'agogo', 'steel_drums', 'woodblock', 'taiko_drum', 'melodic_tom', 'synth_drum', 'reverse_cymbal'],
        sound_effects: ['guitar_fret_noise', 'breath_noise', 'seashore', 'bird_tweet', 'telephone_ring', 'helicopter', 'applause', 'gunshot']
      }
    },
    
    // Listeners for state changes
    _listeners: new Map(),
    
    /**
     * Initialize the state manager
     */
    init() {
      console.log('AppState: Initializing');
      
      // Load saved songs from localStorage
      this.loadSavedSongs();
      
      // Initialize piano state's keysPressed as a Set
      if (!this.piano.keysPressed || !(this.piano.keysPressed instanceof Set)) {
        this.piano.keysPressed = new Set();
        console.log('AppState: Initialized keysPressed Set');
      }
      
      // Log keyboard mapping to ensure it's loaded
      console.log('AppState: Keyboard mapping loaded with', Object.keys(this.keyboardMap).length, 'keys');
      console.log('AppState: Sample key mappings:', 
        'q ->', this.keyboardMap['q'],
        'e ->', this.keyboardMap['e'],
        'r ->', this.keyboardMap['r']
      );
      
      console.log('AppState: Initialized');
      return this;
    },
    
    /**
     * Get a nested property value using a path string
     * @param {string} path - Dot-notation path to the property (e.g., 'audio.volume')
     * @returns {*} Property value
     */
    get(path) {
      return this._getPropertyByPath(this, path);
    },
    
    /**
     * Update a property value and notify listeners
     * @param {string} path - Dot-notation path to the property
     * @param {*} value - New value
     * @returns {*} Updated value
     */
    set(path, value) {
      const segments = path.split('.');
      let current = this;
      
      // Navigate to the parent object
      for (let i = 0; i < segments.length - 1; i++) {
        if (current[segments[i]] === undefined) {
          current[segments[i]] = {};
        }
        current = current[segments[i]];
      }
      
      // Update the value
      const lastSegment = segments[segments.length - 1];
      const oldValue = current[lastSegment];
      current[lastSegment] = value;
      
      // Notify listeners
      this._notifyListeners(path, oldValue, value);
      
      return value;
    },
    
    /**
     * Subscribe to state changes
     * @param {string} path - Dot-notation path to watch
     * @param {Function} callback - Callback function(newValue, oldValue, path)
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
      if (!this._listeners.has(path)) {
        this._listeners.set(path, new Set());
      }
      
      this._listeners.get(path).add(callback);
      
      // Return unsubscribe function
      return () => {
        const listeners = this._listeners.get(path);
        if (listeners) {
          listeners.delete(callback);
          if (listeners.size === 0) {
            this._listeners.delete(path);
          }
        }
      };
    },
    
    /**
     * Clear all timeouts
     * @param {string} [type='all'] - Type of timeouts to clear ('all', 'scale', 'chord', 'progression')
     */
    clearTimeouts(type = 'all') {
      if (type === 'all' || type === 'scale') {
        while (this.timeouts.scale.length > 0) {
          clearTimeout(this.timeouts.scale.pop());
        }
      }
      
      if (type === 'all' || type === 'chord') {
        if (this.timeouts.chord !== null) {
          clearTimeout(this.timeouts.chord);
          this.timeouts.chord = null;
        }
      }
      
      if (type === 'all' || type === 'progression') {
        while (this.timeouts.progression.length > 0) {
          clearTimeout(this.timeouts.progression.pop());
        }
      }
      
      if (type === 'all' || type === 'feedback') {
        if (this.timeouts.feedback !== null) {
          clearTimeout(this.timeouts.feedback);
          this.timeouts.feedback = null;
        }
      }
    },
    
    /**
     * Reset practice state
     */
    resetPractice() {
      this.practice.isActive = false;
      this.practice.playedNotes = [];
      this.clearTimeouts('all');
    },
    
    /**
     * Update practice statistics
     * @param {boolean} correct - Whether the response was correct
     */
    updatePracticeStats(correct) {
      this.practice.stats.totalChallenges++;
      
      if (correct) {
        this.practice.stats.correctResponses++;
        this.practice.stats.currentStreak++;
        this.practice.stats.bestStreak = Math.max(
          this.practice.stats.bestStreak, 
          this.practice.stats.currentStreak
        );
      } else {
        this.practice.stats.incorrectResponses++;
        this.practice.stats.currentStreak = 0;
      }
      
      // Notify about stats changes
      this._notifyListeners('practice.stats', null, this.practice.stats);
    },
    
    /**
     * Save songs to localStorage
     */
    saveSongsToStorage() {
      try {
        localStorage.setItem('piano-app-songs', JSON.stringify(this.songBuilder.songs));
        console.log('AppState: Songs saved to localStorage:', Object.keys(this.songBuilder.songs).length, 'songs');
      } catch (e) {
        console.error('AppState: Failed to save songs to localStorage:', e);
      }
    },
    
    /**
     * Load songs from localStorage
     */
    loadSavedSongs() {
      try {
        const savedSongs = localStorage.getItem('piano-app-songs');
        if (savedSongs) {
          this.songBuilder.songs = JSON.parse(savedSongs);
          console.log('AppState: Loaded', Object.keys(this.songBuilder.songs).length, 'songs from localStorage');
        }
      } catch (e) {
        console.error('AppState: Failed to load songs from localStorage:', e);
      }
    },
    
    /**
     * Add a scale timeout and track it
     * @param {Function} callback - Timeout callback
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    addScaleTimeout(callback, delay) {
      const timeoutId = setTimeout(callback, delay);
      this.timeouts.scale.push(timeoutId);
      return timeoutId;
    },
    
    /**
     * Add a chord timeout and track it
     * @param {Function} callback - Timeout callback
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    setChordTimeout(callback, delay) {
      // Clear any existing chord timeout
      if (this.timeouts.chord !== null) {
        clearTimeout(this.timeouts.chord);
      }
      
      this.timeouts.chord = setTimeout(callback, delay);
      return this.timeouts.chord;
    },
    
    /**
     * Add a progression timeout and track it
     * @param {Function} callback - Timeout callback
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    addProgressionTimeout(callback, delay) {
      const timeoutId = setTimeout(callback, delay);
      this.timeouts.progression.push(timeoutId);
      return timeoutId;
    },
    
    /**
     * Set a feedback timeout
     * @param {Function} callback - Timeout callback
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    setFeedbackTimeout(callback, delay) {
      // Clear any existing feedback timeout
      if (this.timeouts.feedback !== null) {
        clearTimeout(this.timeouts.feedback);
      }
      
      this.timeouts.feedback = setTimeout(callback, delay);
      return this.timeouts.feedback;
    },
    
    /**
     * Get a property value using a path string (internal helper)
     * @private
     * @param {Object} obj - Object to search in
     * @param {string} path - Dot-notation path
     * @returns {*} Property value
     */
    _getPropertyByPath(obj, path) {
      return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : undefined;
      }, obj);
    },
    
    /**
     * Notify all listeners of a state change
     * @private
     * @param {string} path - Path that changed
     * @param {*} oldValue - Previous value
     * @param {*} newValue - New value
     */
    _notifyListeners(path, oldValue, newValue) {
      // Notify exact path listeners
      const listeners = this._listeners.get(path);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(newValue, oldValue, path);
          } catch (e) {
            console.error('AppState: Error in listener callback:', e);
          }
        });
      }
      
      // Notify parent path listeners
      const segments = path.split('.');
      for (let i = segments.length - 1; i > 0; i--) {
        const parentPath = segments.slice(0, i).join('.');
        const parentListeners = this._listeners.get(parentPath);
        
        if (parentListeners) {
          // For parent paths, use the corresponding nested object
          const parentOldValue = this._getPropertyByPath(
            oldValue !== undefined ? { [segments[i]]: oldValue } : {}, 
            segments.slice(i).join('.')
          );
          
          const parentNewValue = this._getPropertyByPath(
            { [segments[i]]: newValue }, 
            segments.slice(i).join('.')
          );
          
          parentListeners.forEach(callback => {
            try {
              callback(parentNewValue, parentOldValue, path);
            } catch (e) {
              console.error('AppState: Error in parent listener callback:', e);
            }
          });
        }
      }
    }
  };