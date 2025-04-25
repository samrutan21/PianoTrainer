/**
 * Main Application Initializer
 * Coordinates initialization of all modules and sets up the application
 */

// Initialize core modules
async function initializeCoreModules() {
  console.log('Initializing core modules...');
  
  try {
    // Initialize EventManager first
    console.log('Initializing EventManager...');
    EventManager.init();
    console.log('EventManager initialized successfully');
    
    // Initialize AppState second
    console.log('Initializing AppState...');
    AppState.init();
    console.log('AppState initialized successfully');
    
    // Initialize AudioEngine
    console.log('Initializing AudioEngine...');
    await AudioEngine.init();
    console.log('AudioEngine initialized successfully');
    
    // Initialize other core modules
    console.log('Initializing UIManager...');
    UIManager.init();
    console.log('UIManager initialized successfully');
    
    // Load instruments after AudioEngine is initialized
    console.log('Loading instruments...');
    try {
      // Don't load instruments yet - wait for user interaction
      console.log('Instruments will be loaded after user interaction');
    } catch (error) {
      console.error('Failed to load instruments:', error);
      UIManager.showFeedback('Failed to load instruments. Some features may not work properly.');
    }
    
    // Initialize YouTubeChordModule after instruments are loaded
    console.log('Initializing YouTubeChordModule...');
    YouTubeChordModule.init();
    console.log('YouTubeChordModule initialized successfully');
    
    console.log('All core modules initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize core modules:', error);
    UIManager.showFeedback('Failed to initialize audio. Please refresh the page and try again.');
    return false;
  }
}

// Initialize the application
async function initializeApp() {
  console.log('Starting application initialization...');
  
  try {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }
    
    // Initialize core modules
    const coreInitialized = await initializeCoreModules();
    if (!coreInitialized) {
      throw new Error('Core modules failed to initialize');
    }
    
    // Setup event listeners
    setupEventListeners();
    console.log('Event listeners setup complete');
    
    // Setup menu listeners
    setupMenuListeners();
    console.log('Menu listeners setup complete');
    
    // Show initial panel
    UIManager.showPanel('piano-panel');
    console.log('Initial panel shown');
    
    // Add click handler to resume audio context and load instruments
    document.addEventListener('click', async () => {
      const resumed = await window.resumeAudioContext();
      if (resumed) {
        console.log('Audio context resumed, loading instruments...');
        try {
          await AudioEngine.loadInstruments();
          console.log('Instruments loaded successfully');
        } catch (error) {
          console.error('Failed to load instruments:', error);
        }
      }
    });
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Application initialization failed:', error);
    UIManager.showFeedback('Application failed to initialize. Please refresh the page and try again.');
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded, starting application...');
  initializeApp();
});

/**
 * Set up side menu event listeners
 */
function setupMenuListeners() {
  console.log('Setting up menu listeners...');
  
  const menuToggle = document.getElementById('menu-toggle');
  const sideMenu = document.getElementById('side-menu');
  const menuItems = document.querySelectorAll('.menu-item');
  
  console.log('Found menu items:', menuItems.length);
  
  // Toggle menu expansion
  if (menuToggle && sideMenu) {
    console.log('Setting up menu toggle...');
    EventManager.on(menuToggle, 'click', () => {
      console.log('Menu toggle clicked');
      UIManager.toggleMenu();
    });
  } else {
    console.error('Menu toggle or side menu not found');
  }
  
  // Handle menu item clicks
  menuItems.forEach(item => {
    const targetId = item.getAttribute('data-target');
    console.log('Setting up menu item:', targetId);
    
    EventManager.on(item, 'click', (e) => {
      console.log('Menu item clicked:', targetId);
      console.log('Menu item element:', item);
      
      // Log AppState to check for any interfering state
      console.log('Current AppState UI properties:', {
        currentPanel: AppState.get('ui.currentPanel'),
        activeDragChordItem: AppState.get('ui.activeDragChordItem'),
        activeDragSectionItem: AppState.get('ui.activeDragSectionItem'),
        isDuplicatingDrag: AppState.get('ui.isDuplicatingDrag')
      });
      
      // First ensure audio context is running
      window.resumeAudioContext().then(() => {
        if (targetId) {
          // Special case for progression-panel when practice-panel is open
          const isPracticePanelOpen = document.getElementById('practice-panel').style.display === 'block';
          
          if (targetId === 'progression-panel' && isPracticePanelOpen) {
            // Show the progression panel without hiding the practice panel
            const progressionPanel = document.getElementById('progression-panel');
            if (progressionPanel) {
              progressionPanel.style.display = 'block';
              progressionPanel.classList.add('visible');
              
              // Update active menu item
              menuItems.forEach(menuItem => menuItem.classList.remove('active'));
              item.classList.add('active');
              
              // Initialize the progression panel
              console.log('Initializing progression panel alongside practice panel...');
              SongBuilderModule.updateSongSectionsDisplay();
              
              UIManager.showFeedback(`Opened Song Builder alongside Practice mode`, 'info', 2000);
            }
            return;
          }
          
          // Standard behavior for other panels
          // Hide all panels first
          const panels = ['practice-panel', 'progression-panel', 'youtube-panel'];
          panels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
              panel.style.display = 'none';
              console.log(`Hiding panel: ${panelId}`);
            }
          });
          
          // Show the target panel
          const targetPanel = document.getElementById(targetId);
          if (targetPanel) {
            console.log(`Showing panel: ${targetId}`);
            targetPanel.style.display = 'block';
            targetPanel.classList.add('visible');
            
            // Update active menu item
            menuItems.forEach(menuItem => menuItem.classList.remove('active'));
            item.classList.add('active');
            
            // Initialize panel-specific functionality
            switch(targetId) {
              case 'practice-panel':
                console.log('Initializing practice panel...');
                PracticeModule.setupPracticeModeUI();
                break;
              case 'progression-panel':
                console.log('Initializing progression panel...');
                SongBuilderModule.updateSongSectionsDisplay();
                break;
              case 'youtube-panel':
                console.log('Initializing YouTube panel...');
                if (typeof YouTubeChordModule !== 'undefined') {
                  YouTubeChordModule.resetUI();
                }
                break;
            }
            
            UIManager.showFeedback(`Switched to ${targetId.replace('-panel', '')} mode`, 'info', 2000);
          } else {
            console.error(`Target panel not found: ${targetId}`);
            UIManager.showFeedback('Error: Panel not found', 'error', 3000);
          }
        } else {
          console.error('Menu item has no data-target attribute');
        }
      }).catch(error => {
        console.error('Failed to resume audio context:', error);
        UIManager.showFeedback('Error: Could not initialize audio', 'error', 3000);
      });
    });
  });
  
  console.log('Menu listeners setup complete');
}
  
