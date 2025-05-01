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
  
  // Save practice logs when the page is about to unload
  window.addEventListener('beforeunload', () => {
    console.log('Page unloading, saving practice session logs...');
    if (PracticeModule && typeof PracticeModule.saveSessionLogsToStorage === 'function') {
      // End current session if active
      if (AppState.get('practice.isActive')) {
        PracticeModule.endSessionLog();
      }
      // Save logs to storage
      PracticeModule.saveSessionLogsToStorage();
    }
  });
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
    console.log('Setting up menu item:', item.getAttribute('data-target'));
    
    item.addEventListener('click', () => {
      const targetPanel = item.getAttribute('data-target');
      console.log('Menu item clicked. Target panel:', targetPanel);
      
      // Get all currently visible panels
      const visiblePanels = AppState.get('ui.visiblePanels') || [];
      const isPracticeVisible = visiblePanels.includes('practice-panel');
      const isProgressionVisible = visiblePanels.includes('progression-panel');
      const isYoutubeVisible = visiblePanels.includes('youtube-panel');
      
      // Special cases for the three content panels that can be open simultaneously
      const contentPanels = ['practice-panel', 'progression-panel', 'youtube-panel'];
      
      // Check if target is one of our content panels
      if (contentPanels.includes(targetPanel)) {
        // Check if any other content panel is already visible
        const hasOtherContentPanelOpen = visiblePanels.some(panel => 
          contentPanels.includes(panel) && panel !== targetPanel
        );
        
        if (hasOtherContentPanelOpen) {
          console.log(`Special case: ${targetPanel} clicked with other content panel(s) open - keeping all visible`);
          UIManager.showPanel(targetPanel, false); // non-exclusive mode
          return;
        }
      }
      
      // For all other cases, show panel exclusively (hide others)
      console.log('Standard case: Hiding other panels and showing', targetPanel);
      UIManager.showPanel(targetPanel, true);
    });
  });
  
  console.log('Menu listeners setup complete');
}
  
/**
 * Set up volume knob UI and event handlers
 */
function setupVolumeKnob() {
  console.log('Setting up volume knob');
  
  // Get DOM elements
  const volumeKnob = document.getElementById('volume-knob');
  const volumeSlider = document.getElementById('volume-slider');
  
  console.log('Volume knob element:', volumeKnob);
  console.log('Volume slider element:', volumeSlider);
  
  // Check if knob elements are present
  if (!volumeKnob || !volumeSlider) {
    console.warn('Volume knob elements not found, using default volume');
    return;
  }
  
  // Initialize initial volume
  let currentVolume = 0.5; // Default
  
  // Try to get volume from slider if available
  if (!isNaN(parseFloat(volumeSlider.value))) {
    currentVolume = parseFloat(volumeSlider.value);
  }
  
  // Clear any existing event listeners
  EventManager.removeAll(volumeKnob);
  
  // Initialize state variables
  let isDragging = false;
  let startY = 0;
  
  // Make sure the knob rotation matches the initial volume
  UIManager.updateKnobRotation(currentVolume);
  
  // Setup DOM event handlers for better drag handling
  function onMouseDown(e) {
    console.log('Volume knob mouse down event fired');
    isDragging = true;
    startY = e.clientY;
    
    // Capture mouse events outside the knob
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Prevent text selection during dragging
    document.body.style.userSelect = 'none';
    e.preventDefault();
    console.log('Volume knob: Mouse down, tracking started at Y:', startY);
  }
  
  function onMouseMove(e) {
    if (!isDragging) return;
    
    console.log('Mouse move while dragging at Y:', e.clientY);
    
    // Calculate volume change based on vertical movement (up = increase, down = decrease)
    const deltaY = startY - e.clientY;
    const volumeDelta = deltaY * 0.005; // Adjust sensitivity
    
    console.log('Volume delta calculation:', { startY, currentY: e.clientY, deltaY, volumeDelta });
    
    // Update volume with limits
    currentVolume = Math.max(0, Math.min(1, currentVolume + volumeDelta));
    
    // Update the UI and state
    volumeSlider.value = currentVolume.toString();
    UIManager.updateKnobRotation(currentVolume);
    
    // Update the audio engine
    AudioEngine.setVolume(currentVolume);
    
    // Reset the start position for continuous movement
    startY = e.clientY;
    
    console.log(`Volume updated: ${currentVolume.toFixed(2)}`);
  }
  
  function onMouseUp() {
    if (!isDragging) return;
    
    console.log('Mouse up event fired, ending knob interaction');
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.userSelect = '';
    console.log('Volume knob: Mouse up, tracking ended at volume:', currentVolume);
  }
  
  // Add touch support
  function onTouchStart(e) {
    console.log('Touch start event fired on volume knob');
    isDragging = true;
    startY = e.touches[0].clientY;
    
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    
    e.preventDefault();
    console.log('Volume knob: Touch start, tracking started at Y:', startY);
  }
  
  function onTouchMove(e) {
    if (!isDragging) return;
    
    console.log('Touch move while dragging');
    
    const deltaY = startY - e.touches[0].clientY;
    const volumeDelta = deltaY * 0.005;
    
    currentVolume = Math.max(0, Math.min(1, currentVolume + volumeDelta));
    
    volumeSlider.value = currentVolume.toString();
    UIManager.updateKnobRotation(currentVolume);
    AudioEngine.setVolume(currentVolume);
    
    startY = e.touches[0].clientY;
    e.preventDefault();
    
    console.log(`Volume updated on touch: ${currentVolume.toFixed(2)}`);
  }
  
  function onTouchEnd() {
    if (!isDragging) return;
    
    console.log('Touch end event fired, ending knob interaction');
    isDragging = false;
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }
  
  // Add event listeners directly to ensure they work
  volumeKnob.addEventListener('mousedown', onMouseDown);
  volumeKnob.addEventListener('touchstart', onTouchStart);
  
  // Also add event listener to the slider for direct input
  volumeSlider.addEventListener('input', function() {
    currentVolume = parseFloat(this.value);
    console.log('Slider input event, new volume:', currentVolume);
    UIManager.updateKnobRotation(currentVolume);
    AudioEngine.setVolume(currentVolume);
  });
  
  // Ensure knob marker is visible
  const marker = volumeKnob.querySelector('.knob-marker');
  if (marker) {
    marker.style.display = 'block';
    console.log('Volume knob marker is visible');
  } else {
    console.warn('Volume knob marker element not found');
  }
  
  console.log('Volume knob setup complete');
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
  
  // Initialize and setup practice module
  PracticeModule.init();
  PracticeModule.setupEventListeners();
  
  // Setup song builder event listeners
  SongBuilderModule.init();
  
  // Setup YouTube chord module event listeners
  YouTubeChordModule.setupEventListeners();
  
  // Make practice stats panel draggable
  setupPracticeStatsDraggable();
  
  // Make practice sessions panel draggable
  setupPracticeSessionsDraggable();
  
  console.log('Core event listeners setup complete');
}

