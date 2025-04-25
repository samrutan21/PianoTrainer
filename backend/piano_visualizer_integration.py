import json
import time
import threading
import websocket
import numpy as np
from typing import Dict, List, Any

class PianoVisualizerIntegration:
    """
    Handles integration with an external piano visualizer application.
    Sends chord data through WebSocket connections and synchronizes playback.
    """
    
    def __init__(self, host="localhost", port=8080):
        """
        Initialize the integration module.
        
        Args:
            host: Hostname of the piano visualizer WebSocket server
            port: Port of the piano visualizer WebSocket server
        """
        self.ws_url = f"ws://{host}:{port}/chords"
        self.ws = None
        self.playback_thread = None
        self.is_playing = False
        self.start_time = 0
        
    def connect(self) -> bool:
        """
        Establish connection to the piano visualizer WebSocket server.
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            print(f"Connecting to piano visualizer at {self.ws_url}...")
            self.ws = websocket.create_connection(self.ws_url)
            print("Connected successfully!")
            return True
        except Exception as e:
            print(f"Connection failed: {e}")
            return False
            
    def disconnect(self):
        """Close the WebSocket connection."""
        if self.ws:
            self.ws.close()
            
    def send_metadata(self, key: str, tempo: float = 120.0):
        """
        Send song metadata to the visualizer.
        
        Args:
            key: Detected musical key
            tempo: Estimated tempo in BPM
        """
        if not self.ws:
            print("Not connected to visualizer. Call connect() first.")
            return
            
        metadata = {
            "type": "metadata",
            "key": key,
            "tempo": tempo
        }
        
        try:
            self.ws.send(json.dumps(metadata))
        except Exception as e:
            print(f"Error sending metadata: {e}")
            
    def send_chord_data(self, chord_sequence: List[Dict[str, Any]]):
        """
        Send the complete chord sequence to the visualizer.
        
        Args:
            chord_sequence: List of chord data dictionaries
        """
        if not self.ws:
            print("Not connected to visualizer. Call connect() first.")
            return
            
        # Convert chord data to the format expected by the visualizer
        formatted_chords = []
        for chord_info in chord_sequence:
            # Parse the chord name into components
            chord_name = chord_info['chord']
            if chord_name == "N":  # Skip "no chord"
                continue
                
            if ":" in chord_name:
                root, chord_type = chord_name.split(":")
            else:
                root, chord_type = chord_name, "maj"
                
            # Convert to MIDI note numbers for the visualizer
            notes = self._chord_to_midi_notes(root, chord_type)
            
            formatted_chords.append({
                "time": chord_info['start_time'],
                "duration": chord_info['duration'],
                "notes": notes,
                "chord": chord_name
            })
        
        chord_data = {
            "type": "chord_sequence",
            "chords": formatted_chords
        }
        
        try:
            self.ws.send(json.dumps(chord_data))
            print(f"Sent {len(formatted_chords)} chords to visualizer")
        except Exception as e:
            print(f"Error sending chord data: {e}")
    
    def _chord_to_midi_notes(self, root: str, chord_type: str) -> List[int]:
        """
        Convert a chord to MIDI note numbers.
        
        Args:
            root: Root note of the chord (e.g., "C", "F#")
            chord_type: Type of chord (e.g., "maj", "min7")
            
        Returns:
            List of MIDI note numbers representing the chord
        """
        # Map root notes to MIDI numbers (C4 = 60)
        root_to_midi = {
            "C": 60, "C#": 61, "D": 62, "D#": 63, "E": 64, 
            "F": 65, "F#": 66, "G": 67, "G#": 68, "A": 69, 
            "A#": 70, "B": 71
        }
        
        # Intervals for different chord types (semitones from root)
        chord_intervals = {
            "maj": [0, 4, 7],                  # Major triad
            "min": [0, 3, 7],                  # Minor triad
            "dim": [0, 3, 6],                  # Diminished triad
            "aug": [0, 4, 8],                  # Augmented triad
            "sus2": [0, 2, 7],                 # Suspended 2nd
            "sus4": [0, 5, 7],                 # Suspended 4th
            "7": [0, 4, 7, 10],                # Dominant 7th
            "maj7": [0, 4, 7, 11],             # Major 7th
            "min7": [0, 3, 7, 10],             # Minor 7th
            "dim7": [0, 3, 6, 9],              # Diminished 7th
            "hdim7": [0, 3, 6, 10],            # Half-diminished 7th
            "minmaj7": [0, 3, 7, 11],          # Minor major 7th
            "aug7": [0, 4, 8, 10],             # Augmented 7th
            "add9": [0, 4, 7, 14],             # Add 9
            "min9": [0, 3, 7, 10, 14],         # Minor 9th
            "maj9": [0, 4, 7, 11, 14],         # Major 9th
            "9": [0, 4, 7, 10, 14],            # Dominant 9th
            "7sus4": [0, 5, 7, 10],            # 7sus4
            "maj6": [0, 4, 7, 9],              # Major 6th
            "min6": [0, 3, 7, 9],              # Minor 6th
        }
        
        # Default to major triad if chord type not recognized
        intervals = chord_intervals.get(chord_type, chord_intervals["maj"])
        
        # Get the root note MIDI number
        root_midi = root_to_midi.get(root, 60)
        
        # Generate MIDI notes for the chord
        return [root_midi + interval for interval in intervals]
    
    def start_playback(self, chord_sequence, audio_offset=0.0):
        """
        Start playback of the chord sequence synchronized with audio.
        
        Args:
            chord_sequence: List of chord data dictionaries
            audio_offset: Time offset to synchronize with audio playback
        """
        if self.playback_thread and self.playback_thread.is_alive():
            self.stop_playback()
            
        self.is_playing = True
        self.playback_thread = threading.Thread(
            target=self._playback_thread_func,
            args=(chord_sequence, audio_offset)
        )
        self.playback_thread.daemon = True
        self.playback_thread.start()
        
    def stop_playback(self):
        """Stop the playback thread."""
        self.is_playing = False
        if self.playback_thread:
            self.playback_thread.join(timeout=1.0)
    
    def _playback_thread_func(self, chord_sequence, audio_offset):
        """
        Thread function that sends chord events synchronized with audio.
        
        Args:
            chord_sequence: List of chord data dictionaries
            audio_offset: Time offset to synchronize with audio playback
        """
        if not self.ws:
            print("Not connected to visualizer. Call connect() first.")
            return
            
        self.start_time = time.time() - audio_offset
        
        # Sort chord sequence by start time
        sorted_chords = sorted(chord_sequence, key=lambda x: x['start_time'])
        
        # Send "playback_started" event
        try:
            start_event = {
                "type": "playback_event",
                "event": "playback_started",
                "time": 0
            }
            self.ws.send(json.dumps(start_event))
        except Exception as e:
            print(f"Error sending playback event: {e}")
            return
            
        # Process each chord at the appropriate time
        for i, chord_info in enumerate(sorted_chords):
            if not self.is_playing:
                break
                
            chord_start_time = chord_info['start_time']
            current_time = time.time() - self.start_time
            
            # Wait until it's time to play this chord
            if chord_start_time > current_time:
                sleep_time = chord_start_time - current_time
                if sleep_time > 0:
                    time.sleep(sleep_time)
            
            # Send the active chord event
            try:
                if chord_info['chord'] != "N":  # Skip "no chord"
                    chord_event = {
                        "type": "playback_event",
                        "event": "chord_active",
                        "chord_index": i,
                        "time": chord_start_time
                    }
                    self.ws.send(json.dumps(chord_event))
            except Exception as e:
                print(f"Error sending chord event: {e}")
                
        # Send "playback_ended" event
        if self.is_playing:
            try:
                end_event = {
                    "type": "playback_event",
                    "event": "playback_ended",
                    "time": sorted_chords[-1]['end_time'] if sorted_chords else 0
                }
                self.ws.send(json.dumps(end_event))
            except Exception as e:
                print(f"Error sending playback event: {e}")
                
        self.is_playing = False


# Example usage:
def export_for_piano_visualizer(chord_sequence, key, output_file=None):
    """
    Export chord sequence data in a format suitable for piano visualizers.
    
    Args:
        chord_sequence: List of chord data dictionaries
        key: Detected musical key
        output_file: Optional file path to save the exported data
    
    Returns:
        Dict containing the formatted data
    """
    # Format data for export
    export_data = {
        "metadata": {
            "key": key,
            "tempo": 120.0  # Default tempo, could be detected
        },
        "chords": []
    }
    
    for chord_info in chord_sequence:
        if chord_info['chord'] == "N":  # Skip "no chord"
            continue
            
        chord_data = {
            "time": chord_info['start_time'],
            "duration": chord_info['duration'],
            "chord": chord_info['chord']
        }
        export_data["chords"].append(chord_data)
    
    # Save to file if requested
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(export_data, f, indent=2)
        print(f"Exported chord data to {output_file}")
        
    return export_data