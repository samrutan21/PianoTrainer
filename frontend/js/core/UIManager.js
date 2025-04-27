/**
 * UIManager - Unified UI and DOM manipulation system for the piano application
 * Handles all DOM updates, element visibility, and UI effects
 */
const UIManager = {
    // Cache of DOM elements for performance
    elements: {},
    
    /**
     * Initialize the UI manager
     */
    init() {
      console.log('UIManager: Initializing');
      
      // Cache frequently accessed elements
      this.cacheElements();
      
      console.log('UIManager: Initialized');
      return this;
    },
    
    /**
     * Cache commonly used DOM elements
     */
    cacheElements() {
      this.elements = {
        // Piano elements
        pianoKeys: document.querySelectorAll('.piano-keys .key'),
        whiteKeys: document.querySelectorAll('.piano-keys .white'),
        blackKeys: document.querySelectorAll('.piano-keys .black'),
        
        // Display elements
        feedbackDisplay: document.getElementById('feedback-display'),
        challengeDisplay: document.getElementById('challenge-display'),
        
        // Control elements
        volumeKnob: document.getElementById('volume-knob'),
        volumeSlider: document.getElementById('volume-slider'),
        instrumentDisplay: document.getElementById('instrument-display'),
        midiIndicator: document.getElementById('midi-indicator'),
        
        // Panels
        practicePanel: document.getElementById('practice-panel'),
        progressionPanel: document.getElementById('progression-panel'),
        practiceStatsPanel: document.getElementById('practice-stats-panel'),
        
        // Practice controls
        scaleMode: document.getElementById('scale-mode'),
        chordMode: document.getElementById('chord-mode'),
        scaleSelect: document.getElementById('scale-select'),
        chordSelect: document.getElementById('chord-select'),
        rootNoteSelect: document.getElementById('root-note-select'),
        scaleDurationControl: document.getElementById('scale-duration-control'),
        chordDurationControl: document.getElementById('chord-duration-control'),
        
        // Buttons
        playSelectedButton: document.getElementById('play-selected'),
        startPracticeButton: document.getElementById('start-practice'),
        stopPracticeButton: document.getElementById('stop-practice'),
        saveToProgressionButton: document.getElementById('save-to-progression'),
        
        // Stats elements
        correctCount: document.getElementById('correct-count'),
        currentStreak: document.getElementById('current-streak'),
        bestStreak: document.getElementById('best-streak'),
        accuracy: document.getElementById('accuracy'),
        
        // Menu elements
        sideMenu: document.getElementById('side-menu'),
        menuToggle: document.getElementById('menu-toggle'),
        menuItems: document.querySelectorAll('.menu-item'),
        
        // Sound explorer
        soundExplorer: document.querySelector('.sound-explorer'),
        explorerContent: document.querySelector('.explorer-content'),
        instrumentCategory: document.getElementById('instrument-category'),
        instrumentSelect: document.getElementById('instrument-select')
      };
      
      console.log('UIManager: Cached DOM elements');
    },
    
    /**
     * Show an element by ID or reference
     * @param {string|Element} elementId - Element ID or reference
     * @param {string} [display='block'] - Display style
     */
    showElement(elementId, display = 'block') {
      console.log('UIManager: Showing element:', elementId);
      
      const element = typeof elementId === 'string' ? 
        document.getElementById(elementId) : elementId;
        
      if (element) {
        element.style.display = display;
        console.log('UIManager: Set display to:', display);
      } else {
        console.error('UIManager: Element not found:', elementId);
      }
    },
    
    /**
     * Hide an element by ID or reference
     * @param {string|Element} elementId - Element ID or reference
     */
    hideElement(elementId) {
      const element = typeof elementId === 'string' ? 
        document.getElementById(elementId) : elementId;
        
      if (element) {
        element.style.display = 'none';
      }
    },
    
    /**
     * Toggle element visibility by ID or reference
     * @param {string|Element} elementId - Element ID or reference
     * @param {string} [display='block'] - Display style when showing
     * @returns {boolean} New visibility state (true = visible)
     */
    toggleElement(elementId, display = 'block') {
      const element = typeof elementId === 'string' ? 
        document.getElementById(elementId) : elementId;
        
      if (!element) return false;
      
      const isVisible = element.style.display !== 'none';
      element.style.display = isVisible ? 'none' : display;
      
      return !isVisible;
    },
    
    /**
     * Show a feedback message
     * @param {string} message - Message to display
     * @param {string} [type='info'] - Message type ('success', 'error', 'warning', 'info')
     * @param {number} [duration=3000] - Auto-clear duration (0 for no auto-clear)
     */
    showFeedback(message, type = 'info', duration = 3000) {
      const element = this.elements.feedbackDisplay;
      if (!element) return;
      
      // Clear any existing timeout
      if (AppState.timeouts.feedback) {
        clearTimeout(AppState.timeouts.feedback);
        AppState.timeouts.feedback = null;
      }
      
      // Update the element
      element.textContent = message;
      
      // Remove existing classes and add the new type class
      element.classList.remove('success', 'error', 'warning', 'info');
      element.classList.add(type);
      
      // Color mapping
      const colors = {
        'success': '#00cc00',
        'error': '#ff0000',
        'warning': '#ffcc00',
        'info': '#0066cc'
      };
      
      element.style.color = colors[type] || colors.info;
      
      // Auto-clear non-error messages after delay
      if (duration > 0) {
        AppState.setFeedbackTimeout(() => {
          if (element.textContent === message) {
            element.textContent = '';
            element.className = '';
          }
        }, duration);
      }
    },
    
    /**
     * Update the challenge display
     * @param {string} text - Text to display
     */
    updateChallengeDisplay(text) {
      const element = this.elements.challengeDisplay;
      if (element) {
        element.textContent = text;
        
        // Add animation class if not empty
        if (text) {
          element.classList.add('active');
        } else {
          element.classList.remove('active');
        }
      }
    },
    
    /**
     * Update practice stats display
     * @param {Object} stats - Practice statistics
     */
    updatePracticeStats(stats) {
      const { correctCount, currentStreak, bestStreak, accuracy } = this.elements;
      
      if (correctCount) {
        correctCount.textContent = stats.correctResponses;
      }
      
      if (currentStreak) {
        currentStreak.textContent = stats.currentStreak;
      }
      
      if (bestStreak) {
        bestStreak.textContent = stats.bestStreak;
      }
      
      if (accuracy) {
        const accuracyValue = stats.totalChallenges > 0 
          ? Math.round((stats.correctResponses / stats.totalChallenges) * 100) 
          : 0;
        accuracy.textContent = `${accuracyValue}%`;
      }
    },
    
    /**
     * Show or hide practice stats panel
     * @param {boolean} show - Whether to show the panel
     */
    showPracticeStats(show) {
      const statsPanel = this.elements.practiceStatsPanel;
      if (!statsPanel) return;
      
      if (show) {
        statsPanel.classList.add('active');
        this.showElement(statsPanel);
        
        // Ensure the panel is positioned correctly if it hasn't been moved by the user yet
        if (!statsPanel.style.left && !statsPanel.style.top) {
          // Position relative to the piano wrapper (top aligned with piano)
          const wrapper = document.querySelector('.wrapper');
          if (wrapper) {
            const wrapperRect = wrapper.getBoundingClientRect();
            const panelRect = statsPanel.getBoundingClientRect();
            
            // Position next to the piano (to the right)
            const left = wrapperRect.right + 20;
            const top = wrapperRect.top;
            
            // Apply position
            statsPanel.style.left = `${left}px`;
            statsPanel.style.top = `${top}px`;
            
            console.log('Positioned practice stats panel next to the piano');
          }
        }
      } else {
        statsPanel.classList.remove('active');
        this.hideElement(statsPanel);
      }
    },
    
    /**
     * Update the instrument display
     * @param {string} instrumentName - Display name of the instrument
     */
    updateInstrumentDisplay(instrumentName) {
      const display = this.elements.instrumentDisplay;
      if (display) {
        display.textContent = instrumentName.toUpperCase();
      }
    },
    
    /**
     * Update MIDI connection status indicator
     * @param {boolean} connected - Whether MIDI is connected
     */
    updateMidiStatus(connected) {
      const indicator = this.elements.midiIndicator;
      if (!indicator) return;
      
      if (connected) {
        indicator.classList.add('connected');
      } else {
        indicator.classList.remove('connected');
      }
    },
    
    /**
     * Highlight piano keys with specific class
     * @param {string[]} noteNames - Array of note names to highlight
     * @param {string} className - CSS class to add
     * @param {number} [duration=2000] - Duration in ms (0 for no auto-removal)
     */
    highlightKeys(noteNames, className = 'hint', duration = 2000) {
      // Remove the class from all keys first
      this.elements.pianoKeys.forEach(key => {
        key.classList.remove(className);
      });
      
      // Add class to specified notes
      noteNames.forEach(note => {
        const key = document.querySelector(`[data-note="${note}"]`);
        if (key) {
          key.classList.add(className);
        }
      });
      
      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          noteNames.forEach(note => {
            const key = document.querySelector(`[data-note="${note}"]`);
            if (key) {
              key.classList.remove(className);
            }
          });
        }, duration);
      }
    },
    
    /**
     * Set active state for a piano key
     * @param {string} noteName - Note name to activate
     * @param {boolean} active - Whether to activate or deactivate
     */
    setKeyActive(noteName, active) {
      const key = document.querySelector(`[data-note="${noteName}"]`);
      if (key) {
        if (active) {
          key.classList.add('active');
        } else {
          key.classList.remove('active');
        }
      }
    },
    
    /**
     * Toggle note labels on piano keys
     * @param {boolean} show - Whether to show labels
     */
    showKeyLabels(show) {
      this.elements.pianoKeys.forEach(key => {
        if (show) {
          key.classList.remove('hide');
        } else {
          key.classList.add('hide');
        }
      });
    },
    
    /**
     * Set up practice mode UI
     * @param {string} mode - Practice mode ('scale', 'chord', 'none')
     */
    setupPracticeModeUI(mode) {
      const {
        scaleMode, 
        chordMode, 
        scaleSelect, 
        chordSelect, 
        scaleDurationControl, 
        chordDurationControl,
        saveToProgressionButton
      } = this.elements;
      
      // Reset mode buttons
      if (scaleMode) scaleMode.classList.remove('active');
      if (chordMode) chordMode.classList.remove('active');
      
      // Handle key selection visibility
      const keySelectionContainer = document.getElementById('key-selection-container');
      if (keySelectionContainer) {
        keySelectionContainer.style.display = mode === 'chord' ? 'flex' : 'none';
      }
      
      // Get root note container and select
      const rootNoteContainer = document.getElementById('root-note-container');
      const rootNoteSelect = document.getElementById('root-note-select');
      const scaleSelectElement = document.getElementById('scale-select');
      const chordSelectElement = document.getElementById('chord-select');
      
      // Manage root note container visibility
      if (rootNoteContainer) {
        rootNoteContainer.style.display = (mode === 'scale' || mode === 'chord') ? 'block' : 'none';
      }
      
      // Manage root note select visibility
      if (rootNoteSelect) {
        rootNoteSelect.style.display = (mode === 'scale' || mode === 'chord') ? 'block' : 'none';
      }
      
      // Manage scale and chord select visibility
      if (scaleSelectElement) {
        scaleSelectElement.style.display = mode === 'scale' ? 'block' : 'none';
      }
      
      if (chordSelectElement) {
        chordSelectElement.style.display = mode === 'chord' ? 'block' : 'none';
      }
      
      // Manage back button visibility
      const backButton = document.getElementById('back-to-practice-home');
      if (backButton) {
        backButton.style.display = (mode === 'scale' || mode === 'chord') ? 'block' : 'none';
      }
      
      // Manage practice buttons visibility
      const playSelectedButton = document.getElementById('play-selected');
      const startPracticeButton = document.getElementById('start-practice');
      
      if (playSelectedButton) {
        playSelectedButton.style.display = (mode === 'scale' || mode === 'chord') ? 'block' : 'none';
      }
      
      if (startPracticeButton) {
        startPracticeButton.style.display = (mode === 'scale' || mode === 'chord') ? 'block' : 'none';
      }
      
      if (mode === 'scale') {
        // Activate scale mode
        if (scaleMode) scaleMode.classList.add('active');
        
        // Show scale UI, hide chord UI
        if (scaleSelect) this.showElement(scaleSelect);
        if (chordSelect) this.hideElement(chordSelect);
        
        // Show scale duration control, hide chord duration control
        if (scaleDurationControl) this.showElement(scaleDurationControl, 'flex');
        if (chordDurationControl) this.hideElement(chordDurationControl);
        
        // Hide save to progression button (scales can't be added to progressions)
        if (saveToProgressionButton) this.hideElement(saveToProgressionButton);
        
        // Update challenge display
        this.updateChallengeDisplay('Scale Mode Selected');
        
      } else if (mode === 'chord') {
        // Activate chord mode
        if (chordMode) chordMode.classList.add('active');
        
        // Show chord UI, hide scale UI
        if (scaleSelect) this.hideElement(scaleSelect);
        if (chordSelect) this.showElement(chordSelect);
        
        // Show chord duration control, hide scale duration control
        if (scaleDurationControl) this.hideElement(scaleDurationControl);
        if (chordDurationControl) this.showElement(chordDurationControl, 'flex');
        
        // Show save to progression button
        if (saveToProgressionButton) this.showElement(saveToProgressionButton);
        
        // Update challenge display
        this.updateChallengeDisplay('Chord Mode Selected');
        
      } else {
        // Reset UI for no mode
        if (scaleSelect) this.hideElement(scaleSelect);
        if (chordSelect) this.hideElement(chordSelect);
        if (scaleDurationControl) this.hideElement(scaleDurationControl);
        if (chordDurationControl) this.hideElement(chordDurationControl);
        if (saveToProgressionButton) this.hideElement(saveToProgressionButton);
        
        // Clear challenge display
        this.updateChallengeDisplay('');
      }
      
      // Clear feedback
      this.showFeedback('');
    },
    
    /**
     * Update knob rotation based on value
     * @param {number} value - Value between 0 and 1
     */
    updateKnobRotation(value) {
      const volumeKnob = document.getElementById('volume-knob'); // Direct reference for reliability
      if (!volumeKnob) {
        console.error('updateKnobRotation: Volume knob element not found');
        return;
      }
      
      // Make sure we have a valid number and clamp between 0 and 1
      if (isNaN(value)) {
        console.warn('updateKnobRotation: Invalid value provided:', value);
        value = 0.5; // Default to mid-value
      }
      
      const clampedValue = Math.max(0, Math.min(1, value));
      
      // Calculate rotation angle: -135° to +135° (270° total range)
      const rotation = -135 + (clampedValue * 270); // -135 to 135 degrees
      
      // Apply rotation to the knob
      volumeKnob.style.transform = `rotate(${rotation}deg)`;
      
      // Make sure the marker is correctly positioned
      const marker = volumeKnob.querySelector('.knob-marker');
      if (marker) {
        marker.style.display = 'block';
      }
      
      // Update the volume level indicator via CSS variable
      document.documentElement.style.setProperty('--volume-angle', `${clampedValue * 270}deg`);
      
      console.log(`Updated volume knob rotation: value=${clampedValue}, angle=${rotation}deg`);
    },
    
    /**
     * Toggle side menu expansion
     * @param {boolean} [expanded] - Force specific state (optional)
     * @returns {boolean} New expansion state
     */
    toggleMenu(expanded) {
      const sideMenu = this.elements.sideMenu;
      if (!sideMenu) return false;
      
      const isExpanded = expanded !== undefined ? 
        expanded : !sideMenu.classList.contains('expanded');
      
      if (isExpanded) {
        sideMenu.classList.add('expanded');
      } else {
        sideMenu.classList.remove('expanded');
      }
      
      return isExpanded;
    },
    
    /**
     * Set active menu item
     * @param {string} targetId - ID of the target panel
     */
    setActiveMenuItem(targetId) {
      const menuItems = this.elements.menuItems;
      if (!menuItems) return;
      
      // Remove active class from all items
      menuItems.forEach(item => item.classList.remove('active'));
      
      // Add active class to matching item
      const targetItem = Array.from(menuItems).find(
        item => item.getAttribute('data-target') === targetId
      );
      
      if (targetItem) {
        targetItem.classList.add('active');
      }
    },
    
    /**
     * Show a specific panel and hide others
     * @param {string} panelId - ID of the panel to show
     * @param {boolean} exclusive - Whether to hide other panels (default: false)
     */
    showPanel(panelId, exclusive = false) {
      console.log('UIManager: Attempting to show panel:', panelId, 'exclusive:', exclusive);
      
      // Get all panels
      const panels = document.querySelectorAll('.panel, .youtube-panel, .practice-panel, .progression-panel');
      console.log('UIManager: Found panels:', panels.length);
      
      if (!panels.length) {
        console.error('UIManager: No panels found in the DOM');
        return;
      }
      
      // If exclusive mode, hide all other panels first
      if (exclusive) {
        console.log('UIManager: Hiding all other panels (exclusive mode)');
        panels.forEach(panel => {
          if (panel.id !== panelId) {
            console.log(`UIManager: Hiding panel: ${panel.id}`);
            panel.style.display = 'none';
            
            // Special handling for progression panel
            if (panel.id === 'progression-panel') {
              panel.classList.remove('visible');
            }
          }
        });
      }
      
      // Show the requested panel
      const targetPanel = document.getElementById(panelId);
      if (!targetPanel) {
        console.error('UIManager: Target panel not found:', panelId);
        return;
      }
      
      console.log('UIManager: Found target panel:', targetPanel.id);
      
      // Update active menu item
      const menuItems = document.querySelectorAll('.menu-item');
      menuItems.forEach(item => {
        if (item.getAttribute('data-target') === panelId) {
          item.classList.add('active');
          console.log('UIManager: Activated menu item for:', panelId);
        } else if (exclusive) {
          // Only remove active class from other menu items if in exclusive mode
          item.classList.remove('active');
        }
      });
      
      // Show the panel
      targetPanel.style.display = 'block';
      if (targetPanel.id === 'progression-panel') {
        targetPanel.classList.add('visible');
      }
      console.log('UIManager: Successfully showed panel:', panelId);
      
      // Update the current panel in state
      const currentPanels = AppState.get('ui.visiblePanels') || [];
      if (!currentPanels.includes(panelId)) {
        currentPanels.push(panelId);
        AppState.set('ui.visiblePanels', currentPanels);
      }
      AppState.set('ui.currentPanel', panelId);
      
      // If this is a practice-related panel, reset the UI to initial state
      if (panelId === 'practice-panel') {
        console.log('UIManager: Resetting practice panel to initial state');
        
        // Always reset to the initial mode selection screen
        // Hide the practice options, show the initial selectors
        const practiceOptions = document.querySelector('.practice-options');
        const initialSelectors = document.querySelector('.practice-initial-selectors');
        const backButton = document.getElementById('back-to-practice-home');
        const playSelectedButton = document.getElementById('play-selected');
        const startPracticeButton = document.getElementById('start-practice');
        
        if (practiceOptions) practiceOptions.style.display = 'none';
        if (initialSelectors) initialSelectors.style.display = 'flex';
        if (backButton) backButton.style.display = 'none';
        if (playSelectedButton) playSelectedButton.style.display = 'none';
        if (startPracticeButton) startPracticeButton.style.display = 'none';
        
        // Reset the practice mode to 'none'
        AppState.set('practice.mode', 'none');
        AppState.set('practice.optionsVisible', false);
        
        // Hide the stats panel if it's visible
        this.showPracticeStats(false);
        
        // Make sure practice is not active
        if (AppState.get('practice.isActive')) {
          // Stop practice mode
          PracticeModule.stopPractice();
        }
        
        // Clear any challenge display or feedback
        this.updateChallengeDisplay('');
        this.showFeedback('');
        
        // Setup practice UI with 'none' mode
        this.setupPracticeModeUI('none');
      }
      
      // If this is the progression panel, ensure it's properly initialized
      if (panelId === 'progression-panel') {
        console.log('UIManager: Initializing progression panel');
        // Update song dropdown
        const songs = AppState.get('songs');
        if (songs) {
          this.updateSongDropdown(songs);
        }
        
        // Always default to "Create New Song..." option when opening the progression panel
        const songSelect = document.getElementById('song-select');
        if (songSelect) {
          console.log('UIManager: Setting song dropdown to "Create New Song..."');
          songSelect.value = 'new';
          
          // Trigger a change event to update the UI based on this selection
          songSelect.dispatchEvent(new Event('change'));
        }
      }
    },
    
    /**
     * Hide a specific panel
     * @param {string} panelId - ID of the panel to hide
     */
    hidePanel(panelId) {
      const panel = document.getElementById(panelId);
      if (!panel) return;
      
      this.hideElement(panel);
      
      // Special handling for progression panel
      if (panelId === 'progression-panel') {
        panel.classList.remove('visible');
      }
      
      // Update visible panels list
      const currentPanels = AppState.get('ui.visiblePanels') || [];
      const updatedPanels = currentPanels.filter(id => id !== panelId);
      AppState.set('ui.visiblePanels', updatedPanels);
      
      // Clear active menu item if this is the current panel
      if (AppState.get('ui.currentPanel') === panelId) {
        const menuItems = this.elements.menuItems;
        if (menuItems) {
          menuItems.forEach(item => {
            if (item.getAttribute('data-target') === panelId) {
              item.classList.remove('active');
            }
          });
        }
        
        // Update state
        AppState.set('ui.currentPanel', updatedPanels.length > 0 ? updatedPanels[0] : null);
      }
    },
    
    /**
     * Populate instrument select dropdown
     * @param {string} categoryId - Category ID or 'all'
     */
    populateInstrumentSelect(categoryId) {
      const instrumentSelect = this.elements.instrumentSelect;
      if (!instrumentSelect) return;
      
      // Clear current options
      instrumentSelect.innerHTML = '<option value="">Select an instrument</option>';
      
      // Get instruments for this category
      let instruments = [];
      const categories = AppState.get('soundExplorer.instrumentCategories');
      
      if (categoryId === 'all') {
        // Get all instruments from all categories
        Object.values(categories).forEach(categoryInstruments => {
          instruments = instruments.concat(categoryInstruments);
        });
      } else if (categories[categoryId]) {
        instruments = categories[categoryId];
      }
      
      // Sort alphabetically
      instruments.sort();
      
      // Add options to select
      instruments.forEach(instrument => {
        const option = document.createElement('option');
        option.value = instrument;
        option.textContent = this.formatInstrumentName(instrument);
        instrumentSelect.appendChild(option);
      });
    },
    
    /**
     * Format instrument name for display
     * @param {string} name - SoundFont instrument name
     * @returns {string} Formatted name
     */
    formatInstrumentName(name) {
      return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    },
    
    /**
     * Update song dropdown in progression builder
     * @param {Object} songs - Songs object
     * @param {string} [currentSongId] - Currently selected song ID
     */
    updateSongDropdown(songs, currentSongId) {
      const songSelect = document.getElementById('song-select');
      if (!songSelect) return;
      
      // Save the current selection
      const currentSelection = currentSongId || songSelect.value;
      
      // Clear existing options, but keep the "Create New" option
      songSelect.innerHTML = '<option value="new">Create New Song...</option>';
      
      // Add all songs
      Object.keys(songs).forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = songs[id].name;
        songSelect.appendChild(option);
      });
      
      // Restore selection if possible
      if (currentSelection !== 'new' && songs[currentSelection]) {
        songSelect.value = currentSelection;
      } else if (Object.keys(songs).length > 0) {
        // Select the first song if available
        songSelect.value = Object.keys(songs)[0];
      } else {
        songSelect.value = 'new';
      }
    },
    
    /**
     * Update song sections display
     * @param {Object} song - Current song
     * @param {string} currentSectionId - Currently selected section ID
     */
    updateSongSectionsDisplay(song, currentSectionId) {
      const songSections = document.getElementById('song-sections');
      
      if (!songSections) {
        console.error('UIManager: Song sections element not found');
        return;
      }
      
      // If no song is selected
      if (!song) {
        songSections.innerHTML = '<div class="empty-song">Select or create a song</div>';
        return;
      }
      
      // Clear existing content
      songSections.innerHTML = '';
      
      // If no sections, show empty message
      if (song.order.length === 0) {
        songSections.innerHTML = '<div class="empty-song">Add sections to your song</div>';
        return;
      }
      
      // Add each section in order
      song.order.forEach((sectionId) => {
        const section = song.sections[sectionId];
        if (!section) return;
        
        const sectionElement = document.createElement('div');
        sectionElement.className = 'song-section';
        sectionElement.setAttribute('data-section-id', sectionId);
        sectionElement.draggable = true;
        
        // Highlight if this is the current section
        if (sectionId === currentSectionId) {
          sectionElement.classList.add('active');
        }
        
        // Add section title with drag handle and chord count
        const titleElement = document.createElement('div');
        titleElement.className = 'song-section-title';
        
        const handleElement = document.createElement('span');
        handleElement.className = 'section-drag-handle';
        handleElement.innerHTML = '&#8942;'; // Unicode for vertical dots
        
        const nameElement = document.createElement('span');
        nameElement.textContent = section.name;
        
        const countElement = document.createElement('span');
        countElement.className = 'section-chord-count';
        countElement.textContent = `${section.chords.length} chords`;
        
        titleElement.appendChild(handleElement);
        titleElement.appendChild(nameElement);
        titleElement.appendChild(countElement);
        
        // Add section preview
        const previewElement = document.createElement('div');
        previewElement.className = 'section-progression';
        
        if (section.chords.length > 0) {
          // Show a preview of the first few chords
          const previewChords = section.chords.slice(0, 3).map(chord => chord.name).join(' → ');
          previewElement.textContent = previewChords;
          if (section.chords.length > 3) {
            previewElement.textContent += ' ...';
          }
        } else {
          previewElement.textContent = 'No chords added yet';
        }
        
        sectionElement.appendChild(titleElement);
        sectionElement.appendChild(previewElement);
        
        songSections.appendChild(sectionElement);
      });
    },
    
    /**
     * Update section progression display
     * @param {Object} section - Current section
     */
    updateSectionProgressionDisplay(section) {
      const progressionDisplay = document.getElementById('section-progression-display');
      
      if (!progressionDisplay) {
        console.error('UIManager: Section progression display element not found');
        return;
      }
      
      // If no section is selected
      if (!section) {
        progressionDisplay.innerHTML = '<div class="empty-progression">Select or create a section</div>';
        return;
      }
      
      // Clear existing content
      progressionDisplay.innerHTML = '';
      
      if (section.chords.length === 0) {
        // Empty progression
        const emptyElement = document.createElement('div');
        emptyElement.className = 'empty-progression';
        emptyElement.textContent = 'Add chords to your section';
        progressionDisplay.appendChild(emptyElement);
        return;
      }
      
      // Create container for chord items
      const chordItemsContainer = document.createElement('div');
      chordItemsContainer.className = 'chord-items-container';
      progressionDisplay.appendChild(chordItemsContainer);
      
      // Add each chord
      section.chords.forEach((chord, index) => {
        const chordElement = document.createElement('div');
        chordElement.className = 'chord-item';
        chordElement.setAttribute('data-index', index);
        chordElement.draggable = true;
        
        // Add drag handle
        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '&#8942;&#8942;'; // Unicode for vertical dots
        
        const chordNumber = document.createElement('span');
        chordNumber.className = 'chord-number';
        chordNumber.textContent = index + 1;
        
        const chordName = document.createElement('span');
        chordName.textContent = chord.name;
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-chord';
        removeButton.innerHTML = '&times;';
        removeButton.setAttribute('data-index', index);
        removeButton.title = 'Remove this chord';
        
        chordElement.appendChild(dragHandle);
        chordElement.appendChild(chordNumber);
        chordElement.appendChild(chordName);
        chordElement.appendChild(removeButton);
        
        chordItemsContainer.appendChild(chordElement);
      });
    },
    
    /**
     * Update section editor visibility
     * @param {boolean} visible - Whether to show the editor
     * @param {Object} [section] - Current section
     */
    updateSectionEditorVisibility(visible, section) {
      const sectionEditor = document.getElementById('current-section-editor');
      
      if (!sectionEditor) return;
      
      if (!visible) {
        this.hideElement(sectionEditor);
        return;
      }
      
      // We have a section selected, show the editor
      this.showElement(sectionEditor);
      
      // Update the section name in the editor
      const sectionNameElement = document.getElementById('current-section-name');
      if (sectionNameElement && section) {
        sectionNameElement.textContent = section.name;
      }
      
      // Update the progression display for this section
      if (section) {
        this.updateSectionProgressionDisplay(section);
      }
    }
  }