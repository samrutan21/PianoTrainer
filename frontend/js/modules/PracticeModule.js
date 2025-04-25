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

      if (scaleMode) {
        EventManager.on(scaleMode, 'click', () => {
          // Show options panel
          const practiceOptions = document.querySelector('.practice-options');
          if (practiceOptions) {
            practiceOptions.style.display = 'block';
            document.querySelector('.practice-initial-selectors').style.display = 'none';
          }
          
          AppState.set('practice.optionsVisible', true);
          this.setMode('scale');
        });
      }

      if (chordMode) {
        EventManager.on(chordMode, 'click', () => {
          // Show options panel
          const practiceOptions = document.querySelector('.practice-options');
          if (practiceOptions) {
            practiceOptions.style.display = 'block';
            document.querySelector('.practice-initial-selectors').style.display = 'none';
          }
          
          // Show key selection for chord mode
          document.getElementById('key-selection-container').style.display = 'flex';
          
          AppState.set('practice.optionsVisible', true);
          this.setMode('chord');
        });
      }

      // Difficulty selector
      const difficultySelect = document.getElementById('difficulty-level');
      if (difficultySelect) {
        EventManager.on(difficultySelect, 'change', () => {
          const difficulty = difficultySelect.value;
          AppState.set('practice.config.difficulty', difficulty);
          
          // Update repetitions and display duration based on difficulty
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
              AppState.set('practice.config.repetitions', 1);
              AppState.set('practice.config.displayDuration', 5000);
              break;
            case 'expert':
              AppState.set('practice.config.repetitions', 1);
              AppState.set('practice.config.displayDuration', 5000);
              break;
          }
        });
      }

      // Feedback mode selector
      const feedbackModeSelect = document.getElementById('practice-feedback-mode');
      if (feedbackModeSelect) {
        EventManager.on(feedbackModeSelect, 'change', () => {
          AppState.set('practice.config.feedbackMode', feedbackModeSelect.value);
        });
      }

      // Key selection mode selector
      const keySelectionMode = document.getElementById('key-selection-mode');
      const specificKeySelect = document.getElementById('specific-key');
      if (keySelectionMode) {
        EventManager.on(keySelectionMode, 'change', () => {
          AppState.set('practice.config.keySelection', keySelectionMode.value);
          
          if (keySelectionMode.value === 'specific' && specificKeySelect) {
            specificKeySelect.style.display = 'block';
          } else if (specificKeySelect) {
            specificKeySelect.style.display = 'none';
          }
        });
      }

      if (specificKeySelect) {
        EventManager.on(specificKeySelect, 'change', () => {
          AppState.set('practice.config.specificKey', specificKeySelect.value);
        });
      }
      
      // Play selected button
      const playSelectedButton = document.getElementById('play-selected');
      if (playSelectedButton) {
        EventManager.on(playSelectedButton, 'click', () => this.playSelected());
      }
      
      // Start practice button
      const startPracticeButton = document.getElementById('start-practice');
      if (startPracticeButton) {
        EventManager.on(startPracticeButton, 'click', () => this.startPractice());
      }
      
      // Stop practice button
      const stopPracticeButton = document.getElementById('stop-practice');
      if (stopPracticeButton) {
        EventManager.on(stopPracticeButton, 'click', () => this.stopPractice());
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
      
      // Close practice panel button
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
          
          AppState.set('practice.optionsVisible', false);
          UIManager.hidePanel('practice-panel');
        });
      }
      
      // Listen for played notes during practice
      document.addEventListener('practice:noteChecked', () => {
        if (AppState.get('practice.isActive')) {
          this.checkPlayedNotes();
        }
      });
    },
    
    /**
     * Set the practice mode
     * @param {string} mode - Practice mode ('scale' or 'chord')
     */
    setMode(mode) {
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      
      // Set practice mode in state
      AppState.set('practice.mode', mode);
      
      // Update UI
      UIManager.setupPracticeModeUI(mode);
      
      // Populate key selector if needed
      if (mode === 'chord') {
        this.populateKeySelector();
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
      
      const practiceMode = AppState.get('practice.mode');
      if (practiceMode === 'none') {
        UIManager.showFeedback('Please select Scale Mode or Chord Mode first', 'error');
        return;
      }
      
      // Reset practice state
      AppState.set('practice.playedNotes', []);
      AppState.set('practice.currentChallenge', []);
      AppState.set('practice.isActive', true);
      
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
      
      // Show the practice stats panel
      UIManager.showPracticeStats(true);
      
      // Show the stop practice button
      UIManager.showElement('stop-practice');
      
      console.log('Starting practice mode...');
      
      // Clear any existing timeouts
      AppState.clearTimeouts('all');
      
      // Generate and play a random challenge after a short delay
      setTimeout(() => {
        this.generateChallenge();
      }, 500);
    },
    
    /**
     * Stop practice mode
     */
    stopPractice() {
      // Reset practice state
      AppState.set('practice.isActive', false);
      AppState.set('practice.playedNotes', []);
      
      // Hide the practice stats panel
      UIManager.showPracticeStats(false);
      
      // Stop any playing notes and clear timeouts
      PianoModule.stopAllNotes();
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
      
      // Hide the stop button
      UIManager.hideElement('stop-practice');
      
      // Clear the timeout that would generate the next challenge
      if (AppState.timeouts.feedback) {
        clearTimeout(AppState.timeouts.feedback);
        AppState.timeouts.feedback = null;
      }
      
      console.log('Practice mode stopped');
    },
    
    /**
     * Generate a random practice challenge
     */
    generateChallenge() {
      // Clear feedback display
      UIManager.showFeedback('');
      
      // Make sure to clear played notes array to avoid false positives
      AppState.set('practice.playedNotes', []);
      
      // Reset the waiting for input flag
      this.clearWaitingForInput();
      
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      
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
        
        // Update challenge display
        UIManager.updateChallengeDisplay(
          `Practice: Play the ${randomRoot} ${scaleName} Scale`
        );
        
        // Get difficulty settings
        const difficulty = AppState.get('practice.config.difficulty');
        const displayDuration = AppState.get('practice.config.displayDuration');
        const repetitions = AppState.get('practice.config.repetitions');

        // Expert mode doesn't show visual hints
        if (difficulty !== 'expert') {
          // Highlight the notes
          PianoModule.highlightNotes(currentChallenge, 'hint', displayDuration);
        }

        // Play the scale after a short delay
        setTimeout(() => {
          if (AppState.get('practice.isActive')) {
            const scaleDuration = AppState.get('practice.durations.scale');
            
            // Play the sequence multiple times based on difficulty
            let lastRepetitionEnd = 0;
            for (let i = 0; i < repetitions; i++) {
              setTimeout(() => {
                if (AppState.get('practice.isActive')) {
                  PianoModule.playNoteSequence(currentChallenge, {
                    highlightDuration: scaleDuration,
                    ignoreInPractice: true
                  });
                  
                  // Mark as waiting for input after the last repetition
                  if (i === repetitions - 1) {
                    setTimeout(() => {
                      if (AppState.get('practice.isActive')) {
                        this.markAsWaitingForInput();
                      }
                    }, scaleDuration + 500);
                  }
                }
              }, i * (scaleDuration + 1000)); // Add a 1-second gap between repetitions
              
              lastRepetitionEnd = (i + 1) * (scaleDuration + 1000);
            }
          }
        }, 1500);
        
      } else if (practiceMode === 'chord') {
        // Get all chord patterns
        const chordPatterns = AppState.get('patterns.chords');
        const chordNames = Object.keys(chordPatterns);
        
        // Select a random chord
        const randomChord = chordNames[Math.floor(Math.random() * chordNames.length)];
        const chordPattern = chordPatterns[randomChord];
        
        // Calculate notes for this chord
        currentChallenge = this.calculateNotesFromPattern(randomRoot, chordPattern);
        
        if (currentChallenge.length === 0) {
          UIManager.showFeedback('Could not generate a valid chord challenge', 'error');
          AppState.set('practice.isActive', false);
          return;
        }
        
        // Update challenge display
        UIManager.updateChallengeDisplay(
          `Practice: Play the ${randomRoot} ${randomChord} Chord`
        );
        
        // Get difficulty settings
        const difficulty = AppState.get('practice.config.difficulty');
        const displayDuration = AppState.get('practice.config.displayDuration');
        const repetitions = AppState.get('practice.config.repetitions');

        // Expert mode doesn't show visual hints
        if (difficulty !== 'expert') {
          // Highlight the notes
          PianoModule.highlightNotes(currentChallenge, 'hint', displayDuration);
        }

        // Play the chord after a short delay
        setTimeout(() => {
          if (AppState.get('practice.isActive')) {
            const chordDuration = AppState.get('practice.durations.chord');
            
            // Play the chord multiple times based on difficulty
            let lastRepetitionEnd = 0;
            for (let i = 0; i < repetitions; i++) {
              setTimeout(() => {
                if (AppState.get('practice.isActive')) {
                  PianoModule.playChord(currentChallenge, {
                    duration: chordDuration,
                    ignoreInPractice: true
                  });
                  
                  // Mark as waiting for input after the last repetition
                  if (i === repetitions - 1) {
                    setTimeout(() => {
                      if (AppState.get('practice.isActive')) {
                        this.markAsWaitingForInput();
                      }
                    }, chordDuration + 500);
                  }
                }
              }, i * (chordDuration + 500)); // Add a half-second gap between repetitions
              
              lastRepetitionEnd = (i + 1) * (chordDuration + 500);
            }
          }
        }, 1500);
        
      } else {
        UIManager.updateChallengeDisplay('Please select Scale Mode or Chord Mode first');
        UIManager.showFeedback('Please select a mode first', 'error');
        AppState.set('practice.isActive', false);
        return;
      }
      
      // Store the current challenge but be sure to do a fresh array to avoid reference issues
      AppState.set('practice.currentChallenge', [...currentChallenge]);
      
      // Make sure the practice mode stays active
      AppState.set('practice.isActive', true);
      
      console.log('Generated challenge:', currentChallenge);
    },
    
    /**
     * Retry the current challenge
     */
    retryCurrentChallenge() {
      // Clear feedback display
      UIManager.showFeedback('');
      
      // Reset played notes
      AppState.set('practice.playedNotes', []);
      
      // Reset waiting for input flag
      this.clearWaitingForInput();
      
      // Get current challenge
      const currentChallenge = AppState.get('practice.currentChallenge');
      if (!currentChallenge || currentChallenge.length === 0) {
        console.error('No current challenge to retry');
        return;
      }
      
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      
      // Highlight the notes
      const difficulty = AppState.get('practice.config.difficulty');
      if (difficulty !== 'expert') {
        PianoModule.highlightNotes(currentChallenge);
      }
      
      // Play the challenge again after a short delay
      setTimeout(() => {
        if (AppState.get('practice.isActive')) {
          const practiceMode = AppState.get('practice.mode');
          
          if (practiceMode === 'scale') {
            const scaleDuration = AppState.get('practice.durations.scale');
            PianoModule.playNoteSequence(currentChallenge, {
              highlightDuration: scaleDuration,
              ignoreInPractice: true
            }).then(() => {
              // Mark as waiting for input after demonstration is complete
              this.markAsWaitingForInput();
            });
          } else if (practiceMode === 'chord') {
            const chordDuration = AppState.get('practice.durations.chord');
            PianoModule.playChord(currentChallenge, {
              duration: chordDuration,
              ignoreInPractice: true
            }).then(() => {
              // Mark as waiting for input after demonstration is complete
              this.markAsWaitingForInput();
            });
          }
        }
      }, 1000);
      
      // Make sure the practice mode stays active
      AppState.set('practice.isActive', true);
    },
    
    /**
     * Check if the played notes match the current challenge
     */
    checkPlayedNotes() {
      // Only check notes if practice is active and waiting for user input
      if (!AppState.get('practice.isActive') || !this.waitingForUserInput) {
        console.log('Practice is not active or not waiting for input, skipping note check.');
        return;
      }

      // Check if in "unplugged" mode - skip note checking
      if (AppState.get('practice.config.feedbackMode') === 'unplugged') {
        console.log('In unplugged mode, skipping note check.');
        return;
      }
      
      const currentChallenge = AppState.get('practice.currentChallenge');
      const playedNotes = AppState.get('practice.playedNotes');
      
      // Prevent empty arrays from triggering checks
      if (!currentChallenge || !currentChallenge.length || !playedNotes || !playedNotes.length) {
        return;
      }
      
      console.log('Checking notes - Challenge:', currentChallenge, 'Played:', playedNotes);
      
      // Check if all challenge notes have been played
      const allNotesPlayed = currentChallenge.every(note => 
        playedNotes.some(played => played === note)
      );
      
      // Check if any extra notes were played
      const noExtraNotes = playedNotes.every(played => 
        currentChallenge.some(note => note === played)
      );
      
      if (allNotesPlayed && noExtraNotes) {
        // Correct response!
        console.log('All notes played correctly!');
        AppState.updatePracticeStats(true);
        
        // Update UI with stats
        UIManager.updatePracticeStats(AppState.get('practice.stats'));
        
        // Show success feedback
        UIManager.showFeedback(
          `Perfect! Well done! Streak: ${AppState.get('practice.stats.currentStreak')}`, 
          'success'
        );
        
        // No longer waiting for input
        this.clearWaitingForInput();
        
        // Temporarily mark practice as no longer active to prevent additional input during transition
        AppState.set('practice.isActive', false);
        
        // Generate next challenge after delay
        AppState.setFeedbackTimeout(() => {
          if (document.getElementById('practice-panel').style.display !== 'none') {
            // Ensure we're reactivating practice mode before generating the next challenge
            console.log('Generating next challenge');
            AppState.set('practice.isActive', true);
            this.generateChallenge();
          }
        }, 2000);
        
      } else if (allNotesPlayed) {
        // Partially correct (all required notes played but with extras)
        console.log('All required notes played but with extras.');
        // Reset streak
        AppState.set('practice.stats.currentStreak', 0);
        UIManager.updatePracticeStats(AppState.get('practice.stats'));
        
        // Show warning feedback
        UIManager.showFeedback("Almost! You played some extra notes. Try again.", 'warning');
        
        // No longer waiting for input
        this.clearWaitingForInput();
        
        // Reset played notes and retry the same challenge
        AppState.setFeedbackTimeout(() => {
          // Ensure we're still in practice mode
          if (AppState.get('practice.isActive')) {
            AppState.set('practice.playedNotes', []);
            
            const difficulty = AppState.get('practice.config.difficulty');
            if (difficulty !== 'expert') {
              PianoModule.highlightNotes(currentChallenge);
            }
            
            // Play the current challenge again after a short delay
            setTimeout(() => {
              if (AppState.get('practice.isActive')) {
                const practiceMode = AppState.get('practice.mode');
                
                if (practiceMode === 'scale') {
                  const scaleDuration = AppState.get('practice.durations.scale');
                  PianoModule.playNoteSequence(currentChallenge, {
                    highlightDuration: scaleDuration,
                    ignoreInPractice: true
                  }).then(() => {
                    this.markAsWaitingForInput();
                  });
                } else if (practiceMode === 'chord') {
                  const chordDuration = AppState.get('practice.durations.chord');
                  PianoModule.playChord(currentChallenge, {
                    duration: chordDuration,
                    ignoreInPractice: true
                  }).then(() => {
                    this.markAsWaitingForInput();
                  });
                }
              }
            }, 1000);
          }
        }, 2000);
        
      } else if (playedNotes.length >= currentChallenge.length) {
        // Wrong notes and enough of them played
        console.log('Wrong notes played.');
        AppState.updatePracticeStats(false);
        UIManager.updatePracticeStats(AppState.get('practice.stats'));
        
        // Show error feedback
        UIManager.showFeedback("Not quite right. Let's try again.", 'error');
        
        // No longer waiting for input
        this.clearWaitingForInput();
        
        // Reset played notes and retry the same challenge
        AppState.setFeedbackTimeout(() => {
          // Make sure practice is still active
          if (AppState.get('practice.isActive')) {
            // Reset the played notes
            AppState.set('practice.playedNotes', []);
            this.retryCurrentChallenge();
          }
        }, 2000);
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
      const noteValues = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11};
      const rootValue = noteValues[baseName];
      
      // Convert semitone values to actual note names
      const valueToNote = {};
      for (const [name, value] of Object.entries(noteValues)) {
        valueToNote[value] = name;
      }
      
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
      // Set up the root note selector
      const rootNoteContainer = document.getElementById('root-note-container');
      if (!rootNoteContainer) return;
      
      // Check if the select already exists
      let rootNoteSelect = document.getElementById('root-note-select');
      
      if (!rootNoteSelect) {
        rootNoteSelect = document.createElement('select');
        rootNoteSelect.id = 'root-note-select';
        
        const uniqueNoteNames = AudioEngine.getUniqueNoteNames();
        uniqueNoteNames.sort().forEach(noteName => {
          const option = document.createElement('option');
          option.value = noteName;
          option.textContent = noteName;
          rootNoteSelect.appendChild(option);
        });
        
        rootNoteSelect.value = 'C';
        rootNoteContainer.appendChild(rootNoteSelect);
      }
      
      // Set up the scale selector
      const scaleSelect = document.getElementById('scale-select');
      if (scaleSelect) {
        scaleSelect.innerHTML = '<option value="">Select a Scale</option>';
        
        const scalePatterns = AppState.get('patterns.scales');
        for (let scale in scalePatterns) {
          let option = document.createElement('option');
          option.value = scale;
          option.textContent = scale.charAt(0).toUpperCase() + scale.slice(1).replace(/_/g, ' ');
          scaleSelect.appendChild(option);
        }
      }
      
      // Set up the chord selector
      const chordSelect = document.getElementById('chord-select');
      if (chordSelect) {
        chordSelect.innerHTML = '<option value="">Select a Chord</option>';
        
        const chordPatterns = AppState.get('patterns.chords');
        for (let chord in chordPatterns) {
          let option = document.createElement('option');
          option.value = chord;
          option.textContent = chord;
          chordSelect.appendChild(option);
        }
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
      
      if (mode) {
        // If mode is specified, set it up
        this.setMode(mode);
      } else {
        // If no mode specified, just show the initial selectors
        const initialSelectors = document.querySelector('.practice-initial-selectors');
        const optionsPanel = document.querySelector('.practice-options');
        
        if (initialSelectors) initialSelectors.style.display = 'flex';
        if (optionsPanel) optionsPanel.style.display = 'none';
        
        // Reset practice mode
        AppState.set('practice.mode', 'none');
      }
      
      // Make sure UI Manager also sets up practice UI
      UIManager.setupPracticeModeUI(mode || 'none');
    }
  }