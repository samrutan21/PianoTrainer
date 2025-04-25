# AI Assistant Guide for Piano Trainer Project

## How to Assist with This Project

### Understanding Context
- This is a piano training web application using JavaScript
- AppState.js is the central state management system
- The app helps users learn piano through interactive exercises

### Code Modification Guidelines
1. **Follow Existing Patterns**:
   - Match existing code style and architecture
   - Use AppState for global state management
   - Maintain separation of concerns

2. **Music Theory Knowledge**:
   - Verify musical accuracy when modifying scales/chords
   - Follow standard music notation conventions
   - Ensure audio implementation aligns with music theory

3. **State Management**:
   - Use AppState.get() and AppState.set() for state access
   - Implement proper subscription patterns for reactivity 
   - Follow the established event system

4. **UI Components**:
   - Maintain consistent styling
   - Follow existing component architecture
   - Prioritize responsive design

### Preferred Assistance Approach
- First analyze existing code thoroughly before suggesting changes
- Aim for the  most logical, simple, and efficient approach
- Ensure that any fixes provided are not going to create issues with other existing functionalities
- Provide complete solutions rather than partial fixes
- Include documentation for any complex changes
- Focus on maintaining performance, especially for audio processing
- Test suggestions against music theory correctness

### Feature Areas to Be Familiar With
- Piano visualization and keyboard interaction
- Scale and chord pattern implementation
- Practice mode exercise logic
- MIDI device integration
- Song detection and chord analysis

### Tips for Effective Help
- Refer to existing implementation before creating new solutions
- Understand the music theory foundations in the codebase
- Consider memory management, especially with audio resources
- Prioritize user experience in any UI modifications 