/**
 * Set up volume knob UI and event handlers
 */
function setupVolumeKnob() {
  const volumeKnob = document.getElementById('volume-knob');
  const volumeSlider = document.querySelector('#volume-knob input');
  
  if (!volumeKnob || !volumeSlider) {
    console.warn('Volume knob elements not found');
    return;
  }
  
  // Set initial position
  const initialVolume = AppState.get('audio.volume');
  volumeSlider.value = initialVolume;
  UIManager.updateKnobRotation(initialVolume);
  
  // Add direct click/drag handling
  let isDragging = false;
  let startY, startValue;
  
  EventManager.on(volumeKnob, 'mousedown', function(e) {
    isDragging = true;
    startY = e.clientY;
    startValue = AppState.get('audio.volume');
    document.body.style.cursor = 'grabbing';
    
    // Prevent text selection during drag
    e.preventDefault();
  });
  
  EventManager.on(document, 'mousemove', function(e) {
    if (!isDragging) return;
    
    // Calculate new value based on vertical drag (up = increase, down = decrease)
    const deltaY = startY - e.clientY;
    let newValue = startValue + (deltaY / 200); // Adjust sensitivity
    
    // Clamp value between 0 and 1
    newValue = Math.max(0, Math.min(1, newValue));
    
    // Update volume
    UIManager.updateKnobRotation(newValue);
    
    // Update state and audio
    AppState.set('audio.volume', newValue);
    AudioEngine.setVolume(newValue);
    
    // Update slider value to keep in sync
    volumeSlider.value = newValue;
  });
  
  EventManager.on(document, 'mouseup', function() {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
    }
  });
  
  // Also handle the standard input change event
  EventManager.on(volumeSlider, 'input', function(e) {
    const value = parseFloat(e.target.value);
    UIManager.updateKnobRotation(value);
    
    // Update state and audio
    AppState.set('audio.volume', value);
    AudioEngine.setVolume(value);
  });
}

// Setup Show Keys toggle
function setupShowKeysToggle() {
  const checkbox = document.querySelector('.keys-checkbox input[type="checkbox"]');
  if (!checkbox) {
    console.warn('Show Keys checkbox not found');
    return;
  }
  
  // Initialize based on current state
  const showLabels = checkbox.checked;
  PianoModule.toggleNoteLabels(showLabels);
  
  // Add event listener for changes
  EventManager.on(checkbox, 'change', function() {
    const showLabels = this.checked;
    console.log('Show Keys toggle changed:', showLabels);
    PianoModule.toggleNoteLabels(showLabels);
  });
  
  console.log('Show Keys toggle initialized');
}

 /**
 * Initialize Sound Explorer
 */
