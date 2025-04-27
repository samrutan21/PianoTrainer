/**
 * SongBuilderModule - Chord progression and song building functionality
 * Manages songs, sections, and chord progressions
 */
const SongBuilderModule = {
    // Add history stack for undo operations
    _editHistory: [],
    _maxHistoryLength: 30, // Maximum number of operations to keep in history
    
    /**
     * Initialize the song builder module
     */
    init() {
      console.log('SongBuilderModule: Initializing');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Check if songs are already loaded in AppState
      const songs = AppState.get('songBuilder.songs');
      
      if (!songs || Object.keys(songs).length === 0) {
        // Only load from localStorage if not already loaded by AppState
        console.log('SongBuilderModule: No songs found in AppState, loading from localStorage');
        this.loadSavedSongs();
      } else {
        console.log('SongBuilderModule: Using', Object.keys(songs).length, 'songs from AppState');
        
        // Still update the UI with the songs from AppState
        const currentSongId = AppState.get('songBuilder.currentSongId');
        UIManager.updateSongDropdown(songs, currentSongId);
      }
      
      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      console.log('SongBuilderModule: Initialized');
      return this;
    },
    
    /**
     * Setup keyboard shortcuts for song builder operations
     */
    setupKeyboardShortcuts() {
      // Listen for keyboard events when progression panel is visible
      document.addEventListener('keydown', (e) => {
        // Check if progression panel is visible
        const progressionPanel = document.getElementById('progression-panel');
        if (!progressionPanel || progressionPanel.style.display !== 'block') {
          return;
        }
        
        // Handle Cmd+Z (Mac) or Ctrl+Z (Windows/Linux) for undo
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault(); // Prevent browser's default undo
          this.undoLastOperation();
        }
      });
    },
    
    /**
     * Save the current state to history before making changes
     * @param {string} operationType - Type of operation (e.g., 'add', 'remove', 'reorder')
     * @param {Object} data - Data related to the operation
     */
    saveToHistory(operationType, data) {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const currentSectionId = AppState.get('songBuilder.currentSectionId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !currentSectionId || 
          !songs[currentSongId] || !songs[currentSongId].sections[currentSectionId]) {
        return;
      }
      
      // Clone the current section state to preserve it
      const sectionClone = JSON.parse(JSON.stringify(songs[currentSongId].sections[currentSectionId]));
      
      // Add to history
      this._editHistory.push({
        timestamp: Date.now(),
        type: operationType,
        songId: currentSongId,
        sectionId: currentSectionId,
        sectionState: sectionClone,
        additionalData: data
      });
      
      // Limit history length
      if (this._editHistory.length > this._maxHistoryLength) {
        this._editHistory.shift(); // Remove oldest item
      }
      
      console.log(`Operation saved to history: ${operationType}`);
    },
    
    /**
     * Undo the last operation
     */
    undoLastOperation() {
      if (this._editHistory.length === 0) {
        UIManager.showFeedback('Nothing to undo', 'info');
        return;
      }
      
      // Get the last history item
      const lastOperation = this._editHistory.pop();
      
      // Get current state
      const songs = AppState.get('songBuilder.songs');
      
      // Check if the song and section still exist
      if (!songs[lastOperation.songId] || !songs[lastOperation.songId].sections[lastOperation.sectionId]) {
        UIManager.showFeedback('Cannot undo: section no longer exists', 'warning');
        return;
      }
      
      // Restore the previous section state
      songs[lastOperation.songId].sections[lastOperation.sectionId] = lastOperation.sectionState;
      
      // Update state
      AppState.set('songBuilder.songs', songs);
      AppState.set('songBuilder.currentSongId', lastOperation.songId);
      AppState.set('songBuilder.currentSectionId', lastOperation.sectionId);
      
      // Save changes
      this.saveSongsToStorage();
      
      // Update UI
      this.updateSectionProgressionDisplay();
      this.updateSongSectionsDisplay();
      
      UIManager.showFeedback(`Undid ${lastOperation.type} operation`, 'success');
    },
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
      // Song selector
      const songSelect = document.getElementById('song-select');
      if (songSelect) {
        EventManager.on(songSelect, 'change', () => {
          const selectedValue = songSelect.value;
          if (selectedValue === 'new') {
            // "Create New Song" option selected
            document.getElementById('song-sections').innerHTML = 
              '<div class="empty-song">Create a new song</div>';
            AppState.set('songBuilder.currentSongId', null);
            AppState.set('songBuilder.currentSectionId', null);
            UIManager.updateSectionEditorVisibility(false);
          } else {
            // Existing song selected
            AppState.set('songBuilder.currentSongId', selectedValue);
            AppState.set('songBuilder.currentSectionId', null);
            this.updateSongSectionsDisplay();
            UIManager.updateSectionEditorVisibility(false);
          }
        });
      }
      
      // Create song button
      const createSongBtn = document.getElementById('create-song');
      if (createSongBtn) {
        EventManager.on(createSongBtn, 'click', () => this.createNewSong());
      }
      
      // Delete song button
      const deleteSongBtn = document.getElementById('delete-song');
      if (deleteSongBtn) {
        EventManager.on(deleteSongBtn, 'click', () => this.deleteSong());
      }
      
      // Play song button
      const playSongBtn = document.getElementById('play-song');
      if (playSongBtn) {
        EventManager.on(playSongBtn, 'click', () => this.playSong());
      }
      
      // Add section button
      const addSectionBtn = document.getElementById('add-section');
      if (addSectionBtn) {
        EventManager.on(addSectionBtn, 'click', () => this.addSection());
      }
      
      // Section type select
      const sectionTypeSelect = document.getElementById('section-type');
      const customSectionName = document.getElementById('custom-section-name');
      if (sectionTypeSelect && customSectionName) {
        EventManager.on(sectionTypeSelect, 'change', () => {
          if (sectionTypeSelect.value === 'custom') {
            customSectionName.style.display = 'inline-block';
            customSectionName.focus();
          } else {
            customSectionName.style.display = 'none';
          }
        });
      }
      
      // Add to section button
      const addToSectionBtn = document.getElementById('add-to-section');
      if (addToSectionBtn) {
        EventManager.on(addToSectionBtn, 'click', () => this.addCurrentChordToSection());
      }
      
      // Play section button
      const playSectionBtn = document.getElementById('play-section');
      if (playSectionBtn) {
        EventManager.on(playSectionBtn, 'click', () => this.playSection());
      }
      
      // Delete section button
      const deleteSectionBtn = document.getElementById('delete-section');
      if (deleteSectionBtn) {
        EventManager.on(deleteSectionBtn, 'click', () => this.deleteSection());
      }
      
      // Close button
      const closeProgressionPanelBtn = document.getElementById('close-progression-panel');
      if (closeProgressionPanelBtn) {
        EventManager.on(closeProgressionPanelBtn, 'click', () => {
          // Just hide the progression panel without using UIManager.hidePanel
          // This prevents affecting other panels like the practice panel
          const progressionPanel = document.getElementById('progression-panel');
          if (progressionPanel) {
            progressionPanel.style.display = 'none';
            progressionPanel.classList.remove('visible');
            console.log('Hiding Song Builder panel without affecting other panels');
            
            // Remove active class from the corresponding menu item
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
              if (item.getAttribute('data-target') === 'progression-panel') {
                item.classList.remove('active');
                console.log('Removed active class from Song Builder menu item');
              }
            });
            
            // Update the visible panels state
            const currentPanels = AppState.get('ui.visiblePanels') || [];
            const updatedPanels = currentPanels.filter(id => id !== 'progression-panel');
            AppState.set('ui.visiblePanels', updatedPanels);
          }
        });
      }
      
      // Save to progression button
      const saveToProgressionBtn = document.getElementById('save-to-progression');
      if (saveToProgressionBtn) {
        EventManager.on(saveToProgressionBtn, 'click', () => {
          // Show the progression panel without hiding the practice panel
          const progressionPanel = document.getElementById('progression-panel');
          if (progressionPanel) {
            progressionPanel.style.display = 'block';
            progressionPanel.classList.add('visible');
            
            // Update the side menu to show the song builder as active
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
              if (item.getAttribute('data-target') === 'progression-panel') {
                item.classList.add('active');
              }
            });
            
            // Initialize the progression panel
            this.updateSongSectionsDisplay();
            
            console.log('Showing Song Builder panel while keeping Practice panel open');
          }
        });
      }
      
      // Add event delegation for section clicks
      const songSections = document.getElementById('song-sections');
      if (songSections) {
        EventManager.on(songSections, 'click', (e) => {
          const sectionElement = e.target.closest('.song-section');
          if (sectionElement) {
            const sectionId = sectionElement.getAttribute('data-section-id');
            if (sectionId) {
              this.selectSection(sectionId);
            }
          }
        });
      }
      
      // Add event delegation for chord removal
      const sectionProgressionDisplay = document.getElementById('section-progression-display');
      if (sectionProgressionDisplay) {
        EventManager.on(sectionProgressionDisplay, 'click', (e) => {
          if (e.target.classList.contains('remove-chord')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            if (!isNaN(index)) {
              this.removeChordFromSection(index);
            }
          } else {
            // Handle chord click for playback
            const chordElement = e.target.closest('.chord-item');
            if (chordElement && !e.target.classList.contains('drag-handle')) {
              const index = parseInt(chordElement.getAttribute('data-index'));
              if (!isNaN(index)) {
                this.playChordFromSection(index);
              }
            }
          }
        });
      }
      
      // Set up drag and drop for sections and chords
      this.setupDragAndDrop();
    },
    
    /**
     * Set up drag and drop functionality
     */
    setupDragAndDrop() {
      // Set up event delegation for chord drag events
      const sectionProgressionDisplay = document.getElementById('section-progression-display');
      if (sectionProgressionDisplay) {
        // Track duplication state separately to ensure it's preserved throughout the drag operation
        let isDuplicatingDrag = false;
        
        // Dragstart
        EventManager.on(sectionProgressionDisplay, 'dragstart', (e) => {
          const chordItem = e.target.closest('.chord-item');
          if (!chordItem) return;
          
          // Store whether Alt/Option key is pressed at drag start
          isDuplicatingDrag = e.altKey;
          console.log('Drag started, Alt key:', isDuplicatingDrag);
          
          chordItem.classList.add('dragging');
          
          // Set the appropriate drag effect
          e.dataTransfer.effectAllowed = isDuplicatingDrag ? 'copy' : 'move';
          
          // Visual indicator for duplication
          if (isDuplicatingDrag) {
            chordItem.classList.add('duplicating');
          }
          
          // Store the chord index
          const chordIndex = chordItem.getAttribute('data-index');
          e.dataTransfer.setData('text/plain', chordIndex);
          
          // Track the drag operation type in AppState
          AppState.set('ui.activeDragChordItem', 'chord');
          AppState.set('ui.isDuplicatingDrag', isDuplicatingDrag);
        });
        
        // Dragover
        EventManager.on(sectionProgressionDisplay, 'dragover', (e) => {
          e.preventDefault();
          
          if (AppState.get('ui.activeDragChordItem') !== 'chord') return;
          
          const chordItem = e.target.closest('.chord-item');
          if (!chordItem) return;
          
          // Check if we're in duplication mode (use the stored state from dragstart)
          const isDuplicating = AppState.get('ui.isDuplicatingDrag');
          
          // Set appropriate visual cues
          if (isDuplicating) {
            e.dataTransfer.dropEffect = 'copy';
            chordItem.classList.add('alt-drag-over');
          } else {
            e.dataTransfer.dropEffect = 'move';
            chordItem.classList.remove('alt-drag-over');
          }
          
          chordItem.classList.add('drag-over');
        });
        
        // Dragleave
        EventManager.on(sectionProgressionDisplay, 'dragleave', (e) => {
          const chordItem = e.target.closest('.chord-item');
          if (!chordItem) return;
          
          chordItem.classList.remove('drag-over');
          chordItem.classList.remove('alt-drag-over');
        });
        
        // Drop
        EventManager.on(sectionProgressionDisplay, 'drop', (e) => {
          e.preventDefault();
          e.stopPropagation(); // Prevent event bubbling
          
          if (AppState.get('ui.activeDragChordItem') !== 'chord') return;
          
          const chordItem = e.target.closest('.chord-item');
          if (!chordItem) return;
          
          try {
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = parseInt(chordItem.getAttribute('data-index'));
            
            // Get duplication state (consistent throughout the drag operation)
            const isDuplicating = AppState.get('ui.isDuplicatingDrag');
            console.log('Drop executed, duplication state:', isDuplicating, 
                       'from:', fromIndex, 'to:', toIndex);
            
            if (isNaN(fromIndex) || isNaN(toIndex)) {
              console.error('Invalid indices for drag operation');
              return;
            }
            
            // Apply the appropriate operation with a slight delay to ensure UI updates properly
            setTimeout(() => {
              if (isDuplicating) {
                // Duplicate the chord at the target location
                this.duplicateChord(fromIndex, toIndex);
                // Show success feedback specific to duplication
                UIManager.showFeedback(`Duplicated chord with Option/Alt+drag`, 'success');
              } else if (fromIndex !== toIndex) {
                // Regular move operation - reorderChords now includes history tracking
                this.reorderChords(fromIndex, toIndex);
              }
              
              // Reset appearance for all items
              document.querySelectorAll('.chord-item').forEach(item => {
                item.classList.remove('dragging');
                item.classList.remove('duplicating');
                item.classList.remove('drag-over');
                item.classList.remove('alt-drag-over');
              });
            }, 50);
          } catch (error) {
            console.error('Error processing chord drop:', error);
            UIManager.showFeedback('Error during drag operation', 'error');
          }
        });
        
        // Dragend
        EventManager.on(sectionProgressionDisplay, 'dragend', (e) => {
          // Reset all chord items
          document.querySelectorAll('.chord-item').forEach(item => {
            item.classList.remove('dragging');
            item.classList.remove('duplicating');
            item.classList.remove('drag-over');
            item.classList.remove('alt-drag-over');
          });
          
          // Clear the drag state - use more specific property name to avoid conflicts
          AppState.set('ui.activeDragChordItem', null);
          AppState.set('ui.isDuplicatingDrag', false);
        });
      }
      
      // Set up event delegation for section drag events
      const songSections = document.getElementById('song-sections');
      if (songSections) {
        // Dragstart
        EventManager.on(songSections, 'dragstart', (e) => {
          const sectionItem = e.target.closest('.song-section');
          if (!sectionItem) return;
          
          sectionItem.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', sectionItem.getAttribute('data-section-id'));
          AppState.set('ui.activeDragSectionItem', 'section');
        });
        
        // Dragover
        EventManager.on(songSections, 'dragover', (e) => {
          e.preventDefault();
          
          if (AppState.get('ui.activeDragSectionItem') !== 'section') return;
          
          const sectionItem = e.target.closest('.song-section');
          if (!sectionItem) return;
          
          e.dataTransfer.dropEffect = 'move';
          sectionItem.classList.add('drag-over');
        });
        
        // Dragleave
        EventManager.on(songSections, 'dragleave', (e) => {
          const sectionItem = e.target.closest('.song-section');
          if (!sectionItem) return;
          
          sectionItem.classList.remove('drag-over');
        });
        
        // Drop
        EventManager.on(songSections, 'drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (AppState.get('ui.activeDragSectionItem') !== 'section') return;
          
          const sectionItem = e.target.closest('.song-section');
          if (!sectionItem) return;
          
          try {
            const fromSectionId = e.dataTransfer.getData('text/plain');
            const toSectionId = sectionItem.getAttribute('data-section-id');
            
            if (fromSectionId !== toSectionId) {
              // Reorder the sections
              this.reorderSections(fromSectionId, toSectionId);
            }
            
            // Reset appearance
            const items = document.querySelectorAll('.song-section');
            items.forEach(item => {
              item.classList.remove('drag-over');
            });
          } catch (error) {
            console.error('Error during section drop:', error);
          }
        });
        
        // Dragend
        EventManager.on(songSections, 'dragend', (e) => {
          const items = document.querySelectorAll('.song-section');
          items.forEach(item => {
            item.classList.remove('dragging');
            item.classList.remove('drag-over');
          });
          
          AppState.set('ui.activeDragSectionItem', null);
        });
      }
    },
    
    /**
     * Create a new song
     */
    createNewSong() {
      // Prompt user for a name
      const songName = prompt('Name your song:');
      
      if (!songName || songName.trim() === '') {
        return; // User cancelled or entered empty name
      }
      
      // Generate unique ID
      const songId = 'song_' + Date.now();
      
      // Create song structure
      const songs = AppState.get('songBuilder.songs');
      songs[songId] = {
        name: songName.trim(),
        sections: {},
        order: []
      };
      
      // Update state and save
      AppState.set('songBuilder.songs', songs);
      AppState.set('songBuilder.currentSongId', songId);
      AppState.set('songBuilder.currentSectionId', null);
      this.saveSongsToStorage();
      
      // Update UI
      UIManager.updateSongDropdown(songs, songId);
      this.updateSongSectionsDisplay();
      UIManager.updateSectionEditorVisibility(false);
      
      UIManager.showFeedback(`Created new song: "${songName.trim()}"`, 'success');
    },
    
    /**
     * Delete the current song
     */
    deleteSong() {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !songs[currentSongId]) {
        UIManager.showFeedback('No song selected to delete', 'error');
        return;
      }
      
      const songName = songs[currentSongId].name;
      
      // Confirm deletion
      if (confirm(`Are you sure you want to delete the song "${songName}"?`)) {
        // Delete the song
        delete songs[currentSongId];
        
        // Update state and save
        AppState.set('songBuilder.songs', songs);
        AppState.set('songBuilder.currentSongId', null);
        AppState.set('songBuilder.currentSectionId', null);
        this.saveSongsToStorage();
        
        // Update UI
        UIManager.updateSongDropdown(songs);
        document.getElementById('song-sections').innerHTML = 
          '<div class="empty-song">Select or create a song</div>';
        UIManager.updateSectionEditorVisibility(false);
        
        UIManager.showFeedback(`Deleted song: "${songName}"`, 'success');
      }
    },
    
    /**
     * Add a new section to the current song
     */
    addSection() {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !songs[currentSongId]) {
        UIManager.showFeedback('Please select or create a song first', 'error');
        return;
      }
      
      // Get section type and name
      const sectionTypeSelect = document.getElementById('section-type');
      const customSectionName = document.getElementById('custom-section-name');
      
      if (!sectionTypeSelect) return;
      
      let sectionType = sectionTypeSelect.value;
      let sectionName;
      
      if (sectionType === 'custom') {
        if (!customSectionName || !customSectionName.value.trim()) {
          UIManager.showFeedback('Please enter a name for your custom section', 'error');
          return;
        }
        sectionName = customSectionName.value.trim();
      } else {
        // For standard types, use capitalized version and add a number if needed
        sectionName = sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
        
        // Check if we already have sections of this type, add a number
        const existingSections = Object.values(songs[currentSongId].sections)
          .filter(section => section.name.startsWith(sectionName))
          .length;
        
        if (existingSections > 0) {
          sectionName += ` ${existingSections + 1}`;
        }
      }
      
      // Generate section ID
      const sectionId = 'section_' + Date.now();
      
      // Add section to the song
      songs[currentSongId].sections[sectionId] = {
        name: sectionName,
        chords: []
      };
      
      // Add to order array
      songs[currentSongId].order.push(sectionId);
      
      // Update state and save
      AppState.set('songBuilder.songs', songs);
      AppState.set('songBuilder.currentSectionId', sectionId);
      this.saveSongsToStorage();
      
      // Update UI
      this.updateSongSectionsDisplay();
      this.updateSectionEditorVisibility();
      
      UIManager.showFeedback(`Added new section: "${sectionName}"`, 'success');
      
      // Reset custom section name if used
      if (customSectionName) {
        customSectionName.value = '';
        customSectionName.style.display = 'none';
      }
      
      // Reset section type select
      if (sectionTypeSelect) {
        sectionTypeSelect.value = 'intro';
      }
    },
    
    /**
     * Select a section
     * @param {string} sectionId - ID of the section to select
     */
    selectSection(sectionId) {
      // Update state
      AppState.set('songBuilder.currentSectionId', sectionId);
      
      // Update UI
      this.updateSongSectionsDisplay();
      this.updateSectionEditorVisibility();
    },
    
    /**
     * Delete the current section
     */
    deleteSection() {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const currentSectionId = AppState.get('songBuilder.currentSectionId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !currentSectionId || 
          !songs[currentSongId] || !songs[currentSongId].sections[currentSectionId]) {
        UIManager.showFeedback('No section selected to delete', 'error');
        return;
      }
      
      const sectionName = songs[currentSongId].sections[currentSectionId].name;
      
      // Confirm deletion
      if (confirm(`Are you sure you want to delete the section "${sectionName}"?`)) {
        // Remove from order array
        const orderIndex = songs[currentSongId].order.indexOf(currentSectionId);
        if (orderIndex !== -1) {
          songs[currentSongId].order.splice(orderIndex, 1);
        }
        
        // Delete the section
        delete songs[currentSongId].sections[currentSectionId];
        
        // Update state and save
        AppState.set('songBuilder.songs', songs);
        AppState.set('songBuilder.currentSectionId', null);
        this.saveSongsToStorage();
        
        // Update UI
        this.updateSongSectionsDisplay();
        UIManager.updateSectionEditorVisibility(false);
        
        UIManager.showFeedback(`Deleted section: "${sectionName}"`, 'success');
      }
    },
    
    /**
     * Add the current chord to the current section
     */
    addCurrentChordToSection() {
      // Make sure we're in chord mode
      if (AppState.get('practice.mode') !== 'chord') {
        UIManager.showFeedback('Please select Chord Mode first', 'error');
        return;
      }
      
      // Make sure a song and section are selected
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const currentSectionId = AppState.get('songBuilder.currentSectionId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !currentSectionId || 
          !songs[currentSongId] || !songs[currentSongId].sections[currentSectionId]) {
        UIManager.showFeedback('Please select a section to add the chord to', 'error');
        return;
      }
      
      // Get selected root and chord
      const rootNoteSelect = document.getElementById('root-note-select');
      const chordSelect = document.getElementById('chord-select');
      
      if (!rootNoteSelect || !chordSelect) {
        console.error('Root note or chord select not found');
        return;
      }
      
      const rootNote = rootNoteSelect.value;
      const chordType = chordSelect.value;
      
      if (!rootNote || !chordType) {
        UIManager.showFeedback('Please select a root note and chord type', 'error');
        return;
      }
      
      // Get the chord pattern
      const chordPattern = AppState.get(`patterns.chords.${chordType}`);
      if (!chordPattern) {
        UIManager.showFeedback('Invalid chord type', 'error');
        return;
      }
      
      // Create chord name
      const chordName = `${rootNote} ${chordType}`;
      
      // Calculate notes for the chord
      const notes = PracticeModule.calculateNotesFromPattern(rootNote, chordPattern);
      
      if (notes.length === 0) {
        UIManager.showFeedback('Could not generate valid notes for this chord', 'error');
        return;
      }
      
      // Save the current state to history before making changes
      this.saveToHistory('add chord', { chordName });
      
      // Add to section
      songs[currentSongId].sections[currentSectionId].chords.push({
        name: chordName,
        notes: notes
      });
      
      // Update state and save
      AppState.set('songBuilder.songs', songs);
      this.saveSongsToStorage();
      
      // Update UI
      this.updateSectionProgressionDisplay();
      this.updateSongSectionsDisplay(); // Update the preview
      
      UIManager.showFeedback(
        `Added ${chordName} to "${songs[currentSongId].sections[currentSectionId].name}"`, 
        'success'
      );
    },
    
    /**
     * Remove a chord from the current section
     * @param {number} index - Index of the chord to remove
     */
    removeChordFromSection(index) {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const currentSectionId = AppState.get('songBuilder.currentSectionId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !currentSectionId || 
          !songs[currentSongId] || !songs[currentSongId].sections[currentSectionId]) {
        return;
      }
      
      const section = songs[currentSongId].sections[currentSectionId];
      
      if (index < 0 || index >= section.chords.length) {
        return;
      }
      
      // Get the chord name before removing it
      const removedChord = section.chords[index];
      
      // Save the current state to history before making changes
      this.saveToHistory('remove chord', { index, chord: removedChord });
      
      // Remove the chord
      section.chords.splice(index, 1);
      
      // Update state and save
      AppState.set('songBuilder.songs', songs);
      this.saveSongsToStorage();
      
      // Update UI
      this.updateSectionProgressionDisplay();
      this.updateSongSectionsDisplay(); // Update the preview
      
      UIManager.showFeedback(`Removed ${removedChord.name} from ${section.name}`, 'success');
    },
    
    /**
     * Play a chord from the current section
     * @param {number} index - Index of the chord to play
     */
    playChordFromSection(index) {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const currentSectionId = AppState.get('songBuilder.currentSectionId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !currentSectionId || 
          !songs[currentSongId] || !songs[currentSongId].sections[currentSectionId]) {
        return;
      }
      
      const section = songs[currentSongId].sections[currentSectionId];
      
      if (index < 0 || index >= section.chords.length) {
        return;
      }
      
      // Get the chord
      const chord = section.chords[index];
      
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      
      // Play the chord
      PianoModule.playChord(chord.notes);
    },
    
    /**
     * Reorder chords in the current section
     * @param {number} fromIndex - Source index
     * @param {number} toIndex - Destination index
     */
    reorderChords(fromIndex, toIndex) {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const currentSectionId = AppState.get('songBuilder.currentSectionId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !currentSectionId || 
          !songs[currentSongId] || !songs[currentSongId].sections[currentSectionId]) {
        return;
      }
      
      const section = songs[currentSongId].sections[currentSectionId];
      
      if (fromIndex < 0 || fromIndex >= section.chords.length || 
          toIndex < 0 || toIndex >= section.chords.length) {
        return;
      }
      
      // Save the current state to history before making changes
      this.saveToHistory('reorder chord', { fromIndex, toIndex });
      
      // Reorder the chords array
      const [movedChord] = section.chords.splice(fromIndex, 1);
      section.chords.splice(toIndex, 0, movedChord);
      
      // Update state and save
      AppState.set('songBuilder.songs', songs);
      this.saveSongsToStorage();
      
      // Update UI
      this.updateSectionProgressionDisplay();
      this.updateSongSectionsDisplay(); // Update the preview
      
      UIManager.showFeedback(`Rearranged chords in ${section.name}`, 'success');
    },
    
    /**
     * Reorder sections in the current song
     * @param {string} fromSectionId - Source section ID
     * @param {string} toSectionId - Destination section ID
     */
    reorderSections(fromSectionId, toSectionId) {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !songs[currentSongId]) {
        return;
      }
      
      const song = songs[currentSongId];
      
      // Find the positions in the order array
      const fromIndex = song.order.indexOf(fromSectionId);
      const toIndex = song.order.indexOf(toSectionId);
      
      if (fromIndex === -1 || toIndex === -1) {
        return;
      }
      
      // Reorder the sections
      const [movedSection] = song.order.splice(fromIndex, 1);
      song.order.splice(toIndex, 0, movedSection);
      
      // Update state and save
      AppState.set('songBuilder.songs', songs);
      this.saveSongsToStorage();
      
      // Update UI
      this.updateSongSectionsDisplay();
      
      UIManager.showFeedback(`Rearranged sections in song`, 'success');
    },
    
    /**
     * Play the current section
     */
    playSection() {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const currentSectionId = AppState.get('songBuilder.currentSectionId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !currentSectionId || 
          !songs[currentSongId] || !songs[currentSongId].sections[currentSectionId]) {
        UIManager.showFeedback('Please select a section to play', 'error');
        return;
      }
      
      const section = songs[currentSongId].sections[currentSectionId];
      
      if (section.chords.length === 0) {
        UIManager.showFeedback('No chords in this section to play', 'error');
        return;
      }
      
      // Play the progression of chords
      this.playProgression(section.chords, section.name);
    },
    
    /**
     * Play the entire song
     */
    playSong() {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !songs[currentSongId]) {
        UIManager.showFeedback('Please select a song to play', 'error');
        return;
      }
      
      const song = songs[currentSongId];
      
      if (song.order.length === 0) {
        UIManager.showFeedback('No sections in this song to play', 'error');
        return;
      }
      
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      
      // Clear any existing timeouts
      AppState.clearTimeouts('progression');
      
      // Gather all chords from all sections in order
      const allChords = [];
      let sectionStartIndexes = [];
      let currentIndex = 0;
      
      // For each section in order
      song.order.forEach(sectionId => {
        const section = song.sections[sectionId];
        if (!section || section.chords.length === 0) return;
        
        // Track where each section starts
        sectionStartIndexes.push({
          index: currentIndex,
          name: section.name
        });
        
        // Add all chords from this section
        section.chords.forEach(chord => {
          allChords.push(chord);
          currentIndex++;
        });
      });
      
      if (allChords.length === 0) {
        UIManager.showFeedback('No chords to play in this song', 'error');
        return;
      }
      
      // Play all chords in sequence
      this.playProgression(allChords, song.name, sectionStartIndexes);
    },
    
    /**
     * Play a progression of chords
     * @param {Array} chords - Array of chord objects with name and notes
     * @param {string} name - Name of the progression (section or song name)
     * @param {Array} [sectionMarkers] - Array of section start markers
     */
    playProgression(chords, name, sectionMarkers = []) {
      // Stop any currently playing notes
      PianoModule.stopAllNotes();
      
      // Clear any existing timeouts
      AppState.clearTimeouts('progression');
      
      // Calculate timing
      const chordDuration = AppState.get('practice.durations.chord');
      const transitionTime = 300; // Brief pause between chords
      
      console.log(`Playing ${name} with ${chords.length} chords`);
      
      // Play each chord in sequence
      chords.forEach((chord, index) => {
        const startTime = index * (chordDuration + transitionTime);
        
        // Check if this is the start of a new section
        let sectionName = '';
        const sectionStart = sectionMarkers.find(marker => marker.index === index);
        if (sectionStart) {
          sectionName = ` (${sectionStart.name})`;
          
          // Add a marker for section change
          const sectionMarkerTimeout = setTimeout(() => {
            UIManager.showFeedback(`Section: ${sectionStart.name}`, 'info');
          }, startTime - 500); // Show just before the section starts
          
          AppState.timeouts.progression.push(sectionMarkerTimeout);
        }
        
        // Set timeout to play this chord
        const playTimeout = AppState.addProgressionTimeout(() => {
          // Display which chord is playing
          UIManager.showFeedback(
            `Playing: ${chord.name}${sectionName} (${index + 1}/${chords.length})`, 
            'success'
          );
          
          // Play the chord
          PianoModule.playChord(chord.notes, { duration: chordDuration });
        }, startTime);
      });
      
      // Final timeout to clear the feedback
      const finalTimeout = AppState.addProgressionTimeout(() => {
        UIManager.showFeedback(`Finished playing "${name}"`, 'success');
      }, chords.length * (chordDuration + transitionTime));
    },
    
    /**
     * Update song sections display
     */
    updateSongSectionsDisplay() {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const currentSectionId = AppState.get('songBuilder.currentSectionId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !songs[currentSongId]) {
        return;
      }
      
      const song = songs[currentSongId];
      
      // Update UI
      UIManager.updateSongSectionsDisplay(song, currentSectionId);
    },
    
    /**
     * Update section progression display
     */
    updateSectionProgressionDisplay() {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const currentSectionId = AppState.get('songBuilder.currentSectionId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !currentSectionId || 
          !songs[currentSongId] || !songs[currentSongId].sections[currentSectionId]) {
        return;
      }
      
      const section = songs[currentSongId].sections[currentSectionId];
      
      // Update UI
      UIManager.updateSectionProgressionDisplay(section);
    },
    
    /**
     * Update section editor visibility
     */
    updateSectionEditorVisibility() {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const currentSectionId = AppState.get('songBuilder.currentSectionId');
      const songs = AppState.get('songBuilder.songs');
      
      const hasSection = (
        currentSongId && 
        currentSectionId && 
        songs[currentSongId] && 
        songs[currentSongId].sections[currentSectionId]
      );
      
      // Update UI
      if (hasSection) {
        const section = songs[currentSongId].sections[currentSectionId];
        UIManager.updateSectionEditorVisibility(true, section);
      } else {
        UIManager.updateSectionEditorVisibility(false);
      }
    },
    
    /**
     * Save songs to localStorage
     */
    saveSongsToStorage() {
      const songs = AppState.get('songBuilder.songs');
      try {
        // Save to localStorage
        localStorage.setItem('piano-app-songs', JSON.stringify(songs));
        console.log('SongBuilderModule: Songs saved to localStorage:', Object.keys(songs).length, 'songs');
        
        // Also trigger AppState's save method to ensure consistency
        if (typeof AppState.saveSongsToStorage === 'function') {
          AppState.saveSongsToStorage();
        }
      } catch (e) {
        console.error('SongBuilderModule: Failed to save songs to localStorage:', e);
        // Show feedback to user
        UIManager.showFeedback('Failed to save songs. Storage may be full.', 'error');
      }
    },
    
    /**
     * Load songs from localStorage
     */
    loadSavedSongs() {
      try {
        const savedSongs = localStorage.getItem('piano-app-songs');
        if (savedSongs) {
          const songs = JSON.parse(savedSongs);
          AppState.set('songBuilder.songs', songs);
          console.log('SongBuilderModule: Loaded', Object.keys(songs).length, 'songs from localStorage');
          
          // Update the song dropdown
          UIManager.updateSongDropdown(songs);
        }
      } catch (e) {
        console.error('SongBuilderModule: Failed to load songs from localStorage:', e);
        // Show feedback to user
        UIManager.showFeedback('Failed to load saved songs.', 'error');
      }
    },
    
    /**
     * Duplicate a chord in the current section
     * @param {number} fromIndex - Source index to duplicate
     * @param {number} toIndex - Destination index to insert the duplicate
     */
    duplicateChord(fromIndex, toIndex) {
      const currentSongId = AppState.get('songBuilder.currentSongId');
      const currentSectionId = AppState.get('songBuilder.currentSectionId');
      const songs = AppState.get('songBuilder.songs');
      
      if (!currentSongId || !currentSectionId || 
          !songs[currentSongId] || !songs[currentSongId].sections[currentSectionId]) {
        return;
      }
      
      const section = songs[currentSongId].sections[currentSectionId];
      
      if (fromIndex < 0 || fromIndex >= section.chords.length || 
          toIndex < 0 || toIndex > section.chords.length) {
        return;
      }
      
      // Clone the chord to duplicate
      const sourceChord = section.chords[fromIndex];
      const duplicatedChord = {
        name: sourceChord.name,
        notes: [...sourceChord.notes] // Create a copy of the notes array
      };
      
      // Calculate the correct insertion index
      // When dragging, we want to insert after the target when dragging downward
      // and before the target when dragging upward
      let insertIndex = toIndex;
      if (fromIndex < toIndex) {
        // If dragging downward, we want to insert after the target chord
        insertIndex = toIndex + 1;
      }
      // But ensure the index is valid
      insertIndex = Math.min(insertIndex, section.chords.length);
      
      console.log(`Duplicating chord from index ${fromIndex} to insert at ${insertIndex}`);
      
      // Insert the duplicated chord at the calculated position
      section.chords.splice(insertIndex, 0, duplicatedChord);
      
      // Update state and save
      AppState.set('songBuilder.songs', songs);
      this.saveSongsToStorage();
      
      // Update UI
      this.updateSectionProgressionDisplay();
      this.updateSongSectionsDisplay(); // Update the preview
      
      UIManager.showFeedback(`Duplicated chord ${sourceChord.name} in ${section.name}`, 'success');
    }
  }