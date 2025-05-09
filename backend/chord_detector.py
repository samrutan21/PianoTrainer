import os
import tempfile
import numpy as np
import librosa
import pytube
from scipy.signal import savgol_filter
from sklearn.preprocessing import normalize
import matplotlib.pyplot as plt

class ChordProgressionDetector:
    # Define pitch classes for different intervals
    def _get_chord_templates(self):
        """Generate templates for different chord types across all root notes"""
        # Root notes (pitch class indices)
        roots = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        }
        
        # Interval structures for different chord types (semitones from root)
        chord_types = {
            # Basic Triads - Root Position
            'maj': [0, 4, 7],                  # Major triad (1, 3, 5)
            'min': [0, 3, 7],                  # Minor triad (1, b3, 5)
            'dim': [0, 3, 6],                  # Diminished triad (1, b3, b5)
            'aug': [0, 4, 8],                  # Augmented triad (1, 3, #5)
            'sus2': [0, 2, 7],                 # Suspended 2nd (1, 2, 5)
            'sus4': [0, 5, 7],                 # Suspended 4th (1, 4, 5)
            
            # Basic Triads - First Inversion
            'maj/3': [4, 7, 12],              # Major triad first inversion (3, 5, 1)
            'min/3': [3, 7, 12],              # Minor triad first inversion (b3, 5, 1)
            'dim/3': [3, 6, 12],              # Diminished triad first inversion (b3, b5, 1)
            'aug/3': [4, 8, 12],              # Augmented triad first inversion (3, #5, 1)
            'sus2/2': [2, 7, 12],             # Suspended 2nd first inversion (2, 5, 1)
            'sus4/4': [5, 7, 12],             # Suspended 4th first inversion (4, 5, 1)
            
            # Basic Triads - Second Inversion
            'maj/5': [7, 12, 16],             # Major triad second inversion (5, 1, 3)
            'min/5': [7, 12, 15],             # Minor triad second inversion (5, 1, b3)
            'dim/5': [6, 12, 15],             # Diminished triad second inversion (b5, 1, b3)
            'aug/5': [8, 12, 16],             # Augmented triad second inversion (#5, 1, 3)
            'sus2/5': [7, 12, 14],            # Suspended 2nd second inversion (5, 1, 2)
            'sus4/5': [7, 12, 17],            # Suspended 4th second inversion (5, 1, 4)
            
            # Seventh Chords - Root Position
            '7': [0, 4, 7, 10],               # Dominant 7th (1, 3, 5, b7)
            'maj7': [0, 4, 7, 11],            # Major 7th (1, 3, 5, 7)
            'min7': [0, 3, 7, 10],            # Minor 7th (1, b3, 5, b7)
            'dim7': [0, 3, 6, 9],             # Diminished 7th (1, b3, b5, bb7)
            'hdim7': [0, 3, 6, 10],           # Half-diminished 7th (1, b3, b5, b7)
            'minmaj7': [0, 3, 7, 11],         # Minor major 7th (1, b3, 5, 7)
            'aug7': [0, 4, 8, 10],            # Augmented 7th (1, 3, #5, b7)
            'maj7#5': [0, 4, 8, 11],          # Major 7th #5 (1, 3, #5, 7)
            
            # Seventh Chords - First Inversion
            '7/3': [4, 7, 10, 12],            # Dominant 7th first inversion (3, 5, b7, 1)
            'maj7/3': [4, 7, 11, 12],         # Major 7th first inversion (3, 5, 7, 1)
            'min7/3': [3, 7, 10, 12],         # Minor 7th first inversion (b3, 5, b7, 1)
            'dim7/3': [3, 6, 9, 12],          # Diminished 7th first inversion (b3, b5, bb7, 1)
            'hdim7/3': [3, 6, 10, 12],        # Half-diminished 7th first inversion (b3, b5, b7, 1)
            'minmaj7/3': [3, 7, 11, 12],      # Minor major 7th first inversion (b3, 5, 7, 1)
            'aug7/3': [4, 8, 10, 12],         # Augmented 7th first inversion (3, #5, b7, 1)
            'maj7#5/3': [4, 8, 11, 12],       # Major 7th #5 first inversion (3, #5, 7, 1)
            
            # Seventh Chords - Second Inversion
            '7/5': [7, 10, 12, 16],           # Dominant 7th second inversion (5, b7, 1, 3)
            'maj7/5': [7, 11, 12, 16],        # Major 7th second inversion (5, 7, 1, 3)
            'min7/5': [7, 10, 12, 15],        # Minor 7th second inversion (5, b7, 1, b3)
            'dim7/5': [6, 9, 12, 15],         # Diminished 7th second inversion (b5, bb7, 1, b3)
            'hdim7/5': [6, 10, 12, 15],       # Half-diminished 7th second inversion (b5, b7, 1, b3)
            'minmaj7/5': [7, 11, 12, 15],     # Minor major 7th second inversion (5, 7, 1, b3)
            'aug7/5': [8, 10, 12, 16],        # Augmented 7th second inversion (#5, b7, 1, 3)
            'maj7#5/5': [8, 11, 12, 16],      # Major 7th #5 second inversion (#5, 7, 1, 3)
            
            # Seventh Chords - Third Inversion
            '7/b7': [10, 12, 16, 19],         # Dominant 7th third inversion (b7, 1, 3, 5)
            'maj7/7': [11, 12, 16, 19],       # Major 7th third inversion (7, 1, 3, 5)
            'min7/b7': [10, 12, 15, 19],      # Minor 7th third inversion (b7, 1, b3, 5)
            'dim7/bb7': [9, 12, 15, 18],      # Diminished 7th third inversion (bb7, 1, b3, b5)
            'hdim7/b7': [10, 12, 15, 18],     # Half-diminished 7th third inversion (b7, 1, b3, b5)
            'minmaj7/7': [11, 12, 15, 19],    # Minor major 7th third inversion (7, 1, b3, 5)
            'aug7/b7': [10, 12, 16, 20],      # Augmented 7th third inversion (b7, 1, 3, #5)
            'maj7#5/7': [11, 12, 16, 20],     # Major 7th #5 third inversion (7, 1, 3, #5)
            
            # Drop Voicings
            'maj7drop2': [0, 7, 11, 16],      # Major 7th drop 2 (1, 5, 7, 3)
            'min7drop2': [0, 7, 10, 15],      # Minor 7th drop 2 (1, 5, b7, b3)
            '7drop2': [0, 7, 10, 16],         # Dominant 7th drop 2 (1, 5, b7, 3)
            'maj7drop3': [0, 4, 11, 19],      # Major 7th drop 3 (1, 3, 7, 5)
            'min7drop3': [0, 3, 10, 19],      # Minor 7th drop 3 (1, b3, b7, 5)
            '7drop3': [0, 4, 10, 19],         # Dominant 7th drop 3 (1, 3, b7, 5)
            
            # Spread Voicings
            'maj7spread': [0, 7, 11, 19],     # Major 7th spread (1, 5, 7, 3)
            'min7spread': [0, 7, 10, 19],     # Minor 7th spread (1, 5, b7, 3)
            '7spread': [0, 7, 10, 19],        # Dominant 7th spread (1, 5, b7, 3)
            
            # Quartal Voicings
            'quartal': [0, 5, 10],            # Quartal chord (1, 4, 7)
            'quartal7': [0, 5, 10, 15],       # Quartal 7th (1, 4, 7, 10)
            'quartal9': [0, 5, 10, 15, 20],   # Quartal 9th (1, 4, 7, 10, 13)
            
            # Cluster Voicings
            'cluster': [0, 1, 2],             # Cluster chord (1, b2, 2)
            'cluster7': [0, 1, 2, 3],         # Cluster 7th (1, b2, 2, b3)
            'cluster9': [0, 1, 2, 3, 4],      # Cluster 9th (1, b2, 2, b3, 3)
            
            # Shell Voicings
            'shell7': [0, 7, 10],             # Shell dominant 7th (1, 5, b7)
            'shellmaj7': [0, 7, 11],          # Shell major 7th (1, 5, 7)
            'shellmin7': [0, 7, 10],          # Shell minor 7th (1, 5, b7)
            
            # Upper Structure Triads
            'ustmaj7': [0, 4, 7, 11, 14, 18], # Upper structure major 7th (1, 3, 5, 7, 9, #11)
            'ustmin7': [0, 3, 7, 10, 14, 17], # Upper structure minor 7th (1, b3, 5, b7, 9, 11)
            'ust7': [0, 4, 7, 10, 14, 18],    # Upper structure dominant 7th (1, 3, 5, b7, 9, #11)
            
            # Open Voicings
            'maj7open': [0, 7, 11, 19],       # Major 7th open (1, 5, 7, 3)
            'min7open': [0, 7, 10, 19],       # Minor 7th open (1, 5, b7, 3)
            '7open': [0, 7, 10, 19],          # Dominant 7th open (1, 5, b7, 3)
            
            # Close Voicings
            'maj7close': [0, 4, 7, 11],       # Major 7th close (1, 3, 5, 7)
            'min7close': [0, 3, 7, 10],       # Minor 7th close (1, b3, 5, b7)
            '7close': [0, 4, 7, 10],          # Dominant 7th close (1, 3, 5, b7)
            
            # Rootless Voicings
            'rootless7': [4, 7, 10, 14],      # Rootless dominant 7th (3, 5, b7, 9)
            'rootlessmaj7': [4, 7, 11, 14],   # Rootless major 7th (3, 5, 7, 9)
            'rootlessmin7': [3, 7, 10, 14],   # Rootless minor 7th (b3, 5, b7, 9)
            
            # Kenny Barron Voicings
            'kb7': [0, 4, 7, 10, 14, 17],     # Kenny Barron dominant 7th (1, 3, 5, b7, 9, 11)
            'kbmaj7': [0, 4, 7, 11, 14, 17],  # Kenny Barron major 7th (1, 3, 5, 7, 9, 11)
            'kbmin7': [0, 3, 7, 10, 14, 17],  # Kenny Barron minor 7th (1, b3, 5, b7, 9, 11)
            
            # Bill Evans Voicings
            'be7': [0, 4, 7, 10, 14, 18],     # Bill Evans dominant 7th (1, 3, 5, b7, 9, #11)
            'bemaj7': [0, 4, 7, 11, 14, 18],  # Bill Evans major 7th (1, 3, 5, 7, 9, #11)
            'bemin7': [0, 3, 7, 10, 14, 18],  # Bill Evans minor 7th (1, b3, 5, b7, 9, #11)
            
            # McCoy Tyner Voicings
            'mt7': [0, 4, 7, 10, 14, 18, 21], # McCoy Tyner dominant 7th (1, 3, 5, b7, 9, #11, 13)
            'mtmaj7': [0, 4, 7, 11, 14, 18, 21], # McCoy Tyner major 7th (1, 3, 5, 7, 9, #11, 13)
            'mtmin7': [0, 3, 7, 10, 14, 18, 21], # McCoy Tyner minor 7th (1, b3, 5, b7, 9, #11, 13)
            
            # Herbie Hancock Voicings
            'hh7': [0, 4, 7, 10, 14, 17, 21], # Herbie Hancock dominant 7th (1, 3, 5, b7, 9, 11, 13)
            'hhmaj7': [0, 4, 7, 11, 14, 17, 21], # Herbie Hancock major 7th (1, 3, 5, 7, 9, 11, 13)
            'hhmin7': [0, 3, 7, 10, 14, 17, 21], # Herbie Hancock minor 7th (1, b3, 5, b7, 9, 11, 13)
            
            # Chick Corea Voicings
            'cc7': [0, 4, 7, 10, 14, 18, 21], # Chick Corea dominant 7th (1, 3, 5, b7, 9, #11, 13)
            'ccmaj7': [0, 4, 7, 11, 14, 18, 21], # Chick Corea major 7th (1, 3, 5, 7, 9, #11, 13)
            'ccmin7': [0, 3, 7, 10, 14, 18, 21], # Chick Corea minor 7th (1, b3, 5, b7, 9, #11, 13)
            
            # Modal Voicings
            'lydian': [0, 4, 7, 11, 14, 18],  # Lydian chord (1, 3, 5, 7, 9, #11)
            'mixolydian': [0, 4, 7, 10, 14, 17], # Mixolydian chord (1, 3, 5, b7, 9, 11)
            'dorian': [0, 3, 7, 10, 14, 17],  # Dorian chord (1, b3, 5, b7, 9, 11)
            'phrygian': [0, 3, 7, 10, 13, 17], # Phrygian chord (1, b3, 5, b7, b9, 11)
            'locrian': [0, 3, 6, 10, 13, 17], # Locrian chord (1, b3, b5, b7, b9, 11)
            
            # Special Voicings
            'mystic': [0, 4, 6, 7, 11],       # Mystic chord (1, 3, b5, 5, 7)
            'petrushka': [0, 4, 7, 12, 16, 19], # Petrushka chord (1, 3, 5, 8, 10, 12)
            'hendrix': [0, 4, 7, 10, 15],     # Hendrix chord (1, 3, 5, b7, #9)
            'mu': [0, 4, 7, 11, 14],          # Mu chord (1, 3, 5, 7, 9)
            'so': [0, 4, 7, 10, 14, 17],      # So What chord (1, 3, 5, b7, 9, 11)
        }
        
        templates = {}
        
        # Generate all chord templates across all roots and chord types
        for root_name, root_idx in roots.items():
            for chord_type, intervals in chord_types.items():
                chord_name = f"{root_name}:{chord_type}"
                # Create a 12-element array for pitch classes
                template = np.zeros(12)
                
                # Add energy to pitch classes that are part of the chord
                for interval in intervals:
                    pitch_class = (root_idx + interval) % 12
                    template[pitch_class] = 1
                
                templates[chord_name] = template
        
        return templates
        
    # Common chord templates (normalized energy distribution across pitch classes)
    # These represent the relative energy expected in each pitch class for a given chord
    
    def __init__(self):
        # Generate chord templates
        self.CHORD_TEMPLATES = self._get_chord_templates()
        
        # Normalize chord templates
        for key in self.CHORD_TEMPLATES:
            self.CHORD_TEMPLATES[key] = normalize(self.CHORD_TEMPLATES[key].reshape(1, -1), axis=1).flatten()
            
        # Configuration parameters
        self.config = {
            'chroma_sr': 22050,          # Sample rate for chroma features
            'hop_length': 512,           # Hop length for chroma features
            'n_chroma': 12,              # Number of chroma bins
            'detection_threshold': 0.75,  # Increased from 0.65 for even stricter detection
            'min_duration_frames': 15,    # Increased from 10 for longer minimum duration
            'window_size': 9,            # Increased from 7 for better smoothing
            'similarity_threshold': 0.2,  # Increased from 0.15 for stricter matching
            'bass_weight': 1.2,          # Reduced from 1.3
            'harmonic_weight': 1.05,     # Reduced from 1.1
            'min_chord_duration': 0.8,   # Increased from 0.5 seconds
            'max_chord_gap': 0.3,        # Increased from 0.2 seconds
            'cluster_threshold': 0.85,    # Special threshold for cluster chords
            'min_progression_duration': 2.0,  # Minimum duration for a progression
        }
        
        # Training configuration
        self.training_config = {
            'epochs': 50,                # Number of training epochs
            'batch_size': 32,            # Batch size for training
            'learning_rate': 0.01,       # Initial learning rate
            'lr_decay': 0.95,           # Learning rate decay per epoch
            'validation_split': 0.2,     # Fraction of data used for validation
            'min_training_samples': 5,   # Minimum number of training samples required
            'early_stopping_patience': 5, # Number of epochs without improvement before stopping
            'model_save_path': 'chord_detector_model.pkl'  # Path to save trained model
        }
        
        # Initialize chord complexity map
        self._init_chord_complexity()
        
        # Add training data storage
        self.training_data = {
            'known_songs': [],  # List of dictionaries with song info and features
            'key_weights': {},  # Learned weights for key detection
            'chord_weights': {}  # Learned weights for chord detection
        }
        
        # Initialize default weights
        self._initialize_default_weights()
    
    def _init_chord_complexity(self):
        """Initialize chord complexity mapping"""
        self.CHORD_COMPLEXITY = {
            # Basic Triads - Root Position
            'maj': 1,    # Major triad
            'min': 1,    # Minor triad
            'dim': 1,    # Diminished triad
            'aug': 1,    # Augmented triad
            'sus2': 1,   # Suspended 2nd
            'sus4': 1,   # Suspended 4th
            
            # Basic Triads - Inversions
            'maj/3': 2,  # Major triad first inversion
            'min/3': 2,  # Minor triad first inversion
            'dim/3': 2,  # Diminished triad first inversion
            'aug/3': 2,  # Augmented triad first inversion
            'sus2/2': 2, # Suspended 2nd first inversion
            'sus4/4': 2, # Suspended 4th first inversion
            'maj/5': 2,  # Major triad second inversion
            'min/5': 2,  # Minor triad second inversion
            'dim/5': 2,  # Diminished triad second inversion
            'aug/5': 2,  # Augmented triad second inversion
            'sus2/5': 2, # Suspended 2nd second inversion
            'sus4/5': 2, # Suspended 4th second inversion
            
            # Seventh Chords - Root Position
            '7': 2,      # Dominant 7th
            'maj7': 2,   # Major 7th
            'min7': 2,   # Minor 7th
            'dim7': 2,   # Diminished 7th
            'hdim7': 2,  # Half-diminished 7th
            'minmaj7': 2,# Minor major 7th
            'aug7': 2,   # Augmented 7th
            'maj7#5': 2, # Major 7th #5
            
            # Seventh Chords - Inversions
            '7/3': 3,    # Dominant 7th first inversion
            'maj7/3': 3, # Major 7th first inversion
            'min7/3': 3, # Minor 7th first inversion
            'dim7/3': 3, # Diminished 7th first inversion
            'hdim7/3': 3,# Half-diminished 7th first inversion
            'minmaj7/3': 3, # Minor major 7th first inversion
            'aug7/3': 3, # Augmented 7th first inversion
            'maj7#5/3': 3, # Major 7th #5 first inversion
            '7/5': 3,    # Dominant 7th second inversion
            'maj7/5': 3, # Major 7th second inversion
            'min7/5': 3, # Minor 7th second inversion
            'dim7/5': 3, # Diminished 7th second inversion
            'hdim7/5': 3,# Half-diminished 7th second inversion
            'minmaj7/5': 3, # Minor major 7th second inversion
            'aug7/5': 3, # Augmented 7th second inversion
            'maj7#5/5': 3, # Major 7th #5 second inversion
            '7/b7': 3,   # Dominant 7th third inversion
            'maj7/7': 3, # Major 7th third inversion
            'min7/b7': 3,# Minor 7th third inversion
            'dim7/bb7': 3, # Diminished 7th third inversion
            'hdim7/b7': 3, # Half-diminished 7th third inversion
            'minmaj7/7': 3, # Minor major 7th third inversion
            'aug7/b7': 3, # Augmented 7th third inversion
            'maj7#5/7': 3, # Major 7th #5 third inversion
            
            # Drop Voicings
            'maj7drop2': 3, # Major 7th drop 2
            'min7drop2': 3, # Minor 7th drop 2
            '7drop2': 3,    # Dominant 7th drop 2
            'maj7drop3': 3, # Major 7th drop 3
            'min7drop3': 3, # Minor 7th drop 3
            '7drop3': 3,    # Dominant 7th drop 3
            
            # Spread Voicings
            'maj7spread': 3, # Major 7th spread
            'min7spread': 3, # Minor 7th spread
            '7spread': 3,    # Dominant 7th spread
            
            # Quartal Voicings
            'quartal': 2,    # Quartal chord
            'quartal7': 3,   # Quartal 7th
            'quartal9': 4,   # Quartal 9th
            
            # Cluster Voicings
            'cluster': 2,    # Cluster chord
            'cluster7': 3,   # Cluster 7th
            'cluster9': 4,   # Cluster 9th
            
            # Shell Voicings
            'shell7': 2,     # Shell dominant 7th
            'shellmaj7': 2,  # Shell major 7th
            'shellmin7': 2,  # Shell minor 7th
            
            # Upper Structure Triads
            'ustmaj7': 4,    # Upper structure major 7th
            'ustmin7': 4,    # Upper structure minor 7th
            'ust7': 4,       # Upper structure dominant 7th
            
            # Open Voicings
            'maj7open': 3,   # Major 7th open
            'min7open': 3,   # Minor 7th open
            '7open': 3,      # Dominant 7th open
            
            # Close Voicings
            'maj7close': 2,  # Major 7th close
            'min7close': 2,  # Minor 7th close
            '7close': 2,     # Dominant 7th close
            
            # Rootless Voicings
            'rootless7': 3,  # Rootless dominant 7th
            'rootlessmaj7': 3, # Rootless major 7th
            'rootlessmin7': 3, # Rootless minor 7th
            
            # Jazz Pianist Voicings
            'kb7': 4,        # Kenny Barron dominant 7th
            'kbmaj7': 4,     # Kenny Barron major 7th
            'kbmin7': 4,     # Kenny Barron minor 7th
            'be7': 4,        # Bill Evans dominant 7th
            'bemaj7': 4,     # Bill Evans major 7th
            'bemin7': 4,     # Bill Evans minor 7th
            'mt7': 5,        # McCoy Tyner dominant 7th
            'mtmaj7': 5,     # McCoy Tyner major 7th
            'mtmin7': 5,     # McCoy Tyner minor 7th
            'hh7': 5,        # Herbie Hancock dominant 7th
            'hhmaj7': 5,     # Herbie Hancock major 7th
            'hhmin7': 5,     # Herbie Hancock minor 7th
            'cc7': 5,        # Chick Corea dominant 7th
            'ccmaj7': 5,     # Chick Corea major 7th
            'ccmin7': 5,     # Chick Corea minor 7th
            
            # Modal Voicings
            'lydian': 4,     # Lydian chord
            'mixolydian': 4, # Mixolydian chord
            'dorian': 4,     # Dorian chord
            'phrygian': 4,   # Phrygian chord
            'locrian': 4,    # Locrian chord
            
            # Special Voicings
            'mystic': 3,     # Mystic chord
            'petrushka': 4,  # Petrushka chord
            'hendrix': 3,    # Hendrix chord
            'mu': 3,         # Mu chord
            'so': 4          # So What chord
        }
    
    def _initialize_default_weights(self):
        """Initialize default weights based on music theory"""
        # Key detection weights
        self.training_data['key_weights'] = {
            'chroma_correlation': 0.3,
            'chord_progression': 0.4,
            'pitch_class_distribution': 0.3,
            'minor_key_boost': 1.2  # Boost for minor keys in pop music
        }
        
        # Chord detection weights
        self.training_data['chord_weights'] = {
            'template_matching': 0.4,
            'harmonic_context': 0.3,
            'temporal_smoothing': 0.3,
            'cluster_penalty': 0.8  # Penalty for cluster chords
        }
    
    def add_training_sample(self, audio_path, true_key, true_chords):
        """Add a training sample to the dataset"""
        try:
            # Extract features
            chroma, sr, hop_length = self.extract_chroma_features(audio_path)
            if chroma is None:
                return False
            
            # Get detected chords
            detected_chords = self.identify_chords(chroma)
            time_chords = self.convert_frames_to_time(detected_chords, sr, hop_length)
            
            # Calculate features
            features = {
                'chroma_correlation': self._calculate_chroma_correlation(chroma),
                'chord_progression': self._analyze_chord_progressions(time_chords),
                'pitch_class_distribution': self._calculate_pitch_class_distribution(chroma),
                'true_key': true_key,
                'true_chords': true_chords
            }
            
            self.training_data['known_songs'].append(features)
            return True
            
        except Exception as e:
            print(f"Error adding training sample: {str(e)}")
            return False
    
    def train_models(self):
        """Train both key detection and chord detection models"""
        try:
            if len(self.training_data['known_songs']) < self.training_config['min_training_samples']:
                print(f"Not enough training samples. Need at least {self.training_config['min_training_samples']}")
                return False
                
            # Split data into training and validation sets
            train_size = int(len(self.training_data['known_songs']) * (1 - self.training_config['validation_split']))
            train_data = self.training_data['known_songs'][:train_size]
            val_data = self.training_data['known_songs'][train_size:]
            
            print("Training key detection model...")
            self._train_key_detection(train_data, val_data)
            
            print("Training chord detection model...")
            self._train_chord_detection(train_data, val_data)
            
            # Save trained model
            self._save_model()
            
            return True
            
        except Exception as e:
            print(f"Error training models: {str(e)}")
            return False
    
    def _save_model(self):
        """Save trained model to file"""
        try:
            import pickle
            model_data = {
                'key_weights': self.training_data['key_weights'],
                'chord_weights': self.training_data['chord_weights'],
                'config': self.config,
                'training_config': self.training_config
            }
            
            with open(self.training_config['model_save_path'], 'wb') as f:
                pickle.dump(model_data, f)
                
            print(f"Model saved to {self.training_config['model_save_path']}")
            
        except Exception as e:
            print(f"Error saving model: {str(e)}")
    
    def load_model(self):
        """Load trained model from file"""
        try:
            import pickle
            if os.path.exists(self.training_config['model_save_path']):
                with open(self.training_config['model_save_path'], 'rb') as f:
                    model_data = pickle.load(f)
                    
                self.training_data['key_weights'] = model_data['key_weights']
                self.training_data['chord_weights'] = model_data['chord_weights']
                self.config.update(model_data['config'])
                self.training_config.update(model_data['training_config'])
                
                print(f"Model loaded from {self.training_config['model_save_path']}")
                return True
            return False
            
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            return False
    
    def _train_key_detection(self, train_data, val_data):
        """Train the key detection model using gradient descent"""
        try:
            # Initialize weights if not already done
            if not self.training_data['key_weights']:
                self._initialize_default_weights()
            
            weights = self.training_data['key_weights'].copy()
            learning_rate = self.training_config['learning_rate']
            best_accuracy = 0
            
            print("Starting key detection training...")
            for epoch in range(self.training_config['epochs']):
                # Shuffle training data
                np.random.shuffle(train_data)
                
                total_loss = 0
                # Mini-batch gradient descent
                for i in range(0, len(train_data), self.training_config['batch_size']):
                    batch = train_data[i:i + self.training_config['batch_size']]
                    
                    # Process each sample in batch
                    batch_loss = 0
                    batch_gradients = {k: 0.0 for k in weights.keys()}
                    
                    for sample in batch:
                        # Extract numerical features
                        features = self._extract_numerical_features(sample)
                        
                        # Predict key using the current weights
                        predicted_key = self._predict_key(features, weights)
                        
                        # Calculate loss (1 if incorrect, 0 if correct)
                        loss = 0.0 if predicted_key == sample.get('true_key', '') else 1.0
                        batch_loss += loss
                        
                        # Update gradients only if prediction was wrong
                        if loss > 0:
                            for key in weights:
                                if key in features:
                                    batch_gradients[key] += features[key]
                    
                    # Average gradients over batch and update weights
                    batch_size = max(1, len(batch))  # Avoid division by zero
                    for key in batch_gradients:
                        batch_gradients[key] /= batch_size
                        weights[key] -= learning_rate * batch_gradients[key]
                    
                    total_loss += batch_loss
                
                # Validate after each epoch
                accuracy = self._validate_key_detection(val_data, weights)
                
                print(f"Epoch {epoch + 1}/{self.training_config['epochs']}, Loss: {total_loss:.4f}, Accuracy: {accuracy:.2%}")
                
                if accuracy > best_accuracy:
                    best_accuracy = accuracy
                    self.training_data['key_weights'] = weights.copy()
                
                # Decay learning rate
                learning_rate *= self.training_config['lr_decay']
            
            print(f"Key detection training complete. Best validation accuracy: {best_accuracy:.2%}")
            
        except Exception as e:
            print(f"Error in key detection training: {str(e)}")
            import traceback
            traceback.print_exc()
    
    def _train_chord_detection(self, train_data, val_data):
        """Train the chord detection model using gradient descent"""
        try:
            # Initialize weights if not already done
            if not self.training_data['chord_weights']:
                self._initialize_default_weights()
            
            weights = self.training_data['chord_weights'].copy()
            learning_rate = self.training_config['learning_rate']
            best_accuracy = 0
            
            print("Starting chord detection training...")
            for epoch in range(self.training_config['epochs']):
                # Shuffle training data
                np.random.shuffle(train_data)
                
                total_loss = 0
                # Mini-batch gradient descent
                for i in range(0, len(train_data), self.training_config['batch_size']):
                    batch = train_data[i:i + self.training_config['batch_size']]
                    
                    # Process each sample in batch
                    batch_loss = 0
                    batch_gradients = {k: 0.0 for k in weights.keys()}
                    
                    for sample in batch:
                        if 'true_chords' not in sample or not sample['true_chords']:
                            continue
                        
                        # Extract features for chord detection
                        features = self._extract_chord_features(sample)
                        
                        # Predict chords using current weights
                        predicted_chords = self._predict_chords(sample, weights)
                        
                        # Calculate accuracy and loss
                        accuracy = self._calculate_chord_accuracy(predicted_chords, sample['true_chords'])
                        loss = 1.0 - accuracy
                        batch_loss += loss
                        
                        # Update gradients based on loss
                        for key in weights:
                            if key in features:
                                batch_gradients[key] += features[key] * loss
                    
                    # Average gradients over batch and update weights
                    batch_size = max(1, len(batch))  # Avoid division by zero
                    for key in batch_gradients:
                        batch_gradients[key] /= batch_size
                        weights[key] -= learning_rate * batch_gradients[key]
                    
                    total_loss += batch_loss
                
                # Validate after each epoch
                accuracy = self._validate_chord_detection(val_data, weights)
                
                print(f"Epoch {epoch + 1}/{self.training_config['epochs']}, Loss: {total_loss:.4f}, Accuracy: {accuracy:.2%}")
                
                if accuracy > best_accuracy:
                    best_accuracy = accuracy
                    self.training_data['chord_weights'] = weights.copy()
                
                # Decay learning rate
                learning_rate *= self.training_config['lr_decay']
            
            print(f"Chord detection training complete. Best validation accuracy: {best_accuracy:.2%}")
            
        except Exception as e:
            print(f"Error in chord detection training: {str(e)}")
            import traceback
            traceback.print_exc()
    
    def _extract_numerical_features(self, sample):
        """Extract numerical features from a sample for key detection"""
        features = {}
        
        # Extract chroma correlation
        if 'chroma_correlation' in sample:
            if isinstance(sample['chroma_correlation'], dict):
                # Handle each key separately to avoid inhomogeneous arrays
                try:
                    values = []
                    for value in sample['chroma_correlation'].values():
                        if isinstance(value, (int, float)):
                            values.append(float(value))
                        elif isinstance(value, (list, np.ndarray)) and all(isinstance(x, (int, float)) for x in value):
                            values.append(float(np.mean(value)))
                    
                    if values:
                        features['chroma_correlation'] = sum(values) / len(values)
                    else:
                        features['chroma_correlation'] = 0.5
                except:
                    features['chroma_correlation'] = 0.5
            elif isinstance(sample['chroma_correlation'], (int, float)):
                features['chroma_correlation'] = float(sample['chroma_correlation'])
            else:
                features['chroma_correlation'] = 0.5
        else:
            features['chroma_correlation'] = 0.5
        
        # Extract pitch class distribution
        if 'pitch_class_distribution' in sample:
            if isinstance(sample['pitch_class_distribution'], dict):
                if 'pitch_strength' in sample['pitch_class_distribution']:
                    try:
                        if isinstance(sample['pitch_class_distribution']['pitch_strength'], list):
                            if all(isinstance(x, (int, float)) for x in sample['pitch_class_distribution']['pitch_strength']):
                                features['pitch_class_distribution'] = float(np.mean(sample['pitch_class_distribution']['pitch_strength']))
                            else:
                                features['pitch_class_distribution'] = 0.5
                        else:
                            features['pitch_class_distribution'] = 0.5
                    except:
                        features['pitch_class_distribution'] = 0.5
                else:
                    features['pitch_class_distribution'] = 0.5
            elif isinstance(sample['pitch_class_distribution'], (int, float)):
                features['pitch_class_distribution'] = float(sample['pitch_class_distribution'])
            else:
                features['pitch_class_distribution'] = 0.5
        else:
            features['pitch_class_distribution'] = 0.5
        
        # Extract chord progression features
        if 'chord_progression' in sample:
            if isinstance(sample['chord_progression'], dict) and 'root_transitions' in sample['chord_progression']:
                features['chord_progression'] = float(len(sample['chord_progression']['root_transitions'])) / 10.0
            else:
                features['chord_progression'] = 0.5
        else:
            features['chord_progression'] = 0.5
        
        # Add minor key boost feature
        features['minor_key_boost'] = 1.0  # Default value
        
        return features
    
    def _extract_chord_features(self, sample):
        """Extract features for chord detection"""
        features = {}
        
        # Template matching feature
        if 'chroma_correlation' in sample:
            if isinstance(sample['chroma_correlation'], dict):
                # Handle each key separately to avoid inhomogeneous arrays
                try:
                    values = []
                    for value in sample['chroma_correlation'].values():
                        if isinstance(value, (int, float)):
                            values.append(float(value))
                        elif isinstance(value, (list, np.ndarray)) and all(isinstance(x, (int, float)) for x in value):
                            values.append(float(np.mean(value)))
                    
                    if values:
                        features['template_matching'] = sum(values) / len(values)
                    else:
                        features['template_matching'] = 0.5
                except:
                    features['template_matching'] = 0.5
            elif isinstance(sample['chroma_correlation'], (int, float)):
                features['template_matching'] = float(sample['chroma_correlation'])
            else:
                features['template_matching'] = 0.5
        else:
            features['template_matching'] = 0.5
        
        # Harmonic context feature
        if 'chord_progression' in sample and isinstance(sample['chord_progression'], dict):
            if 'root_transitions' in sample['chord_progression']:
                features['harmonic_context'] = float(len(sample['chord_progression']['root_transitions'])) / 10.0
            else:
                features['harmonic_context'] = 0.5
        else:
            features['harmonic_context'] = 0.5
        
        # Temporal smoothing feature
        if 'true_chords' in sample:
            if isinstance(sample['true_chords'], list) and len(sample['true_chords']) > 0:
                try:
                    if all('start' in chord and 'end' in chord for chord in sample['true_chords']):
                        durations = [float(chord['end'] - chord['start']) for chord in sample['true_chords']]
                        features['temporal_smoothing'] = float(np.mean(durations)) if durations else 0.5
                    else:
                        features['temporal_smoothing'] = 0.5
                except:
                    features['temporal_smoothing'] = 0.5
            else:
                features['temporal_smoothing'] = 0.5
        else:
            features['temporal_smoothing'] = 0.5
        
        # Cluster penalty feature
        if 'pitch_class_distribution' in sample:
            if isinstance(sample['pitch_class_distribution'], dict):
                try:
                    entropy_value = sample['pitch_class_distribution'].get('pitch_entropy', 2.0)
                    if isinstance(entropy_value, (int, float)):
                        features['cluster_penalty'] = float(entropy_value) / 4.0
                    else:
                        features['cluster_penalty'] = 0.5
                except:
                    features['cluster_penalty'] = 0.5
            else:
                features['cluster_penalty'] = 0.5
        else:
            features['cluster_penalty'] = 0.5
        
        return features
    
    def _calculate_key_gradients(self, batch, weights):
        """Calculate gradients for key detection weights"""
        gradients = {key: 0 for key in weights}
        
        for sample in batch:
            # Calculate predicted key
            predicted_key = self._predict_key(sample, weights)
            
            # Calculate error
            error = 1 if predicted_key != sample['true_key'] else 0
            
            # Update gradients
            for key in weights:
                if key == 'minor_key_boost':
                    continue  # Skip this weight in gradient calculation
                if key in sample:
                    if isinstance(sample[key], dict):
                        # For dictionary features, use average value
                        feature_value = sum(sample[key].values()) / len(sample[key])
                    else:
                        feature_value = sample[key]
                    gradients[key] += error * feature_value
        
        # Average gradients
        for key in gradients:
            gradients[key] /= len(batch)
        
        return gradients
    
    def _calculate_chord_gradients(self, batch, weights):
        """Calculate gradients for chord detection weights"""
        gradients = {key: 0 for key in weights}
        
        for sample in batch:
            # Calculate predicted chords
            predicted_chords = self._predict_chords(sample, weights)
            
            # Calculate error
            error = self._calculate_chord_error(predicted_chords, sample['true_chords'])
            
            # Update gradients using available features
            for key in weights:
                if key == 'template_matching':
                    gradients[key] += error * self._calculate_template_match_score(sample)
                elif key == 'harmonic_context':
                    gradients[key] += error * self._calculate_harmonic_context_score(sample)
                elif key == 'temporal_smoothing':
                    gradients[key] += error * self._calculate_temporal_smoothing_score(sample)
                elif key == 'cluster_penalty':
                    gradients[key] += error * self._calculate_cluster_penalty_score(sample)
        
        # Average gradients
        for key in gradients:
            gradients[key] /= len(batch)
        
        return gradients
    
    def _calculate_template_match_score(self, sample):
        """Calculate template matching score from chroma features"""
        if 'chroma_correlation' in sample:
            return np.mean(list(sample['chroma_correlation'].values()))
        return 0.5  # Default value if feature not available
    
    def _calculate_harmonic_context_score(self, sample):
        """Calculate harmonic context score from chord progression"""
        if 'chord_progression' in sample and 'root_transitions' in sample['chord_progression']:
            return len(sample['chord_progression']['root_transitions']) / 10.0
        return 0.5
    
    def _calculate_temporal_smoothing_score(self, sample):
        """Calculate temporal smoothing score"""
        if 'true_chords' in sample:
            # Calculate average chord duration
            durations = [chord['end'] - chord['start'] for chord in sample['true_chords']]
            avg_duration = np.mean(durations) if durations else 0.5
            return min(1.0, avg_duration / 2.0)  # Normalize to [0,1]
        return 0.5
    
    def _calculate_cluster_penalty_score(self, sample):
        """Calculate cluster penalty score"""
        if 'pitch_class_distribution' in sample:
            # Use pitch class entropy as cluster penalty
            return min(1.0, sample['pitch_class_distribution'].get('pitch_entropy', 0) / 4.0)
        return 0.5
    
    def _validate_key_detection(self, val_data, weights):
        """Validate key detection accuracy"""
        correct = 0
        total = max(1, len(val_data))  # Avoid division by zero
        
        for sample in val_data:
            if 'true_key' not in sample:
                continue
                
            features = self._extract_numerical_features(sample)
            predicted_key = self._predict_key(features, weights)
            if predicted_key == sample['true_key']:
                correct += 1
        
        return correct / total
    
    def _validate_chord_detection(self, val_data, weights):
        """Validate chord detection accuracy"""
        correct = 0
        total = 0
        
        for sample in val_data:
            if 'true_chords' not in sample or not sample['true_chords']:
                continue
                
            predicted_chords = self._predict_chords(sample, weights)
            correct_count = self._calculate_chord_accuracy(predicted_chords, sample['true_chords']) * len(sample['true_chords'])
            correct += correct_count
            total += len(sample['true_chords'])
        
        return correct / max(1, total)  # Avoid division by zero
    
    def _predict_key(self, sample, weights):
        """Predict key using current weights"""
        scores = {}
        
        # Extract features
        features = {
            'chroma_correlation': np.mean(list(sample['chroma_correlation'].values())) if isinstance(sample['chroma_correlation'], dict) else sample['chroma_correlation'],
            'pitch_class_distribution': np.mean([v for v in sample['pitch_class_distribution']['pitch_strength']]) if isinstance(sample['pitch_class_distribution'], dict) else sample['pitch_class_distribution'],
            'chord_progression': len(sample['chord_progression']['root_transitions']) / 10.0 if isinstance(sample['chord_progression'], dict) and 'root_transitions' in sample['chord_progression'] else 0.5
        }
        
        # Calculate scores for each key
        for key in ['C Major', 'C Minor', 'C# Major', 'C# Minor', 'D Major', 'D Minor',
                   'D# Major', 'D# Minor', 'E Major', 'E Minor', 'F Major', 'F Minor',
                   'F# Major', 'F# Minor', 'G Major', 'G Minor', 'G# Major', 'G# Minor',
                   'A Major', 'A Minor', 'A# Major', 'A# Minor', 'B Major', 'B Minor']:
            score = 0
            for feature_name, feature_value in features.items():
                if feature_name in weights:
                    score += feature_value * weights[feature_name]
            
            # Apply minor key boost if applicable
            if 'Minor' in key and 'minor_key_boost' in weights:
                score *= weights['minor_key_boost']
            
            scores[key] = score
        
        return max(scores.items(), key=lambda x: x[1])[0]
    
    def _predict_chords(self, sample, weights):
        """Predict chords using current weights"""
        # Extract chroma features
        chroma = np.array(sample['chroma_correlation']['values']) if isinstance(sample['chroma_correlation'], dict) and 'values' in sample['chroma_correlation'] else np.zeros(12)
        
        # Calculate template matching scores
        template_scores = {}
        for chord_name, template in self.CHORD_TEMPLATES.items():
            similarity = np.dot(chroma, template)
            template_scores[chord_name] = similarity * weights.get('template_matching', 1.0)
        
        # Apply harmonic context
        if isinstance(sample['chord_progression'], dict) and 'root_transitions' in sample['chord_progression']:
            context_weight = weights.get('harmonic_context', 0.3)
            for chord in template_scores:
                root = chord.split(':')[0]
                if root in sample['chord_progression']['root_transitions']:
                    template_scores[chord] *= (1 + context_weight)
        
        # Get predicted chords
        predicted = []
        for i, chord_info in enumerate(sample['true_chords']):  # Use timing from true chords
            start, end = chord_info['start'], chord_info['end']
            best_chord = max(template_scores.items(), key=lambda x: x[1])[0]
            predicted.append({
                'chord': best_chord,
                'start': start,
                'end': end
            })
        
        return predicted
    
    def _calculate_harmonic_context(self, chord, progression):
        """Calculate harmonic context score for a chord"""
        try:
            score = 0
            
            # Check if chord type appears in progression
            chord_type = chord.split(':')[1] if ':' in chord else chord
            type_dist = progression.get('chord_type_distribution', {})
            if chord_type in type_dist:
                score += type_dist[chord_type]
            
            # Check if root appears in progression
            root = chord.split(':')[0] if ':' in chord else chord
            root_dist = progression.get('root_distribution', {})
            if root in root_dist:
                score += root_dist[root]
            
            return score
            
        except:
            return 0
    
    def _calculate_chord_error(self, predicted, true):
        """Calculate error between predicted and true chords"""
        try:
            if predicted == "N" or true == "N":
                return 1.0
            
            # Parse chords
            pred_root, pred_type = predicted.split(':')
            true_root, true_type = true.split(':')
            
            # Calculate root error
            root_error = 0 if pred_root == true_root else 1
            
            # Calculate type error
            type_error = 0 if pred_type == true_type else 1
            
            # Combine errors
            return 0.7 * root_error + 0.3 * type_error
            
        except:
            return 1.0
    
    def _calculate_chord_accuracy(self, predicted_chords, true_chords):
        """Calculate accuracy between predicted and true chord sequences"""
        correct = 0
        total = 0
        
        # Convert predicted chords to time-based format if needed
        if isinstance(predicted_chords, list) and isinstance(predicted_chords[0], str):
            predicted_time_chords = []
            for i, chord in enumerate(predicted_chords):
                predicted_time_chords.append({
                    'chord': chord,
                    'start': true_chords[i]['start'],
                    'end': true_chords[i]['end']
                })
            predicted_chords = predicted_time_chords
        
        # Compare chords at each time point
        for true_chord in true_chords:
            # Find overlapping predicted chord
            for pred_chord in predicted_chords:
                if (pred_chord['start'] < true_chord['end'] and 
                    pred_chord['end'] > true_chord['start']):
                    # Calculate overlap duration
                    overlap = min(pred_chord['end'], true_chord['end']) - \
                             max(pred_chord['start'], true_chord['start'])
                    
                    # Compare root notes and chord types
                    true_root, true_type = true_chord['chord'].split(':')
                    pred_root, pred_type = pred_chord['chord'].split(':')
                    
                    # Award partial credit
                    if true_root == pred_root:
                        correct += 0.7 * overlap  # 70% credit for correct root
                        if true_type == pred_type:
                            correct += 0.3 * overlap  # Additional 30% for correct type
                    
                    total += overlap
        
        return correct / total if total > 0 else 0
    
    def _calculate_chroma_correlation(self, chroma):
        """Calculate chroma correlation features"""
        try:
            # Calculate mean chroma vector
            mean_chroma = np.mean(chroma, axis=1)
            
            # Calculate correlation matrix
            correlation_matrix = np.zeros((12, 12))
            for i in range(12):
                for j in range(12):
                    correlation_matrix[i, j] = np.corrcoef(chroma[i], chroma[j])[0, 1]
            
            # Extract important features
            features = {
                'chroma_mean': mean_chroma.tolist(),
                'chroma_std': np.std(chroma, axis=1).tolist(),
                'chroma_correlation': correlation_matrix.flatten().tolist(),
                'chroma_entropy': self._calculate_entropy(mean_chroma),
                'chroma_peaks': self._find_peaks(mean_chroma)
            }
            
            return features
            
        except Exception as e:
            print(f"Error calculating chroma correlation: {str(e)}")
            return {}
    
    def _analyze_chord_progressions(self, chords):
        """Analyze chord progression features"""
        try:
            if not chords:
                return {}
            
            # Extract chord types and roots
            chord_types = []
            chord_roots = []
            durations = []
            
            for chord_info in chords:
                if chord_info['chord'] == "N":
                    continue
                    
                try:
                    root, chord_type = chord_info['chord'].split(':')
                    chord_types.append(chord_type)
                    chord_roots.append(root)
                    durations.append(chord_info['duration'])
                except:
                    continue
            
            # Calculate features
            features = {
                'chord_type_distribution': self._calculate_distribution(chord_types),
                'root_distribution': self._calculate_distribution(chord_roots),
                'avg_duration': np.mean(durations) if durations else 0,
                'duration_std': np.std(durations) if durations else 0,
                'chord_transitions': self._analyze_transitions(chord_types),
                'root_transitions': self._analyze_transitions(chord_roots)
            }
            
            return features
            
        except Exception as e:
            print(f"Error analyzing chord progressions: {str(e)}")
            return {}
    
    def _calculate_pitch_class_distribution(self, chroma):
        """Calculate pitch class distribution features"""
        try:
            # Calculate mean and variance for each pitch class
            mean_chroma = np.mean(chroma, axis=1)
            var_chroma = np.var(chroma, axis=1)
            
            # Calculate relative strength
            strength = mean_chroma / np.sum(mean_chroma) if np.sum(mean_chroma) > 0 else np.ones(12) / 12
            
            # Calculate stability
            stability = 1 / (1 + var_chroma)
            
            # Calculate entropy
            entropy = self._calculate_entropy(strength)
            
            # Find peaks
            peaks = self._find_peaks(strength)
            
            features = {
                'pitch_strength': strength.tolist(),
                'pitch_stability': stability.tolist(),
                'pitch_entropy': entropy,
                'pitch_peaks': peaks,
                'pitch_contrast': np.max(strength) - np.min(strength)
            }
            
            return features
            
        except Exception as e:
            print(f"Error calculating pitch class distribution: {str(e)}")
            return {}
    
    def _calculate_entropy(self, distribution):
        """Calculate entropy of a probability distribution"""
        try:
            # Remove zeros to avoid log(0)
            distribution = distribution[distribution > 0]
            return -np.sum(distribution * np.log2(distribution))
        except:
            return 0
    
    def _find_peaks(self, signal):
        """Find peaks in a signal"""
        try:
            peaks = []
            for i in range(1, len(signal) - 1):
                if signal[i] > signal[i-1] and signal[i] > signal[i+1]:
                    peaks.append(i)
            return peaks
        except:
            return []
    
    def _calculate_distribution(self, items):
        """Calculate distribution of items"""
        try:
            counts = {}
            total = len(items)
            for item in items:
                counts[item] = counts.get(item, 0) + 1
            
            return {k: v/total for k, v in counts.items()}
        except:
            return {}
    
    def _analyze_transitions(self, sequence):
        """Analyze transitions in a sequence"""
        try:
            transitions = {}
            for i in range(len(sequence) - 1):
                transition = f"{sequence[i]}-{sequence[i+1]}"
                transitions[transition] = transitions.get(transition, 0) + 1
            
            # Normalize
            total = sum(transitions.values())
            return {k: v/total for k, v in transitions.items()} if total > 0 else {}
        except:
            return {}
    
    def download_youtube_audio(self, url, output_path=None):
        """Download audio from a YouTube video using yt-dlp"""
        print(f"Downloading audio from {url}...")
        try:
            import yt_dlp
            import os
            
            # Create a temporary directory for downloads if output_path is not provided
            if not output_path:
                import tempfile
                temp_dir = tempfile.mkdtemp()
                output_path = os.path.join(temp_dir, '%(id)s.%(ext)s')
            
            # Set up yt-dlp options with more robustness
            ydl_opts = {
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'outtmpl': output_path,
                'quiet': False,  # Changed to show more info for debugging
                'no_warnings': False,  # Changed to show warnings
                'ignoreerrors': True,  # Continue on download errors
                'noprogress': False,  # Show progress
                'nooverwrites': False,  # Overwrite existing files
            }
            
            # Download the audio
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                if not info:
                    print("Failed to extract video information")
                    return None
                    
                downloaded_file = ydl.prepare_filename(info)
                
                # Get the actual MP3 file path
                mp3_file = os.path.splitext(downloaded_file)[0] + '.mp3'
                
                # Verify the file exists
                if not os.path.exists(mp3_file):
                    print(f"Warning: MP3 file not found at expected path: {mp3_file}")
                    
                    # Try to find the file in the same directory
                    dir_path = os.path.dirname(mp3_file)
                    if dir_path:
                        for file in os.listdir(dir_path):
                            if file.endswith('.mp3') and info['id'] in file:
                                mp3_file = os.path.join(dir_path, file)
                                print(f"Found MP3 file at alternative path: {mp3_file}")
                                break
                
                if os.path.exists(mp3_file):
                    print(f"Audio downloaded to {mp3_file}")
                    return mp3_file
                else:
                    print(f"Error: Could not find downloaded MP3 file")
                    return None
                    
        except Exception as e:
            print(f"Error downloading YouTube video: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def extract_chroma_features(self, audio_path, sr=22050, hop_length=512, n_chroma=12):
        """Extract chromagram features from audio file"""
        print("Extracting chroma features...")
        try:
            # Load audio with error handling
            try:
                y, sr = librosa.load(audio_path, sr=sr)
            except Exception as e:
                print(f"Error loading audio with librosa: {str(e)}")
                # Try alternative loading method
                import soundfile as sf
                y, sr = sf.read(audio_path)
                if len(y.shape) > 1:  # If stereo, convert to mono
                    y = y.mean(axis=1)
            
            # Apply harmonic-percussive source separation to isolate harmonic content
            y_harmonic, _ = librosa.effects.hpss(y)
            
            # Compute constant-Q transform (better frequency resolution for music)
            C = np.abs(librosa.cqt(y_harmonic, sr=sr, hop_length=hop_length, 
                                  fmin=librosa.note_to_hz('C1'), 
                                  n_bins=96, bins_per_octave=12))
            
            # Compute chromagram using CQT (normalized energy for each pitch class)
            chroma = librosa.feature.chroma_cqt(C=C, sr=sr, hop_length=hop_length, n_chroma=n_chroma)
            
            # Apply additional pre-processing:
            # 1. Non-linear mapping to enhance strong activations
            chroma = np.power(chroma, 2)
            
            # 2. Apply smoothing filter to reduce noise and transients
            chroma_smoothed = np.zeros_like(chroma)
            for i in range(chroma.shape[0]):
                chroma_smoothed[i] = savgol_filter(chroma[i], 15, 3)
            
            # 3. Normalize each frame
            for j in range(chroma_smoothed.shape[1]):
                if np.sum(chroma_smoothed[:, j]) > 0:
                    chroma_smoothed[:, j] = chroma_smoothed[:, j] / np.sum(chroma_smoothed[:, j])
            
            return chroma_smoothed, sr, hop_length
            
        except Exception as e:
            print(f"Error extracting chroma features: {str(e)}")
            import traceback
            traceback.print_exc()
            return None, None, None
    
    def identify_chords(self, chroma, threshold=None, min_duration_frames=None):
        """
        Identify chords from chroma features using an enhanced algorithm.
        
        Args:
            chroma: Chroma features matrix
            threshold: Optional override for detection threshold
            min_duration_frames: Optional override for minimum duration
            
        Returns:
            List of tuples (chord_name, duration_in_frames)
        """
        # Use config values if parameters not provided
        threshold = threshold or self.config['detection_threshold']
        min_duration_frames = min_duration_frames or self.config['min_duration_frames']
        
        num_frames = chroma.shape[1]
        chord_sequence = []
        current_chord = None
        current_chord_duration = 0
        
        # Initialize sliding window buffer
        window_size = self.config['window_size']
        chord_buffer = []
        
        for frame in range(num_frames):
            # Get enhanced chroma vector for current frame
            chroma_vector = self._enhance_chroma_vector(chroma[:, frame])
            
            # Get chord candidates with similarity scores
            chord_candidates = self._get_chord_candidates(chroma_vector, threshold)
            
            # Select best chord using context and rules
            best_chord = self._select_best_chord(chord_candidates)
            
            # Update sliding window buffer
            chord_buffer.append(best_chord)
            if len(chord_buffer) > window_size:
                chord_buffer.pop(0)
            
            # Apply temporal smoothing
            if len(chord_buffer) == window_size:
                smoothed_chord = self._apply_temporal_smoothing(chord_buffer)
                
                # Update chord sequence
                if smoothed_chord != current_chord:
                    if current_chord is not None and current_chord_duration >= min_duration_frames:
                        # Only add chord if it's not a cluster or if it's a significant duration
                        if not current_chord.endswith(':cluster') or current_chord_duration >= min_duration_frames * 2:
                            chord_sequence.append((current_chord, current_chord_duration))
                    current_chord = smoothed_chord
                    current_chord_duration = 1
                else:
                    current_chord_duration += 1
        
        # Add final chord to sequence
        if current_chord is not None and current_chord_duration >= min_duration_frames:
            if not current_chord.endswith(':cluster') or current_chord_duration >= min_duration_frames * 2:
                chord_sequence.append((current_chord, current_chord_duration))
        
        return chord_sequence
        
    def _enhance_chroma_vector(self, chroma_vector):
        """
        Enhance chroma vector by emphasizing bass and harmonic content.
        
        Args:
            chroma_vector: Original chroma vector
            
        Returns:
            Enhanced chroma vector
        """
        # Create a copy to avoid modifying original
        enhanced = chroma_vector.copy()
        
        # Emphasize bass notes
        enhanced[0] *= self.config['bass_weight']  # Root note
        enhanced[4] *= self.config['bass_weight']  # Fifth
        
        # Emphasize harmonic content
        enhanced[7] *= self.config['harmonic_weight']  # Octave
        
        # Normalize the enhanced vector
        return normalize(enhanced.reshape(1, -1), axis=1).flatten()
        
    def _get_chord_candidates(self, chroma_vector, threshold):
        """
        Get potential chord candidates with similarity scores.
        
        Args:
            chroma_vector: Enhanced chroma vector
            threshold: Similarity threshold
            
        Returns:
            List of tuples (chord_name, similarity_score)
        """
        similarities = {}
        
        for chord_name, chord_template in self.CHORD_TEMPLATES.items():
            similarity = np.dot(chroma_vector, chord_template)
            
            # Apply special threshold for cluster chords
            if chord_name.endswith(':cluster'):
                if similarity >= self.config['cluster_threshold']:
                    similarities[chord_name] = similarity
            else:
                if similarity >= threshold:
                    similarities[chord_name] = similarity
        
        return sorted(similarities.items(), key=lambda x: x[1], reverse=True)
        
    def _select_best_chord(self, chord_candidates):
        """
        Select the best chord from candidates using context and rules.
        
        Args:
            chord_candidates: List of (chord_name, similarity_score) tuples
            
        Returns:
            Selected chord name or "N" for no chord
        """
        if not chord_candidates:
            return "N"
            
        # Get top candidates
        top_chords = chord_candidates[:3]
        
        # If only one candidate or clear winner, return it
        if len(top_chords) == 1 or (top_chords[0][1] - top_chords[1][1]) > self.config['similarity_threshold']:
            return top_chords[0][0]
            
        # For ambiguous cases, prefer simpler chords
        return self._prefer_simpler_chord([c[0] for c in top_chords[:2]])
        
    def _apply_temporal_smoothing(self, chord_buffer):
        """
        Apply temporal smoothing to chord sequence.
        
        Args:
            chord_buffer: List of recent chord detections
            
        Returns:
            Smoothed chord name
        """
        from collections import Counter
        chord_counts = Counter(chord_buffer)
        return chord_counts.most_common(1)[0][0]
        
    def _prefer_simpler_chord(self, chord_candidates):
        """
        Choose the simpler chord from candidates based on complexity.
        
        Args:
            chord_candidates: List of chord names
            
        Returns:
            Selected chord name
        """
        if not chord_candidates:
            return None
            
        # Calculate complexity for each candidate
        complexities = {}
        for chord in chord_candidates:
            root, chord_type = chord.split(':')
            complexity = self.CHORD_COMPLEXITY.get(chord_type, 10)
            complexities[chord] = complexity
            
        return min(complexities, key=complexities.get)
    
    def convert_frames_to_time(self, chord_sequence, sr, hop_length):
        """Convert frame-based chord sequence to time-based"""
        time_chord_sequence = []
        current_time = 0
        
        for chord, duration in chord_sequence:
            # Convert duration in frames to duration in seconds
            duration_seconds = duration * hop_length / sr
            
            # Add chord with start and end times
            time_chord_sequence.append({
                'chord': chord,
                'start_time': current_time,
                'end_time': current_time + duration_seconds,
                'duration': duration_seconds
            })
            
            # Update current time
            current_time += duration_seconds
        
        return time_chord_sequence
    
    def simplify_chord_sequence(self, chord_sequence, min_duration=0.5):
        """Simplify chord sequence by merging short chords and removing 'N' chords"""
        simplified = []
        prev_chord = None
        
        for chord_info in chord_sequence:
            # Skip very short chords and "N" (no chord) segments
            if chord_info['chord'] == "N" or chord_info['duration'] < min_duration:
                continue
            
            # Merge with previous chord if it's the same
            if prev_chord is not None and prev_chord['chord'] == chord_info['chord']:
                prev_chord['end_time'] = chord_info['end_time']
                prev_chord['duration'] = prev_chord['end_time'] - prev_chord['start_time']
            else:
                simplified.append(chord_info)
                prev_chord = chord_info
        
        return simplified
    
    def detect_chord_progression(self, simplified_sequence):
        """Extract the main chord progression from the chord sequence with music theory awareness"""
        if not simplified_sequence:
            return []
        
        # Filter out very short chords and merge close ones
        filtered_sequence = []
        current_chord = None
        current_start = None
        current_end = None
        
        for chord_info in simplified_sequence:
            # Skip cluster chords unless they're very long
            if (chord_info['chord'].endswith(':cluster') and 
                chord_info['duration'] < self.config['min_progression_duration']):
                continue
                
            if chord_info['duration'] < self.config['min_chord_duration']:
                continue
                
            if current_chord is None:
                current_chord = chord_info['chord']
                current_start = chord_info['start_time']
                current_end = chord_info['end_time']
            elif (chord_info['chord'] == current_chord and 
                  chord_info['start_time'] - current_end < self.config['max_chord_gap']):
                current_end = chord_info['end_time']
            else:
                filtered_sequence.append({
                    'chord': current_chord,
                    'start_time': current_start,
                    'end_time': current_end,
                    'duration': current_end - current_start
                })
                current_chord = chord_info['chord']
                current_start = chord_info['start_time']
                current_end = chord_info['end_time']
        
        if current_chord is not None:
            filtered_sequence.append({
                'chord': current_chord,
                'start_time': current_start,
                'end_time': current_end,
                'duration': current_end - current_start
            })
        
        # Find common progressions
        progression_lengths = [2, 4]  # Reduced from [2, 4, 8] to focus on shorter progressions
        all_progressions = []
        
        for length in progression_lengths:
            if len(filtered_sequence) <= length:
                continue
                
            # Find chord patterns of the current length
            chord_patterns = {}
            for i in range(len(filtered_sequence) - (length - 1)):
                pattern = tuple(filtered_sequence[j]['chord'] for j in range(i, i + length))
                
                # Skip patterns with cluster chords
                if any(chord.endswith(':cluster') for chord in pattern):
                    continue
                
                if pattern not in chord_patterns:
                    chord_patterns[pattern] = 0
                
                chord_patterns[pattern] += 1
            
            # Analyze found patterns
            for pattern, count in chord_patterns.items():
                if count >= max(2, int(len(filtered_sequence) / (length * 2))):
                    # Calculate average duration
                    avg_duration = sum(filtered_sequence[i]['duration'] for i in range(len(pattern))) / length
                    
                    # Only include progressions with significant duration
                    if avg_duration >= self.config['min_progression_duration']:
                        function = self._analyze_chord_function(pattern)
                        all_progressions.append({
                            'progression': pattern,
                            'count': count,
                            'length': length,
                            'avg_duration': avg_duration,
                            'function': function
                        })
        
        # Sort patterns by count and length
        sorted_progressions = sorted(all_progressions, 
                                  key=lambda x: (x['count'], -x['length']), 
                                  reverse=True)
        
        # Return the top progressions (max 3)
        return sorted_progressions[:3]
    
    def _analyze_chord_function(self, progression):
        """Analyze the musical function of a chord progression"""
        # Extract just the chord types without root notes for pattern matching
        chord_types = []
        for chord in progression:
            if chord != "N" and ":" in chord:
                parts = chord.split(":")
                chord_types.append(parts[1])
            else:
                chord_types = []  # Can't analyze if invalid format
        
        if not chord_types:
            return "Unknown"
            
        # Common chord progressions in music theory
        common_patterns = {
            # Major key progressions
            ("maj", "maj", "min", "maj"): "I-IV-ii-V (Major key)",
            ("maj", "min", "maj", "maj"): "I-ii-V-IV (Major key)",
            ("maj", "min", "maj"): "I-vi-IV (Major key)",
            ("maj", "maj", "min", "maj"): "I-V-vi-IV (Pop progression)",
            ("min", "maj", "maj"): "vi-IV-V (Major key)",
            ("maj", "maj", "maj", "maj"): "I-V-vi-IV (Major key)",
            ("maj", "min", "min", "maj"): "I-vi-ii-V (Jazz turnaround)",
            
            # Minor key progressions
            ("min", "dim", "maj", "min"): "i-ii°-III-iv (Minor key)",
            ("min", "maj", "min"): "i-III-VII (Minor key)",
            ("min", "min", "maj", "maj"): "i-iv-III-VII (Minor key)",
            ("min", "maj", "maj", "min"): "i-III-VII-iv (Minor key)",
            ("min", "maj", "min", "maj"): "i-VII-vi-III (Minor key)",
            
            # Blues progressions
            ("7", "7", "7", "7"): "I7-IV7-V7-IV7 (Blues)",
            ("7", "7", "7"): "I7-IV7-V7 (Blues)",
            
            # Jazz progressions
            ("maj7", "min7", "7", "maj7"): "IMaj7-iim7-V7-IMaj7 (Jazz)",
            ("min7", "7", "maj7"): "iim7-V7-IMaj7 (Jazz ii-V-I)",
            ("min7", "hdim7", "7", "min7"): "iim7-V7/V-V7-im7 (Jazz minor)",
        }
        
        # Try to match the progression with known patterns
        chord_type_tuple = tuple(chord_types)
        for pattern, name in common_patterns.items():
            # Check if the pattern is contained in the progression
            pattern_len = len(pattern)
            if pattern_len <= len(chord_type_tuple):
                for i in range(len(chord_type_tuple) - pattern_len + 1):
                    if chord_type_tuple[i:i+pattern_len] == pattern:
                        return name
        
        # Check for cadences (at the end of progressions)
        if len(chord_types) >= 2:
            last_two = tuple(chord_types[-2:])
            if last_two in [("7", "maj"), ("maj", "maj")]:
                return "Authentic Cadence"
            elif last_two in [("maj", "7"), ("7", "7")]:
                return "Half Cadence"
            elif last_two in [("maj", "min"), ("min", "maj")]:
                return "Deceptive Cadence"
            elif last_two in [("maj", "maj7"), ("7", "maj7")]:
                return "Jazz Cadence"
        
        return "Custom Progression"
    
    def visualize_chords(self, chroma, chord_sequence, sr, hop_length, key_estimation=None):
        """Visualize the chroma features and identified chords with enhanced visualization"""
        plt.figure(figsize=(15, 12))
        
        # Plot chroma features
        plt.subplot(3, 1, 1)
        librosa.display.specshow(chroma, x_axis='time', y_axis='chroma', hop_length=hop_length, sr=sr)
        plt.colorbar()
        plt.title('Chromagram', fontsize=14)
        
        # Plot chord segmentation
        plt.subplot(3, 1, 2)
        current_time = 0
        
        # Color chords by type for better visualization
        chord_type_colors = {
            'maj': 'royalblue',
            'min': 'forestgreen',
            '7': 'darkorange',
            'maj7': 'purple',
            'min7': 'olivedrab',
            'dim': 'firebrick',
            'aug': 'darkviolet',
            'sus': 'teal',
            'sus2': 'cadetblue',
            'sus4': 'steelblue',
            'add9': 'mediumorchid',
            '9': 'coral',
            'dim7': 'crimson',
            'hdim7': 'indianred',
            'maj6': 'mediumblue',
            'min6': 'seagreen',
            'N': 'gray'
        }
        
        for i, chord_info in enumerate(chord_sequence):
            if chord_info['chord'] != "N":  # Skip "no chord" segments
                # Get chord type for coloring
                if ":" in chord_info['chord']:
                    root, chord_type = chord_info['chord'].split(':')
                    color = chord_type_colors.get(chord_type, 'gray')
                else:
                    color = 'gray'
                
                plt.axvspan(chord_info['start_time'], chord_info['end_time'], 
                            alpha=0.4, color=color)
                plt.text(chord_info['start_time'] + 0.05, 0.5, chord_info['chord'], 
                        fontsize=9, verticalalignment='center')
        
        plt.ylim(0, 1)
        plt.title('Chord Segmentation', fontsize=14)
        
        # Plot chord distribution
        plt.subplot(3, 1, 3)
        
        # Count chord types
        chord_counts = {}
        for chord_info in chord_sequence:
            chord = chord_info['chord']
            if chord == "N":
                continue
                
            if chord not in chord_counts:
                chord_counts[chord] = 0
            
            # Weight by duration
            chord_counts[chord] += chord_info['duration']
        
        # Get most common chords
        top_chords = sorted(chord_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Create bar chart
        chord_names = [c[0] for c in top_chords]
        chord_durations = [c[1] for c in top_chords]
        
        # Color bars by chord type
        bar_colors = []
        for chord in chord_names:
            if ":" in chord:
                _, chord_type = chord.split(':')
                bar_colors.append(chord_type_colors.get(chord_type, 'gray'))
            else:
                bar_colors.append('gray')
        
        plt.bar(range(len(chord_names)), chord_durations, color=bar_colors)
        plt.xticks(range(len(chord_names)), chord_names, rotation=45, ha='right')
        plt.title('Most Common Chords by Duration', fontsize=14)
        
        # Add key estimation if available
        if key_estimation:
            plt.figtext(0.02, 0.02, f"Estimated Key: {key_estimation}", fontsize=12)
        
        plt.tight_layout()
        plt.savefig('chord_analysis.png')
        print("Visualization saved as 'chord_analysis.png'")
    
    def estimate_key(self, chroma, chord_sequence):
        """Advanced key detection using multiple techniques"""
        print("Estimating musical key...")
        
        # 1. Krumhansl-Schmuckler algorithm
        def krumhansl_schmuckler(chroma_vector):
            try:
                major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
                minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
                
                major_profile = major_profile / np.sum(major_profile)
                minor_profile = minor_profile / np.sum(minor_profile)
                
                scores = {}
                for i in range(12):
                    major_corr = np.corrcoef(np.roll(major_profile, i), chroma_vector)[0, 1]
                    minor_corr = np.corrcoef(np.roll(minor_profile, i), chroma_vector)[0, 1]
                    
                    root_notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                    scores[f"{root_notes[i]} Major"] = major_corr
                    scores[f"{root_notes[i]} Minor"] = minor_corr
                
                return scores
            except Exception as e:
                print(f"Error in Krumhansl-Schmuckler: {str(e)}")
                return {}
        
        # 2. Temperley-Kostka-Payne algorithm
        def temperley_kostka_payne(chroma_vector):
            try:
                major_profile = np.array([0.748, 0.060, 0.488, 0.082, 0.670, 0.460, 0.096, 0.715, 0.104, 0.366, 0.057, 0.400])
                minor_profile = np.array([0.712, 0.084, 0.474, 0.618, 0.049, 0.460, 0.105, 0.747, 0.404, 0.067, 0.133, 0.330])
                
                scores = {}
                for i in range(12):
                    major_score = np.sum(np.roll(major_profile, i) * chroma_vector)
                    minor_score = np.sum(np.roll(minor_profile, i) * chroma_vector)
                    
                    root_notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                    scores[f"{root_notes[i]} Major"] = major_score
                    scores[f"{root_notes[i]} Minor"] = minor_score
                
                return scores
            except Exception as e:
                print(f"Error in Temperley-Kostka-Payne: {str(e)}")
                return {}
        
        # 3. Advanced chord progression analysis
        def analyze_chord_progressions(chord_sequence):
            try:
                # Common pop music progressions
                pop_progressions = {
                    'Minor': {
                        'i-VI-III-VII': 1.0,  # Common in pop music
                        'i-VII-VI-VII': 0.9,
                        'i-VI-VII-VI': 0.9,
                        'i-VI-VII-V': 0.8,
                        'i-VII-VI-V': 0.8
                    },
                    'Major': {
                        'I-V-vi-IV': 1.0,  # Common in pop music
                        'I-IV-V-IV': 0.9,
                        'I-V-IV-V': 0.9,
                        'I-vi-IV-V': 0.8,
                        'I-IV-vi-V': 0.8
                    }
                }
                
                # Analyze chord functions
                chord_functions = {}
                for chord_info in chord_sequence:
                    if chord_info['chord'] == "N":
                        continue
                        
                    try:
                        root, chord_type = chord_info['chord'].split(':')
                        duration = chord_info['duration']
                        
                        # Determine possible functions
                        functions = {
                            'Major': [],
                            'Minor': []
                        }
                        
                        if chord_type in ['maj', 'maj7', 'maj6']:
                            # Could be I, IV, or V in major
                            # Could be III, VI, or VII in minor
                            functions['Major'] = ['I', 'IV', 'V']
                            functions['Minor'] = ['III', 'VI', 'VII']
                        elif chord_type in ['min', 'min7', 'min6']:
                            # Could be ii, iii, or vi in major
                            # Could be i, iv, or v in minor
                            functions['Major'] = ['ii', 'iii', 'vi']
                            functions['Minor'] = ['i', 'iv', 'v']
                        elif chord_type in ['7', '9', '11']:
                            # Usually V in major or V in minor
                            functions['Major'] = ['V']
                            functions['Minor'] = ['V']
                        
                        for mode in functions:
                            for function in functions[mode]:
                                if mode not in chord_functions:
                                    chord_functions[mode] = {}
                                if function not in chord_functions[mode]:
                                    chord_functions[mode][function] = 0
                                chord_functions[mode][function] += duration
                    except Exception as e:
                        print(f"Error processing chord {chord_info['chord']}: {str(e)}")
                        continue
                
                return chord_functions
            except Exception as e:
                print(f"Error in chord progression analysis: {str(e)}")
                return {}
        
        # 4. Statistical analysis of chroma features
        def analyze_chroma_statistics(chroma):
            try:
                # Calculate mean and variance for each pitch class
                mean_chroma = np.mean(chroma, axis=1)
                var_chroma = np.var(chroma, axis=1)
                
                # Calculate relative strength of each pitch class
                strength = mean_chroma / np.sum(mean_chroma)
                
                # Calculate stability (inverse of variance)
                stability = 1 / (1 + var_chroma)
                
                # Combine strength and stability
                importance = strength * stability
                
                # Convert to dictionary format
                scores = {}
                root_notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                for i in range(12):
                    scores[f"{root_notes[i]} Major"] = importance[i]
                    scores[f"{root_notes[i]} Minor"] = importance[i]
                
                return scores
            except Exception as e:
                print(f"Error in chroma statistics: {str(e)}")
                return {}
        
        # 5. Machine learning-based key detection
        def ml_key_detection(chroma_vector, chord_sequence):
            try:
                # Features for ML model
                features = []
                
                # Chroma features
                features.extend(chroma_vector)
                
                # Chord type distribution
                chord_types = {}
                for chord_info in chord_sequence:
                    if chord_info['chord'] == "N":
                        continue
                    try:
                        chord_type = chord_info['chord'].split(':')[1]
                        if chord_type not in chord_types:
                            chord_types[chord_type] = 0
                        chord_types[chord_type] += chord_info['duration']
                    except Exception as e:
                        print(f"Error processing chord type: {str(e)}")
                        continue
                
                # Normalize chord type distribution
                total_duration = sum(chord_types.values())
                if total_duration > 0:
                    for chord_type in chord_types:
                        chord_types[chord_type] /= total_duration
                
                # Add chord type features
                for chord_type in ['maj', 'min', '7', 'maj7', 'min7', 'dim', 'aug', 'sus2', 'sus4']:
                    features.append(chord_types.get(chord_type, 0))
                
                # Calculate key scores based on features
                scores = {}
                for i in range(12):
                    # Calculate major key score
                    major_score = 0
                    # Root note weight
                    major_score += features[i] * 2.0
                    # Perfect fifth weight
                    major_score += features[(i + 7) % 12] * 1.5
                    # Major third weight
                    major_score += features[(i + 4) % 12] * 1.2
                    
                    # Calculate minor key score
                    minor_score = 0
                    # Root note weight
                    minor_score += features[i] * 2.0
                    # Perfect fifth weight
                    minor_score += features[(i + 7) % 12] * 1.5
                    # Minor third weight
                    minor_score += features[(i + 3) % 12] * 1.2
                    
                    root_notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                    scores[f"{root_notes[i]} Major"] = major_score
                    scores[f"{root_notes[i]} Minor"] = minor_score
                
                return scores
            except Exception as e:
                print(f"Error in ML key detection: {str(e)}")
                return {}
        
        # Combine all methods
        def combine_key_scores(methods_scores):
            try:
                final_scores = {}
                weights = {
                    'krumhansl': 0.2,
                    'temperley': 0.2,
                    'chord_prog': 0.3,
                    'chroma_stats': 0.1,
                    'ml': 0.2
                }
                
                # Get all possible keys from the first available method
                available_keys = None
                for method in methods_scores.values():
                    if isinstance(method, dict) and method:
                        available_keys = list(method.keys())
                        break
                
                if not available_keys:
                    return {}
                
                for key in available_keys:
                    final_scores[key] = 0
                    for method, weight in weights.items():
                        if method in methods_scores and isinstance(methods_scores[method], dict):
                            final_scores[key] += methods_scores[method].get(key, 0) * weight
                
                return final_scores
            except Exception as e:
                print(f"Error combining key scores: {str(e)}")
                return {}
        
        try:
            # Main key detection process
            # 1. Get chroma vector
            chroma_vector = np.sum(chroma, axis=1)
            if np.sum(chroma_vector) > 0:
                chroma_vector = chroma_vector / np.sum(chroma_vector)
            else:
                chroma_vector = np.ones(12) / 12  # Fallback to uniform distribution
            
            # 2. Run all key detection methods
            methods_scores = {
                'krumhansl': krumhansl_schmuckler(chroma_vector),
                'temperley': temperley_kostka_payne(chroma_vector),
                'chord_prog': analyze_chord_progressions(chord_sequence),
                'chroma_stats': analyze_chroma_statistics(chroma),
                'ml': ml_key_detection(chroma_vector, chord_sequence)
            }
            
            # 3. Combine scores
            final_scores = combine_key_scores(methods_scores)
            
            if not final_scores:
                return "Unknown Key"
            
            # 4. Find the key with the highest score
            estimated_key = max(final_scores.items(), key=lambda x: x[1])[0]
            
            # 5. Final verification
            if estimated_key.endswith('Major'):
                root_notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                relative_minor = f"{root_notes[(root_notes.index(estimated_key.split()[0]) + 9) % 12]} Minor"
                if relative_minor in final_scores and final_scores[relative_minor] > final_scores[estimated_key] * 0.9:
                    estimated_key = relative_minor
            
            return estimated_key
            
        except Exception as e:
            print(f"Error in key detection: {str(e)}")
            return "Unknown Key"
        
    def analyze_youtube_video(self, url, visualize=True):
        """Analyze chord progression from YouTube video"""
        print("Starting analysis of YouTube video...")
        
        # Download audio from YouTube
        print("Downloading audio...")
        audio_path = self.download_youtube_audio(url)
        if audio_path is None:
            print("Download failed, returning None")
            return None
        
        try:
            # Extract chroma features
            print("Extracting chroma features...")
            chroma, sr, hop_length = self.extract_chroma_features(audio_path)
            if chroma is None:
                print("Failed to extract chroma features")
                return None
                
            print(f"Chroma shape: {chroma.shape}, Sample rate: {sr}, Hop length: {hop_length}")
            
            # Identify chords
            print("Identifying chords...")
            chord_sequence = self.identify_chords(chroma)
            print(f"Identified {len(chord_sequence)} chord segments")
            
            # Convert to time-based sequence
            print("Converting to time-based sequence...")
            time_chord_sequence = self.convert_frames_to_time(chord_sequence, sr, hop_length)
            print(f"Converted {len(time_chord_sequence)} time-based chord segments")
            
            # Simplify the chord sequence
            print("Simplifying chord sequence...")
            simplified_sequence = self.simplify_chord_sequence(time_chord_sequence)
            print(f"Simplified to {len(simplified_sequence)} chord segments")
            
            # Estimate the musical key
            print("Estimating musical key...")
            key_estimation = self.estimate_key(chroma, simplified_sequence)
            print(f"Estimated key: {key_estimation}")
            
            # Detect chord progressions
            print("Detecting chord progressions...")
            progressions = self.detect_chord_progression(simplified_sequence)
            print(f"Detected {len(progressions)} chord progressions")
            
            # Visualize if requested
            if visualize:
                print("Creating visualization...")
                self.visualize_chords(chroma, simplified_sequence, sr, hop_length, key_estimation)
                print("Visualization complete")
            
            # Clean up temporary file
            if os.path.exists(audio_path):
                os.remove(audio_path)
                print(f"Removed temporary audio file: {audio_path}")
            
            print("Analysis complete, returning results")
            return {
                'chord_sequence': simplified_sequence,
                'progressions': progressions,
                'estimated_key': key_estimation
            }
        
        except Exception as e:
            print(f"Error during analysis: {e}")
            import traceback
            traceback.print_exc()
            # Clean up temporary file
            if os.path.exists(audio_path):
                os.remove(audio_path)
            return None

# Example usage
if __name__ == "__main__":
    detector = ChordProgressionDetector()
    
    # Example YouTube URL - enter your own YouTube URL here
    youtube_url = "https://www.youtube.com/watch?v=YOUR_VIDEO_ID"
    
    # Analyze the YouTube video
    results = detector.analyze_youtube_video(youtube_url)
    
    if results is not None:
        # Print chord sequence
        print("\nDetected Chord Sequence:")
        for chord_info in results['chord_sequence']:
            print(f"{chord_info['chord']} ({chord_info['start_time']:.2f}s - {chord_info['end_time']:.2f}s)")
        
        # Print detected progressions
        print("\nDetected Chord Progressions:")
        for prog in results['progressions']:
            print(f"{' → '.join(prog['progression'])} (occurs {prog['count']} times)")