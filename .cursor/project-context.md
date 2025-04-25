# Piano Trainer Application - Project Context

## Project Overview
This is a web-based piano training application designed to help users learn and practice piano skills, including:
- Playing scales and chords
- Building songs
- Practicing with different instruments
- MIDI device integration

## Core Architecture
- **Frontend**: JavaScript-based web application
  - Core state management in `AppState.js`
  - Component-based UI architecture
- **Backend**: Supporting API functionality

## Coding Principles

### State Management
- Use the central `AppState` object for global state management
- Follow the existing pattern of dot-notation paths for state access/updates
- Utilize the provided subscribe/notify pattern for state changes

### Code Style
- Follow existing naming conventions:
  - camelCase for variables, methods, and properties
  - PascalCase for component/class names
- Maintain clean code organization with proper documentation
- Prefer concise, readable, and self-documenting code

### Architecture Patterns
- Maintain separation of concerns:
  - Data management (state)
  - UI components
  - Audio processing
  - User interaction logic
- Follow the existing event-driven programming model
- Use the established subscription pattern for reactivity

### Music Theory Implementation
- Piano notes are represented in standard notation (e.g., 'C4', 'F#5')
- Scales and chords follow established musical patterns
- Maintain accurate implementation of music theory concepts

### UI/UX Guidelines
- Prioritize intuitive, responsive user interfaces
- Maintain consistent styling with existing components
- Ensure accessibility in UI implementations

### Performance Considerations
- Optimize audio processing to minimize latency
- Handle MIDI input responsively
- Manage memory efficiently, especially with timeouts and audio resources

## Feature Areas
- Piano visualization and interaction
- Scale and chord practice modes
- Song building and playback
- Sound exploration and instrument selection
- MIDI device integration

## Tech Stack
- JavaScript for core application logic
- Web Audio API for sound generation
- Local storage for data persistence
- HTML/CSS for UI rendering

## Future Development Directions
- Enhanced song detection capabilities
- Expanded chord and scale libraries
- Advanced practice modes
- Performance analytics 