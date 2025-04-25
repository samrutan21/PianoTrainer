# Piano Trainer - Commands Reference

## Development Commands

### Starting the Application
```
npm run dev   # Start development server
```

### Music Theory Reference

#### Note Format
Notes are represented as letter + octave (e.g., 'C4', 'F#5')

#### Scale Patterns (Semitone Intervals)
- Major: [0, 2, 4, 5, 7, 9, 11]
- Minor: [0, 2, 3, 5, 7, 8, 10]
- Dorian: [0, 2, 3, 5, 7, 9, 10]
- Phrygian: [0, 1, 3, 5, 7, 8, 10]
- Lydian: [0, 2, 4, 6, 7, 9, 11]
- Mixolydian: [0, 2, 4, 5, 7, 9, 10]
- Locrian: [0, 1, 3, 5, 6, 8, 10]
- Harmonic Minor: [0, 2, 3, 5, 7, 8, 11]
- Melodic Minor: [0, 2, 3, 5, 7, 9, 11]
- Pentatonic Major: [0, 2, 4, 7, 9]
- Pentatonic Minor: [0, 3, 5, 7, 10]
- Blues: [0, 3, 5, 6, 7, 10]

#### Chord Patterns (Semitone Intervals)
- Major (maj): [0, 4, 7]
- Minor (min): [0, 3, 7]
- Dominant 7th (7): [0, 4, 7, 10]
- Major 7th (maj7): [0, 4, 7, 11]
- Minor 7th (min7): [0, 3, 7, 10]
- Diminished (dim): [0, 3, 6]
- Diminished 7th (dim7): [0, 3, 6, 9]
- Half-diminished 7th (half_dim7): [0, 3, 6, 10]
- Augmented (aug): [0, 4, 8]
- Suspended 2nd (sus2): [0, 2, 7]
- Suspended 4th (sus4): [0, 5, 7]
- Major 9th (maj9): [0, 4, 7, 11, 14]
- Minor 9th (min9): [0, 3, 7, 10, 14]

#### Keyboard Mapping
Computer keyboard to piano note mapping:
```
q: A3,  2: A#3,  w: B3,  e: C4,  4: C#4,  r: D4,  5: D#4,  t: E4
y: F4,  7: F#4,  u: G4,  8: G#4,  i: A4,  9: A#4,  o: B4,  p: C5
-: C#5, [: D5,   =: D#5, ]: E5,  z: F5,  s: F#5,  x: G5,  d: G#5
c: A5,  f: A#5,  v: B5
```

## AppState API Reference

### Accessing State
```javascript
// Get state values
AppState.get('audio.volume');
AppState.get('piano.showNoteLabels');

// Set state values (triggers listeners)
AppState.set('audio.volume', 0.7);
AppState.set('piano.showNoteLabels', false);
```

### State Subscriptions
```javascript
// Subscribe to state changes
const unsubscribe = AppState.subscribe('audio.volume', (newValue, oldValue, path) => {
  console.log(`Volume changed from ${oldValue} to ${newValue}`);
});

// Unsubscribe when no longer needed
unsubscribe();
```

### Managing Timeouts
```javascript
// Add a scale timeout
const timeoutId = AppState.addScaleTimeout(() => {
  // Callback code
}, 2000);

// Set chord timeout
AppState.setChordTimeout(() => {
  // Callback code
}, 1500);

// Clear timeouts
AppState.clearTimeouts('all');  // Options: 'all', 'scale', 'chord', 'progression', 'feedback'
```

## Common Code Patterns

### Adding New Chord or Scale Pattern
```javascript
// Add new chord pattern
AppState.patterns.chords['new_chord_name'] = [0, 3, 6, 9];

// Add new scale pattern
AppState.patterns.scales['new_scale_name'] = [0, 2, 3, 5, 7, 8, 11];
```

### Instrument Selection
```javascript
// Change instrument
AppState.set('audio.currentInstrument', 'acoustic_guitar_nylon');
``` 