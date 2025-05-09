/**
 * PianoModule - Core piano functionality
 * Manages piano keys, key events, and note visualization
 */
const PianoModule = {
    // Reference to DOM elements
    elements: {
      pianoKeys: null,
      whiteKeys: null,
      blackKeys: null
    },
    
    // Track currently active note objects
    activeNotes: new Map(), // Maps note names to their audio objects
    
    // Track keyboard key presses
    keyboardState: new Map(), // Maps note names to pressed state
    
    /**
     * Initialize the piano module
     */
    init() {
      console.log('PianoModule: Initializing');
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._initializePiano());
      } else {
        this._initializePiano();
      }
      
      // Set up event listeners
      this.setupPianoEvents();
      
      // Set up keyboard control
      this.setupKeyboardEvents();
      
      // Verify keyboard mapping
      this._verifyKeyboardMapping();
      
      // Subscribe to state changes
      AppState.subscribe('audio.volume', () => this.updateActiveNotesVolume());
      
      console.log('PianoModule: Initialized with', this.elements.pianoKeys.length, 'keys');
      return this;
    },
    
    /**
     * Internal initialization method
     * @private
     */
    _initializePiano() {
      // Cache piano elements
      this.elements.pianoKeys = document.querySelectorAll('.piano-keys .key');
      this.elements.whiteKeys = document.querySelectorAll('.piano-keys .white');
      this.elements.blackKeys = document.querySelectorAll('.piano-keys .black');
      
      if (!this.elements.pianoKeys.length) {
        console.error('PianoModule: No piano keys found in DOM');
        return;
      }
      
      // Set up event handlers
      this.setupPianoEvents();
      this.setupKeyboardEvents();
      
      // Subscribe to state changes
      AppState.subscribe('audio.volume', () => this.updateActiveNotesVolume());
      
      console.log('PianoModule: Initialized with', this.elements.pianoKeys.length, 'keys');
    },
    
    /**
     * Set up mouse/touch events for piano keys
     */
    setupPianoEvents() {
      // Remove any existing event listeners first to prevent duplicates
      this.elements.pianoKeys.forEach(key => {
        EventManager.removeAll(key);
      });
      
      // Add mouse/touch events to each key
      this.elements.pianoKeys.forEach(key => {
        const note = key.dataset.note;
        
        // Mouse down event
        EventManager.on(key, 'mousedown', () => {
          this.playNote(note, key);
        });
        
        // Mouse up event
        EventManager.on(key, 'mouseup', () => {
          this.stopNote(note);
        });
        
        // Mouse leave event
        EventManager.on(key, 'mouseleave', () => {
          this.stopNote(note);
        });
        
        // Touch events for mobile devices
        EventManager.on(key, 'touchstart', (e) => {
          e.preventDefault();
          this.playNote(note, key);
        });
        
        EventManager.on(key, 'touchend', () => {
          this.stopNote(note);
        });
      });
      
      console.log('PianoModule: Piano key events setup complete');
    },
    
    /**
     * Set up keyboard events
     */
    setupKeyboardEvents() {
      // Log info about keyboard setup
      console.log('PianoModule: Setting up keyboard event handlers');
      
      try {
        // Remove existing keyboard listeners
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Store bound handlers for removal later if needed
        this._boundKeyDown = this.handleKeyDown.bind(this);
        this._boundKeyUp = this.handleKeyUp.bind(this);
        
        // Add direct event listeners
        document.addEventListener('keydown', this._boundKeyDown);
        document.addEventListener('keyup', this._boundKeyUp);
        
        // Handle window blur to stop all notes
        window.addEventListener('blur', () => {
          // Check if we should ignore focus events (for sequence playback)
          const ignoreFocus = AppState.get('piano.ignoreFocus');
          console.log('PianoModule: Window blur event - ignoreFocus =', ignoreFocus);
          
          if (ignoreFocus) {
            console.log('PianoModule: Ignoring window blur due to sequence playback');
            return;
          }
          
          console.log('PianoModule: Window lost focus, stopping all notes');
          this.stopAllNotes();
        });
        
        console.log('PianoModule: Keyboard event handlers successfully set up');
      } catch (error) {
        console.error('PianoModule: Error setting up keyboard events:', error);
      }
    },
    
    /**
     * Handle keyboard key down events
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
      // Don't handle if modifier keys are pressed or if inside input fields
      if (e.ctrlKey || e.altKey || e.metaKey || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Get key and log it
      const key = e.key.toLowerCase();
      console.log(`Key pressed: '${key}'`);
      
      // Direct access to AppState.keyboardMap
      const keyboardMap = AppState.keyboardMap;
      
      if (!keyboardMap) {
        console.error('PianoModule: AppState.keyboardMap is undefined or null');
        return;
      }
      
      const hasKey = key in keyboardMap;
      console.log(`Key '${key}' exists in keyboardMap: ${hasKey}`);
      
      if (!hasKey) {
        // No need to log for function keys, arrows, etc.
        if (key.length === 1 || ['shift', 'space', 'enter'].includes(key)) {
          console.log(`PianoModule: No mapping for key '${key}'`);
        }
        return;
      }
      
      const note = keyboardMap[key];
      console.log(`PianoModule: Mapping found: '${key}' -> '${note}'`);
      
      // Check if already pressed (prevents retriggering on key repeat)
      if (this.keyboardState.get(note)) {
        console.log(`PianoModule: Note '${note}' already active, ignoring repeat`);
        return;
      }
      
      // Add to keysPressed set in AppState
      AppState.piano.keysPressed.add(key);
      
      // Mark as pressed
      this.keyboardState.set(note, true);
      
      // Find the corresponding piano key
      const keyElement = document.querySelector(`[data-note="${note}"]`);
      if (!keyElement) {
        console.warn(`PianoModule: No piano key found with data-note="${note}"`);
      }
      
      // Play the note
      this.playNote(note, keyElement);
      console.log(`PianoModule: Playing note '${note}'`);
      
      // If in practice mode, check the played note
      if (AppState.practice.isActive) {
        const playedNotes = AppState.practice.playedNotes || [];
        AppState.set('practice.playedNotes', [...playedNotes, note]);
        
        // Trigger note check in Practice Module
        document.dispatchEvent(new CustomEvent('practice:noteChecked'));
      }
    },
    
    /**
     * Handle keyboard key up events
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyUp(e) {
      const key = e.key.toLowerCase();
      
      // Direct access to AppState.keyboardMap
      const keyboardMap = AppState.keyboardMap;
      
      if (!keyboardMap) {
        console.error('PianoModule: AppState.keyboardMap is undefined or null');
        return;
      }
      
      const note = keyboardMap[key];
      
      if (!note) return;
      
      console.log(`PianoModule: Key release '${key}' -> '${note}'`);
      
      // Remove from keysPressed set in AppState
      AppState.piano.keysPressed.delete(key);
      
      // Mark as released
      this.keyboardState.set(note, false);
      
      // Stop the note
      this.stopNote(note);
    },
    
    /**
     * Play a piano note
     * @param {string} note - Note name (e.g., 'C4')
     * @param {Element} [keyElement] - Piano key DOM element
     * @param {Object} [options] - Additional options
     * @param {boolean} [options.isUserInitiated=true] - Whether this note play was initiated by the user
     */
    playNote(note, keyElement, options = {}) {
      const { isUserInitiated = true } = options;
      
      // Skip if the note is already playing (prevents duplicate note triggers)
      if (this.activeNotes.has(note)) return;
      
      // Ensure audio context is running
      AudioEngine.ensureContextRunning();
      
      // Play the note through the audio engine
      const noteObj = AudioEngine.playNote(note);
      
      if (!noteObj) {
        console.warn('PianoModule: Failed to play note:', note);
        return;
      }
      
      // Store the note object
      this.activeNotes.set(note, noteObj);
      
      // Activate the visual key if provided
      if (keyElement) {
        keyElement.classList.add('active');
      } else {
        // Find and activate the key element
        const key = document.querySelector(`[data-note="${note}"]`);
        if (key) {
          key.classList.add('active');
        }
      }
      
      // Only add to played notes if this is a user action (not a demo) and practice is active AND waiting for input
      const isPracticeActive = AppState.get('practice.isActive');
      const isPracticeWaiting = PracticeModule.waitingForUserInput;
      
      if (isPracticeActive && isPracticeWaiting && isUserInitiated) {
        const playedNotes = AppState.get('practice.playedNotes') || [];
        
        // Only add the note if it's not already in the played notes array
        if (!playedNotes.includes(note)) {
          console.log('User played note in practice mode:', note);
          
          // Update played notes with a new array to ensure reactivity
          AppState.set('practice.playedNotes', [...playedNotes, note]);
          
          // Trigger note check event
          setTimeout(() => {
            document.dispatchEvent(new CustomEvent('practice:noteChecked'));
          }, 50);
        }
      }
    },
    
    /**
     * Stop a piano note
     * @param {string} note - Note name (e.g., 'C4')
     */
    stopNote(note) {
      if (!this.activeNotes.has(note)) return;
      
      // Get the note object
      const noteObj = this.activeNotes.get(note);
      
      // Stop the note through the audio engine
      AudioEngine.stopNote(noteObj);
      
      // Remove from active notes
      this.activeNotes.delete(note);
      
      // Deactivate the key element
      const key = document.querySelector(`[data-note="${note}"]`);
      if (key) {
        key.classList.remove('active');
      }
    },
    
    /**
     * Stop all currently playing notes
     */
    stopAllNotes() {
      // Create a copy of note names to avoid modification during iteration
      const activeNoteNames = [...this.activeNotes.keys()];
      
      // Stop each note
      activeNoteNames.forEach(note => {
        this.stopNote(note);
      });
      
      // Also ask AudioEngine to stop all notes (redundant but safe)
      AudioEngine.stopAllNotes();
      
      // Reset keyboard state
      this.keyboardState.clear();
      
      // Remove active class from all keys
      this.elements.pianoKeys.forEach(key => {
        key.classList.remove('active');
      });
    },
    
    /**
     * Update volume for all active notes
     */
    updateActiveNotesVolume() {
      const volume = AppState.get('audio.volume');
      
      // Let AudioEngine handle volume updates for all active notes
      AudioEngine.setVolume(volume);
    },
    
    /**
     * Highlight specific notes on the piano
     * @param {string[]} notes - Array of note names
     * @param {string} className - CSS class to use for highlighting
     * @param {number} duration - Duration in ms (0 for no auto-clear)
     */
    highlightNotes(notes, className = 'hint', duration = 2000) {
      // Clear current highlights of this class
      this.elements.pianoKeys.forEach(key => {
        key.classList.remove(className);
      });
      
      // Add class to specified notes
      notes.forEach(note => {
        const key = document.querySelector(`[data-note="${note}"]`);
        if (key) {
          key.classList.add(className);
        }
      });
      
      // Clear after duration if specified
      if (duration > 0) {
        setTimeout(() => {
          notes.forEach(note => {
            const key = document.querySelector(`[data-note="${note}"]`);
            if (key) {
              key.classList.remove(className);
            }
          });
        }, duration);
      }
    },
    
    /**
     * Toggle note labels visibility
     * @param {boolean} show - Whether to show labels
     */
    toggleNoteLabels(show) {
      console.log('Toggling note labels:', show);
      
      this.elements.pianoKeys.forEach(key => {
        if (show) {
          key.classList.remove('hide');
        } else {
          key.classList.add('hide');
        }
      });
      
      // Update app state
      AppState.set('piano.showNoteLabels', show);
      
      // Log the change
      console.log('Note labels visibility set to:', show);
    },
    
    /**
     * Play a sequence of notes (like a scale)
     * @param {string[]} notes - Array of note names
     * @param {Object} options - Playback options
     * @param {number} options.delay - Delay between notes in ms
     * @param {number} options.duration - Duration of each note in ms
     * @param {boolean} options.highlight - Whether to highlight the scale after playing
     * @param {number} options.highlightDuration - How long to highlight for
     * @param {boolean} options.ignoreInPractice - Whether to ignore these notes in practice mode
     * @returns {Promise} Resolves when sequence finishes playing
     */
    playNoteSequence(notes, options = {}) {
      const {
        delay = 300,
        duration = 250,
        highlight = true,
        highlightDuration = 3000,
        ignoreInPractice = true  // Add this flag to prevent demo playback from counting in practice
      } = options;
      
      // Stop any currently playing notes
      this.stopAllNotes();
      
      // Clear any existing timeouts
      AppState.clearTimeouts('scale');
      
      // Keep track of which keys are active for after-playback visualization
      const activeKeys = [];
      
      // In practice mode, temporarily store current played notes to restore later
      let tempPlayedNotes = [];
      if (ignoreInPractice && AppState.get('practice.isActive')) {
        tempPlayedNotes = [...AppState.get('practice.playedNotes')];
        console.log('Saved played notes before demo:', tempPlayedNotes);
      }
      
      return new Promise((resolve) => {
        // Play each note with a delay
        notes.forEach((note, index) => {
          const startTimeout = setTimeout(() => {
            // For demo playback in practice mode
            if (ignoreInPractice && AppState.get('practice.isActive')) {
              // Special case handling to avoid adding demo notes to played notes
              const noteObj = AudioEngine.playNote(note);
              
              // Activate the key visually
              const key = document.querySelector(`[data-note="${note}"]`);
              if (key) {
                key.classList.add('active');
              }
              
              // Add the key to activeKeys if it's not already there
              if (key && !activeKeys.includes(key)) {
                activeKeys.push(key);
              }
              
              // Stop the note after the specified duration
              const stopTimeout = setTimeout(() => {
                AudioEngine.stopNote(noteObj);
                if (key) {
                  key.classList.remove('active');
                }
              }, duration);
              
              // Track the timeout
              AppState.timeouts.scale.push(stopTimeout);
              
            } else {
              // Standard note playback for non-practice mode
              this.playNote(note);
              
              // Add the key to activeKeys if it's not already there
              const keyElement = document.querySelector(`[data-note="${note}"]`);
              if (keyElement && !activeKeys.includes(keyElement)) {
                activeKeys.push(keyElement);
              }
              
              // Stop the note after the specified duration
              const stopTimeout = setTimeout(() => {
                this.stopNote(note);
              }, duration);
              
              // Track the timeout
              AppState.timeouts.scale.push(stopTimeout);
            }
            
          }, index * delay);
          
          // Track the timeout
          AppState.timeouts.scale.push(startTimeout);
        });
        
        // After all notes have played, highlight the entire sequence if requested
        const totalPlayTime = (notes.length * delay) + duration;
        const visualizeTimeout = setTimeout(() => {
          // Stop any playing notes to be safe
          this.stopAllNotes();
          
          // If in practice mode, restore the original played notes
          if (ignoreInPractice && AppState.get('practice.isActive')) {
            AppState.set('practice.playedNotes', tempPlayedNotes);
            console.log('Restored played notes after demo:', tempPlayedNotes);
          }
          
          if (highlight) {
            // Highlight all notes in the sequence
            this.highlightNotes(notes, 'scale-highlight', highlightDuration);
          }
          
          // Resolve the promise when sequence is complete
          resolve();
        }, totalPlayTime);
        
        // Track the timeout
        AppState.timeouts.scale.push(visualizeTimeout);
      });
    },
    
    /**
     * Play multiple notes simultaneously (like a chord)
     * @param {string[]} notes - Array of note names
     * @param {Object} options - Playback options
     * @param {number} options.duration - Duration in ms
     * @param {boolean} options.ignoreInPractice - Whether to ignore these notes in practice mode
     * @param {boolean} options.ignoreFocus - Whether to ignore window focus events
     * @returns {Promise} Resolves when chord finishes playing
     */
    playChord(notes, options = {}) {
      const { 
        duration = 2000,
        ignoreInPractice = true,
        ignoreFocus = false
      } = options;
      
      console.log(`PianoModule: Playing chord with ${notes.length} notes:`, notes);
      console.log(`PianoModule: Chord options: duration=${duration}ms, ignoreInPractice=${ignoreInPractice}, ignoreFocus=${ignoreFocus}`);
      
      // Set ignoreFocus flag in AppState if needed
      if (ignoreFocus) {
        AppState.set('piano.ignoreFocus', true);
        console.log('PianoModule: Set ignoreFocus flag to true');
      }
      
      // Stop any currently playing notes and wait for them to fully stop
      console.log('PianoModule: Stopping all active notes before playing chord');
      this.stopAllNotes();
      AudioEngine.stopAllNotes();
      
      // Clear any existing chord timeout
      if (AppState.timeouts.chord !== null) {
        console.log('PianoModule: Clearing existing chord timeout');
        clearTimeout(AppState.timeouts.chord);
        AppState.timeouts.chord = null;
      }
      
      // In practice mode, temporarily store current played notes to restore later
      let tempPlayedNotes = [];
      if (ignoreInPractice && AppState.get('practice.isActive')) {
        tempPlayedNotes = [...AppState.get('practice.playedNotes')];
        console.log('PianoModule: Saved played notes before chord demo:', tempPlayedNotes);
      }
      
      return new Promise((resolve) => {
        // Add a small delay to ensure previous notes are fully stopped
        setTimeout(() => {
          console.log(`PianoModule: Starting chord playback after short delay`);
          
          if (ignoreInPractice && AppState.get('practice.isActive')) {
            // Direct audio playback for demonstration in practice mode
            console.log(`PianoModule: Using direct audio playback for practice mode demo`);
            const noteObjs = [];
            
            // Play each note in the chord
            notes.forEach(note => {
              console.log(`PianoModule: Playing chord note: ${note}`);
              const noteObj = AudioEngine.playNote(note);
              if (noteObj) {
                noteObjs.push(noteObj);
                
                // Activate the key visually
                const key = document.querySelector(`[data-note="${note}"]`);
                if (key) {
                  key.classList.add('active');
                }
              }
            });
            
            // Set a timeout to stop the notes
            console.log(`PianoModule: Setting timeout to stop chord after ${duration}ms`);
            AppState.timeouts.chord = setTimeout(() => {
              console.log('PianoModule: Chord duration timeout reached, stopping notes');
              
              // Stop all notes
              noteObjs.forEach(noteObj => {
                AudioEngine.stopNote(noteObj);
              });
              
              // Deactivate all keys
              notes.forEach(note => {
                const key = document.querySelector(`[data-note="${note}"]`);
                if (key) {
                  key.classList.remove('active');
                }
              });
              
              // Restore the original played notes
              AppState.set('practice.playedNotes', tempPlayedNotes);
              console.log('PianoModule: Restored played notes after chord demo:', tempPlayedNotes);
              
              // Clear ignoreFocus flag if it was set
              if (ignoreFocus) {
                AppState.set('piano.ignoreFocus', false);
                console.log('PianoModule: Cleared ignoreFocus flag');
              }
              
              console.log('PianoModule: Chord playback completed');
              resolve();
            }, duration);
            
          } else {
            // Standard playback for non-practice mode
            console.log(`PianoModule: Using standard playback for chord`);
            
            // Play each note in the chord
            notes.forEach(note => {
              console.log(`PianoModule: Playing chord note: ${note}`);
              this.playNote(note);
            });
            
            // Set a timeout to stop the notes
            console.log(`PianoModule: Setting timeout to stop chord after ${duration}ms`);
            AppState.timeouts.chord = setTimeout(() => {
              console.log('PianoModule: Chord duration timeout reached, stopping all notes');
              this.stopAllNotes();
              
              // Clear ignoreFocus flag if it was set
              if (ignoreFocus) {
                AppState.set('piano.ignoreFocus', false);
                console.log('PianoModule: Cleared ignoreFocus flag');
              }
              
              console.log('PianoModule: Chord playback completed');
              resolve();
            }, duration);
          }
        }, 50);
      });
    },

    
    /**
     * Get a function to handle chord item click in the progression builder
     * @param {Object} chord - Chord object with name and notes
     * @returns {Function} Click handler
     */
    getChordClickHandler(chord) {
      return (e) => {
        // Don't play if clicking on controls
        if (e.target.classList.contains('drag-handle') || 
            e.target.classList.contains('remove-chord')) {
          return;
        }
        
        // Play the chord
        this.playChord(chord.notes);
      };
    },
    
    /**
     * Verify that keyboard mapping is correctly initialized
     * @private
     */
    _verifyKeyboardMapping() {
      const keyboardMap = AppState.get('keyboardMap');
      
      if (!keyboardMap) {
        console.error('PianoModule: keyboardMap not found in AppState');
        return;
      }
      
      const keyCount = Object.keys(keyboardMap).length;
      console.log(`PianoModule: Keyboard mapping loaded with ${keyCount} keys`);
      
      // Log a few sample mappings for diagnostic purposes
      const sampleKeys = ['q', 'e', 'r', 'i'];
      sampleKeys.forEach(key => {
        const note = keyboardMap[key];
        console.log(`PianoModule: Key '${key}' mapped to note '${note || 'none'}'`);
      });
    },
    
    /**
     * Debug keyboard mapping
     * Call this from console to diagnose keyboard issues
     */
    debugKeyboardMapping() {
      console.group('Keyboard Mapping Debug');
      
      try {
        // Check if AppState exists
        if (!window.AppState) {
          console.error('AppState not found!');
          return;
        }
        
        // Direct access to AppState's keyboardMap
        const keyboardMap = AppState.keyboardMap;
        
        if (!keyboardMap) {
          console.error('AppState.keyboardMap is undefined or null');
          return;
        }
        
        const keys = Object.keys(keyboardMap);
        console.log(`Found ${keys.length} mapped keys in AppState.keyboardMap`);
        
        // Log all keyboard mappings
        console.table(
          keys.reduce((acc, key) => {
            acc[key] = keyboardMap[key];
            return acc;
          }, {})
        );
        
        // Check some sample keys to match with piano DOM elements
        const sampleKeys = ['q', 'e', 'r', 'i'];
        sampleKeys.forEach(key => {
          const note = keyboardMap[key];
          const keyElement = note ? document.querySelector(`[data-note="${note}"]`) : null;
          console.log(`Key '${key}' -> Note '${note || 'none'}' -> DOM element: ${keyElement ? 'Found' : 'Not found'}`);
        });
        
        // Verify event handlers
        console.log('Event handlers bound:', 
          this._boundKeyDown ? 'keydown: Yes' : 'keydown: No',
          this._boundKeyUp ? 'keyup: Yes' : 'keyup: No'
        );
        
      } catch (error) {
        console.error('Error during keyboard mapping debug:', error);
      } finally {
        console.groupEnd();
      }
    }
  }