function initSoundExplorer() {
  const toggleButton = document.getElementById('toggle-explorer');
  const explorerContent = document.querySelector('.explorer-content');
  const categorySelect = document.getElementById('instrument-category');
  const instrumentSelect = document.getElementById('instrument-select');
  const testButton = document.getElementById('test-instrument');
  const setButton = document.getElementById('set-instrument');
  
  // Toggle explorer visibility
  if (toggleButton && explorerContent) {
    EventManager.on(toggleButton, 'click', () => {
      const isVisible = explorerContent.style.display !== 'none';
      explorerContent.style.display = isVisible ? 'none' : 'block';
      toggleButton.textContent = isVisible ? 'Show Sound Explorer' : 'Hide Sound Explorer';
    });
  }
  
  // Populate instrument select based on category
  if (categorySelect && instrumentSelect) {
    EventManager.on(categorySelect, 'change', () => {
      const category = categorySelect.value;
      const categories = AppState.get('soundExplorer.instrumentCategories');
      
      UIManager.populateInstrumentSelect(category);
    });
  }
  
  // Test the selected instrument
  if (testButton && instrumentSelect) {
    EventManager.on(testButton, 'click', async () => {
      const instrumentName = instrumentSelect.value;
      if (!instrumentName) return;
      
      testButton.disabled = true;
      testButton.textContent = 'Loading...';
      
      try {
        await AudioEngine.loadInstrument(instrumentName);
        
        // Play a C major scale
        const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
        const delay = 200;
        
        for (let i = 0; i < notes.length; i++) {
          setTimeout(() => {
            PianoModule.playNote(notes[i]);
            
            // Stop the note after a short duration
            setTimeout(() => {
              PianoModule.stopNote(notes[i]);
            }, 300);
          }, i * delay);
        }
        
        testButton.textContent = 'Test Instrument';
        testButton.disabled = false;
      } catch (error) {
        console.error('Error testing instrument:', error);
        testButton.textContent = 'Test Failed';
        setTimeout(() => {
          testButton.textContent = 'Test Instrument';
          testButton.disabled = false;
        }, 2000);
      }
    });
  }
  
  // Set the selected instrument as current
  if (setButton && instrumentSelect) {
    EventManager.on(setButton, 'click', () => {
      const instrumentName = instrumentSelect.value;
      if (!instrumentName) return;
      
      AudioEngine.setCurrentInstrument(instrumentName);
      UIManager.showFeedback(`Instrument changed to ${UIManager.formatInstrumentName(instrumentName)}`, 'success');
    });
  }
  
  // Initialize with all instruments
  if (categorySelect) {
    categorySelect.value = 'all';
    categorySelect.dispatchEvent(new Event('change'));
  }
}

/**
 * Set up instrument selection
 */
function setupInstrumentSelection() {
  // Handle instrument option clicks
  document.querySelectorAll('.instrument-option').forEach(option => {
    EventManager.on(option, 'click', function() {
      const instrument = this.dataset.instrument;
      const display = document.getElementById('instrument-display');
      
      // Update display
      if (display) {
        display.textContent = this.textContent.toUpperCase();
      }
      
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      
      // Update instrument
      AudioEngine.setCurrentInstrument(instrument);
      
      // Hide the menu after selection
      const instrumentMenu = document.querySelector('.instrument-menu');
      if (instrumentMenu) {
        instrumentMenu.style.display = 'none';
        
        // Show feedback
        UIManager.showFeedback(`Instrument changed to ${this.textContent}`, 'success');
      }
    });
  });
  
  // Make the LED display clickable to show/hide instrument menu
  const instrumentDisplay = document.getElementById('instrument-display');
  const instrumentMenu = document.querySelector('.instrument-menu');
  
  if (instrumentDisplay && instrumentMenu) {
    EventManager.on(instrumentDisplay, 'click', function() {
      const isVisible = instrumentMenu.style.display === 'block';
      instrumentMenu.style.display = isVisible ? 'none' : 'block';
    });
    
    // Hide menu when clicking elsewhere
    EventManager.on(document, 'click', function(e) {
      if (e.target !== instrumentDisplay && !instrumentMenu.contains(e.target)) {
        instrumentMenu.style.display = 'none';
      }
    });
  }
}
  

/**
 * Set up audio context resume on user interaction
 */
function setupAudioContextResume() {
  // Create a one-time click handler to resume audio context
  const resumeAudioContext = () => {
    AudioEngine.ensureContextRunning()
      .then(success => {
        if (success) {
          console.log('Audio context resumed by user interaction');
          document.removeEventListener('click', resumeAudioContext);
          document.removeEventListener('keydown', resumeAudioContext);
          
          // Try loading instruments if they haven't loaded yet
          if (!AudioEngine.instruments.allLoaded && !AudioEngine.instruments.loadingInProgress) {
            AudioEngine.loadInstruments();
          }
        }
      });
  };

 
  // Add event listeners
  document.addEventListener('click', resumeAudioContext);
  document.addEventListener('keydown', resumeAudioContext);
}

/**
 * Set up core event listeners for the application
 */
function setupEventListeners() {
  console.log('Setting up core event listeners...');
  
  // Initialize PianoModule
  PianoModule.init();
  
  // Setup volume control
  setupVolumeKnob();
  
  // Setup show keys toggle
  setupShowKeysToggle();
  
  // Initialize sound explorer
  initSoundExplorer();
  
  // Setup instrument selection
  setupInstrumentSelection();
  
  // Setup audio context resume
  setupAudioContextResume();
  
  // Setup practice module event listeners
  PracticeModule.setupEventListeners();
  
  // Setup song builder event listeners
  SongBuilderModule.init();
  
  // Setup YouTube chord module event listeners
  YouTubeChordModule.setupEventListeners();
  
  console.log('Core event listeners setup complete');
}