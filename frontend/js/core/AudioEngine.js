/**
 * AudioEngine - Unified audio management system for the piano application
 * Handles all audio context management, instrument loading, and sound playback
 */
const AudioEngine = {
    // Core audio components
    context: null,
    masterVolume: 0.5,
    
    // Instrument tracking
    instruments: {
      soundfontInstruments: {},
      currentInstrument: 'acoustic_grand_piano',
      loadingInProgress: false,
      allLoaded: false
    },
    
    // Note tracking
    activeNotes: [],
    
    // Frequency mapping (consolidated from existing code)
    noteFrequencies: {
      'A3': 220.00, 'A#3': 233.08, 'B3': 247.94,
      'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 
      'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30,
      'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
      'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 
      'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61,
      'A5': 880.00, 'A#5': 932.33, 'B5': 987.77
    },
    
    // Wave types for oscillator fallback
    waveTypes: {
      'grand-piano': 'sine',
      'synth': 'sawtooth',
      'guitar': 'triangle'
    },
    
    /**
     * Initialize the audio engine
     */
    async init() {
        console.log('AudioEngine: Initializing');
        
        try {
            // Create audio context
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioEngine: Created audio context, state:', this.context.state);
            
            // Set up resume function
            window.resumeAudioContext = async () => {
                if (this.context.state === 'suspended') {
                    console.log('AudioEngine: Resuming audio context');
                    await this.context.resume();
                    console.log('AudioEngine: Audio context resumed, state:', this.context.state);
                    return true;
                }
                return false;
            };
            
            // Create the global volume accessor method
            window.getCurrentVolume = () => this.masterVolume;
            
            // Initialize instruments mapping to SoundFont names
            this.instrumentMapping = {
              'grand-piano': 'acoustic_grand_piano',
              'synth': 'lead_1_square',
              'guitar': 'acoustic_guitar_nylon'
            };

            // Initialize MIDI connections
            this.initializeMIDI();
            
            // Expose volume control method
            window.AudioEngine = this;
            
            console.log('AudioEngine: Initialized, context state:', this.context.state);
            return true;
        } catch (error) {
            console.error('AudioEngine: Failed to initialize:', error);
            return false;
        }
    },
    
    /**
     * Ensure audio context is running
     */
    async ensureContextRunning() {
        if (this.context.state === 'suspended') {
            console.log('AudioEngine: Context is suspended, attempting to resume');
            try {
                await this.context.resume();
                console.log('AudioEngine: Context resumed successfully');
                return true;
            } catch (error) {
                console.error('AudioEngine: Failed to resume context:', error);
                return false;
            }
        }
        return true;
    },
    
    /**
     * Update the master volume
     * @param {number} value - Volume level (0 to 1)
     */
    setVolume(value) {
      this.masterVolume = Math.max(0, Math.min(1, value));
      
      // Update currently playing notes if possible
      this.activeNotes.forEach(note => {
        if (note.gainNode) {
          note.gainNode.gain.value = this.masterVolume;
        } else if (note.soundfontNote && typeof note.soundfontNote.gain === 'function') {
          try {
            note.soundfontNote.gain(this.masterVolume);
          } catch (e) {
            console.warn('AudioEngine: Could not update gain for SoundFont note');
          }
        }
      });
      
      console.log('AudioEngine: Volume set to', this.masterVolume);
      return this.masterVolume;
    },
    
    /**
     * Load all required SoundFont instruments
     * @param {boolean} forceReload - Force reload even if already loaded
     * @returns {Promise} Resolves when instruments are loaded
     */
    loadInstruments(forceReload = false) {
      console.log('AudioEngine: Starting loadInstruments()...');
      
      if (this.instruments.loadingInProgress) {
        console.log('AudioEngine: Already loading instruments, please wait');
        return Promise.reject(new Error('Instrument loading already in progress'));
      }
      
      if (this.instruments.allLoaded && !forceReload) {
        console.log('AudioEngine: Instruments already loaded');
        return Promise.resolve(this.instruments.soundfontInstruments);
      }
      
      console.log('AudioEngine: Loading SoundFont instruments');
      this.instruments.loadingInProgress = true;
      
      // Check if Soundfont library is available
      if (typeof Soundfont === 'undefined') {
        console.error('AudioEngine: Soundfont library not found! Make sure it is properly loaded in your HTML.');
        UIManager.showFeedback('Failed to load instruments: Soundfont library not found', 'error', 5000);
        this.instruments.loadingInProgress = false;
        return Promise.reject(new Error('Soundfont library not found'));
      }
      
      // Make sure audio context is running
      return this.ensureContextRunning()
        .then(() => {
          console.log('AudioEngine: Audio context is running, proceeding with instrument loading');
          
          // Define the default instruments to load
          const instrumentsToLoad = [
            { id: 'acoustic_grand_piano', mapTo: 'grand-piano' },
            { id: 'lead_1_square', mapTo: 'synth' },
            { id: 'acoustic_guitar_nylon', mapTo: 'guitar' }
          ];
          
          console.log('AudioEngine: Will load these instruments:', instrumentsToLoad.map(i => i.id).join(', '));
          
          // Load each instrument with proper error handling
          return Promise.all(instrumentsToLoad.map(inst => {
            console.log(`AudioEngine: Loading ${inst.id}...`);
            return Soundfont.instrument(this.context, inst.id, { 
              soundfont: 'MusyngKite',
              timeout: 10000 // 10 second timeout
            })
              .then(instrument => {
                console.log(`AudioEngine: Successfully loaded ${inst.id}`);
                this.instruments.soundfontInstruments[inst.id] = instrument;
                
                // Test note with very low volume to ensure instrument works
                try {
                  const testNote = instrument.play('C4', this.context.currentTime, { gain: 0.01 });
                  setTimeout(() => {
                    try {
                      testNote.stop(this.context.currentTime);
                    } catch (e) {
                      console.warn(`AudioEngine: Could not stop test note for ${inst.id}:`, e);
                    }
                  }, 50);
                  console.log(`AudioEngine: Test note played successfully for ${inst.id}`);
                } catch (e) {
                  console.error(`AudioEngine: Test note failed for ${inst.id}:`, e);
                  return Promise.reject(new Error(`Test note failed for ${inst.id}`));
                }
                
                return {
                  instrument,
                  id: inst.id,
                  mapTo: inst.mapTo
                };
              })
              .catch(error => {
                console.error(`AudioEngine: Failed to load instrument ${inst.id}:`, error);
                UIManager.showFeedback(`Failed to load instrument: ${inst.id}`, 'warning', 3000);
                return null;
              });
          }))
          .then(loadedInstruments => {
            // Filter out null entries (failed instruments)
            const validInstruments = loadedInstruments.filter(instr => instr !== null);
            
            console.log(`AudioEngine: Loaded ${validInstruments.length} out of ${instrumentsToLoad.length} instruments`);
            
            // Only consider successful if ALL instruments loaded
            if (validInstruments.length === instrumentsToLoad.length) {
              this.instruments.allLoaded = true;
              this.instruments.loadingInProgress = false;
              
              // Map instruments to their UI names
              validInstruments.forEach(({instrument, id, mapTo}) => {
                this.instruments.soundfontInstruments[mapTo] = instrument;
              });
              
              UIManager.showFeedback('All instruments loaded successfully!', 'success', 3000);
              return this.instruments.soundfontInstruments;
            } else {
              this.instruments.loadingInProgress = false;
              return Promise.reject(new Error(`Only ${validInstruments.length} out of ${instrumentsToLoad.length} instruments loaded successfully`));
            }
          });
        })
        .catch(error => {
          this.instruments.loadingInProgress = false;
          console.error('AudioEngine: Failed to load instruments:', error);
          UIManager.showFeedback('Failed to load all instruments. Some features may be limited.', 'error', 5000);
          throw error;
        });
    },
    
    /**
     * Map UI instrument name to SoundFont instrument name
     * @param {string} uiInstrumentName - Instrument name from UI (e.g. 'grand-piano')
     * @returns {string} SoundFont instrument name
     */
    mapInstrumentName(uiInstrumentName) {
      return this.instrumentMapping[uiInstrumentName] || 'acoustic_grand_piano';
    },
    
    /**
     * Set the current instrument
     * @param {string} instrumentName - Name of the instrument to use
     */
    setCurrentInstrument(instrumentName) {
      console.log('AudioEngine: Setting current instrument to:', instrumentName);
      
      // First stop all currently playing notes
      this.stopAllNotes();
      
      // Get the SoundFont instrument name (either mapped or direct)
      const soundfontName = this.instrumentMapping[instrumentName] || instrumentName;
      console.log('AudioEngine: Mapped to SoundFont name:', soundfontName);
      
      // Check if we have this instrument loaded
      if (!this.instruments.soundfontInstruments[soundfontName]) {
        console.log('AudioEngine: Instrument not loaded, attempting to load:', soundfontName);
        return this.loadInstrument(soundfontName)
          .then(instrument => {
            this.instruments.currentInstrument = soundfontName;
            console.log('AudioEngine: Successfully loaded and set instrument:', soundfontName);
            return soundfontName;
          })
          .catch(error => {
            console.error('AudioEngine: Failed to load instrument:', error);
            // Fall back to piano
            this.instruments.currentInstrument = 'acoustic_grand_piano';
            return 'acoustic_grand_piano';
          });
      }
      
      // Instrument is already loaded
      this.instruments.currentInstrument = soundfontName;
      console.log('AudioEngine: Set current instrument to:', soundfontName);
      return Promise.resolve(soundfontName);
    },
    
    /**
     * Load a specific instrument if not already loaded
     * @param {string} instrumentName - SoundFont instrument name
     * @returns {Promise} Resolves with the loaded instrument
     */
    loadInstrument(instrumentName) {
      console.log(`AudioEngine: Loading instrument ${instrumentName}`);
      
      // If already loaded, return it
      if (this.instruments.soundfontInstruments[instrumentName]) {
        console.log(`AudioEngine: Instrument ${instrumentName} already loaded`);
        return Promise.resolve(this.instruments.soundfontInstruments[instrumentName]);
      }
      
      // Check if Soundfont library is available
      if (typeof Soundfont === 'undefined') {
        console.error('AudioEngine: Soundfont library not found!');
        return Promise.reject(new Error('Soundfont library not found'));
      }
      
      // Ensure audio context is running
      return this.ensureContextRunning()
        .then(() => {
          console.log(`AudioEngine: Loading ${instrumentName} from Soundfont library`);
          return Soundfont.instrument(this.context, instrumentName, { 
            soundfont: 'MusyngKite',
            timeout: 10000 // 10 second timeout
          });
        })
        .then(instrument => {
          console.log(`AudioEngine: Successfully loaded ${instrumentName}`);
          this.instruments.soundfontInstruments[instrumentName] = instrument;
          
          // Test the instrument with a quiet note
          try {
            const testNote = instrument.play('C4', this.context.currentTime, { gain: 0.01 });
            setTimeout(() => {
              try {
                testNote.stop(this.context.currentTime);
              } catch (e) {
                console.warn(`AudioEngine: Could not stop test note for ${instrumentName}:`, e);
              }
            }, 50);
          } catch (e) {
            console.error(`AudioEngine: Test note failed for ${instrumentName}:`, e);
          }
          
          return instrument;
        })
        .catch(error => {
          console.error(`AudioEngine: Failed to load instrument ${instrumentName}:`, error);
          return Promise.reject(error);
        });
    },
    
    /**
     * Play a note using the current instrument with appropriate fallbacks
     * @param {string} noteName - Note name with octave (e.g. 'C4')
     * @param {Object} options - Additional options
     * @returns {Object} Note object that can be used to stop the note
     */
    playNote(noteName, options = {}) {
      const frequency = this.noteFrequencies[noteName];
      if (!frequency || isNaN(frequency)) {
        console.warn('AudioEngine: Invalid note name or frequency:', noteName);
        return null;
      }
      
      // Ensure the audio context is running
      this.ensureContextRunning();
      
      // Try to use SoundFont instrument if loaded
      const currentInstrument = this.instruments.currentInstrument;
      const soundfontInstrument = this.instruments.soundfontInstruments[currentInstrument];
      
      if (soundfontInstrument) {
        try {
          // Convert note name to MIDI note number
          const midiNote = this.noteToMidi(noteName);
          const volume = options.volume || this.masterVolume;
          
          console.log(`AudioEngine: Playing SoundFont note: ${noteName} (MIDI: ${midiNote}) with instrument: ${currentInstrument}`);
          const soundfontNote = soundfontInstrument.play(midiNote, this.context.currentTime, { gain: volume });
          
          // Create a note object for tracking
          const noteObj = {
            type: 'soundfont',
            noteName: noteName,
            soundfontNote: soundfontNote,
            stopMethod: () => soundfontNote.stop(this.context.currentTime)
          };
          
          // Add to active notes
          this.activeNotes.push(noteObj);
          
          return noteObj;
        } catch (e) {
          console.error("AudioEngine: Error playing note with SoundFont", e);
          // Fall through to oscillator method
        }
      } else {
        console.warn(`AudioEngine: SoundFont instrument not found: ${currentInstrument}`);
      }
      
      // Fallback to oscillator approach
      try {
        console.log(`AudioEngine: Falling back to oscillator for note: ${noteName}`);
        
        // Create oscillator and gain node
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        // Map UI instrument to wave type
        const uiInstrument = Object.keys(this.instrumentMapping).find(
          key => this.instrumentMapping[key] === currentInstrument
        ) || 'grand-piano';
        
        oscillator.type = this.waveTypes[uiInstrument] || 'sine';
        oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
        
        // Set volume
        const volume = options.volume || this.masterVolume;
        gainNode.gain.setValueAtTime(volume, this.context.currentTime);
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        // Start oscillator
        oscillator.start();
        
        // Create a note object for tracking
        const noteObj = {
          type: 'oscillator',
          noteName: noteName,
          oscillator: oscillator,
          gainNode: gainNode,
          stopMethod: () => {
            gainNode.gain.setValueAtTime(gainNode.gain.value, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.02);
            oscillator.stop(this.context.currentTime + 0.03);
          }
        };
        
        // Add to active notes
        this.activeNotes.push(noteObj);
        
        return noteObj;
      } catch (e) {
        console.error("AudioEngine: Error starting oscillator", e);
        return null;
      }
    },
    
    /**
     * Stop a specific note
     * @param {Object} noteObj - Note object returned from playNote
     */
    stopNote(noteObj) {
      if (!noteObj) {
        console.warn('AudioEngine: Attempted to stop a null note');
        return;
      }
      
      try {
        // Call the appropriate stop method
        if (noteObj.stopMethod && typeof noteObj.stopMethod === 'function') {
          noteObj.stopMethod();
        } else if (typeof noteObj.stop === 'function') {
          // Direct SoundFont note object
          noteObj.stop(this.context.currentTime);
        } else {
          console.warn('AudioEngine: Unknown note object format:', noteObj);
        }
        
        // Remove from active notes
        const index = this.activeNotes.findIndex(n => n === noteObj);
        if (index !== -1) {
          this.activeNotes.splice(index, 1);
        }
        
      } catch (e) {
        console.error("AudioEngine: Error stopping note", e);
      }
    },
    
    /**
     * Stop all currently playing notes
     */
    stopAllNotes() {
      console.log('AudioEngine: Stopping all currently playing notes');
      
      // Create a copy of the array to safely iterate while removing
      const notesToStop = [...this.activeNotes];
      
      // Stop each note
      notesToStop.forEach(noteObj => {
        this.stopNote(noteObj);
      });
      
      // Clear the active notes array
      this.activeNotes = [];
    },
    
    /**
     * Convert a note name to a MIDI note number
     * @param {string} noteName - Note name with octave (e.g. 'C4')
     * @returns {number} MIDI note number
     */
    noteToMidi(noteName) {
      const noteMatch = noteName.match(/([A-G]#?)(\d+)/);
      if (!noteMatch) return 60; // Default to middle C
      
      const note = noteMatch[1];
      const octave = parseInt(noteMatch[2]);
      
      const noteValues = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
      
      return noteValues[note] + ((octave + 1) * 12);
    },
    
    /**
     * Convert a MIDI note number to a note name
     * @param {number} midiNote - MIDI note number
     * @returns {string|null} Note name with octave or null if not in our range
     */
    midiToNote(midiNote) {
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const octave = Math.floor(midiNote / 12) - 1;
      const noteIndex = midiNote % 12;
      const noteName = noteNames[noteIndex];
      
      // Construct the note name with octave
      const fullNoteName = `${noteName}${octave}`;
      
      // Only return if this note exists in our noteFrequencies
      return this.noteFrequencies[fullNoteName] ? fullNoteName : null;
    },
    
    /**
     * Get all available note names
     * @returns {string[]} Array of note names
     */
    getAllNoteNames() {
      return Object.keys(this.noteFrequencies);
    },
    
    /**
     * Get unique note names without octave
     * @returns {string[]} Array of unique note names
     */
    getUniqueNoteNames() {
      return [...new Set(Object.keys(this.noteFrequencies).map(note => note.replace(/[0-9]/g, '')))];
    },   
    
    /**
     * Find the lowest octave for a given note on our keyboard
     * @param {string} noteName - Note name without octave (e.g. 'C')
     * @returns {number} Lowest octave available
     */
    findLowestOctaveForNote(noteName) {
      // Map of notes to their lowest octave on this specific keyboard
      const lowestOctaveMap = {
        'A': 3, 'A#': 3, 'B': 3,
        'C': 4, 'C#': 4, 'D': 4, 'D#': 4, 'E': 4, 'F': 4, 'F#': 4, 'G': 4, 'G#': 4
      };
      
      // Return the lowest octave for this note or default to 4
      return lowestOctaveMap[noteName] || 4;
    },
    
    /**
     * Find a playable note starting from the lowest octave
     * @param {string} noteName - Note name without octave (e.g. 'C')
     * @returns {string} Full note name with appropriate octave
     */
    findPlayableNoteFromLowest(noteName) {
      const lowestOctave = this.findLowestOctaveForNote(noteName);
      const noteKey = `${noteName}${lowestOctave}`;
      
      if (this.noteFrequencies[noteKey]) {
        return noteKey;
      }
      
      // If not found, try the next octave up
      const nextOctave = lowestOctave + 1;
      const nextNoteKey = `${noteName}${nextOctave}`;
      
      if (this.noteFrequencies[nextNoteKey]) {
        return nextNoteKey;
      }
      
      // Default to middle C if we couldn't find a valid note
      return 'C4';
    },
  /**
   * Initialize MIDI connection
   */
  initializeMIDI() {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess({ sysex: false })
        .then(this.onMIDISuccess.bind(this), this.onMIDIFailure.bind(this));
    } else {
      UIManager.updateMidiStatus(false);
      console.log('WebMIDI is not supported in this browser.');
    }
  },

  onMIDISuccess(midiAccess) {
    let inputs = midiAccess.inputs;
    let foundDevice = false;

    inputs.forEach((input) => {
      console.log(`Input port: ${input.name}`);
      input.onmidimessage = this.getMIDIMessage.bind(this);
      foundDevice = true;
      UIManager.updateMidiStatus(true);
      AppState.set('audio.midiConnected', true);
      AppState.set('audio.midiDeviceName', input.name);
      console.log('Connected to MIDI device:', input.name);
    });

    if (!foundDevice) {
      UIManager.updateMidiStatus(false);
      AppState.set('audio.midiConnected', false);
      console.log('No MIDI device found.');
    }

    midiAccess.onstatechange = (e) => {
      if (e.port.type === "input") {
        if (e.port.state === "connected") {
          e.port.onmidimessage = this.getMIDIMessage.bind(this);
          UIManager.updateMidiStatus(true);
          AppState.set('audio.midiConnected', true);
          AppState.set('audio.midiDeviceName', e.port.name);
          console.log('MIDI device connected:', e.port.name);
        } else {
          UIManager.updateMidiStatus(false);
          AppState.set('audio.midiConnected', false);
          console.log('MIDI device disconnected');
        }
      }
    };
  },

  onMIDIFailure(error) {
    UIManager.updateMidiStatus(false);
    AppState.set('audio.midiConnected', false);
    console.log('Could not access your MIDI devices:', error);
  },

  /**
   * Handle MIDI message
   * @param {MIDIMessageEvent} message - MIDI message event
   */
  getMIDIMessage(message) {
    let command = message.data[0];
    let note = message.data[1];
    let velocity = (message.data.length > 2) ? message.data[2] : 0;

    // Note On message (144) with velocity > 0
    if (command === 144 && velocity > 0) {
      // Convert MIDI note number to note name with correct octave
      const noteName = this.midiToNote(note);
      
      if (noteName) {
        console.log('MIDI Note On:', noteName, velocity);
        
        // Important: Play the note through the PianoModule, which handles practice mode
        // specifically marking this as user-initiated input for practice mode
        PianoModule.playNote(noteName, null, { isUserInitiated: true });
        
        // Dispatch a custom event that can be listened for elsewhere
        document.dispatchEvent(new CustomEvent('midi:noteOn', {
          detail: { noteName: noteName, velocity: velocity }
        }));
      }
    } 
    // Note Off message (128) or Note On with velocity 0
    else if (command === 128 || (command === 144 && velocity === 0)) {
      const noteName = this.midiToNote(note);
      if (noteName) {
        console.log('MIDI Note Off:', noteName);
        
        // Stop the note through PianoModule
        PianoModule.stopNote(noteName);
        
        // Dispatch custom event for note off
        document.dispatchEvent(new CustomEvent('midi:noteOff', {
          detail: { noteName: noteName }
        }));
      }
    }
  }
  };
  