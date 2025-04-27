/**
 * EventManager - Unified event handling system for the piano application
 * Tracks and manages all event listeners to prevent duplicates and memory leaks
 */
const EventManager = {
    // Registered event listeners
    registeredListeners: new Map(),
    
    // Counter for generating unique IDs
    idCounter: 0,
    
    /**
     * Initialize the event manager
     */
    init() {
      console.log('EventManager: Initializing');
      console.log('EventManager: Initialized');
      return this;
    },
    
    /**
     * Add an event listener with tracking
     * @param {Element} element - DOM element to attach listener to
     * @param {string} eventType - Event type (e.g., 'click', 'keydown')
     * @param {Function} handler - Event handler function
     * @param {Object|boolean} [options] - Event listener options
     * @returns {string} Unique listener ID for removal
     */
    on(element, eventType, handler, options) {
      if (!element) {
        console.warn('EventManager: Cannot add listener to null element for event:', eventType);
        return null;
      }
      
      if (!(element instanceof Element)) {
        console.warn('EventManager: Invalid element provided for event:', eventType);
        return null;
      }
      
      // Generate unique ID for this handler
      const id = this._generateId(element, eventType);
      
      // Store reference
      this.registeredListeners.set(id, { element, eventType, handler, options });
      
      try {
        // Add the actual event listener
        element.addEventListener(eventType, handler, options);
        return id;
      } catch (error) {
        console.error('EventManager: Failed to add event listener:', error);
        this.registeredListeners.delete(id);
        return null;
      }
    },
    
    /**
     * Remove an event listener by ID or by element and event type
     * @param {string|Element} elementOrId - Listener ID or DOM element
     * @param {string} [eventType] - Event type (required if first param is an element)
     * @returns {boolean|number} True if removed by ID, or count of removed listeners
     */
    off(elementOrId, eventType) {
      // If first argument is a string, treat as ID
      if (typeof elementOrId === 'string') {
        if (!this.registeredListeners.has(elementOrId)) {
          return false;
        }
        
        const { element, eventType, handler, options } = this.registeredListeners.get(elementOrId);
        element.removeEventListener(eventType, handler, options);
        this.registeredListeners.delete(elementOrId);
        
        return true;
      }
      
      // Otherwise, treat as element + eventType
      if (!elementOrId || !eventType) return 0;
      
      let count = 0;
      const idsToRemove = [];
      
      // Find all matching listeners
      for (const [id, data] of this.registeredListeners.entries()) {
        if (data.element === elementOrId && data.eventType === eventType) {
          elementOrId.removeEventListener(eventType, data.handler, data.options);
          idsToRemove.push(id);
          count++;
        }
      }
      
      // Remove from our registry
      idsToRemove.forEach(id => this.registeredListeners.delete(id));
      
      return count;
    },
    
    /**
     * Remove all listeners from an element
     * @param {Element} element - DOM element to clean up
     * @param {string} [eventType] - Optional event type filter
     * @returns {number} Number of listeners removed
     */
    removeAll(element, eventType) {
      let count = 0;
      
      for (const [id, data] of this.registeredListeners.entries()) {
        if (data.element === element && (!eventType || data.eventType === eventType)) {
          data.element.removeEventListener(data.eventType, data.handler, data.options);
          this.registeredListeners.delete(id);
          count++;
        }
      }
      
      return count;
    },
    
    /**
     * Add multiple event listeners to the same element
     * @param {Element} element - DOM element to attach listeners to
     * @param {Object} eventMap - Map of event types to handlers
     * @param {Object|boolean} [options] - Event listener options
     * @returns {Object} Map of event types to listener IDs
     */
    onMultiple(element, eventMap, options) {
      const ids = {};
      
      for (const [eventType, handler] of Object.entries(eventMap)) {
        ids[eventType] = this.on(element, eventType, handler, options);
      }
      
      return ids;
    },
    
    /**
     * Add the same listener to multiple elements
     * @param {NodeList|Array} elements - Collection of DOM elements
     * @param {string} eventType - Event type to listen for
     * @param {Function} handler - Event handler function
     * @param {Object|boolean} [options] - Event listener options
     * @returns {string[]} Array of listener IDs
     */
    onElements(elements, eventType, handler, options) {
      const ids = [];
      
      for (const element of elements) {
        ids.push(this.on(element, eventType, handler, options));
      }
      
      return ids;
    },
    
    /**
     * Add an event listener that only fires once
     * @param {Element} element - DOM element to attach listener to
     * @param {string} eventType - Event type (e.g., 'click', 'keydown')
     * @param {Function} handler - Event handler function
     * @param {Object|boolean} [options] - Event listener options
     * @returns {string} Unique listener ID
     */
    once(element, eventType, handler, options) {
      // Create options object if it's a boolean
      const listenerOptions = typeof options === 'boolean' ? 
        { capture: options, once: true } : 
        { ...options, once: true };
        
      // Wrap the handler to remove from our registry when fired
      const wrappedHandler = (event) => {
        // Call the original handler
        handler(event);
        
        // Find and remove from our registry
        for (const [id, data] of this.registeredListeners.entries()) {
          if (data.element === element && data.eventType === eventType && data.handler === wrappedHandler) {
            this.registeredListeners.delete(id);
            break;
          }
        }
      };
      
      return this.on(element, eventType, wrappedHandler, listenerOptions);
    },
    
    /**
     * Add document event listener
     * @param {string} eventType - Event type (e.g., 'click', 'keydown')
     * @param {Function} handler - Event handler function
     * @param {Object|boolean} [options] - Event listener options
     * @returns {string} Unique listener ID
     */
    onDocument(eventType, handler, options) {
      return this.on(document, eventType, handler, options);
    },
    
    /**
     * Add window event listener
     * @param {string} eventType - Event type (e.g., 'resize', 'blur')
     * @param {Function} handler - Event handler function
     * @param {Object|boolean} [options] - Event listener options
     * @returns {string} Unique listener ID
     */
    onWindow(eventType, handler, options) {
      return this.on(window, eventType, handler, options);
    },
    
    /**
     * Add a listener for a keyboard key
     * @param {string} key - Key to listen for (e.g., 'Escape', 'Enter')
     * @param {Function} handler - Event handler function(event)
     * @param {Object} [options] - Additional options
     * @param {string} [options.eventType='keydown'] - Event type ('keydown' or 'keyup')
     * @param {boolean} [options.preventDefault=false] - Whether to prevent default
     * @param {Element} [options.target=document] - Target element (default: document)
     * @returns {string} Unique listener ID
     */
    onKey(key, handler, options = {}) {
      const { 
        eventType = 'keydown', 
        preventDefault = false,
        target = document
      } = options;
      
      const keyHandler = (event) => {
        if (event.key === key) {
          if (preventDefault) {
            event.preventDefault();
          }
          handler(event);
        }
      };
      
      return this.on(target, eventType, keyHandler, options);
    },
    
    /**
     * Trigger a custom event
     * @param {Element} element - Element to dispatch event on
     * @param {string} eventName - Name of the event
     * @param {Object} [detail] - Custom event data
     * @param {Object} [options] - Event options
     * @returns {boolean} Whether the event was cancelled
     */
    trigger(element, eventName, detail = {}, options = {}) {
      const event = new CustomEvent(eventName, {
        bubbles: true,
        cancelable: true,
        detail,
        ...options
      });
      
      return element.dispatchEvent(event);
    },
    
    /**
     * Get current listener count
     * @returns {number} Number of registered listeners
     */
    listenerCount() {
      return this.registeredListeners.size;
    },
    
    /**
     * Generate a unique ID for a listener
     * @private
     * @param {Element} element - DOM element
     * @param {string} eventType - Event type
     * @returns {string} Unique ID
     */
    _generateId(element, eventType) {
      const elementId = element.id || 
        (element === document ? 'document' : 
         (element === window ? 'window' : 'element'));
      
      this.idCounter++;
      return `${elementId}_${eventType}_${this.idCounter}`;
    }
  };