/**
 * Make the practice stats panel draggable
 */
function setupPracticeStatsDraggable() {
  console.log('Setting up practice stats panel draggable functionality');
  
  const statsPanel = document.getElementById('practice-stats-panel');
  if (!statsPanel) {
    console.warn('Practice stats panel not found, skipping draggable setup');
    return;
  }
  
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  // Offset positions for the panel relative to the practice panel
  statsPanel.style.transform = 'none'; // Ensure no transformations interfere with positioning
  
  // Move the panel outside the practice panel to the document body
  // This ensures it can be dragged anywhere in the viewport
  document.body.appendChild(statsPanel);
  
  // Function to handle mouse/touch down events
  function onDragStart(e) {
    const event = e.touches ? e.touches[0] : e;
    isDragging = true;
    
    // Calculate starting positions
    const rect = statsPanel.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    
    // Get current position from inline styles or computed styles
    const computedStyle = window.getComputedStyle(statsPanel);
    startLeft = parseInt(statsPanel.style.left || computedStyle.left) || rect.left;
    startTop = parseInt(statsPanel.style.top || computedStyle.top) || rect.top;
    
    // Add dragging class for visual feedback
    statsPanel.classList.add('dragging');
    
    // Prevent default behavior to avoid text selection, etc.
    e.preventDefault();
    
    console.log('Started dragging practice stats panel');
  }
  
  // Function to handle mouse/touch move events
  function onDragMove(e) {
    if (!isDragging) return;
    
    const event = e.touches ? e.touches[0] : e;
    
    // Calculate new position
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    
    // Apply new position
    statsPanel.style.left = `${startLeft + deltaX}px`;
    statsPanel.style.top = `${startTop + deltaY}px`;
    
    // Prevent default to avoid scrolling while dragging
    e.preventDefault();
  }
  
  // Function to handle mouse/touch up events
  function onDragEnd() {
    if (!isDragging) return;
    
    isDragging = false;
    statsPanel.classList.remove('dragging');
    
    console.log('Finished dragging practice stats panel');
    
    // Store position in local storage for persistence
    try {
      const position = {
        left: statsPanel.style.left,
        top: statsPanel.style.top
      };
      localStorage.setItem('practiceStatsPanelPosition', JSON.stringify(position));
      console.log('Saved practice stats panel position to local storage');
    } catch (error) {
      console.warn('Could not save practice stats panel position to local storage:', error);
    }
  }
  
  // Restore position from local storage if available
  try {
    const savedPosition = localStorage.getItem('practiceStatsPanelPosition');
    if (savedPosition) {
      const position = JSON.parse(savedPosition);
      statsPanel.style.left = position.left;
      statsPanel.style.top = position.top;
      console.log('Restored practice stats panel position from local storage');
    }
  } catch (error) {
    console.warn('Could not restore practice stats panel position from local storage:', error);
  }
  
  // Add event listeners
  statsPanel.addEventListener('mousedown', onDragStart);
  statsPanel.addEventListener('touchstart', onDragStart);
  
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('touchmove', onDragMove, { passive: false });
  
  document.addEventListener('mouseup', onDragEnd);
  document.addEventListener('touchend', onDragEnd);
  
  console.log('Practice stats panel draggable setup complete');
}

