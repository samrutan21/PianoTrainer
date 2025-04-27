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
        # For example, Major triad = root + major third (4 semitones) + perfect fifth (7 semitones)
        chord_types = {
            'maj': [0, 4, 7],                  # Major triad (1, 3, 5)
            'min': [0, 3, 7],                  # Minor triad (1, b3, 5)
            'dim': [0, 3, 6],                  # Diminished triad (1, b3, b5)
            'aug': [0, 4, 8],                  # Augmented triad (1, 3, #5)
            'sus2': [0, 2, 7],                 # Suspended 2nd (1, 2, 5)
            'sus4': [0, 5, 7],                 # Suspended 4th (1, 4, 5)
            '7': [0, 4, 7, 10],                # Dominant 7th (1, 3, 5, b7)
            'maj7': [0, 4, 7, 11],             # Major 7th (1, 3, 5, 7)
            'min7': [0, 3, 7, 10],             # Minor 7th (1, b3, 5, b7)
            'dim7': [0, 3, 6, 9],              # Diminished 7th (1, b3, b5, bb7)
            'hdim7': [0, 3, 6, 10],            # Half-diminished 7th (1, b3, b5, b7)
            'minmaj7': [0, 3, 7, 11],          # Minor major 7th (1, b3, 5, 7)
            'aug7': [0, 4, 8, 10],             # Augmented 7th (1, 3, #5, b7)
            'add9': [0, 4, 7, 14],             # Add 9 (1, 3, 5, 9)
            'min9': [0, 3, 7, 10, 14],         # Minor 9th (1, b3, 5, b7, 9)
            'maj9': [0, 4, 7, 11, 14],         # Major 9th (1, 3, 5, 7, 9)
            '9': [0, 4, 7, 10, 14],            # Dominant 9th (1, 3, 5, b7, 9)
            '7sus4': [0, 5, 7, 10],            # 7sus4 (1, 4, 5, b7)
            'maj6': [0, 4, 7, 9],              # Major 6th (1, 3, 5, 6)
            'min6': [0, 3, 7, 9],              # Minor 6th (1, b3, 5, 6)
            '11': [0, 4, 7, 10, 14, 17],       # Dominant 11th (1, 3, 5, b7, 9, 11)
            'maj11': [0, 4, 7, 11, 14, 17],    # Major 11th (1, 3, 5, 7, 9, 11)
            'min11': [0, 3, 7, 10, 14, 17],    # Minor 11th (1, b3, 5, b7, 9, 11)
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
    
    def download_youtube_audio(self, url, output_path=None):
        """Download audio from a YouTube video"""
        print(f"Downloading audio from {url}...")
        try:
            # Create a YouTube object
            yt = pytube.YouTube(url)
            
            # Get the audio stream
            audio_stream = yt.streams.filter(only_audio=True).first()
            
            # Download the audio
            if output_path is None:
                # Create a temporary file if no output path is specified
                output_path = tempfile.mktemp(suffix='.mp4')
            
            audio_stream.download(filename=output_path)
            print(f"Audio downloaded to {output_path}")
            return output_path
        except Exception as e:
            print(f"Error downloading YouTube video: {e}")
            return None
    
    def extract_chroma_features(self, audio_path, sr=22050, hop_length=512, n_chroma=12):
        """Extract chromagram features from audio file"""
        print("Extracting chroma features...")
        # Load audio
        y, sr = librosa.load(audio_path, sr=sr)
        
        # Apply harmonic-percussive source separation to isolate harmonic content
        y_harmonic, _ = librosa.effects.hpss(y)
        
        # Compute constant-Q transform (better frequency resolution for music)
        C = np.abs(librosa.cqt(y_harmonic, sr=sr, hop_length=hop_length, 
                              fmin=librosa.note_to_hz('C1'), 
                              n_bins=96, bins_per_octave=12))
        
        # Compute chromagram using CQT (normalized energy for each pitch class)
        # Using CQT-based chroma for better handling of harmonics
        chroma = librosa.feature.chroma_cqt(C=C, sr=sr, hop_length=hop_length, n_chroma=n_chroma)
        
        # Apply additional pre-processing:
        # 1. Non-linear mapping to enhance strong activations
        chroma = np.power(chroma, 2)
        
        # 2. Apply smoothing filter to reduce noise and transients
        chroma_smoothed = np.zeros_like(chroma)
        for i in range(chroma.shape[0]):
            # Using a wider window for smoothing to better track chord changes
            chroma_smoothed[i] = savgol_filter(chroma[i], 15, 3)
        
        # 3. Normalize each frame
        for j in range(chroma_smoothed.shape[1]):
            if np.sum(chroma_smoothed[:, j]) > 0:
                chroma_smoothed[:, j] = chroma_smoothed[:, j] / np.sum(chroma_smoothed[:, j])
        
        return chroma_smoothed, sr, hop_length
    
    def identify_chords(self, chroma, threshold=0.5, min_duration_frames=5):
        """Identify chords from chroma features using an enhanced algorithm"""
        print("Identifying chords...")
        num_frames = chroma.shape[1]
        chord_sequence = []
        current_chord = None
        current_chord_duration = 0
        
        # Collect chord classification decisions for a sliding window
        window_size = 5  # frames
        chord_buffer = []
        
        for frame in range(num_frames):
            # Get chroma vector for current frame
            chroma_vector = chroma[:, frame]
            
            # Dictionary to store similarity scores for all chord types
            similarities = {}
            
            # Calculate similarity for every chord template
            for chord_name, chord_template in self.CHORD_TEMPLATES.items():
                # Calculate cosine similarity between chroma and chord template
                similarity = np.dot(chroma_vector, chord_template)
                similarities[chord_name] = similarity
            
            # Sort chords by similarity score
            sorted_chords = sorted(similarities.items(), key=lambda x: x[1], reverse=True)
            
            # Get top 3 chord candidates
            top_chords = sorted_chords[:3]
            
            # Check if the best match exceeds the threshold
            if top_chords[0][1] > threshold:
                best_chord = top_chords[0][0]
                
                # Check if the top chord is significantly better than the second best
                if len(top_chords) > 1 and (top_chords[0][1] - top_chords[1][1]) < 0.1:
                    # Chords are too close, need additional context to decide
                    # Prefer simpler chords (fewer notes) in ambiguous cases
                    simpler_chord = self._prefer_simpler_chord([c[0] for c in top_chords[:2]])
                    if simpler_chord:
                        best_chord = simpler_chord
            else:
                best_chord = "N"  # No chord
            
            # Add to sliding window buffer
            chord_buffer.append(best_chord)
            if len(chord_buffer) > window_size:
                chord_buffer.pop(0)
            
            # Use majority voting to smooth out chord detection
            if len(chord_buffer) == window_size:
                from collections import Counter
                chord_counts = Counter(chord_buffer)
                most_common_chord = chord_counts.most_common(1)[0][0]
                
                # If current chord changes or this is the first frame
                if most_common_chord != current_chord:
                    # Add the previous chord to the sequence if it lasted long enough
                    if current_chord is not None and current_chord_duration >= min_duration_frames:
                        chord_sequence.append((current_chord, current_chord_duration))
                    
                    # Start a new chord
                    current_chord = most_common_chord
                    current_chord_duration = 1
                else:
                    # Continue the current chord
                    current_chord_duration += 1
        
        # Process remaining frames in buffer
        if current_chord is not None and current_chord_duration >= min_duration_frames:
            chord_sequence.append((current_chord, current_chord_duration))
        
        return chord_sequence
    
    def _prefer_simpler_chord(self, chord_candidates):
        """Choose the simpler chord from candidates (fewer notes is simpler)"""
        if not chord_candidates:
            return None
        
        # Count the number of notes in each chord type
        chord_complexity = {}
        for chord in chord_candidates:
            root, chord_type = chord.split(':')
            
            # Complexity ranking (lower is simpler)
            complexity_map = {
                'maj': 1,  # Major triad (simplest)
                'min': 1,  # Minor triad (equally simple)
                'sus2': 2,
                'sus4': 2,
                'dim': 2,
                'aug': 2,
                '7': 3,
                'maj7': 3,
                'min7': 3,
                'maj6': 3,
                'min6': 3,
                'dim7': 4,
                'hdim7': 4,
                'minmaj7': 4,
                'aug7': 4,
                'add9': 4,
                '9': 5,
                'maj9': 5,
                'min9': 5,
                '7sus4': 4,
                '11': 6,   # Most complex
                'maj11': 6,
                'min11': 6
            }
            
            complexity = complexity_map.get(chord_type, 10)  # Default to high complexity if unknown
            chord_complexity[chord] = complexity
        
        # Return the chord with the lowest complexity
        return min(chord_complexity, key=chord_complexity.get)
    
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
        
        # Count chord transitions
        transitions = {}
        for i in range(len(simplified_sequence) - 1):
            current = simplified_sequence[i]['chord']
            next_chord = simplified_sequence[i + 1]['chord']
            
            if current not in transitions:
                transitions[current] = {}
            
            if next_chord not in transitions[current]:
                transitions[current][next_chord] = 0
            
            transitions[current][next_chord] += 1
        
        # Create a Markov chain of chord transitions
        total_transitions = {}
        for source, targets in transitions.items():
            total = sum(targets.values())
            total_transitions[source] = total
            for target in targets:
                transitions[source][target] /= total
        
        # Find common chord progressions of different lengths (2, 4, and 8 chords)
        progression_lengths = [2, 4, 8]
        all_progressions = []
        
        for length in progression_lengths:
            if len(simplified_sequence) <= length:
                continue
                
            # Find chord patterns of the current length
            chord_patterns = {}
            for i in range(len(simplified_sequence) - (length - 1)):
                pattern = tuple(simplified_sequence[j]['chord'] for j in range(i, i + length))
                
                # Skip patterns with "N" (no chord)
                if "N" in pattern:
                    continue
                    
                if pattern not in chord_patterns:
                    chord_patterns[pattern] = 0
                
                chord_patterns[pattern] += 1
            
            # Analyze found patterns
            for pattern, count in chord_patterns.items():
                if count >= max(2, int(len(simplified_sequence) / (length * 4))):  # Adjust threshold based on length
                    # Calculate average duration
                    avg_duration = 0
                    for chord in pattern:
                        for chord_info in simplified_sequence:
                            if chord_info['chord'] == chord:
                                avg_duration += chord_info['duration']
                                break
                    avg_duration /= length
                    
                    # Detect musical function - Check for common patterns
                    function = self._analyze_chord_function(pattern)
                    
                    all_progressions.append({
                        'progression': pattern,
                        'count': count,
                        'length': length,
                        'avg_duration': avg_duration,
                        'function': function
                    })
        
        # Sort patterns first by count, then by length (preferring shorter patterns)
        sorted_progressions = sorted(all_progressions, key=lambda x: (x['count'], -x['length']), reverse=True)
        
        # Return the top progressions (max 8)
        return sorted_progressions[:8]
    
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
        """Estimate the musical key based on chord distribution and chroma data"""
        print("Estimating musical key...")
        
        # Krumhansl-Schmuckler key-finding algorithm using chroma features
        # Major and minor key profiles (Krumhansl & Kessler, 1982)
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        
        # Normalize profiles
        major_profile = major_profile / np.sum(major_profile)
        minor_profile = minor_profile / np.sum(minor_profile)
        
        # Aggregate chroma features across time
        chroma_sum = np.sum(chroma, axis=1)
        chroma_norm = chroma_sum / np.sum(chroma_sum)
        
        # Calculate correlation with each possible key
        key_scores = {}
        
        # Test all 12 major and 12 minor keys
        for i in range(12):  # For each root note
            # Major key correlation
            major_corr = np.corrcoef(np.roll(major_profile, i), chroma_norm)[0, 1]
            # Minor key correlation
            minor_corr = np.corrcoef(np.roll(minor_profile, i), chroma_norm)[0, 1]
            
            # Get note name for this root
            root_notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            major_key = f"{root_notes[i]} Major"
            minor_key = f"{root_notes[i]} Minor"
            
            key_scores[major_key] = major_corr
            key_scores[minor_key] = minor_corr
        
        # Now incorporate chord information to improve key estimation
        chord_weights = {}
        
        # Process all chords to build frequency distribution
        for chord_info in chord_sequence:
            chord = chord_info['chord']
            if chord == "N":  # Skip "no chord"
                continue
                
            if ":" in chord:
                root, chord_type = chord.split(':')
                
                # Calculate weight based on chord duration
                weight = chord_info['duration']
                
                # Determine likely keys for this chord
                likely_keys = []
                
                # Major chords are strong indicators of major keys
                if chord_type in ['maj', 'maj7', 'maj6', 'add9', 'maj9']:
                    # This chord could be I in major key
                    likely_keys.append(f"{root} Major")
                    # Or IV in major key
                    fourth_down = (["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].index(root) - 5) % 12
                    likely_keys.append(f"{['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][fourth_down]} Major")
                    # Or V in major key
                    fifth_down = (["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].index(root) - 7) % 12
                    likely_keys.append(f"{['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][fifth_down]} Major")
                
                # Minor chords are strong indicators of minor keys or relative major
                elif chord_type in ['min', 'min7', 'min6', 'min9']:
                    # This chord could be i in minor key
                    likely_keys.append(f"{root} Minor")
                    # Or ii in major key
                    second_down = (["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].index(root) - 2) % 12
                    likely_keys.append(f"{['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][second_down]} Major")
                    # Or vi in major key
                    sixth_up = (["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].index(root) + 3) % 12
                    likely_keys.append(f"{['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][sixth_up]} Major")
                
                # Dominant 7th chords strongly suggest the key a fifth below
                elif chord_type in ['7', '9', '11', '7sus4']:
                    fifth_down = (["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].index(root) - 7) % 12
                    likely_keys.append(f"{['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][fifth_down]} Major")
                    
                    # Could also be V of relative minor
                    relative_minor = (fifth_down + 9) % 12
                    likely_keys.append(f"{['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][relative_minor]} Minor")
                
                # Diminished chords often function as vii in major or minor keys
                elif chord_type in ['dim', 'dim7', 'hdim7']:
                    semitone_up = (["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].index(root) + 1) % 12
                    likely_keys.append(f"{['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][semitone_up]} Major")
                    likely_keys.append(f"{['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][semitone_up]} Minor")
                
                # Augmented chords are less common but can suggest key centers
                elif chord_type in ['aug', 'aug7']:
                    # Could be in several keys, somewhat ambiguous
                    likely_keys.append(f"{root} Major")
                
                # Add weights to all likely keys
                for key in likely_keys:
                    if key not in chord_weights:
                        chord_weights[key] = 0
                    chord_weights[key] += weight
        
        # Combine key correlation scores with chord-based weights
        final_scores = {}
        for key in key_scores:
            # Normalize and combine both sources of information
            # Key profile correlation is given 60% weight, chord analysis 40%
            profile_score = (key_scores[key] + 1) / 2  # Convert correlation (-1 to 1) to range (0 to 1)
            chord_score = chord_weights.get(key, 0) / (max(chord_weights.values()) if chord_weights else 1)
            
            final_scores[key] = 0.6 * profile_score + 0.4 * chord_score
        
        # Find the key with the highest score
        estimated_key = max(final_scores.items(), key=lambda x: x[1])[0]
        
        return estimated_key
        
    def analyze_youtube_video(self, url, visualize=True):
        """Analyze chord progression from YouTube video"""
        # Download audio from YouTube
        audio_path = self.download_youtube_audio(url)
        if audio_path is None:
            return None
        
        try:
            # Extract chroma features
            chroma, sr, hop_length = self.extract_chroma_features(audio_path)
            
            # Identify chords
            chord_sequence = self.identify_chords(chroma)
            
            # Convert to time-based sequence
            time_chord_sequence = self.convert_frames_to_time(chord_sequence, sr, hop_length)
            
            # Simplify the chord sequence
            simplified_sequence = self.simplify_chord_sequence(time_chord_sequence)
            
            # Estimate the musical key
            key_estimation = self.estimate_key(chroma, simplified_sequence)
            print(f"Estimated key: {key_estimation}")
            
            # Detect chord progressions
            progressions = self.detect_chord_progression(simplified_sequence)
            
            # Visualize if requested
            if visualize:
                self.visualize_chords(chroma, simplified_sequence, sr, hop_length, key_estimation)
            
            # Clean up temporary file
            if os.path.exists(audio_path):
                os.remove(audio_path)
            
            return {
                'chord_sequence': simplified_sequence,
                'progressions': progressions,
                'estimated_key': key_estimation
            }
        
        except Exception as e:
            print(f"Error during analysis: {e}")
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