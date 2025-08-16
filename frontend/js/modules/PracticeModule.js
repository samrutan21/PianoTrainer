/**
 * PracticeModule - Scale and chord practice functionality
 * Manages practice modes, challenges, and feedback
 */
  const PracticeModule = {
    /**
     * Flag to indicate whether the module is waiting for user input
     * This will be set to true after the demo playback finishes
     */
    waitingForUserInput: false,

    /**
     * Track the last chord type that was played to avoid repetition
     */
    lastChordType: null,
    
    /**
     * Track the last few chord types to avoid repetition
     */
    recentChordTypes: [],
    
    /**
     * Maximum number of recent chord types to track
     */
    maxRecentChords: 3,

    /**
     * Mark the module as waiting for user input
     */
    markAsWaitingForInput() {
      this.waitingForUserInput = true;
      console.log('Practice module is now waiting for user input');
      
      // Clear the played notes array to make sure we're starting fresh
      AppState.set('practice.playedNotes', []);
    },

    /**
     * Mark the module as no longer waiting for user input
     */
    clearWaitingForInput() {
      this.waitingForUserInput = false;
      console.log('Practice module is no longer waiting for user input');
    },
    /**
     * Initialize the practice module
     */
    init() {
      console.log('PracticeModule: Initializing');
      
      // Check if patterns are loaded in AppState
      if (!AppState.patterns || !AppState.patterns.scales || !AppState.patterns.chords) {
        console.warn('PracticeModule: Patterns not found in AppState during init, creating directly');
        
        // Define patterns directly if they're not in AppState
        const scalePatterns = {
          // Major Scale Family
          'major': [0, 2, 4, 5, 7, 9, 11],
          'ionian': [0, 2, 4, 5, 7, 9, 11],  // Same as major
          
          // Natural Minor and Modes
          'minor': [0, 2, 3, 5, 7, 8, 10],
          'aeolian': [0, 2, 3, 5, 7, 8, 10],  // Same as natural minor
          'dorian': [0, 2, 3, 5, 7, 9, 10],
          'phrygian': [0, 1, 3, 5, 7, 8, 10],
          'lydian': [0, 2, 4, 6, 7, 9, 11],
          'mixolydian': [0, 2, 4, 5, 7, 9, 10],
          'locrian': [0, 1, 3, 5, 6, 8, 10],
          
          // Minor Scale Variations
          'harmonic_minor': [0, 2, 3, 5, 7, 8, 11],
          'melodic_minor': [0, 2, 3, 5, 7, 9, 11],
          'hungarian_minor': [0, 2, 3, 6, 7, 8, 11],
          'neapolitan_minor': [0, 1, 3, 5, 7, 8, 11],
          
          // Pentatonic Scales
          'pentatonic_major': [0, 2, 4, 7, 9],
          'pentatonic_minor': [0, 3, 5, 7, 10],
          'pentatonic_egyptian': [0, 2, 5, 7, 10],
          'pentatonic_hirajoshi': [0, 1, 5, 7, 8],
          'pentatonic_in_sen': [0, 1, 5, 7, 10],
          
          // Blues and Jazz Scales
          'blues': [0, 3, 5, 6, 7, 10],
          'blues_major': [0, 2, 3, 4, 7, 9],
          'bebop_major': [0, 2, 4, 5, 7, 8, 9, 11],
          'bebop_dominant': [0, 2, 4, 5, 7, 9, 10, 11],
          'bebop_minor': [0, 2, 3, 5, 7, 8, 9, 10],
          
          // Exotic and World Scales
          'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          'whole_tone': [0, 2, 4, 6, 8, 10],
          'diminished_whole_half': [0, 2, 3, 5, 6, 8, 9, 11],
          'diminished_half_whole': [0, 1, 3, 4, 6, 7, 9, 10],
          'augmented': [0, 3, 4, 7, 8, 11],
          
          // Middle Eastern Scales
          'phrygian_dominant': [0, 1, 4, 5, 7, 8, 10],
          'double_harmonic': [0, 1, 4, 5, 7, 8, 11],
          'hijaz': [0, 1, 4, 5, 7, 8, 11],
          'maqam_hijaz': [0, 1, 4, 5, 7, 8, 10],
          
          // Eastern Scales
          'japanese_in_sen': [0, 1, 5, 7, 10],
          'japanese_hirajoshi': [0, 2, 3, 7, 8],
          'japanese_kumoi': [0, 2, 3, 7, 9],
          'chinese': [0, 4, 6, 7, 11],
          'mongolian': [0, 2, 4, 7, 9],
          
          // Indian Ragas (simplified)
          'raga_bhairav': [0, 1, 4, 5, 7, 8, 11],
          'raga_yaman': [0, 2, 4, 6, 7, 9, 11],
          'raga_kafi': [0, 2, 3, 5, 7, 9, 10],
          
          // Synthetic Scales
          'altered': [0, 1, 3, 4, 6, 8, 10],
          'super_locrian': [0, 1, 3, 4, 6, 8, 10],  // Same as altered
          'lydian_dominant': [0, 2, 4, 6, 7, 9, 10],
          'half_diminished': [0, 2, 3, 5, 6, 8, 10],
          
          // Modes of Harmonic Minor
          'harmonic_minor_2': [0, 1, 3, 4, 6, 8, 9],  // Locrian #6
          'harmonic_minor_3': [0, 2, 3, 5, 7, 8, 10],  // Ionian #5
          'harmonic_minor_4': [0, 1, 3, 5, 6, 8, 9],   // Dorian #4
          'harmonic_minor_5': [0, 2, 4, 5, 7, 8, 10],  // Phrygian dominant
          'harmonic_minor_6': [0, 2, 3, 5, 6, 8, 9],   // Lydian #2
          'harmonic_minor_7': [0, 1, 3, 4, 6, 7, 9],   // Super locrian diminished
          
          // Modes of Melodic Minor
          'melodic_minor_2': [0, 1, 3, 4, 6, 8, 10],  // Dorian b2
          'melodic_minor_3': [0, 2, 3, 5, 7, 9, 10],  // Lydian augmented
          'melodic_minor_4': [0, 1, 3, 5, 7, 8, 10],  // Lydian dominant
          'melodic_minor_5': [0, 2, 4, 6, 7, 9, 10],  // Mixolydian b6
          'melodic_minor_6': [0, 2, 4, 5, 7, 8, 10],  // Locrian #2
          'melodic_minor_7': [0, 2, 3, 5, 6, 8, 9]    // Altered scale
        };
        
        const chordPatterns = {
          // Basic Triads
          'maj': [0, 4, 7],
          'min': [0, 3, 7],
          'dim': [0, 3, 6],
          'aug': [0, 4, 8],
          
          // Suspended Chords
          'sus2': [0, 2, 7],
          'sus4': [0, 5, 7],
          
          // Seventh Chords
          '7': [0, 4, 7, 10],
          'maj7': [0, 4, 7, 11],
          'min7': [0, 3, 7, 10],
          'min_maj7': [0, 3, 7, 11],
          'dim7': [0, 3, 6, 9],
          'half_dim7': [0, 3, 6, 10],
          'aug7': [0, 4, 8, 10],
          'aug_maj7': [0, 4, 8, 11],
          
          // Extended Chords (9ths)
          '9': [0, 4, 7, 10, 14],
          'maj9': [0, 4, 7, 11, 14],
          'min9': [0, 3, 7, 10, 14],
          'min_maj9': [0, 3, 7, 11, 14],
          'add9': [0, 4, 7, 14],
          'min_add9': [0, 3, 7, 14],
          
          // Extended Chords (11ths)
          '11': [0, 4, 7, 10, 14, 17],
          'maj11': [0, 4, 7, 11, 14, 17],
          'min11': [0, 3, 7, 10, 14, 17],
          'add11': [0, 4, 7, 17],
          'min_add11': [0, 3, 7, 17],
          
          // Extended Chords (13ths)
          '13': [0, 4, 7, 10, 14, 17, 21],
          'maj13': [0, 4, 7, 11, 14, 17, 21],
          'min13': [0, 3, 7, 10, 14, 17, 21],
          'add13': [0, 4, 7, 21],
          '6': [0, 4, 7, 9],
          'min6': [0, 3, 7, 9],
          
          // Altered Chords
          '7b5': [0, 4, 6, 10],
          '7#5': [0, 4, 8, 10],
          '7b9': [0, 4, 7, 10, 13],
          '7#9': [0, 4, 7, 10, 15],
          '7#11': [0, 4, 7, 10, 18],
          '7b13': [0, 4, 7, 10, 20],
          'alt': [0, 4, 6, 10, 13, 15], // Altered dominant (b5, #9)
          
          // Jazz/Advanced Chords
          'maj7#11': [0, 4, 7, 11, 18],
          'min_maj7#11': [0, 3, 7, 11, 18],
          'maj7b5': [0, 4, 6, 11],
          'maj9#11': [0, 4, 7, 11, 14, 18],
          'min6_9': [0, 3, 7, 9, 14],
          '6_9': [0, 4, 7, 9, 14],
          
          // Quartal/Quintal Chords
          'quartal': [0, 5, 10],
          'quintal': [0, 7, 14],
          
          // Special/Modal Chords
          'power': [0, 7],  // Power chord (1-5)
          'power_octave': [0, 7, 12],  // Power chord with octave
          'maj_no3': [0, 7],  // Root and fifth only
          'min_no3': [0, 7],  // Same as above (no third to define major/minor)
          
          // Additional Suspended Variations
          'sus2_7': [0, 2, 7, 10],
          'sus4_7': [0, 5, 7, 10],
          'sus2_maj7': [0, 2, 7, 11],
          'sus4_maj7': [0, 5, 7, 11],
          
          // Augmented variations
          'aug_add9': [0, 4, 8, 14],
          'aug_maj7_add9': [0, 4, 8, 11, 14],
          
          // Diminished variations
          'dim_add9': [0, 3, 6, 14],
          'dim_maj7': [0, 3, 6, 11]
        };
        
        // Create patterns in AppState if it doesn't exist
        if (!AppState.patterns) {
          AppState.patterns = {};
        }
        
        AppState.patterns.scales = scalePatterns;
        AppState.patterns.chords = chordPatterns;
        
        console.log('PracticeModule: Created patterns in AppState');
      } else {
        console.log('PracticeModule: Patterns found in AppState');
      }
      
      // Force log the patterns to ensure they're available
      console.log('Scale patterns:', AppState.patterns.scales);
      console.log('Chord patterns:', AppState.patterns.chords);
      
      // Log the available patterns
      const scalePatterns = AppState.patterns.scales;
      const chordPatterns = AppState.patterns.chords;
      
      if (!scalePatterns || Object.keys(scalePatterns).length === 0) {
        console.error('PracticeModule init: Scale patterns not found in AppState');
      } else {
        console.log(`PracticeModule: Loaded ${Object.keys(scalePatterns).length} scale patterns`);
      }
      
      if (!chordPatterns || Object.keys(chordPatterns).length === 0) {
        console.error('PracticeModule init: Chord patterns not found in AppState');
      } else {
        console.log(`PracticeModule: Loaded ${Object.keys(chordPatterns).length} chord patterns`);
      }
      
      // Load practice session logs from storage
      this.loadSessionLogsFromStorage();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize difficulty parameters
      this.initDifficultyParams();

      // Subscribe to MIDI events
      this.setupMIDIEventSubscription();
      
      // Populate scale and chord selects with available patterns
      this.populateSelects();
      
      console.log('PracticeModule: Initialized');
      return this;
    },

    /**
     * Initialize practice difficulty parameters based on current settings
     */
    initDifficultyParams() {
      const difficulty = AppState.get('practice.config.difficulty');
      
      switch (difficulty) {
        case 'easy':
          AppState.set('practice.config.repetitions', 3);
          AppState.set('practice.config.displayDuration', 10000);
          break;
        case 'medium':
          AppState.set('practice.config.repetitions', 2);
          AppState.set('practice.config.displayDuration', 7000);
          break;
        case 'hard':
        case 'expert':
          AppState.set('practice.config.repetitions', 1);
          AppState.set('practice.config.displayDuration', 5000);
          break;
      }
    },

    /**
     * Subscribe to MIDI-related events
     */
    setupMIDIEventSubscription() {
      // Listen for note played events from MIDI
      document.addEventListener('midi:noteOn', (e) => {
        if (AppState.get('practice.isActive')) {
          const noteName = e.detail.noteName;
          if (noteName) {
            // Add to played notes array
            const playedNotes = AppState.get('practice.playedNotes') || [];
            if (!playedNotes.includes(noteName)) {
              AppState.set('practice.playedNotes', [...playedNotes, noteName]);
              
              // Check if the played notes match the challenge
              this.checkPlayedNotes();
            }
          }
        }
      });
    },
    
    /**
     * Set up event listeners for practice functionality
     */
    setupEventListeners() {
      // Mode selection buttons
      const scaleMode = document.getElementById('scale-mode');
      const chordMode = document.getElementById('chord-mode');
      const backButton = document.getElementById('back-to-practice-home');

      if (scaleMode) {
        EventManager.on(scaleMode, 'click', () => {
          console.log('Scale mode button clicked');
          this.setMode('scale');
        });
      }

      if (chordMode) {
        EventManager.on(chordMode, 'click', () => {
          console.log('Chord mode button clicked');
          this.setMode('chord');
        });
      }
      
      // Back button to return to initial selectors
      if (backButton) {
        EventManager.on(backButton, 'click', () => {
          console.log('Back button clicked');
          
          // Make sure practice is not active
          if (AppState.get('practice.isActive')) {
            this.stopPractice();
          }
          
          // Reset to 'none' mode, which will update all UI elements
          this.setMode('none');
          
          console.log('Returned to practice home screen');
        });
      }

      // Practice start button
      const startPracticeButton = document.getElementById('start-practice');
      if (startPracticeButton) {
        EventManager.on(startPracticeButton, 'click', () => {
          // If practice was paused, resume it, otherwise start fresh
          if (AppState.get('practice.isPaused')) {
            this.resumePractice();
          } else {
            this.startPractice();
          }
        });
      }
      
      // Stop practice button
      const stopPracticeButton = document.getElementById('stop-practice');
      if (stopPracticeButton) {
        EventManager.on(stopPracticeButton, 'click', () => this.stopPractice());
      }
      
      // Pause practice button
      const pausePracticeButton = document.getElementById('pause-practice');
      if (pausePracticeButton) {
        EventManager.on(pausePracticeButton, 'click', () => this.pausePractice());
      }
      
      // Play selected button
      const playSelectedButton = document.getElementById('play-selected');
      if (playSelectedButton) {
        EventManager.on(playSelectedButton, 'click', () => this.playSelected());
      }
      
      // Escape key to stop practice
      EventManager.onKey('Escape', () => {
        if (AppState.get('practice.isActive')) {
          this.stopPractice();
        }
      });
      
      // Duration sliders
      const scaleDurationSlider = document.getElementById('scale-duration');
      if (scaleDurationSlider) {
        EventManager.on(scaleDurationSlider, 'input', (e) => {
          const durationInSeconds = parseFloat(e.target.value);
          const durationInMs = durationInSeconds * 1000;
          AppState.set('practice.durations.scale', durationInMs);
          
          // Update display
          const scaleDurationValue = document.getElementById('scale-duration-value');
          if (scaleDurationValue) {
            scaleDurationValue.textContent = durationInSeconds.toFixed(1);
          }
        });
      }
      
      const chordDurationSlider = document.getElementById('chord-duration');
      if (chordDurationSlider) {
        EventManager.on(chordDurationSlider, 'input', (e) => {
          const durationInSeconds = parseFloat(e.target.value);
          const durationInMs = durationInSeconds * 1000;
          AppState.set('practice.durations.chord', durationInMs);
          
          // Update display
          const durationValue = document.getElementById('duration-value');
          if (durationValue) {
            durationValue.textContent = durationInSeconds.toFixed(1);
          }
        });
      }
      
      // Key selection mode selector
      const keySelectionMode = document.getElementById('key-selection-mode');
      const specificKeySelect = document.getElementById('specific-key');
      
      if (keySelectionMode) {
        EventManager.on(keySelectionMode, 'change', () => {
          const selectedMode = keySelectionMode.value;
          AppState.set('practice.config.keySelection', selectedMode);
          
          // Show/hide specific key selector based on mode
          if (specificKeySelect) {
            specificKeySelect.style.display = selectedMode === 'specific' ? 'block' : 'none';
            
            // Reset the specific key if switching to random mode
            if (selectedMode === 'random') {
              AppState.set('practice.config.specificKey', '');
            }
          }
          
          console.log(`Key selection mode changed to: ${selectedMode}`);
        });
      }
      
      // Specific key selector
      if (specificKeySelect) {
        EventManager.on(specificKeySelect, 'change', () => {
          const selectedKey = specificKeySelect.value;
          AppState.set('practice.config.specificKey', selectedKey);
          console.log(`Specific key changed to: ${selectedKey}`);
        });
      }
      
      // Setup close practice panel button
      const closePracticePanelButton = document.getElementById('close-practice-panel');
      
      if (closePracticePanelButton) {
        EventManager.on(closePracticePanelButton, 'click', () => {
          if (AppState.get('practice.isActive')) {
            this.stopPractice();
          }
          
          // Reset UI to initial state
          const practiceOptions = document.querySelector('.practice-options');
          const initialSelectors = document.querySelector('.practice-initial-selectors');
          
          if (practiceOptions) practiceOptions.style.display = 'none';
          if (initialSelectors) initialSelectors.style.display = 'flex';
          
          // Hide the back button
          const backButton = document.getElementById('back-to-practice-home');
          if (backButton) backButton.style.display = 'none';
          
          AppState.set('practice.optionsVisible', false);
          
          // Don't use UIManager.hidePanel as it might affect other panels
          // Just hide this specific panel
          const practicePanel = document.getElementById('practice-panel');
          if (practicePanel) {
            practicePanel.style.display = 'none';
            practicePanel.classList.remove('visible');
            console.log('Hiding Practice panel without affecting other panels');
            
            // Remove active state from this panel's menu item
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
              if (item.getAttribute('data-target') === 'practice-panel') {
                item.classList.remove('active');
                console.log('Removed active class from Practice panel menu item');
              }
            });
            
            // Update the visible panels state
            const currentPanels = AppState.get('ui.visiblePanels') || [];
            const updatedPanels = currentPanels.filter(id => id !== 'practice-panel');
            AppState.set('ui.visiblePanels', updatedPanels);
          }
        });
      }
      
      // Listen for played notes during practice
      document.addEventListener('practice:noteChecked', () => {
        if (AppState.get('practice.isActive')) {
          this.checkPlayedNotes();
        }
      });
      
      // Setup practice session logs panel
      const viewPracticeSessionsBtn = document.getElementById('view-practice-sessions');
      if (viewPracticeSessionsBtn) {
        EventManager.on(viewPracticeSessionsBtn, 'click', () => {
          this.showPracticeSessionsPanel();
        });
      }
      
      // Setup close practice sessions panel button
      const closePracticeSessionsBtn = document.getElementById('close-practice-sessions');
      if (closePracticeSessionsBtn) {
        EventManager.on(closePracticeSessionsBtn, 'click', () => {
          this.hidePracticeSessionsPanel();
        });
      }
      
      // Setup close session details button
      const closeSessionDetailsBtn = document.getElementById('close-session-details');
      if (closeSessionDetailsBtn) {
        EventManager.on(closeSessionDetailsBtn, 'click', () => {
          this.hideSessionDetails();
        });
      }
      
      // Setup delegate for session items
      const sessionsList = document.getElementById('sessions-list');
      if (sessionsList) {
        EventManager.on(sessionsList, 'click', (e) => {
          const sessionItem = e.target.closest('.session-item');
          if (sessionItem) {
            const sessionId = sessionItem.getAttribute('data-session-id');
            if (sessionId) {
              this.showSessionDetails(sessionId);
            }
          }
        });
      }
      
      // Setup delegate for challenge items
      const sessionDetails = document.getElementById('session-details');
      if (sessionDetails) {
        EventManager.on(sessionDetails, 'click', (e) => {
          const challengeItem = e.target.closest('.challenge-item');
          if (challengeItem) {
            const challengeIndex = challengeItem.getAttribute('data-index');
            const sessionId = sessionDetails.getAttribute('data-session-id');
            if (challengeIndex && sessionId) {
              this.playChallenge(sessionId, parseInt(challengeIndex));
            }
          }
        });
      }
    },
    
    /**
     * Set practice mode
     * @param {string} mode - Practice mode ('scale', 'chord', 'none')
     */
    setMode(mode) {
      console.log(`PracticeModule: Setting practice mode to ${mode}`);
      
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      
      // Set practice mode in state
      AppState.set('practice.mode', mode);
      
      // Make sure we have the latest patterns
      this.populateSelects();
      
      // Update UI visibility
      const practiceOptions = document.querySelector('.practice-options');
      const initialSelectors = document.querySelector('.practice-initial-selectors');
      const backButton = document.getElementById('back-to-practice-home');
      const playSelectedButton = document.getElementById('play-selected');
      const startPracticeButton = document.getElementById('start-practice');
      const rootNoteContainer = document.getElementById('root-note-container');
      const rootNoteSelect = document.getElementById('root-note-select');
      const scaleSelect = document.getElementById('scale-select');
      const chordSelect = document.getElementById('chord-select');
      
      // When setting a specific mode, hide initial selectors and show options
      if (mode === 'scale' || mode === 'chord') {
        if (practiceOptions) practiceOptions.style.display = 'block';
        if (initialSelectors) initialSelectors.style.display = 'none';
        if (backButton) backButton.style.display = 'block';
        if (playSelectedButton) playSelectedButton.style.display = 'block';
        if (startPracticeButton) startPracticeButton.style.display = 'block';
        
        // Show the root note selector for both modes
        if (rootNoteContainer) rootNoteContainer.style.display = 'block';
        if (rootNoteSelect) rootNoteSelect.style.display = 'block';
        
        // Show the appropriate selector based on mode
        if (mode === 'scale') {
          if (scaleSelect) scaleSelect.style.display = 'block';
          if (chordSelect) chordSelect.style.display = 'none';
        } else { // mode === 'chord'
          if (scaleSelect) scaleSelect.style.display = 'none';
          if (chordSelect) chordSelect.style.display = 'block';
        }
        
        // Show/hide the key selection container based on mode
        const keySelectionContainer = document.getElementById('key-selection-container');
        if (keySelectionContainer) {
          keySelectionContainer.style.display = mode === 'chord' ? 'flex' : 'none';
        }
        
        // Make sure we don't have any stale feedback or challenge display
        UIManager.showFeedback('');
        
        // Update practice options visibility state
        AppState.set('practice.optionsVisible', true);
      } else {
        // For 'none' mode, show initial selectors and hide options
        if (practiceOptions) practiceOptions.style.display = 'none';
        if (initialSelectors) initialSelectors.style.display = 'flex';
        if (backButton) backButton.style.display = 'none';
        if (playSelectedButton) playSelectedButton.style.display = 'none';
        if (startPracticeButton) startPracticeButton.style.display = 'none';
        
        // Hide selectors in 'none' mode
        if (rootNoteContainer) rootNoteContainer.style.display = 'none';
        if (scaleSelect) scaleSelect.style.display = 'none';
        if (chordSelect) chordSelect.style.display = 'none';
        
        // Update practice options visibility state
        AppState.set('practice.optionsVisible', false);
      }
      
      // Update UI and component visibility
      UIManager.setupPracticeModeUI(mode);
      
      // Populate key selector if needed
      if (mode === 'chord') {
        this.populateKeySelector();
        
        // Initialize key selection mode display
        const keySelectionMode = document.getElementById('key-selection-mode');
        const specificKeySelect = document.getElementById('specific-key');
        
        if (keySelectionMode) {
          // Set value from AppState
          const currentMode = AppState.get('practice.config.keySelection') || 'random';
          keySelectionMode.value = currentMode;
          
          // Update specific key selector visibility
          if (specificKeySelect) {
            specificKeySelect.style.display = currentMode === 'specific' ? 'block' : 'none';
            
            // If specific mode with a previously selected key, set it
            if (currentMode === 'specific') {
              const currentKey = AppState.get('practice.config.specificKey');
              if (currentKey) {
                specificKeySelect.value = currentKey;
              }
            }
          }
        }
      }
    },

    /**
     * Populate key selector dropdown
     */
    populateKeySelector() {
      const specificKeySelect = document.getElementById('specific-key');
      if (!specificKeySelect) return;
      
      // Clear existing options
      specificKeySelect.innerHTML = '<option value="">Select a Key</option>';
      
      // Get all available root notes
      const uniqueNoteNames = AudioEngine.getUniqueNoteNames();
      
      // Sort and add options
      uniqueNoteNames.sort().forEach(noteName => {
        const option = document.createElement('option');
        option.value = noteName;
        option.textContent = noteName;
        specificKeySelect.appendChild(option);
      });
    },
    
    /**
     * Play the currently selected scale or chord
     */
    playSelected() {
      // Ensure audio context is running
      AudioEngine.ensureContextRunning();
      
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      
      const practiceMode = AppState.get('practice.mode');
      if (practiceMode === 'none') {
        UIManager.showFeedback('Please select Scale Mode or Chord Mode first', 'error');
        return;
      }
      
      // Get the root note
      const rootNoteSelect = document.getElementById('root-note-select');
      if (!rootNoteSelect) {
        console.error('Root note select not found');
        return;
      }
      const rootNote = rootNoteSelect.value;
      
      let pattern, patternName, notes;
      
      if (practiceMode === 'scale') {
        const scaleSelect = document.getElementById('scale-select');
        if (!scaleSelect || !scaleSelect.value) {
          UIManager.showFeedback('Please select a scale', 'error');
          return;
        }
        
        patternName = scaleSelect.value;
        pattern = AppState.get(`patterns.scales.${patternName}`);
        
        if (!pattern) {
          UIManager.showFeedback('Invalid scale selected', 'error');
          return;
        }
        
        // Calculate scale notes
        notes = this.calculateNotesFromPattern(rootNote, pattern);
        
        if (notes.length === 0) {
          UIManager.showFeedback('Could not generate valid notes for this scale', 'error');
          return;
        }
        
        // Format the scale name for display
        const formattedName = patternName.charAt(0).toUpperCase() + 
          patternName.slice(1).replace(/_/g, ' ');
        
        // Update challenge display
        UIManager.updateChallengeDisplay(`Playing: ${rootNote} ${formattedName} Scale`);
        
        // Highlight and play the scale
        PianoModule.highlightNotes(notes);
        
        // Play the scale with the current duration setting
        const scaleDuration = AppState.get('practice.durations.scale');
        PianoModule.playNoteSequence(notes, {
          highlightDuration: scaleDuration
        });
        
      } else if (practiceMode === 'chord') {
        const chordSelect = document.getElementById('chord-select');
        if (!chordSelect || !chordSelect.value) {
          UIManager.showFeedback('Please select a chord', 'error');
          return;
        }
        
        patternName = chordSelect.value;
        pattern = AppState.get(`patterns.chords.${patternName}`);
        
        if (!pattern) {
          UIManager.showFeedback('Invalid chord selected', 'error');
          return;
        }
        
        // Calculate chord notes
        notes = this.calculateNotesFromPattern(rootNote, pattern);
        
        if (notes.length === 0) {
          UIManager.showFeedback('Could not generate valid notes for this chord', 'error');
          return;
        }
        
        // Update challenge display
        UIManager.updateChallengeDisplay(`Playing: ${rootNote} ${patternName} Chord`);
        
        // Highlight and play the chord
        PianoModule.highlightNotes(notes);
        
        // Play the chord with the current duration setting
        const chordDuration = AppState.get('practice.durations.chord');
        PianoModule.playChord(notes, {
          duration: chordDuration
        });
      }
      
      // Clear feedback display
      UIManager.showFeedback('');
    },
    
    /**
     * Start practice mode
     */
    startPractice() {
      // Ensure audio context is running
      AudioEngine.ensureContextRunning();
      
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      AudioEngine.stopAllNotes();
      
      const practiceMode = AppState.get('practice.mode');
      if (practiceMode === 'none') {
        UIManager.showFeedback('Please select Scale Mode or Chord Mode first', 'error');
        return;
      }
      
      // Check if we're resuming or starting fresh
      const startButton = document.getElementById('start-practice');
      const isResuming = startButton && startButton.textContent === 'Resume Practice';
      
      if (isResuming && AppState.get('practice.isPaused')) {
        // If we're resuming, call the resume method instead
        this.resumePractice();
        return;
      }
      
      // Reset practice state
      AppState.set('practice.playedNotes', []);
      AppState.set('practice.currentChallenge', []);
      AppState.set('practice.isActive', false); // Start inactive
      AppState.set('practice.isPaused', false);
      AppState.set('practice.pausedState', null);
      
      // Reset chord tracking
      this.lastChordType = null;
      this.recentChordTypes = [];
      
      // Reset practice stats if starting a new session
      if (confirm("Reset practice statistics?")) {
        AppState.practice.stats = {
          totalChallenges: 0,
          correctResponses: 0,
          incorrectResponses: 0,
          currentStreak: 0,
          bestStreak: 0
        };
        UIManager.updatePracticeStats(AppState.practice.stats);
      }
      
      // Start a new practice session log
      this.startNewSessionLog();
      
      // Show the practice stats panel
      UIManager.showPracticeStats(true);
      
      // Show the stop and pause practice buttons
      UIManager.showElement('stop-practice');
      UIManager.showElement('pause-practice');
      UIManager.hideElement('start-practice');
      
      // Hide the View Practice Sessions button when starting
      UIManager.hideElement('view-practice-sessions');
      
      console.log('Starting practice mode...');
      
      // Clear any existing timeouts
      AppState.clearTimeouts('all');
      
      // Generate and play a random challenge after a short delay
      setTimeout(() => {
        // Only proceed if we haven't been stopped or paused
        if (!AppState.get('practice.isActive') && !AppState.get('practice.isPaused')) {
          AppState.set('practice.isActive', true);
          this.generateChallenge();
        }
      }, 1000);
    },
    
    /**
     * Start a new practice session log
     */
    startNewSessionLog() {
      // Create a unique ID for this session
      const sessionId = Date.now().toString();
      
      // Create a new session log
      const sessionLog = {
        id: sessionId,
        startTime: new Date(),
        endTime: null,
        mode: AppState.get('practice.mode'),
        challenges: [],
        difficulty: AppState.get('practice.config.difficulty')
      };
      
      // Get current session logs
      const sessionLogs = AppState.get('practice.sessionLogs') || [];
      
      // Add the new session log to the beginning of the array
      sessionLogs.unshift(sessionLog);
      
      // Limit to 50 session logs to prevent excessive storage
      if (sessionLogs.length > 50) {
        sessionLogs.pop();
      }
      
      // Update state
      AppState.set('practice.sessionLogs', sessionLogs);
      AppState.set('practice.currentSessionId', sessionId);
      
      console.log(`New practice session started: ${sessionId}`);
      
      // Save to localStorage immediately to avoid losing session on page refresh
      this.saveSessionLogsToStorage();
      
      return sessionId;
    },
    
    /**
     * Save the session logs to localStorage
     */
    saveSessionLogsToStorage() {
      try {
        const sessionLogs = AppState.get('practice.sessionLogs');
        localStorage.setItem('piano-app-practice-logs', JSON.stringify(sessionLogs));
        console.log('Saved practice session logs to localStorage');
      } catch (e) {
        console.error('Failed to save practice session logs to localStorage:', e);
      }
    },
    
    /**
     * Load session logs from localStorage
     */
    loadSessionLogsFromStorage() {
      try {
        const storedLogs = localStorage.getItem('piano-app-practice-logs');
        if (storedLogs) {
          const sessionLogs = JSON.parse(storedLogs);
          
          // Process date strings back to Date objects
          sessionLogs.forEach(session => {
            // Convert startTime and endTime strings to Date objects
            if (session.startTime) session.startTime = new Date(session.startTime);
            if (session.endTime) session.endTime = new Date(session.endTime);
            
            // Convert challenge timestamps to Date objects
            if (session.challenges && Array.isArray(session.challenges)) {
              session.challenges.forEach(challenge => {
                if (challenge.timestamp) challenge.timestamp = new Date(challenge.timestamp);
              });
            }
          });
          
          AppState.set('practice.sessionLogs', sessionLogs);
          console.log(`Loaded ${sessionLogs.length} practice session logs from localStorage`);
        }
      } catch (e) {
        console.error('Failed to load practice session logs from localStorage:', e);
      }
    },
    
    /**
     * Add a challenge to the current session log
     * @param {string} challengeType - Type of challenge (scale or chord)
     * @param {string} description - Description of the challenge
     * @param {Array} notes - Array of notes that make up the challenge
     */
    logChallenge(challengeType, description, notes) {
      const currentSessionId = AppState.get('practice.currentSessionId');
      if (!currentSessionId) return;
      
      const sessionLogs = AppState.get('practice.sessionLogs');
      const currentSession = sessionLogs.find(log => log.id === currentSessionId);
      
      if (currentSession) {
        // Add challenge to log
        currentSession.challenges.push({
          type: challengeType,
          description: description,
          notes: notes,
          timestamp: new Date()
        });
        
        // Update state and save
        AppState.set('practice.sessionLogs', sessionLogs);
        this.saveSessionLogsToStorage();
      }
    },
    
    /**
     * End the current practice session log
     */
    endSessionLog() {
      const currentSessionId = AppState.get('practice.currentSessionId');
      if (!currentSessionId) return;
      
      const sessionLogs = AppState.get('practice.sessionLogs');
      const currentSession = sessionLogs.find(log => log.id === currentSessionId);
      
      if (currentSession) {
        // Set end time
        currentSession.endTime = new Date();
        
        // Update state and save
        AppState.set('practice.sessionLogs', sessionLogs);
        this.saveSessionLogsToStorage();
        
        // Clear current session ID
        AppState.set('practice.currentSessionId', null);
        
        console.log(`Practice session ended: ${currentSessionId}`);
      }
    },
    
    /**
     * Stop practice mode
     */
    stopPractice() {
      // End the current session log
      this.endSessionLog();
      
      // Reset practice state
      AppState.set('practice.isActive', false);
      AppState.set('practice.playedNotes', []);
      AppState.set('practice.isPaused', false);
      AppState.set('practice.pausedState', null);
      
      // Reset chord tracking
      this.lastChordType = null;
      this.recentChordTypes = [];
      
      // Hide the practice stats panel
      UIManager.showPracticeStats(false);
      
      // Stop any playing notes and clear timeouts
      PianoModule.stopAllNotes();
      AudioEngine.stopAllNotes();
      AppState.clearTimeouts('all');
      
      // Clear challenge display
      const mode = AppState.get('practice.mode');
      UIManager.updateChallengeDisplay(mode === 'scale' ? 
        'Scale Mode Selected' : 'Chord Mode Selected');
      
      // Show info message
      UIManager.showFeedback('Practice stopped', 'info');
      
      // Remove hints from piano keys
      const pianoKeys = document.querySelectorAll('.piano-keys .key');
      pianoKeys.forEach(key => {
        key.classList.remove('hint', 'scale-highlight');
      });
      
      // Hide the stop and pause buttons, show the start button
      UIManager.hideElement('stop-practice');
      UIManager.hideElement('pause-practice');
      UIManager.showElement('start-practice');
      
      // Reset the start button text
      const startButton = document.getElementById('start-practice');
      if (startButton) {
        startButton.textContent = 'Start Practice Mode';
      }
      
      // Clear the timeout that would generate the next challenge
      if (AppState.timeouts.feedback) {
        clearTimeout(AppState.timeouts.feedback);
        AppState.timeouts.feedback = null;
      }
      
      console.log('Practice mode stopped');
    },
    
    /**
     * Pause the current practice session
     */
    pausePractice() {
      if (!AppState.get('practice.isActive') || AppState.get('practice.isPaused')) {
        return;
      }
      
      console.log('Pausing practice mode...');
      
      // Store the current state to resume later
      const currentState = {
        currentChallenge: AppState.get('practice.currentChallenge'),
        waitingForInput: this.waitingForUserInput,
        stats: JSON.parse(JSON.stringify(AppState.get('practice.stats'))),
        mode: AppState.get('practice.mode')
      };
      
      // Clear timeouts that would advance to the next challenge
      AppState.clearTimeouts('all');
      
      // Set the pause state
      AppState.set('practice.isPaused', true);
      AppState.set('practice.pausedState', currentState);
      
      // Stop any playing notes
      PianoModule.stopAllNotes();
      AudioEngine.stopAllNotes();
      
      // Update UI
      UIManager.showElement('start-practice');
      UIManager.hideElement('pause-practice');
      UIManager.hideElement('stop-practice');
      
      // Show the View Practice Sessions button during pause
      UIManager.showElement('view-practice-sessions');
      
      // Change the start button text to "Resume Practice"
      const startButton = document.getElementById('start-practice');
      if (startButton) {
        startButton.textContent = 'Resume Practice';
      }
      
      // Extract current chord or scale info for display
      const lastPlayedInfo = this.extractLastPlayedInfo();
      
      // Update challenge display to show paused state and last played chord/scale
      if (lastPlayedInfo) {
        UIManager.updateChallengeDisplay(`Practice Paused - Last ${currentState.mode === 'chord' ? 'Chord' : 'Scale'} Played: ${lastPlayedInfo}`);
      } else {
        UIManager.updateChallengeDisplay('Practice Paused - Press Resume to continue');
      }
      
      // Show info message
      UIManager.showFeedback('Practice paused. You can add the current chord to the Song Builder.', 'info');
      
      // Show Song Builder panel
      document.getElementById('progression-panel').style.display = 'block';
      document.getElementById('progression-panel').classList.add('visible');
      
      // If this is a chord challenge, extract the root and chord type for easy addition
      this.extractCurrentChallengeForSongBuilder();
    },
    
    /**
     * Extract information about the last played chord or scale
     * @returns {string|null} Information about the last played chord or scale, or null if not available
     */
    extractLastPlayedInfo() {
      const challengeDisplay = document.getElementById('challenge-display');
      if (!challengeDisplay) return null;
      
      const challengeText = challengeDisplay.textContent || '';
      
      // Check if this is a chord challenge
      const chordMatch = challengeText.match(/Play the ([A-G]#?b?) ([a-zA-Z0-9_]+) Chord/i);
      if (chordMatch && chordMatch.length === 3) {
        return `${chordMatch[1]} ${chordMatch[2]}`;
      }
      
      // Check if this is a scale challenge
      const scaleMatch = challengeText.match(/Play the ([A-G]#?b?) ([a-zA-Z0-9_\s]+) Scale/i);
      if (scaleMatch && scaleMatch.length === 3) {
        return `${scaleMatch[1]} ${scaleMatch[2]}`;
      }
      
      return null;
    },
    
    /**
     * Extract information about the current chord challenge to make it easier to add to the Song Builder
     */
    extractCurrentChallengeForSongBuilder() {
      const practiceMode = AppState.get('practice.mode');
      if (practiceMode !== 'chord') {
        return; // Only applicable for chord practice
      }
      
      const currentChallenge = AppState.get('practice.currentChallenge');
      if (!currentChallenge || currentChallenge.length === 0) {
        return;
      }
      
      // Try to determine the chord type and root note from the challenge display
      const challengeDisplay = document.getElementById('challenge-display');
      if (challengeDisplay) {
        const challengeText = challengeDisplay.textContent || '';
        const match = challengeText.match(/Play the ([A-G]#?b?) ([a-zA-Z0-9_]+) Chord/i);
        
        if (match && match.length === 3) {
          const rootNote = match[1];
          const chordType = match[2].toLowerCase();
          
          console.log(`Extracted chord from challenge: ${rootNote} ${chordType}`);
          
          // Set the values in the Song Builder UI if possible
          const rootNoteSelect = document.getElementById('root-note-select');
          const chordSelect = document.getElementById('chord-select');
          
          if (rootNoteSelect) {
            // Find the closest matching option
            const options = Array.from(rootNoteSelect.options);
            const matchingOption = options.find(opt => opt.value === rootNote) || 
                                   options.find(opt => opt.value.startsWith(rootNote));
                                   
            if (matchingOption) {
              rootNoteSelect.value = matchingOption.value;
            }
          }
          
          if (chordSelect) {
            // Find the closest matching option
            const options = Array.from(chordSelect.options);
            const matchingOption = options.find(opt => opt.value === chordType) || 
                                   options.find(opt => opt.value.includes(chordType));
                                   
            if (matchingOption) {
              chordSelect.value = matchingOption.value;
            }
          }
          
          // Highlight the add-to-section button
          const addToSectionBtn = document.getElementById('add-to-section');
          if (addToSectionBtn) {
            addToSectionBtn.classList.add('highlighted');
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
              addToSectionBtn.classList.remove('highlighted');
            }, 3000);
          }
        }
      }
    },
    
    /**
     * Resume a paused practice session
     */
    resumePractice() {
      if (!AppState.get('practice.isPaused')) {
        return;
      }
      
      console.log('Resuming practice mode...');
      
      // Get the saved state
      const savedState = AppState.get('practice.pausedState');
      if (!savedState) {
        // If no saved state, start fresh
        this.startPractice();
        return;
      }
      
      // Restore the state
      AppState.set('practice.isActive', true);
      AppState.set('practice.isPaused', false);
      AppState.set('practice.currentChallenge', savedState.currentChallenge);
      
      // Restore the waiting for input flag
      if (savedState.waitingForInput) {
        this.markAsWaitingForInput();
      }
      
      // Update UI
      UIManager.hideElement('start-practice');
      UIManager.showElement('pause-practice');
      UIManager.showElement('stop-practice');
      
      // Hide the View Practice Sessions button when resuming
      UIManager.hideElement('view-practice-sessions');
      
      // Reset the start button text for next time
      const startButton = document.getElementById('start-practice');
      if (startButton) {
        startButton.textContent = 'Start Practice Mode';
      }
      
      // Show the practice stats panel
      UIManager.showPracticeStats(true);
      
      // Generate a new challenge after a short delay
      setTimeout(() => {
        this.generateChallenge();
      }, 1000);
      
      // Show info message
      UIManager.showFeedback('Practice resumed', 'success');
    },
    
    /**
     * Generate a random practice challenge
     */
    generateChallenge() {
      console.log('Generating new practice challenge');
      
      // Clear all existing timeouts to prevent overlapping challenges
      AppState.clearTimeouts('all');
      
      // Clear feedback display
      UIManager.showFeedback('');
      
      // Make sure to clear played notes array to avoid false positives
      AppState.set('practice.playedNotes', []);
      
      // Reset the waiting for input flag
      this.clearWaitingForInput();
      
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      AudioEngine.stopAllNotes();
      
      // Add a small delay to ensure all notes are stopped
      setTimeout(() => {
        if (!AppState.get('practice.isActive')) return;
        
        const practiceMode = AppState.get('practice.mode');
        
        // Get root note based on key selection mode
        let randomRoot;
        const keySelectionMode = AppState.get('practice.config.keySelection');
        if (keySelectionMode === 'specific') {
          const specificKey = AppState.get('practice.config.specificKey');
          if (specificKey) {
            randomRoot = specificKey;
          } else {
            // Fallback to random if no specific key is selected
            const availableRoots = AudioEngine.getUniqueNoteNames();
            randomRoot = availableRoots[Math.floor(Math.random() * availableRoots.length)];
          }
        } else {
          // Random key selection
          const availableRoots = AudioEngine.getUniqueNoteNames();
          randomRoot = availableRoots[Math.floor(Math.random() * availableRoots.length)];
        }
        
        let currentChallenge = [];
        let challengeDescription = '';
        
        if (practiceMode === 'scale') {
          // Get all scale patterns
          const scalePatterns = AppState.get('patterns.scales');
          const scaleNames = Object.keys(scalePatterns);
          
          // Select a random scale
          const randomScale = scaleNames[Math.floor(Math.random() * scaleNames.length)];
          const scalePattern = scalePatterns[randomScale];
          
          // Calculate notes for this scale
          currentChallenge = this.calculateNotesFromPattern(randomRoot, scalePattern);
          
          if (currentChallenge.length === 0) {
            UIManager.showFeedback('Could not generate a valid scale challenge', 'error');
            AppState.set('practice.isActive', false);
            return;
          }
          
          // Format the challenge name
          const scaleName = randomScale.charAt(0).toUpperCase() + 
            randomScale.slice(1).replace(/_/g, ' ');
          
          challengeDescription = `Practice: Play the ${randomRoot} ${scaleName} Scale`;
          
          // Log this challenge
          this.logChallenge('scale', `${randomRoot} ${scaleName} Scale`, currentChallenge);
          
        } else if (practiceMode === 'chord') {
          // Get all chord patterns
          const chordPatterns = AppState.get('patterns.chords');
          const chordNames = Object.keys(chordPatterns);
          
          // Select a random chord that's not the same as the last one
          let randomChord;
          let attempts = 0;
          const maxAttempts = 5; // Prevent potential infinite loops
          
          do {
            // Get a random chord from the available chord types
            randomChord = chordNames[Math.floor(Math.random() * chordNames.length)];
            attempts++;
            
            // If we've tried too many times, just use what we have to avoid an infinite loop
            if (attempts >= maxAttempts) {
              console.log('Max attempts reached, using current chord selection');
              break;
            }
            
          } while (
            // Avoid repeating the same chord type or recent chord types
            (this.lastChordType === randomChord || this.recentChordTypes.includes(randomChord)) && 
            chordNames.length > this.maxRecentChords
          );
          
          // Update the tracking for chord types
          this.lastChordType = randomChord;
          
          // Add to recent chords and maintain the list size
          this.recentChordTypes.push(randomChord);
          if (this.recentChordTypes.length > this.maxRecentChords) {
            this.recentChordTypes.shift(); // Remove the oldest chord
          }
          
          console.log(`Selected chord type: ${randomChord} (Previous chords: ${this.recentChordTypes.join(', ')})`);
          
          const chordPattern = chordPatterns[randomChord];
          
          // Calculate notes for this chord
          currentChallenge = this.calculateNotesFromPattern(randomRoot, chordPattern);
          
          if (currentChallenge.length === 0) {
            UIManager.showFeedback('Could not generate a valid chord challenge', 'error');
            AppState.set('practice.isActive', false);
            return;
          }
          
          challengeDescription = `Practice: Play the ${randomRoot} ${randomChord} Chord`;
          
          // Log this challenge
          this.logChallenge('chord', `${randomRoot} ${randomChord} Chord`, currentChallenge);
          
        } else {
          console.error('Unknown practice mode:', practiceMode);
          return;
        }
        
        // Save the current challenge to AppState
        AppState.set('practice.currentChallenge', currentChallenge);
        
        // Update challenge display
        UIManager.updateChallengeDisplay(challengeDescription);
        
        // Get difficulty settings
        const difficulty = AppState.get('practice.config.difficulty');
        const displayDuration = AppState.get('practice.config.displayDuration');
        const repetitions = AppState.get('practice.config.repetitions');

        // Expert mode doesn't show visual hints
        if (difficulty !== 'expert') {
          // Highlight the notes
          PianoModule.highlightNotes(currentChallenge, 'hint', displayDuration);
        }

        // Play the challenge after a short delay
        const playChallenge = () => {
          if (!AppState.get('practice.isActive')) return;
          
          const duration = practiceMode === 'scale' ? 
            AppState.get('practice.durations.scale') : 
            AppState.get('practice.durations.chord');
          
          // Play the challenge multiple times based on difficulty
          let currentRepetition = 0;
          
          const playNextRepetition = () => {
            if (!AppState.get('practice.isActive') || currentRepetition >= repetitions) return;
            
            // Stop any currently playing notes before starting the next repetition
            PianoModule.stopAllNotes();
            AudioEngine.stopAllNotes();
            
            // Add a small delay to ensure notes are stopped
            setTimeout(() => {
              if (!AppState.get('practice.isActive')) return;
              
              // Play the challenge
              if (practiceMode === 'scale') {
                PianoModule.playNoteSequence(currentChallenge, {
                  highlightDuration: duration,
                  ignoreInPractice: true
                });
              } else {
                PianoModule.playChord(currentChallenge, {
                  duration: duration,
                  ignoreInPractice: true
                });
              }
              
              currentRepetition++;
              
              // If this was the last repetition, mark as waiting for input
              if (currentRepetition === repetitions) {
                setTimeout(() => {
                  if (AppState.get('practice.isActive')) {
                    this.markAsWaitingForInput();
                  }
                }, duration + 500);
              } else {
                // Schedule the next repetition
                setTimeout(playNextRepetition, duration + 1000);
              }
            }, 100);
          };
          
          // Start the sequence
          playNextRepetition();
        };
        
        // Start the sequence after a short delay
        setTimeout(playChallenge, 1500);
        
        console.log('Generated challenge:', currentChallenge);
      }, 100);
    },
    
    /**
     * Retry the current challenge
     */
    retryCurrentChallenge() {
      console.log('Retrying current challenge');
      
      // Get the current challenge
      const currentChallenge = AppState.get('practice.currentChallenge');
      if (!currentChallenge || currentChallenge.length === 0) {
        console.error('No current challenge to retry');
        return;
      }
      
      // Clear all existing timeouts to prevent overlapping challenges
      AppState.clearTimeouts('all');
      
      // Reset played notes
      AppState.set('practice.playedNotes', []);
      
      // Reset the waiting for input flag
      this.clearWaitingForInput();
      
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      
      // Get the practice mode
      const practiceMode = AppState.get('practice.mode');
      
      // Play the challenge
      if (practiceMode === 'scale') {
        // Get duration
        const scaleDuration = AppState.get('practice.durations.scale');
        
        // Play the scale
        PianoModule.playNoteSequence(currentChallenge, {
          highlightDuration: scaleDuration,
          ignoreInPractice: true
        });
        
        // Mark as waiting for input after playing
        setTimeout(() => {
          if (AppState.get('practice.isActive')) {
            this.markAsWaitingForInput();
          }
        }, scaleDuration + 500);
        
      } else if (practiceMode === 'chord') {
        // Get duration
        const chordDuration = AppState.get('practice.durations.chord');
        
        // Play the chord
        PianoModule.playChord(currentChallenge, {
          duration: chordDuration,
          ignoreInPractice: true
        });
        
        // Mark as waiting for input after playing
        setTimeout(() => {
          if (AppState.get('practice.isActive')) {
            this.markAsWaitingForInput();
          }
        }, chordDuration + 500);
      } else {
        console.error('Unknown practice mode:', practiceMode);
        return;
      }
      
      // Show feedback message
      UIManager.showFeedback('Try again...', 'info', 2000);
    },
    
    /**
     * Check if the played notes match the current challenge
     */
    checkPlayedNotes() {
      // If not waiting for user input, ignore played notes
      if (!this.waitingForUserInput) {
        console.log('Not waiting for user input, ignoring played notes');
        return;
      }
      
      // Get the current challenge and played notes
      const currentChallenge = AppState.get('practice.currentChallenge');
      const playedNotes = AppState.get('practice.playedNotes');
      
      if (!currentChallenge || !playedNotes) {
        console.error('Missing current challenge or played notes');
        return;
      }
      
      console.log('Checking played notes:', playedNotes, 'against challenge:', currentChallenge);
      
      // Check if user played the correct notes (order doesn't matter)
      const practiceMode = AppState.get('practice.mode');
      let isCorrect = false;
      
      if (practiceMode === 'scale') {
        // For scales, need to play all notes in any order
        isCorrect = playedNotes.length >= currentChallenge.length && 
                   currentChallenge.every(note => playedNotes.includes(note));
      } else if (practiceMode === 'chord') {
        // For chords, need to play all notes at once
        isCorrect = playedNotes.length >= currentChallenge.length && 
                   currentChallenge.every(note => playedNotes.includes(note));
      }
      
      // Clear waiting flag immediately to prevent multiple feedback events
      this.clearWaitingForInput();
      
      if (isCorrect) {
        console.log('Correct notes played!');
        
        // Update stats
        AppState.updatePracticeStats(true);
        
        // Show feedback
        UIManager.showFeedback('Correct! Well done!', 'success', 2000);
        
        // Generate a new challenge after a short delay
        AppState.clearTimeouts('feedback'); // Clear any existing timeouts
        AppState.setFeedbackTimeout(() => {
          // Make sure practice is still active
          if (AppState.get('practice.isActive')) {
            this.generateChallenge();
          }
        }, 2000);
      } else if (playedNotes.length >= currentChallenge.length) {
        // The user played the wrong combination of notes
        console.log('Wrong notes played:', playedNotes, 'Expected:', currentChallenge);
        
        // Update stats
        AppState.updatePracticeStats(false);
        
        // Show feedback
        UIManager.showFeedback('Not quite right. Try again!', 'error', 2000);
        
        // Reset played notes and retry the same challenge
        AppState.clearTimeouts('feedback'); // Clear any existing timeouts
        AppState.setFeedbackTimeout(() => {
          // Make sure practice is still active
          if (AppState.get('practice.isActive')) {
            // Reset the played notes
            AppState.set('practice.playedNotes', []);
            this.retryCurrentChallenge();
          }
        }, 2000);
      }
      // If fewer notes than the challenge, do nothing and wait for more input
      else {
        // Re-enable waiting for input since the user is still entering notes
        this.markAsWaitingForInput();
      }
    },
    
    /**
     * Calculate notes from a pattern with proper octave handling
     * @param {string} rootNote - Root note without octave (e.g., 'C')
     * @param {number[]} pattern - Array of semitone offsets
     * @returns {string[]} Array of note names with octaves
     */
    calculateNotesFromPattern(rootNote, pattern) {
      const notes = [];
      
      // Get the root note in the proper format (with octave)
      const baseNoteWithOctave = AudioEngine.findPlayableNoteFromLowest(rootNote);
      if (!baseNoteWithOctave) {
        console.error('Could not find playable note for root:', rootNote);
        return notes;
      }
      
      // Extract name and octave from the base note
      const baseName = baseNoteWithOctave.replace(/[0-9]/g, '');
      const baseOctave = parseInt(baseNoteWithOctave.match(/[0-9]+/)[0]);
      
      // Get the semitone value of the root note (C = 0, C# = 1, etc.)
      // Include both sharps and flats with their enharmonic equivalents
      const noteValues = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 
        'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
      };
      const rootValue = noteValues[baseName];
      
      // Convert semitone values to actual note names (prefer sharps for display consistency)
      const valueToNote = {
        0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F',
        6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
      };
      
      // For A and B roots, we need special handling
      const isAorB = (baseName === 'A' || baseName === 'B');
      
      // Calculate each note in the pattern
      pattern.forEach(interval => {
        // Calculate the absolute semitone value of this note in the pattern
        const absoluteSemitone = rootValue + interval;
        
        // Calculate the note value (0-11)
        const noteValue = absoluteSemitone % 12;
        
        // Special handling for A and B root notes
        let noteOctave;
        if (isAorB) {
          if (interval === 0) {
            // Root note stays at its original octave
            noteOctave = baseOctave;
          } else if (noteValue < rootValue) {
            // If we wrapped around to a note with a lower value (like C, D, etc.),
            // it should be in the next octave
            noteOctave = baseOctave + 1;
          } else {
            // For other notes in the same octave segment
            noteOctave = baseOctave;
          }
        } else {
          // Standard octave calculation for other root notes
          const octaveChange = Math.floor(absoluteSemitone / 12);
          noteOctave = baseOctave + octaveChange;
        }
        
        // Get the note name from its value
        const noteName = valueToNote[noteValue];
        
        if (noteName) {
          const fullNote = `${noteName}${noteOctave}`;
          
          // Only add if this note exists on our keyboard
          if (AudioEngine.noteFrequencies[fullNote]) {
            notes.push(fullNote);
          } else {
            // Try one octave higher if the note doesn't exist on our keyboard
            const alternateNote = `${noteName}${noteOctave + 1}`;
            if (AudioEngine.noteFrequencies[alternateNote]) {
              notes.push(alternateNote);
            } else {
              console.log(`Note ${fullNote} and ${alternateNote} not on keyboard, skipping`);
            }
          }
        }
      });
      
      return notes;
    },
    
    /**
     * Populate select elements for scales and chords
     */
    populateSelects() {
      console.log('PracticeModule: Populating select elements');
      
      // Directly access the patterns from AppState for debugging
      const scalePatterns = AppState.get('patterns.scales');
      const chordPatterns = AppState.get('patterns.chords');
      
      console.log('Direct scale patterns check:', scalePatterns);
      console.log('Direct chord patterns check:', chordPatterns);
      console.log('Chord patterns count:', chordPatterns ? Object.keys(chordPatterns).length : 0);
      console.log('Scale patterns count:', scalePatterns ? Object.keys(scalePatterns).length : 0);
      
      // Set up the scale selector
      const scaleSelect = document.getElementById('scale-select');
      if (scaleSelect) {
        scaleSelect.innerHTML = '<option value="">Select a Scale</option>';
        
        if (!scalePatterns || Object.keys(scalePatterns).length === 0) {
          console.error('No scale patterns found in AppState');
          
          // Fallback to a basic set of scales
          const fallbackScales = {
            'major': 'Major',
            'minor': 'Minor',
            'pentatonic_major': 'Pentatonic Major',
            'pentatonic_minor': 'Pentatonic Minor'
          };
          
          for (let [scale, displayName] of Object.entries(fallbackScales)) {
            let option = document.createElement('option');
            option.value = scale;
            option.textContent = displayName;
            scaleSelect.appendChild(option);
          }
        } else {
          for (let scale in scalePatterns) {
            let option = document.createElement('option');
            option.value = scale;
            option.textContent = scale.charAt(0).toUpperCase() + scale.slice(1).replace(/_/g, ' ');
            scaleSelect.appendChild(option);
          }
        }
      } else {
        console.error('Scale select element not found');
      }
      
      // Set up the chord selector
      const chordSelect = document.getElementById('chord-select');
      if (chordSelect) {
        chordSelect.innerHTML = '<option value="">Select a Chord</option>';
        
        if (!chordPatterns || Object.keys(chordPatterns).length === 0) {
          console.error('No chord patterns found in AppState - using fallback chords');
          console.log('chordPatterns value:', chordPatterns);
          console.log('AppState.patterns:', AppState.patterns);
          
          // Fallback to a basic set of chords
          const fallbackChords = {
            'maj': 'Major',
            'min': 'Minor',
            '7': 'Dominant 7th',
            'maj7': 'Major 7th'
          };
          
          for (let [chord, displayName] of Object.entries(fallbackChords)) {
            let option = document.createElement('option');
            option.value = chord;
            option.textContent = displayName;
            chordSelect.appendChild(option);
          }
        } else {
          console.log('Successfully found chord patterns - loading all', Object.keys(chordPatterns).length, 'chord types');
          // Create a mapping for better display names
          const chordDisplayNames = {
            'maj': 'Major',
            'min': 'Minor',
            'dim': 'Diminished',
            'aug': 'Augmented',
            'sus2': 'Suspended 2nd',
            'sus4': 'Suspended 4th',
            '7': 'Dominant 7th',
            'maj7': 'Major 7th',
            'min7': 'Minor 7th',
            'min_maj7': 'Minor Major 7th',
            'dim7': 'Diminished 7th',
            'half_dim7': 'Half Diminished 7th',
            'aug7': 'Augmented 7th',
            'aug_maj7': 'Augmented Major 7th',
            '9': 'Dominant 9th',
            'maj9': 'Major 9th',
            'min9': 'Minor 9th',
            'min_maj9': 'Minor Major 9th',
            'add9': 'Add 9th',
            'min_add9': 'Minor Add 9th',
            '11': 'Dominant 11th',
            'maj11': 'Major 11th',
            'min11': 'Minor 11th',
            'add11': 'Add 11th',
            'min_add11': 'Minor Add 11th',
            '13': 'Dominant 13th',
            'maj13': 'Major 13th',
            'min13': 'Minor 13th',
            'add13': 'Add 13th',
            '6': 'Major 6th',
            'min6': 'Minor 6th',
            '7b5': '7th Flat 5',
            '7#5': '7th Sharp 5',
            '7b9': '7th Flat 9',
            '7#9': '7th Sharp 9',
            '7#11': '7th Sharp 11',
            '7b13': '7th Flat 13',
            'alt': 'Altered Dominant',
            'maj7#11': 'Major 7th Sharp 11',
            'min_maj7#11': 'Minor Major 7th Sharp 11',
            'maj7b5': 'Major 7th Flat 5',
            'maj9#11': 'Major 9th Sharp 11',
            'min6_9': 'Minor 6/9',
            '6_9': 'Major 6/9',
            'quartal': 'Quartal',
            'quintal': 'Quintal',
            'power': 'Power Chord',
            'power_octave': 'Power Chord w/Octave',
            'maj_no3': 'Major (no 3rd)',
            'min_no3': 'Minor (no 3rd)',
            'sus2_7': 'Sus2 7th',
            'sus4_7': 'Sus4 7th',
            'sus2_maj7': 'Sus2 Major 7th',
            'sus4_maj7': 'Sus4 Major 7th',
            'aug_add9': 'Augmented Add 9',
            'aug_maj7_add9': 'Augmented Major 7th Add 9',
            'dim_add9': 'Diminished Add 9',
            'dim_maj7': 'Diminished Major 7th'
          };
          
          for (let chord in chordPatterns) {
            let option = document.createElement('option');
            option.value = chord;
            option.textContent = chordDisplayNames[chord] || chord.replace(/_/g, ' ');
            chordSelect.appendChild(option);
          }
        }
      } else {
        console.error('Chord select element not found');
      }
      
      // Set up duration sliders
      const scaleDurationSlider = document.getElementById('scale-duration');
      const scaleDurationValueDisplay = document.getElementById('scale-duration-value');
      
      if (scaleDurationSlider && scaleDurationValueDisplay) {
        // Initial duration from state
        const initialDurationInSeconds = AppState.get('practice.durations.scale') / 1000;
        scaleDurationSlider.value = initialDurationInSeconds;
        scaleDurationValueDisplay.textContent = initialDurationInSeconds.toFixed(1);
      }
      
      const chordDurationSlider = document.getElementById('chord-duration');
      const durationValueDisplay = document.getElementById('duration-value');
      
      if (chordDurationSlider && durationValueDisplay) {
        // Initial duration from state
        const initialDurationInSeconds = AppState.get('practice.durations.chord') / 1000;
        chordDurationSlider.value = initialDurationInSeconds;
        durationValueDisplay.textContent = initialDurationInSeconds.toFixed(1);
      }
    },

    /**
     * Set up practice mode UI for the specified mode or initialize the entire UI
     * @param {string} [mode] - Optional practice mode ('scale' or 'chord')
     */
    setupPracticeModeUI(mode) {
      console.log('PracticeModule: Setting up practice mode UI', mode ? `for ${mode} mode` : '');
      
      // Always ensure selects are populated
      this.populateSelects();
      
      // If mode is specified, set it up
      if (mode && mode !== 'none') {
        this.setMode(mode);
      } else {
        // For 'none' mode, just ensure the state is reset
        AppState.set('practice.mode', 'none');
        
        // Make sure UI Manager also sets up practice UI
        UIManager.setupPracticeModeUI('none');
      }
    },

    /**
     * Show the practice sessions panel
     */
    showPracticeSessionsPanel() {
      // Populate the sessions list
      this.populateSessionsList();
      
      // Hide session details if visible
      this.hideSessionDetails();
      
      // Show the panel
      const sessionsPanel = document.getElementById('practice-sessions-panel');
      if (sessionsPanel) {
        sessionsPanel.style.display = 'block';
      }
    },
    
    /**
     * Hide the practice sessions panel
     */
    hidePracticeSessionsPanel() {
      const sessionsPanel = document.getElementById('practice-sessions-panel');
      if (sessionsPanel) {
        sessionsPanel.style.display = 'none';
      }
    },
    
    /**
     * Populate the sessions list with data from AppState
     */
    populateSessionsList() {
      const sessionsList = document.getElementById('sessions-list');
      if (!sessionsList) {
        console.error('Cannot populate sessions list: element not found');
        return;
      }
      
      // Clear the list
      sessionsList.innerHTML = '';
      
      // Get sessions from AppState
      const sessions = AppState.get('practice.sessionLogs') || [];
      console.log(`Populating sessions list with ${sessions.length} sessions`);
      
      if (sessions.length === 0) {
        sessionsList.innerHTML = '<div class="empty-sessions">No practice sessions recorded yet.</div>';
        return;
      }
      
      try {
        // Sort sessions by start time (newest first)
        sessions.sort((a, b) => {
          // Safely handle date comparison
          const dateA = a.startTime instanceof Date ? a.startTime : new Date(a.startTime);
          const dateB = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
          return dateB - dateA;
        });
        
        // Populate the list
        sessions.forEach((session, index) => {
          try {
            // Safely convert startTime to a Date object if it's not already
            const startTime = session.startTime instanceof Date ? 
              session.startTime : new Date(session.startTime);
            
            // Format the date and time
            const formattedDate = startTime.toLocaleDateString();
            const formattedTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const sessionItem = document.createElement('div');
            sessionItem.className = 'session-item';
            sessionItem.setAttribute('data-session-id', session.id);
            
            // Ensure mode is available, default to "Unknown" if not
            const mode = session.mode || 'Unknown';
            
            // Ensure challenges array exists
            const challengeCount = session.challenges && Array.isArray(session.challenges) 
              ? session.challenges.length 
              : 0;
            
            // Construct the session item content
            sessionItem.innerHTML = `
              <div class="session-time">${formattedDate} at ${formattedTime}</div>
              <div class="session-mode">${mode.toUpperCase()} Practice</div>
              <div class="session-challenges-count">${challengeCount} challenges</div>
            `;
            
            sessionsList.appendChild(sessionItem);
          } catch (err) {
            console.error(`Error rendering session ${index}:`, err, session);
            // Continue with next session instead of breaking the entire list
          }
        });
      } catch (error) {
        console.error('Error populating sessions list:', error);
        sessionsList.innerHTML = '<div class="empty-sessions">Error loading practice sessions. Please try again.</div>';
      }
    },
    
    /**
     * Show details for a specific session
     * @param {string} sessionId - ID of the session to display
     */
    showSessionDetails(sessionId) {
      const sessionsList = document.getElementById('sessions-list');
      const sessionDetails = document.getElementById('session-details');
      const sessionTitle = document.getElementById('session-title');
      const sessionChallenges = document.getElementById('session-challenges');
      
      if (!sessionsList || !sessionDetails || !sessionTitle || !sessionChallenges) {
        console.error('Cannot show session details: required elements not found');
        return;
      }
      
      // Get the session from AppState
      const sessions = AppState.get('practice.sessionLogs') || [];
      const session = sessions.find(s => s.id === sessionId);
      
      if (!session) {
        console.error(`Session with ID ${sessionId} not found`);
        sessionChallenges.innerHTML = '<div class="empty-challenges">Session not found.</div>';
        return;
      }
      
      try {
        // Set the session ID on the details panel
        sessionDetails.setAttribute('data-session-id', sessionId);
        
        // Format the session title
        // Safely convert startTime to a Date object if it's not already
        const startTime = session.startTime instanceof Date ? 
          session.startTime : new Date(session.startTime);
        
        const formattedDate = startTime.toLocaleDateString();
        const formattedTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const mode = session.mode || 'Unknown';
        sessionTitle.textContent = `${mode.toUpperCase()} Practice - ${formattedDate} at ${formattedTime}`;
        
        // Clear the challenges list
        sessionChallenges.innerHTML = '';
        
        // Ensure challenges array exists
        if (!session.challenges || !Array.isArray(session.challenges) || session.challenges.length === 0) {
          sessionChallenges.innerHTML = '<div class="empty-challenges">No challenges recorded in this session.</div>';
          return;
        }
        
        // Populate the challenges list
        session.challenges.forEach((challenge, index) => {
          try {
            // Safely convert timestamp to a Date object if it's not already
            const challengeTime = challenge.timestamp instanceof Date ?
              challenge.timestamp : new Date(challenge.timestamp);
              
            const timeStr = challengeTime.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            });
            
            const challengeItem = document.createElement('div');
            challengeItem.className = 'challenge-item';
            challengeItem.setAttribute('data-index', index);
            
            // Default description if missing
            const description = challenge.description || `${challenge.type || 'Unknown'} challenge`;
            
            // Construct the challenge item content
            challengeItem.innerHTML = `
              <div class="challenge-description">${description}</div>
              <div class="challenge-time">${timeStr}</div>
            `;
            
            sessionChallenges.appendChild(challengeItem);
          } catch (err) {
            console.error(`Error rendering challenge ${index}:`, err, challenge);
            // Continue with next challenge
          }
        });
        
        // Hide the sessions list and show the details
        sessionsList.style.display = 'none';
        sessionDetails.style.display = 'block';
      } catch (error) {
        console.error('Error showing session details:', error);
        sessionChallenges.innerHTML = '<div class="empty-challenges">Error loading challenge details. Please try again.</div>';
      }
    },
    
    /**
     * Hide session details and show the sessions list
     */
    hideSessionDetails() {
      const sessionsList = document.getElementById('sessions-list');
      const sessionDetails = document.getElementById('session-details');
      
      if (!sessionsList || !sessionDetails) return;
      
      // Show the sessions list and hide the details
      sessionsList.style.display = 'block';
      sessionDetails.style.display = 'none';
    },
    
    /**
     * Play a challenge from a session
     * @param {string} sessionId - ID of the session
     * @param {number} challengeIndex - Index of the challenge in the session
     */
    playChallenge(sessionId, challengeIndex) {
      try {
        // Get the session from AppState
        const sessions = AppState.get('practice.sessionLogs') || [];
        const session = sessions.find(s => s.id === sessionId);
        
        if (!session) {
          console.error(`Challenge playback failed: Session ${sessionId} not found`);
          UIManager.showFeedback('Session not found', 'error');
          return;
        }
        
        // Check if challenges array is valid
        if (!session.challenges || !Array.isArray(session.challenges)) {
          console.error('Challenge playback failed: Invalid challenges array', session);
          UIManager.showFeedback('Invalid session data', 'error');
          return;
        }
        
        // Check if challenge index is valid
        if (challengeIndex < 0 || challengeIndex >= session.challenges.length) {
          console.error(`Challenge playback failed: Invalid challenge index ${challengeIndex}`);
          UIManager.showFeedback('Challenge not found', 'error');
          return;
        }
        
        // Get the challenge
        const challenge = session.challenges[challengeIndex];
        
        // Validate the challenge has notes
        if (!challenge.notes || !Array.isArray(challenge.notes) || challenge.notes.length === 0) {
          console.error('Challenge playback failed: No notes to play', challenge);
          UIManager.showFeedback('No notes to play for this challenge', 'error');
          return;
        }
        
        // Stop any currently playing notes
        PianoModule.stopAllNotes();
        
        // Play the notes based on challenge type
        if (challenge.type === 'scale') {
          PianoModule.playNoteSequence(challenge.notes);
          // Show feedback
          UIManager.showFeedback(`Playing: ${challenge.description}`, 'info');
        } else if (challenge.type === 'chord') {
          PianoModule.playChord(challenge.notes);
          // Show feedback
          UIManager.showFeedback(`Playing: ${challenge.description}`, 'info');
        } else {
          console.error(`Unknown challenge type: ${challenge.type}`);
          UIManager.showFeedback('Unknown challenge type', 'error');
        }
      } catch (error) {
        console.error('Failed to play challenge:', error);
        UIManager.showFeedback('Error playing challenge', 'error');
      }
    },
  }