/**
 * Make the practice sessions panel draggable
 */
function setupPracticeSessionsDraggable() {
  console.log('Setting up practice sessions panel draggable functionality');
  
  const sessionsPanel = document.getElementById('practice-sessions-panel');
  if (!sessionsPanel) {
    console.warn('Practice sessions panel not found, skipping draggable setup');
    return;
  }
  
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  // Offset positions for the panel relative to the practice panel
  sessionsPanel.style.transform = 'none'; // Ensure no transformations interfere with positioning
  
  // Move the panel outside the practice panel to the document body
  // This ensures it can be dragged anywhere in the viewport
  document.body.appendChild(sessionsPanel);
  
  // Function to handle mouse/touch down events
  function onDragStart(e) {
    // Only start dragging if clicked on the header (to allow scrolling in the content)
    if (!e.target.closest('.stats-header')) {
      return;
    }
    
    const event = e.touches ? e.touches[0] : e;
    isDragging = true;
    
    // Calculate starting positions
    const rect = sessionsPanel.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    
    // Get current position from inline styles or computed styles
    const computedStyle = window.getComputedStyle(sessionsPanel);
    startLeft = parseInt(sessionsPanel.style.left || computedStyle.left) || rect.left;
    startTop = parseInt(sessionsPanel.style.top || computedStyle.top) || rect.top;
    
    // Add dragging class for visual feedback
    sessionsPanel.classList.add('dragging');
    
    // Prevent default behavior to avoid text selection, etc.
    e.preventDefault();
    
    console.log('Started dragging practice sessions panel');
  }
  
  // Function to handle mouse/touch move events
  function onDragMove(e) {
    if (!isDragging) return;
    
    const event = e.touches ? e.touches[0] : e;
    
    // Calculate new position
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    
    // Apply new position
    sessionsPanel.style.left = `${startLeft + deltaX}px`;
    sessionsPanel.style.top = `${startTop + deltaY}px`;
    
    // Prevent default to avoid scrolling while dragging
    e.preventDefault();
  }
  
  // Function to handle mouse/touch up events
  function onDragEnd() {
    if (!isDragging) return;
    
    isDragging = false;
    sessionsPanel.classList.remove('dragging');
    
    console.log('Finished dragging practice sessions panel');
    
    // Store position in local storage for persistence
    try {
      const position = {
        left: sessionsPanel.style.left,
        top: sessionsPanel.style.top
      };
      localStorage.setItem('practiceSessionsPanelPosition', JSON.stringify(position));
      console.log('Saved practice sessions panel position to local storage');
    } catch (error) {
      console.warn('Could not save practice sessions panel position to local storage:', error);
    }
  }
  
  // Restore position from local storage if available
  try {
    const savedPosition = localStorage.getItem('practiceSessionsPanelPosition');
    if (savedPosition) {
      const position = JSON.parse(savedPosition);
      sessionsPanel.style.left = position.left;
      sessionsPanel.style.top = position.top;
      console.log('Restored practice sessions panel position from local storage');
    } else {
      // Default position if not saved before
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      sessionsPanel.style.left = `${viewportWidth / 2 - 150}px`;
      sessionsPanel.style.top = `${viewportHeight / 2 - 200}px`;
    }
  } catch (error) {
    console.warn('Could not restore practice sessions panel position from local storage:', error);
  }
  
  // Add event listeners
  sessionsPanel.addEventListener('mousedown', onDragStart);
  sessionsPanel.addEventListener('touchstart', onDragStart);
  
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('touchmove', onDragMove, { passive: false });
  
  document.addEventListener('mouseup', onDragEnd);
  document.addEventListener('touchend', onDragEnd);
  
  console.log('Practice sessions panel draggable setup complete');
}