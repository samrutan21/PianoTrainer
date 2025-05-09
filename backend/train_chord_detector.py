import os
import json
import numpy as np
from chord_detector import ChordProgressionDetector

class TrainingDataCollector:
    def __init__(self):
        self.detector = ChordProgressionDetector()
        self.training_data = []
        self.dataset_path = "training_data.json"
        
    def load_dataset(self):
        """Load existing training dataset"""
        if os.path.exists(self.dataset_path):
            with open(self.dataset_path, 'r') as f:
                self.training_data = json.load(f)
            print(f"Loaded {len(self.training_data)} training samples")
    
    def save_dataset(self):
        """Save training dataset to file"""
        def convert_numpy_to_python(obj):
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, np.float32):
                return float(obj)
            elif isinstance(obj, dict):
                return {k: convert_numpy_to_python(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy_to_python(item) for item in obj]
            return obj

        # Convert numpy types to Python types
        training_data_converted = convert_numpy_to_python(self.training_data)
        
        with open(self.dataset_path, 'w') as f:
            json.dump(training_data_converted, f, indent=2)
        print(f"Saved {len(self.training_data)} training samples")
    
    def add_song(self, audio_path, true_key, true_chords):
        """Add a song to the training dataset"""
        try:
            # Extract features
            chroma, sr, hop_length = self.detector.extract_chroma_features(audio_path)
            if chroma is None:
                return False
            
            # Get detected chords
            detected_chords = self.detector.identify_chords(chroma)
            time_chords = self.detector.convert_frames_to_time(detected_chords, sr, hop_length)
            
            # Calculate features
            features = {
                'chroma_correlation': self.detector._calculate_chroma_correlation(chroma),
                'chord_progression': self.detector._analyze_chord_progressions(time_chords),
                'pitch_class_distribution': self.detector._calculate_pitch_class_distribution(chroma),
                'true_key': true_key,
                'true_chords': true_chords
            }
            
            self.training_data.append(features)
            return True
            
        except Exception as e:
            print(f"Error adding song {audio_path}: {str(e)}")
            return False
    
    def add_youtube_song(self, url, true_key, true_chords):
        """Add a song from YouTube to the training dataset"""
        try:
            # Download audio
            audio_path = self.detector.download_youtube_audio(url)
            if audio_path is None:
                return False
            
            # Add to dataset
            success = self.add_song(audio_path, true_key, true_chords)
            
            # Clean up
            if os.path.exists(audio_path):
                os.remove(audio_path)
            
            return success
            
        except Exception as e:
            print(f"Error adding YouTube song {url}: {str(e)}")
            return False
    
    def train_model(self):
        """Train the chord detector model"""
        if len(self.training_data) < self.detector.training_config['min_training_samples']:
            print(f"Not enough training samples. Need at least {self.detector.training_config['min_training_samples']}")
            return False
        
        # Add all training samples to the detector
        for sample in self.training_data:
            self.detector.training_data['known_songs'].append(sample)
        
        # Train the model
        return self.detector.train_models()

def main():
    collector = TrainingDataCollector()
    
    # Remove existing training data file if it exists
    if os.path.exists(collector.dataset_path):
        os.remove(collector.dataset_path)
        print("Removed existing training data file")
    
    print("Starting fresh training data collection...")
    
    # Example 1: "Shape of You" by Ed Sheeran (C# Minor)
    shape_of_you_chords = [
        # Intro (0:00-0:11)
        {"chord": "C#:min", "start": 0.0, "end": 2.75},
        {"chord": "F#:min", "start": 2.75, "end": 5.5},
        {"chord": "A:maj", "start": 5.5, "end": 8.25},
        {"chord": "B:maj", "start": 8.25, "end": 11.0},
        
        # Verse 1 (0:11-0:33)
        {"chord": "C#:min", "start": 11.0, "end": 13.75},
        {"chord": "F#:min", "start": 13.75, "end": 16.5},
        {"chord": "A:maj", "start": 16.5, "end": 19.25},
        {"chord": "B:maj", "start": 19.25, "end": 22.0},
        {"chord": "C#:min", "start": 22.0, "end": 24.75},
        {"chord": "F#:min", "start": 24.75, "end": 27.5},
        {"chord": "A:maj", "start": 27.5, "end": 30.25},
        {"chord": "B:maj", "start": 30.25, "end": 33.0},
        
        # Pre-Chorus (0:33-0:55)
        {"chord": "C#:min", "start": 33.0, "end": 35.75},
        {"chord": "F#:min", "start": 35.75, "end": 38.5},
        {"chord": "A:maj", "start": 38.5, "end": 41.25},
        {"chord": "B:maj", "start": 41.25, "end": 44.0},
        {"chord": "C#:min", "start": 44.0, "end": 46.75},
        {"chord": "F#:min", "start": 46.75, "end": 49.5},
        {"chord": "A:maj", "start": 49.5, "end": 52.25},
        {"chord": "B:maj", "start": 52.25, "end": 55.0},
        
        # Chorus (0:55-1:18)
        {"chord": "C#:min", "start": 55.0, "end": 57.75},
        {"chord": "F#:min", "start": 57.75, "end": 60.5},
        {"chord": "A:maj", "start": 60.5, "end": 63.25},
        {"chord": "B:maj", "start": 63.25, "end": 66.0},
        {"chord": "C#:min", "start": 66.0, "end": 68.75},
        {"chord": "F#:min", "start": 68.75, "end": 71.5},
        {"chord": "A:maj", "start": 71.5, "end": 74.25},
        {"chord": "B:maj", "start": 74.25, "end": 77.0},
        
        # Verse 2 (1:18-1:40)
        {"chord": "C#:min", "start": 77.0, "end": 79.75},
        {"chord": "F#:min", "start": 79.75, "end": 82.5},
        {"chord": "A:maj", "start": 82.5, "end": 85.25},
        {"chord": "B:maj", "start": 85.25, "end": 88.0},
        {"chord": "C#:min", "start": 88.0, "end": 90.75},
        {"chord": "F#:min", "start": 90.75, "end": 93.5},
        {"chord": "A:maj", "start": 93.5, "end": 96.25},
        {"chord": "B:maj", "start": 96.25, "end": 99.0},
        
        # Pre-Chorus (1:40-2:02)
        {"chord": "C#:min", "start": 99.0, "end": 101.75},
        {"chord": "F#:min", "start": 101.75, "end": 104.5},
        {"chord": "A:maj", "start": 104.5, "end": 107.25},
        {"chord": "B:maj", "start": 107.25, "end": 110.0},
        {"chord": "C#:min", "start": 110.0, "end": 112.75},
        {"chord": "F#:min", "start": 112.75, "end": 115.5},
        {"chord": "A:maj", "start": 115.5, "end": 118.25},
        {"chord": "B:maj", "start": 118.25, "end": 121.0},
        
        # Chorus (2:02-2:24)
        {"chord": "C#:min", "start": 121.0, "end": 123.75},
        {"chord": "F#:min", "start": 123.75, "end": 126.5},
        {"chord": "A:maj", "start": 126.5, "end": 129.25},
        {"chord": "B:maj", "start": 129.25, "end": 132.0},
        {"chord": "C#:min", "start": 132.0, "end": 134.75},
        {"chord": "F#:min", "start": 134.75, "end": 137.5},
        {"chord": "A:maj", "start": 137.5, "end": 140.25},
        {"chord": "B:maj", "start": 140.25, "end": 143.0},
        
        # Bridge (2:24-2:46)
        {"chord": "C#:min", "start": 143.0, "end": 145.75},
        {"chord": "F#:min", "start": 145.75, "end": 148.5},
        {"chord": "A:maj", "start": 148.5, "end": 151.25},
        {"chord": "B:maj", "start": 151.25, "end": 154.0},
        {"chord": "C#:min", "start": 154.0, "end": 156.75},
        {"chord": "F#:min", "start": 156.75, "end": 159.5},
        {"chord": "A:maj", "start": 159.5, "end": 162.25},
        {"chord": "B:maj", "start": 162.25, "end": 165.0},
        
        # Final Chorus (2:46-3:44)
        {"chord": "C#:min", "start": 165.0, "end": 167.75},
        {"chord": "F#:min", "start": 167.75, "end": 170.5},
        {"chord": "A:maj", "start": 170.5, "end": 173.25},
        {"chord": "B:maj", "start": 173.25, "end": 176.0},
        {"chord": "C#:min", "start": 176.0, "end": 178.75},
        {"chord": "F#:min", "start": 178.75, "end": 181.5},
        {"chord": "A:maj", "start": 181.5, "end": 184.25},
        {"chord": "B:maj", "start": 184.25, "end": 187.0},
        {"chord": "C#:min", "start": 187.0, "end": 189.75},
        {"chord": "F#:min", "start": 189.75, "end": 192.5},
        {"chord": "A:maj", "start": 192.5, "end": 195.25},
        {"chord": "B:maj", "start": 195.25, "end": 198.0},
        {"chord": "C#:min", "start": 198.0, "end": 200.75},
        {"chord": "F#:min", "start": 200.75, "end": 203.5},
        {"chord": "A:maj", "start": 203.5, "end": 206.25},
        {"chord": "B:maj", "start": 206.25, "end": 209.0},
        
        # Outro (3:44-3:55)
        {"chord": "C#:min", "start": 209.0, "end": 211.75},
        {"chord": "F#:min", "start": 211.75, "end": 214.5},
        {"chord": "A:maj", "start": 214.5, "end": 217.25},
        {"chord": "B:maj", "start": 217.25, "end": 220.0},
    ]
    
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=JGwWNGJdvx8",
        "C# Minor",
        shape_of_you_chords
    )
    
    # Example 2: "Someone Like You" by Adele (A Major)
    someone_like_you_chords = [
        # Intro (0:00-0:12)
        {"chord": "A:maj", "start": 0.0, "end": 3.0},
        {"chord": "F#:min", "start": 3.0, "end": 6.0},
        {"chord": "D:maj", "start": 6.0, "end": 9.0},
        {"chord": "E:maj", "start": 9.0, "end": 12.0},
        
        # Verse 1 (0:12-0:48)
        {"chord": "A:maj", "start": 12.0, "end": 15.0},
        {"chord": "F#:min", "start": 15.0, "end": 18.0},
        {"chord": "D:maj", "start": 18.0, "end": 21.0},
        {"chord": "E:maj", "start": 21.0, "end": 24.0},
        {"chord": "A:maj", "start": 24.0, "end": 27.0},
        {"chord": "F#:min", "start": 27.0, "end": 30.0},
        {"chord": "D:maj", "start": 30.0, "end": 33.0},
        {"chord": "E:maj", "start": 33.0, "end": 36.0},
        {"chord": "A:maj", "start": 36.0, "end": 39.0},
        {"chord": "F#:min", "start": 39.0, "end": 42.0},
        {"chord": "D:maj", "start": 42.0, "end": 45.0},
        {"chord": "E:maj", "start": 45.0, "end": 48.0},
        
        # Pre-Chorus (0:48-1:12)
        {"chord": "A:maj", "start": 48.0, "end": 51.0},
        {"chord": "E:maj", "start": 51.0, "end": 54.0},
        {"chord": "F#:min", "start": 54.0, "end": 57.0},
        {"chord": "D:maj", "start": 57.0, "end": 60.0},
        {"chord": "A:maj", "start": 60.0, "end": 63.0},
        {"chord": "E:maj", "start": 63.0, "end": 66.0},
        {"chord": "F#:min", "start": 66.0, "end": 69.0},
        {"chord": "D:maj", "start": 69.0, "end": 72.0},
        
        # Chorus (1:12-1:37)
        {"chord": "A:maj", "start": 72.0, "end": 75.0},
        {"chord": "F#:min", "start": 75.0, "end": 78.0},
        {"chord": "D:maj", "start": 78.0, "end": 81.0},
        {"chord": "E:maj", "start": 81.0, "end": 84.0},
        {"chord": "A:maj", "start": 84.0, "end": 87.0},
        {"chord": "F#:min", "start": 87.0, "end": 90.0},
        {"chord": "D:maj", "start": 90.0, "end": 93.0},
        {"chord": "E:maj", "start": 93.0, "end": 97.0},
        
        # Verse 2 (1:37-2:13)
        {"chord": "A:maj", "start": 97.0, "end": 100.0},
        {"chord": "F#:min", "start": 100.0, "end": 103.0},
        {"chord": "D:maj", "start": 103.0, "end": 106.0},
        {"chord": "E:maj", "start": 106.0, "end": 109.0},
        {"chord": "A:maj", "start": 109.0, "end": 112.0},
        {"chord": "F#:min", "start": 112.0, "end": 115.0},
        {"chord": "D:maj", "start": 115.0, "end": 118.0},
        {"chord": "E:maj", "start": 118.0, "end": 121.0},
        {"chord": "A:maj", "start": 121.0, "end": 124.0},
        {"chord": "F#:min", "start": 124.0, "end": 127.0},
        {"chord": "D:maj", "start": 127.0, "end": 130.0},
        {"chord": "E:maj", "start": 130.0, "end": 133.0},
        
        # Pre-Chorus (2:13-2:38)
        {"chord": "A:maj", "start": 133.0, "end": 136.0},
        {"chord": "E:maj", "start": 136.0, "end": 139.0},
        {"chord": "F#:min", "start": 139.0, "end": 142.0},
        {"chord": "D:maj", "start": 142.0, "end": 145.0},
        {"chord": "A:maj", "start": 145.0, "end": 148.0},
        {"chord": "E:maj", "start": 148.0, "end": 151.0},
        {"chord": "F#:min", "start": 151.0, "end": 154.0},
        {"chord": "D:maj", "start": 154.0, "end": 158.0},
        
        # Chorus (2:38-3:03)
        {"chord": "A:maj", "start": 158.0, "end": 161.0},
        {"chord": "F#:min", "start": 161.0, "end": 164.0},
        {"chord": "D:maj", "start": 164.0, "end": 167.0},
        {"chord": "E:maj", "start": 167.0, "end": 170.0},
        {"chord": "A:maj", "start": 170.0, "end": 173.0},
        {"chord": "F#:min", "start": 173.0, "end": 176.0},
        {"chord": "D:maj", "start": 176.0, "end": 179.0},
        {"chord": "E:maj", "start": 179.0, "end": 183.0},
        
        # Bridge (3:03-3:29)
        {"chord": "F#:min", "start": 183.0, "end": 186.0},
        {"chord": "D:maj", "start": 186.0, "end": 189.0},
        {"chord": "E:maj", "start": 189.0, "end": 192.0},
        {"chord": "A:maj", "start": 192.0, "end": 195.0},
        {"chord": "F#:min", "start": 195.0, "end": 198.0},
        {"chord": "D:maj", "start": 198.0, "end": 201.0},
        {"chord": "E:maj", "start": 201.0, "end": 204.0},
        {"chord": "A:maj", "start": 204.0, "end": 209.0},
        
        # Final Chorus (3:29-4:16)
        {"chord": "A:maj", "start": 209.0, "end": 212.0},
        {"chord": "F#:min", "start": 212.0, "end": 215.0},
        {"chord": "D:maj", "start": 215.0, "end": 218.0},
        {"chord": "E:maj", "start": 218.0, "end": 221.0},
        {"chord": "A:maj", "start": 221.0, "end": 224.0},
        {"chord": "F#:min", "start": 224.0, "end": 227.0},
        {"chord": "D:maj", "start": 227.0, "end": 230.0},
        {"chord": "E:maj", "start": 230.0, "end": 233.0},
        {"chord": "A:maj", "start": 233.0, "end": 236.0},
        {"chord": "F#:min", "start": 236.0, "end": 239.0},
        {"chord": "D:maj", "start": 239.0, "end": 242.0},
        {"chord": "E:maj", "start": 242.0, "end": 245.0},
        {"chord": "A:maj", "start": 245.0, "end": 248.0},
        {"chord": "F#:min", "start": 248.0, "end": 251.0},
        {"chord": "D:maj", "start": 251.0, "end": 254.0},
        {"chord": "E:maj", "start": 254.0, "end": 256.0},
    ]
    
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=hLQl3WQQoQ0",
        "A Major",
        someone_like_you_chords
    )
    
    # Example 3: "Havana" by Camila Cabello (G Minor)
    havana_chords = [
        # Intro (0:00-0:19)
        {"chord": "G:min", "start": 0.0, "end": 4.75},
        {"chord": "Eb:maj", "start": 4.75, "end": 9.5},
        {"chord": "D:min", "start": 9.5, "end": 14.25},
        {"chord": "D:7", "start": 14.25, "end": 19.0},
        
        # Verse 1 (0:19-0:37)
        {"chord": "G:min", "start": 19.0, "end": 23.75},
        {"chord": "Eb:maj", "start": 23.75, "end": 28.5},
        {"chord": "D:min", "start": 28.5, "end": 33.25},
        {"chord": "D:7", "start": 33.25, "end": 37.0},
        
        # Pre-Chorus (0:37-0:55)
        {"chord": "G:min", "start": 37.0, "end": 41.75},
        {"chord": "Eb:maj", "start": 41.75, "end": 46.5},
        {"chord": "D:min", "start": 46.5, "end": 51.25},
        {"chord": "D:7", "start": 51.25, "end": 55.0},
        
        # Chorus (0:55-1:12)
        {"chord": "G:min", "start": 55.0, "end": 59.75},
        {"chord": "Eb:maj", "start": 59.75, "end": 64.5},
        {"chord": "D:min", "start": 64.5, "end": 69.25},
        {"chord": "D:7", "start": 69.25, "end": 73.0},
        
        # Post-Chorus (1:12-1:31)
        {"chord": "G:min", "start": 73.0, "end": 77.75},
        {"chord": "Eb:maj", "start": 77.75, "end": 82.5},
        {"chord": "D:min", "start": 82.5, "end": 87.25},
        {"chord": "D:7", "start": 87.25, "end": 91.0},
        
        # Young Thug Verse (1:31-1:57)
        {"chord": "G:min", "start": 91.0, "end": 95.75},
        {"chord": "Eb:maj", "start": 95.75, "end": 100.5},
        {"chord": "D:min", "start": 100.5, "end": 105.25},
        {"chord": "D:7", "start": 105.25, "end": 110.0},
        {"chord": "G:min", "start": 110.0, "end": 114.75},
        {"chord": "Eb:maj", "start": 114.75, "end": 117.0},
        
        # Verse 2 (1:57-2:16)
        {"chord": "G:min", "start": 117.0, "end": 121.75},
        {"chord": "Eb:maj", "start": 121.75, "end": 126.5},
        {"chord": "D:min", "start": 126.5, "end": 131.25},
        {"chord": "D:7", "start": 131.25, "end": 136.0},
        
        # Pre-Chorus (2:16-2:34)
        {"chord": "G:min", "start": 136.0, "end": 140.75},
        {"chord": "Eb:maj", "start": 140.75, "end": 145.5},
        {"chord": "D:min", "start": 145.5, "end": 150.25},
        {"chord": "D:7", "start": 150.25, "end": 154.0},
        
        # Chorus (2:34-2:52)
        {"chord": "G:min", "start": 154.0, "end": 158.75},
        {"chord": "Eb:maj", "start": 158.75, "end": 163.5},
        {"chord": "D:min", "start": 163.5, "end": 168.25},
        {"chord": "D:7", "start": 168.25, "end": 172.0},
        
        # Post-Chorus/Outro (2:52-3:37)
        {"chord": "G:min", "start": 172.0, "end": 176.75},
        {"chord": "Eb:maj", "start": 176.75, "end": 181.5},
        {"chord": "D:min", "start": 181.5, "end": 186.25},
        {"chord": "D:7", "start": 186.25, "end": 191.0},
        {"chord": "G:min", "start": 191.0, "end": 195.75},
        {"chord": "Eb:maj", "start": 195.75, "end": 200.5},
        {"chord": "D:min", "start": 200.5, "end": 205.25},
        {"chord": "D:7", "start": 205.25, "end": 210.0},
        {"chord": "G:min", "start": 210.0, "end": 217.0},
    ]
    
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=BQ0mxQXmLsk",
        "G Minor",
        havana_chords
    )
    
    # Example 4: "Perfect" by Ed Sheeran (Ab Major)
    perfect_chords = [
        # Intro (0:00-0:10)
        {"chord": "Ab:maj", "start": 0.0, "end": 2.5},
        {"chord": "Fm:min", "start": 2.5, "end": 5.0},
        {"chord": "Db:maj", "start": 5.0, "end": 7.5},
        {"chord": "Eb:maj", "start": 7.5, "end": 10.0},
        
        # Verse 1 (0:10-0:39)
        {"chord": "Ab:maj", "start": 10.0, "end": 12.5},
        {"chord": "Fm:min", "start": 12.5, "end": 15.0},
        {"chord": "Db:maj", "start": 15.0, "end": 17.5},
        {"chord": "Eb:maj", "start": 17.5, "end": 20.0},
        {"chord": "Ab:maj", "start": 20.0, "end": 22.5},
        {"chord": "Fm:min", "start": 22.5, "end": 25.0},
        {"chord": "Db:maj", "start": 25.0, "end": 27.5},
        {"chord": "Eb:maj", "start": 27.5, "end": 30.0},
        {"chord": "Ab:maj", "start": 30.0, "end": 32.5},
        {"chord": "Fm:min", "start": 32.5, "end": 35.0},
        {"chord": "Db:maj", "start": 35.0, "end": 37.5},
        {"chord": "Eb:maj", "start": 37.5, "end": 39.0},
        
        # Pre-Chorus (0:39-0:59)
        {"chord": "Ab:maj", "start": 39.0, "end": 41.5},
        {"chord": "Fm:min", "start": 41.5, "end": 44.0},
        {"chord": "Db:maj", "start": 44.0, "end": 46.5},
        {"chord": "Eb:maj", "start": 46.5, "end": 49.0},
        {"chord": "Ab:maj", "start": 49.0, "end": 51.5},
        {"chord": "Fm:min", "start": 51.5, "end": 54.0},
        {"chord": "Db:maj", "start": 54.0, "end": 56.5},
        {"chord": "Eb:maj", "start": 56.5, "end": 59.0},
        
        # Chorus (0:59-1:18)
        {"chord": "Ab:maj", "start": 59.0, "end": 61.5},
        {"chord": "Fm:min", "start": 61.5, "end": 64.0},
        {"chord": "Db:maj", "start": 64.0, "end": 66.5},
        {"chord": "Eb:maj", "start": 66.5, "end": 69.0},
        {"chord": "Ab:maj", "start": 69.0, "end": 71.5},
        {"chord": "Fm:min", "start": 71.5, "end": 74.0},
        {"chord": "Db:maj", "start": 74.0, "end": 76.5},
        {"chord": "Eb:maj", "start": 76.5, "end": 78.0},
        
        # Verse 2 (1:18-1:48)
        {"chord": "Ab:maj", "start": 78.0, "end": 80.5},
        {"chord": "Fm:min", "start": 80.5, "end": 83.0},
        {"chord": "Db:maj", "start": 83.0, "end": 85.5},
        {"chord": "Eb:maj", "start": 85.5, "end": 88.0},
        {"chord": "Ab:maj", "start": 88.0, "end": 90.5},
        {"chord": "Fm:min", "start": 90.5, "end": 93.0},
        {"chord": "Db:maj", "start": 93.0, "end": 95.5},
        {"chord": "Eb:maj", "start": 95.5, "end": 98.0},
        {"chord": "Ab:maj", "start": 98.0, "end": 100.5},
        {"chord": "Fm:min", "start": 100.5, "end": 103.0},
        {"chord": "Db:maj", "start": 103.0, "end": 105.5},
        {"chord": "Eb:maj", "start": 105.5, "end": 108.0},
        
        # Pre-Chorus (1:48-2:07)
        {"chord": "Ab:maj", "start": 108.0, "end": 110.5},
        {"chord": "Fm:min", "start": 110.5, "end": 113.0},
        {"chord": "Db:maj", "start": 113.0, "end": 115.5},
        {"chord": "Eb:maj", "start": 115.5, "end": 118.0},
        {"chord": "Ab:maj", "start": 118.0, "end": 120.5},
        {"chord": "Fm:min", "start": 120.5, "end": 123.0},
        {"chord": "Db:maj", "start": 123.0, "end": 125.5},
        {"chord": "Eb:maj", "start": 125.5, "end": 127.0},
        
        # Chorus (2:07-2:27)
        {"chord": "Ab:maj", "start": 127.0, "end": 129.5},
        {"chord": "Fm:min", "start": 129.5, "end": 132.0},
        {"chord": "Db:maj", "start": 132.0, "end": 134.5},
        {"chord": "Eb:maj", "start": 134.5, "end": 137.0},
        {"chord": "Ab:maj", "start": 137.0, "end": 139.5},
        {"chord": "Fm:min", "start": 139.5, "end": 142.0},
        {"chord": "Db:maj", "start": 142.0, "end": 144.5},
        {"chord": "Eb:maj", "start": 144.5, "end": 147.0},
        
        # Bridge (2:27-2:56)
        {"chord": "Db:maj", "start": 147.0, "end": 149.5},
        {"chord": "Bbm:min", "start": 149.5, "end": 152.0},
        {"chord": "Eb:maj", "start": 152.0, "end": 154.5},
        {"chord": "Ab:maj", "start": 154.5, "end": 157.0},
        {"chord": "Db:maj", "start": 157.0, "end": 159.5},
        {"chord": "Bbm:min", "start": 159.5, "end": 162.0},
        {"chord": "Eb:maj", "start": 162.0, "end": 164.5},
        {"chord": "Eb:maj", "start": 164.5, "end": 167.0},
        {"chord": "Fm:min", "start": 167.0, "end": 169.5},
        {"chord": "Db:maj", "start": 169.5, "end": 172.0},
        {"chord": "Eb:maj", "start": 172.0, "end": 174.5},
        {"chord": "Ab:maj", "start": 174.5, "end": 176.0},
        
        # Final Chorus (2:56-4:23)
        {"chord": "Ab:maj", "start": 176.0, "end": 178.5},
        {"chord": "Fm:min", "start": 178.5, "end": 181.0},
        {"chord": "Db:maj", "start": 181.0, "end": 183.5},
        {"chord": "Eb:maj", "start": 183.5, "end": 186.0},
        {"chord": "Ab:maj", "start": 186.0, "end": 188.5},
        {"chord": "Fm:min", "start": 188.5, "end": 191.0},
        {"chord": "Db:maj", "start": 191.0, "end": 193.5},
        {"chord": "Eb:maj", "start": 193.5, "end": 196.0},
        {"chord": "Ab:maj", "start": 196.0, "end": 198.5},
        {"chord": "Fm:min", "start": 198.5, "end": 201.0},
        {"chord": "Db:maj", "start": 201.0, "end": 203.5},
        {"chord": "Eb:maj", "start": 203.5, "end": 206.0},
        {"chord": "Ab:maj", "start": 206.0, "end": 208.5},
        {"chord": "Fm:min", "start": 208.5, "end": 211.0},
        {"chord": "Db:maj", "start": 211.0, "end": 213.5},
        {"chord": "Eb:maj", "start": 213.5, "end": 216.0},
        {"chord": "Ab:maj", "start": 216.0, "end": 218.5},
        {"chord": "Fm:min", "start": 218.5, "end": 221.0},
        {"chord": "Db:maj", "start": 221.0, "end": 223.5},
        {"chord": "Eb:maj", "start": 223.5, "end": 226.0},
        {"chord": "Ab:maj", "start": 226.0, "end": 228.5},
        {"chord": "Fm:min", "start": 228.5, "end": 231.0},
        {"chord": "Db:maj", "start": 231.0, "end": 233.5},
        {"chord": "Eb:maj", "start": 233.5, "end": 236.0},
        {"chord": "Ab:maj", "start": 236.0, "end": 238.5},
        {"chord": "Fm:min", "start": 238.5, "end": 241.0},
        {"chord": "Db:maj", "start": 241.0, "end": 243.5},
        {"chord": "Eb:maj", "start": 243.5, "end": 246.0},
        {"chord": "Ab:maj", "start": 246.0, "end": 248.5},
        {"chord": "Fm:min", "start": 248.5, "end": 251.0},
        {"chord": "Db:maj", "start": 251.0, "end": 253.5},
        {"chord": "Eb:maj", "start": 253.5, "end": 256.0},
        {"chord": "Ab:maj", "start": 256.0, "end": 263.0},
    ]
    
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=2Vv-BfVoq4g",
        "Ab Major",
        perfect_chords
    )
    
    # Example 5: "Bad Guy" by Billie Eilish (G Minor)
    bad_guy_chords = [
        # Intro (0:00-0:14)
        {"chord": "Gm:min", "start": 0.0, "end": 3.5},
        {"chord": "Cm:min", "start": 3.5, "end": 7.0},
        {"chord": "D#:maj", "start": 7.0, "end": 10.5},
        {"chord": "Gm:min", "start": 10.5, "end": 14.0},
        
        # Verse 1 (0:14-0:28)
        {"chord": "Gm:min", "start": 14.0, "end": 17.5},
        {"chord": "Cm:min", "start": 17.5, "end": 21.0},
        {"chord": "D#:maj", "start": 21.0, "end": 24.5},
        {"chord": "Gm:min", "start": 24.5, "end": 28.0},
        
        # Verse 2 (0:28-0:42)
        {"chord": "Gm:min", "start": 28.0, "end": 31.5},
        {"chord": "Cm:min", "start": 31.5, "end": 35.0},
        {"chord": "D#:maj", "start": 35.0, "end": 38.5},
        {"chord": "Gm:min", "start": 38.5, "end": 42.0},
        
        # Chorus (0:42-0:56)
        {"chord": "Gm:min", "start": 42.0, "end": 45.5},
        {"chord": "Cm:min", "start": 45.5, "end": 49.0},
        {"chord": "D#:maj", "start": 49.0, "end": 52.5},
        {"chord": "Gm:min", "start": 52.5, "end": 56.0},
        
        # Post-Chorus (0:56-1:09)
        {"chord": "Gm:min", "start": 56.0, "end": 59.5},
        {"chord": "Cm:min", "start": 59.5, "end": 63.0},
        {"chord": "D#:maj", "start": 63.0, "end": 66.5},
        {"chord": "Gm:min", "start": 66.5, "end": 69.0},
        
        # Verse 3 (1:09-1:23)
        {"chord": "Gm:min", "start": 69.0, "end": 72.5},
        {"chord": "Cm:min", "start": 72.5, "end": 76.0},
        {"chord": "D#:maj", "start": 76.0, "end": 79.5},
        {"chord": "Gm:min", "start": 79.5, "end": 83.0},
        
        # Verse 4 (1:23-1:37)
        {"chord": "Gm:min", "start": 83.0, "end": 86.5},
        {"chord": "Cm:min", "start": 86.5, "end": 90.0},
        {"chord": "D#:maj", "start": 90.0, "end": 93.5},
        {"chord": "Gm:min", "start": 93.5, "end": 97.0},
        
        # Chorus (1:37-1:51)
        {"chord": "Gm:min", "start": 97.0, "end": 100.5},
        {"chord": "Cm:min", "start": 100.5, "end": 104.0},
        {"chord": "D#:maj", "start": 104.0, "end": 107.5},
        {"chord": "Gm:min", "start": 107.5, "end": 111.0},
        
        # Post-Chorus (1:51-2:05)
        {"chord": "Gm:min", "start": 111.0, "end": 114.5},
        {"chord": "Cm:min", "start": 114.5, "end": 118.0},
        {"chord": "D#:maj", "start": 118.0, "end": 121.5},
        {"chord": "Gm:min", "start": 121.5, "end": 125.0},
        
        # Bridge (2:05-2:32)
        {"chord": "Gm:min", "start": 125.0, "end": 128.5},
        {"chord": "Cm:min", "start": 128.5, "end": 132.0},
        {"chord": "D#:maj", "start": 132.0, "end": 135.5},
        {"chord": "Gm:min", "start": 135.5, "end": 139.0},
        {"chord": "Gm:min", "start": 139.0, "end": 142.5},
        {"chord": "Cm:min", "start": 142.5, "end": 146.0},
        {"chord": "D#:maj", "start": 146.0, "end": 149.5},
        {"chord": "Gm:min", "start": 149.5, "end": 152.0},
        
        # Outro (2:32-3:14)
        {"chord": "Gm:min", "start": 152.0, "end": 155.5},
        {"chord": "Cm:min", "start": 155.5, "end": 159.0},
        {"chord": "D#:maj", "start": 159.0, "end": 162.5},
        {"chord": "Gm:min", "start": 162.5, "end": 166.0},
        {"chord": "Gm:min", "start": 166.0, "end": 169.5},
        {"chord": "Cm:min", "start": 169.5, "end": 173.0},
        {"chord": "D#:maj", "start": 173.0, "end": 176.5},
        {"chord": "Gm:min", "start": 176.5, "end": 180.0},
        {"chord": "Gm:min", "start": 180.0, "end": 183.5},
        {"chord": "Cm:min", "start": 183.5, "end": 187.0},
        {"chord": "D#:maj", "start": 187.0, "end": 190.5},
        {"chord": "Gm:min", "start": 190.5, "end": 194.0},
    ]
    
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=DyDfgMOUjCI",
        "G Minor",
        bad_guy_chords
    )
    
    # Example 6: "Happy" by Pharrell Williams (F Minor)
    happy_chords = [
        # Intro (0:00-0:08)
        {"chord": "F:min", "start": 0.0, "end": 2.0},
        {"chord": "Eb:maj", "start": 2.0, "end": 4.0},
        {"chord": "Ab:maj", "start": 4.0, "end": 6.0},
        {"chord": "Bb:maj", "start": 6.0, "end": 8.0},
        
        # Verse 1 (0:08-0:25)
        {"chord": "F:min", "start": 8.0, "end": 10.0},
        {"chord": "Eb:maj", "start": 10.0, "end": 12.0},
        {"chord": "Ab:maj", "start": 12.0, "end": 14.0},
        {"chord": "Bb:maj", "start": 14.0, "end": 16.0},
        {"chord": "F:min", "start": 16.0, "end": 18.0},
        {"chord": "Eb:maj", "start": 18.0, "end": 20.0},
        {"chord": "Ab:maj", "start": 20.0, "end": 22.0},
        {"chord": "Bb:maj", "start": 22.0, "end": 25.0},
        
        # Pre-Chorus (0:25-0:41)
        {"chord": "F:min", "start": 25.0, "end": 27.0},
        {"chord": "Eb:maj", "start": 27.0, "end": 29.0},
        {"chord": "Ab:maj", "start": 29.0, "end": 31.0},
        {"chord": "Bb:maj", "start": 31.0, "end": 33.0},
        {"chord": "F:min", "start": 33.0, "end": 35.0},
        {"chord": "Eb:maj", "start": 35.0, "end": 37.0},
        {"chord": "Ab:maj", "start": 37.0, "end": 39.0},
        {"chord": "Bb:maj", "start": 39.0, "end": 41.0},
        
        # Chorus (0:41-0:57)
        {"chord": "F:min", "start": 41.0, "end": 43.0},
        {"chord": "Eb:maj", "start": 43.0, "end": 45.0},
        {"chord": "Ab:maj", "start": 45.0, "end": 47.0},
        {"chord": "Bb:maj", "start": 47.0, "end": 49.0},
        {"chord": "F:min", "start": 49.0, "end": 51.0},
        {"chord": "Eb:maj", "start": 51.0, "end": 53.0},
        {"chord": "Ab:maj", "start": 53.0, "end": 55.0},
        {"chord": "Bb:maj", "start": 55.0, "end": 57.0},
        
        # Verse 2 (0:57-1:14)
        {"chord": "F:min", "start": 57.0, "end": 59.0},
        {"chord": "Eb:maj", "start": 59.0, "end": 61.0},
        {"chord": "Ab:maj", "start": 61.0, "end": 63.0},
        {"chord": "Bb:maj", "start": 63.0, "end": 65.0},
        {"chord": "F:min", "start": 65.0, "end": 67.0},
        {"chord": "Eb:maj", "start": 67.0, "end": 69.0},
        {"chord": "Ab:maj", "start": 69.0, "end": 71.0},
        {"chord": "Bb:maj", "start": 71.0, "end": 74.0},
        
        # Pre-Chorus (1:14-1:30)
        {"chord": "F:min", "start": 74.0, "end": 76.0},
        {"chord": "Eb:maj", "start": 76.0, "end": 78.0},
        {"chord": "Ab:maj", "start": 78.0, "end": 80.0},
        {"chord": "Bb:maj", "start": 80.0, "end": 82.0},
        {"chord": "F:min", "start": 82.0, "end": 84.0},
        {"chord": "Eb:maj", "start": 84.0, "end": 86.0},
        {"chord": "Ab:maj", "start": 86.0, "end": 88.0},
        {"chord": "Bb:maj", "start": 88.0, "end": 90.0},
        
        # Chorus (1:30-1:46)
        {"chord": "F:min", "start": 90.0, "end": 92.0},
        {"chord": "Eb:maj", "start": 92.0, "end": 94.0},
        {"chord": "Ab:maj", "start": 94.0, "end": 96.0},
        {"chord": "Bb:maj", "start": 96.0, "end": 98.0},
        {"chord": "F:min", "start": 98.0, "end": 100.0},
        {"chord": "Eb:maj", "start": 100.0, "end": 102.0},
        {"chord": "Ab:maj", "start": 102.0, "end": 104.0},
        {"chord": "Bb:maj", "start": 104.0, "end": 106.0},
        
        # Bridge (1:46-2:19)
        {"chord": "F:min", "start": 106.0, "end": 108.0},
        {"chord": "Eb:maj", "start": 108.0, "end": 110.0},
        {"chord": "Ab:maj", "start": 110.0, "end": 112.0},
        {"chord": "Bb:maj", "start": 112.0, "end": 114.0},
        {"chord": "F:min", "start": 114.0, "end": 116.0},
        {"chord": "Eb:maj", "start": 116.0, "end": 118.0},
        {"chord": "Ab:maj", "start": 118.0, "end": 120.0},
        {"chord": "Bb:maj", "start": 120.0, "end": 122.0},
        {"chord": "F:min", "start": 122.0, "end": 124.0},
        {"chord": "Eb:maj", "start": 124.0, "end": 126.0},
        {"chord": "Ab:maj", "start": 126.0, "end": 128.0},
        {"chord": "Bb:maj", "start": 128.0, "end": 130.0},
        {"chord": "F:min", "start": 130.0, "end": 132.0},
        {"chord": "Eb:maj", "start": 132.0, "end": 134.0},
        {"chord": "Ab:maj", "start": 134.0, "end": 136.0},
        {"chord": "Bb:maj", "start": 136.0, "end": 139.0},
        
        # Chorus (2:19-2:35)
        {"chord": "F:min", "start": 139.0, "end": 141.0},
        {"chord": "Eb:maj", "start": 141.0, "end": 143.0},
        {"chord": "Ab:maj", "start": 143.0, "end": 145.0},
        {"chord": "Bb:maj", "start": 145.0, "end": 147.0},
        {"chord": "F:min", "start": 147.0, "end": 149.0},
        {"chord": "Eb:maj", "start": 149.0, "end": 151.0},
        {"chord": "Ab:maj", "start": 151.0, "end": 153.0},
        {"chord": "Bb:maj", "start": 153.0, "end": 155.0},
        
        # Outro (2:35-3:53)
        {"chord": "F:min", "start": 155.0, "end": 157.0},
        {"chord": "Eb:maj", "start": 157.0, "end": 159.0},
        {"chord": "Ab:maj", "start": 159.0, "end": 161.0},
        {"chord": "Bb:maj", "start": 161.0, "end": 163.0},
        {"chord": "F:min", "start": 163.0, "end": 165.0},
        {"chord": "Eb:maj", "start": 165.0, "end": 167.0},
        {"chord": "Ab:maj", "start": 167.0, "end": 169.0},
        {"chord": "Bb:maj", "start": 169.0, "end": 171.0},
        {"chord": "F:min", "start": 171.0, "end": 173.0},
        {"chord": "Eb:maj", "start": 173.0, "end": 175.0},
        {"chord": "Ab:maj", "start": 175.0, "end": 177.0},
        {"chord": "Bb:maj", "start": 177.0, "end": 179.0},
        {"chord": "F:min", "start": 179.0, "end": 181.0},
        {"chord": "Eb:maj", "start": 181.0, "end": 183.0},
        {"chord": "Ab:maj", "start": 183.0, "end": 185.0},
        {"chord": "Bb:maj", "start": 185.0, "end": 187.0},
        {"chord": "F:min", "start": 187.0, "end": 189.0},
        {"chord": "Eb:maj", "start": 189.0, "end": 191.0},
        {"chord": "Ab:maj", "start": 191.0, "end": 193.0},
        {"chord": "Bb:maj", "start": 193.0, "end": 195.0},
        {"chord": "F:min", "start": 195.0, "end": 197.0},
        {"chord": "Eb:maj", "start": 197.0, "end": 199.0},
        {"chord": "Ab:maj", "start": 199.0, "end": 201.0},
        {"chord": "Bb:maj", "start": 201.0, "end": 203.0},
        {"chord": "F:min", "start": 203.0, "end": 205.0},
        {"chord": "Eb:maj", "start": 205.0, "end": 207.0},
        {"chord": "Ab:maj", "start": 207.0, "end": 209.0},
        {"chord": "Bb:maj", "start": 209.0, "end": 211.0},
        {"chord": "F:min", "start": 211.0, "end": 213.0},
        {"chord": "Eb:maj", "start": 213.0, "end": 215.0},
        {"chord": "Ab:maj", "start": 215.0, "end": 217.0},
        {"chord": "Bb:maj", "start": 217.0, "end": 219.0},
        {"chord": "F:min", "start": 219.0, "end": 221.0},
        {"chord": "Eb:maj", "start": 221.0, "end": 223.0},
        {"chord": "Ab:maj", "start": 223.0, "end": 225.0},
        {"chord": "Bb:maj", "start": 225.0, "end": 227.0},
        {"chord": "F:min", "start": 227.0, "end": 229.0},
        {"chord": "Eb:maj", "start": 229.0, "end": 231.0},
        {"chord": "Ab:maj", "start": 231.0, "end": 233.0},
        {"chord": "F:min", "start": 233.0, "end": 233.0},
    ]
    
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=ZbZSe6N_BXs",
        "F Minor",
        happy_chords
    )
    
    # Example 7: "Shallow" by Lady Gaga & Bradley Cooper (G Major)
    shallow_chords = [
        # Intro (0:00-0:35)
        {"chord": "Em:min", "start": 0.0, "end": 5.0},
        {"chord": "D:maj", "start": 5.0, "end": 10.0},
        {"chord": "G:maj", "start": 10.0, "end": 15.0},
        {"chord": "C:maj", "start": 15.0, "end": 20.0},
        {"chord": "G:maj", "start": 20.0, "end": 25.0},
        {"chord": "D:maj", "start": 25.0, "end": 30.0},
        {"chord": "Em:min", "start": 30.0, "end": 35.0},
        
        # Verse 1 - Bradley (0:35-0:55)
        {"chord": "Em:min", "start": 35.0, "end": 38.75},
        {"chord": "D:maj", "start": 38.75, "end": 42.5},
        {"chord": "G:maj", "start": 42.5, "end": 46.25},
        {"chord": "C:maj", "start": 46.25, "end": 50.0},
        {"chord": "G:maj", "start": 50.0, "end": 53.75},
        {"chord": "D:maj", "start": 53.75, "end": 55.0},
        
        # Verse 2 - Bradley (0:55-1:15)
        {"chord": "Em:min", "start": 55.0, "end": 58.75},
        {"chord": "D:maj", "start": 58.75, "end": 62.5},
        {"chord": "G:maj", "start": 62.5, "end": 66.25},
        {"chord": "C:maj", "start": 66.25, "end": 70.0},
        {"chord": "G:maj", "start": 70.0, "end": 73.75},
        {"chord": "D:maj", "start": 73.75, "end": 75.0},
        
        # Pre-Chorus - Lady Gaga (1:15-1:37)
        {"chord": "Em:min", "start": 75.0, "end": 78.75},
        {"chord": "D:maj", "start": 78.75, "end": 82.5},
        {"chord": "G:maj", "start": 82.5, "end": 86.25},
        {"chord": "C:maj", "start": 86.25, "end": 90.0},
        {"chord": "G:maj", "start": 90.0, "end": 93.75},
        {"chord": "D:maj", "start": 93.75, "end": 97.0},
        
        # Chorus 1 - Lady Gaga (1:37-2:00)
        {"chord": "Am:min", "start": 97.0, "end": 100.75},
        {"chord": "Em:min", "start": 100.75, "end": 104.5},
        {"chord": "D:maj", "start": 104.5, "end": 108.25},
        {"chord": "G:maj", "start": 108.25, "end": 112.0},
        {"chord": "Am:min", "start": 112.0, "end": 115.75},
        {"chord": "Em:min", "start": 115.75, "end": 120.0},
        
        # Instrumental (2:00-2:19)
        {"chord": "C:maj", "start": 120.0, "end": 123.75},
        {"chord": "G:maj", "start": 123.75, "end": 127.5},
        {"chord": "D:maj", "start": 127.5, "end": 131.25},
        {"chord": "Em:min", "start": 131.25, "end": 135.0},
        {"chord": "Bm:min", "start": 135.0, "end": 139.0},
        
        # Bridge - Both (2:19-2:39)
        {"chord": "C:maj", "start": 139.0, "end": 142.75},
        {"chord": "G:maj", "start": 142.75, "end": 146.5},
        {"chord": "D:maj", "start": 146.5, "end": 150.25},
        {"chord": "Em:min", "start": 150.25, "end": 154.0},
        {"chord": "Bm:min", "start": 154.0, "end": 157.75},
        {"chord": "C:maj", "start": 157.75, "end": 159.0},
        
        # Chorus 2 - Both (2:39-3:02)
        {"chord": "Am:min", "start": 159.0, "end": 162.75},
        {"chord": "Em:min", "start": 162.75, "end": 166.5},
        {"chord": "D:maj", "start": 166.5, "end": 170.25},
        {"chord": "G:maj", "start": 170.25, "end": 174.0},
        {"chord": "Am:min", "start": 174.0, "end": 177.75},
        {"chord": "Em:min", "start": 177.75, "end": 181.5},
        {"chord": "D:maj", "start": 181.5, "end": 182.0},
        
        # Final Chorus - Lady Gaga (3:02-3:36)
        {"chord": "Am:min", "start": 182.0, "end": 185.75},
        {"chord": "Em:min", "start": 185.75, "end": 189.5},
        {"chord": "D:maj", "start": 189.5, "end": 193.25},
        {"chord": "G:maj", "start": 193.25, "end": 197.0},
        {"chord": "Am:min", "start": 197.0, "end": 200.75},
        {"chord": "Em:min", "start": 200.75, "end": 204.5},
        {"chord": "D:maj", "start": 204.5, "end": 208.25},
        {"chord": "G:maj", "start": 208.25, "end": 212.0},
        {"chord": "Am:min", "start": 212.0, "end": 216.0},
        
        # Outro (3:36-3:56)
        {"chord": "Em:min", "start": 216.0, "end": 219.75},
        {"chord": "D:maj", "start": 219.75, "end": 223.5},
        {"chord": "G:maj", "start": 223.5, "end": 227.25},
        {"chord": "C:maj", "start": 227.25, "end": 231.0},
        {"chord": "G:maj", "start": 231.0, "end": 234.75},
        {"chord": "D:maj", "start": 234.75, "end": 236.0},
    ]
    
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=bo_efYhYU2A",
        "G Major",
        shallow_chords
    )
    
    # Example 8: "Don't Start Now" by Dua Lipa (Bb Minor)
    dont_start_now_chords = [
        # Intro (0:00-0:15)
        {"chord": "Bbm:min", "start": 0.0, "end": 3.75},
        {"chord": "Db:maj", "start": 3.75, "end": 7.5},
        {"chord": "Ab:maj", "start": 7.5, "end": 11.25},
        {"chord": "Eb:maj", "start": 11.25, "end": 15.0},
        
        # Verse 1 (0:15-0:35)
        {"chord": "Bbm:min", "start": 15.0, "end": 18.75},
        {"chord": "Db:maj", "start": 18.75, "end": 22.5},
        {"chord": "Ab:maj", "start": 22.5, "end": 26.25},
        {"chord": "Eb:maj", "start": 26.25, "end": 30.0},
        {"chord": "Bbm:min", "start": 30.0, "end": 33.75},
        {"chord": "Db:maj", "start": 33.75, "end": 35.0},
        
        # Pre-Chorus (0:35-0:45)
        {"chord": "Ab:maj", "start": 35.0, "end": 38.75},
        {"chord": "Eb:maj", "start": 38.75, "end": 41.25},
        {"chord": "Gb:maj", "start": 41.25, "end": 45.0},
        
        # Chorus (0:45-1:05)
        {"chord": "Bbm:min", "start": 45.0, "end": 48.75},
        {"chord": "Db:maj", "start": 48.75, "end": 52.5},
        {"chord": "Ab:maj", "start": 52.5, "end": 56.25},
        {"chord": "Eb:maj", "start": 56.25, "end": 60.0},
        {"chord": "Bbm:min", "start": 60.0, "end": 63.75},
        {"chord": "Db:maj", "start": 63.75, "end": 65.0},
        
        # Post-Chorus (1:05-1:15)
        {"chord": "Ab:maj", "start": 65.0, "end": 68.75},
        {"chord": "Eb:maj", "start": 68.75, "end": 72.5},
        {"chord": "Bbm:min", "start": 72.5, "end": 75.0},
        
        # Verse 2 (1:15-1:35)
        {"chord": "Bbm:min", "start": 75.0, "end": 78.75},
        {"chord": "Db:maj", "start": 78.75, "end": 82.5},
        {"chord": "Ab:maj", "start": 82.5, "end": 86.25},
        {"chord": "Eb:maj", "start": 86.25, "end": 90.0},
        {"chord": "Bbm:min", "start": 90.0, "end": 93.75},
        {"chord": "Db:maj", "start": 93.75, "end": 95.0},
        
        # Pre-Chorus (1:35-1:45)
        {"chord": "Ab:maj", "start": 95.0, "end": 98.75},
        {"chord": "Eb:maj", "start": 98.75, "end": 101.25},
        {"chord": "Gb:maj", "start": 101.25, "end": 105.0},
        
        # Chorus (1:45-2:04)
        {"chord": "Bbm:min", "start": 105.0, "end": 108.75},
        {"chord": "Db:maj", "start": 108.75, "end": 112.5},
        {"chord": "Ab:maj", "start": 112.5, "end": 116.25},
        {"chord": "Eb:maj", "start": 116.25, "end": 120.0},
        {"chord": "Bbm:min", "start": 120.0, "end": 123.75},
        {"chord": "Db:maj", "start": 123.75, "end": 124.0},
        
        # Post-Chorus (2:04-2:14)
        {"chord": "Ab:maj", "start": 124.0, "end": 127.75},
        {"chord": "Eb:maj", "start": 127.75, "end": 131.5},
        {"chord": "Bbm:min", "start": 131.5, "end": 134.0},
        
        # Bridge (2:14-2:34)
        {"chord": "Fm:min", "start": 134.0, "end": 137.75},
        {"chord": "Eb:maj", "start": 137.75, "end": 141.5},
        {"chord": "Db:maj", "start": 141.5, "end": 145.25},
        {"chord": "Eb:maj", "start": 145.25, "end": 149.0},
        {"chord": "Fm:min", "start": 149.0, "end": 152.75},
        {"chord": "Eb:maj", "start": 152.75, "end": 154.0},
        
        # Breakdown (2:34-2:43)
        {"chord": "Bbm:min", "start": 154.0, "end": 157.75},
        {"chord": "Db:maj", "start": 157.75, "end": 161.5},
        {"chord": "Ab:maj", "start": 161.5, "end": 163.0},
        
        # Final Chorus (2:43-3:03)
        {"chord": "Bbm:min", "start": 163.0, "end": 166.75},
        {"chord": "Db:maj", "start": 166.75, "end": 170.5},
        {"chord": "Ab:maj", "start": 170.5, "end": 174.25},
        {"chord": "Eb:maj", "start": 174.25, "end": 178.0},
        {"chord": "Bbm:min", "start": 178.0, "end": 181.75},
        {"chord": "Db:maj", "start": 181.75, "end": 183.0},
        
        # Outro (3:03-3:19)
        {"chord": "Ab:maj", "start": 183.0, "end": 186.75},
        {"chord": "Eb:maj", "start": 186.75, "end": 190.5},
        {"chord": "Bbm:min", "start": 190.5, "end": 194.25},
        {"chord": "Db:maj", "start": 194.25, "end": 198.0},
        {"chord": "Bbm:min", "start": 198.0, "end": 199.0},
    ]

    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=oygrmJFKYZY",
        "Bb Minor",
        dont_start_now_chords
    )
    
    # Example 9: "Believer" by Imagine Dragons (Bb Minor)
    believer_chords = [
        # Intro (0:00-0:11)
        {"chord": "Bbm:min", "start": 0.0, "end": 2.75},
        {"chord": "Gb:maj", "start": 2.75, "end": 5.5},
        {"chord": "F:maj", "start": 5.5, "end": 8.25},
        {"chord": "Bbm:min", "start": 8.25, "end": 11.0},
        
        # Verse 1 (0:11-0:32)
        {"chord": "Bbm:min", "start": 11.0, "end": 13.75},
        {"chord": "Gb:maj", "start": 13.75, "end": 16.5},
        {"chord": "F:maj", "start": 16.5, "end": 19.25},
        {"chord": "Bbm:min", "start": 19.25, "end": 22.0},
        {"chord": "Bbm:min", "start": 22.0, "end": 24.75},
        {"chord": "Gb:maj", "start": 24.75, "end": 27.5},
        {"chord": "F:maj", "start": 27.5, "end": 30.25},
        {"chord": "Bbm:min", "start": 30.25, "end": 32.0},
        
        # Pre-Chorus (0:32-0:43)
        {"chord": "Bbm:min", "start": 32.0, "end": 34.75},
        {"chord": "Gb:maj", "start": 34.75, "end": 37.5},
        {"chord": "F:maj", "start": 37.5, "end": 40.25},
        {"chord": "Bbm:min", "start": 40.25, "end": 43.0},
        
        # Chorus (0:43-1:04)
        {"chord": "Bbm:min", "start": 43.0, "end": 45.75},
        {"chord": "Gb:maj", "start": 45.75, "end": 48.5},
        {"chord": "F:maj", "start": 48.5, "end": 51.25},
        {"chord": "Bbm:min", "start": 51.25, "end": 54.0},
        {"chord": "Bbm:min", "start": 54.0, "end": 56.75},
        {"chord": "Gb:maj", "start": 56.75, "end": 59.5},
        {"chord": "F:maj", "start": 59.5, "end": 62.25},
        {"chord": "Bbm:min", "start": 62.25, "end": 64.0},
        
        # Verse 2 (1:04-1:24)
        {"chord": "Bbm:min", "start": 64.0, "end": 66.75},
        {"chord": "Gb:maj", "start": 66.75, "end": 69.5},
        {"chord": "F:maj", "start": 69.5, "end": 72.25},
        {"chord": "Bbm:min", "start": 72.25, "end": 75.0},
        {"chord": "Bbm:min", "start": 75.0, "end": 77.75},
        {"chord": "Gb:maj", "start": 77.75, "end": 80.5},
        {"chord": "F:maj", "start": 80.5, "end": 83.25},
        {"chord": "Bbm:min", "start": 83.25, "end": 84.0},
        
        # Pre-Chorus (1:24-1:35)
        {"chord": "Bbm:min", "start": 84.0, "end": 86.75},
        {"chord": "Gb:maj", "start": 86.75, "end": 89.5},
        {"chord": "F:maj", "start": 89.5, "end": 92.25},
        {"chord": "Bbm:min", "start": 92.25, "end": 95.0},
        
        # Chorus (1:35-1:56)
        {"chord": "Bbm:min", "start": 95.0, "end": 97.75},
        {"chord": "Gb:maj", "start": 97.75, "end": 100.5},
        {"chord": "F:maj", "start": 100.5, "end": 103.25},
        {"chord": "Bbm:min", "start": 103.25, "end": 106.0},
        {"chord": "Bbm:min", "start": 106.0, "end": 108.75},
        {"chord": "Gb:maj", "start": 108.75, "end": 111.5},
        {"chord": "F:maj", "start": 111.5, "end": 114.25},
        {"chord": "Bbm:min", "start": 114.25, "end": 116.0},
        
        # Bridge (1:56-2:17)
        {"chord": "Bbm:min", "start": 116.0, "end": 118.75},
        {"chord": "Gb:maj", "start": 118.75, "end": 121.5},
        {"chord": "F:maj", "start": 121.5, "end": 124.25},
        {"chord": "Bbm:min", "start": 124.25, "end": 127.0},
        {"chord": "Bbm:min", "start": 127.0, "end": 129.75},
        {"chord": "Gb:maj", "start": 129.75, "end": 132.5},
        {"chord": "F:maj", "start": 132.5, "end": 135.25},
        {"chord": "Bbm:min", "start": 135.25, "end": 137.0},
        
        # Final Chorus (2:17-3:23)
        {"chord": "Bbm:min", "start": 137.0, "end": 139.75},
        {"chord": "Gb:maj", "start": 139.75, "end": 142.5},
        {"chord": "F:maj", "start": 142.5, "end": 145.25},
        {"chord": "Bbm:min", "start": 145.25, "end": 148.0},
        {"chord": "Bbm:min", "start": 148.0, "end": 150.75},
        {"chord": "Gb:maj", "start": 150.75, "end": 153.5},
        {"chord": "F:maj", "start": 153.5, "end": 156.25},
        {"chord": "Bbm:min", "start": 156.25, "end": 159.0},
        {"chord": "Bbm:min", "start": 159.0, "end": 161.75},
        {"chord": "Gb:maj", "start": 161.75, "end": 164.5},
        {"chord": "F:maj", "start": 164.5, "end": 167.25},
        {"chord": "Bbm:min", "start": 167.25, "end": 170.0},
        {"chord": "Bbm:min", "start": 170.0, "end": 172.75},
        {"chord": "Gb:maj", "start": 172.75, "end": 175.5},
        {"chord": "F:maj", "start": 175.5, "end": 178.25},
        {"chord": "Bbm:min", "start": 178.25, "end": 181.0},
        {"chord": "Bbm:min", "start": 181.0, "end": 183.75},
        {"chord": "Gb:maj", "start": 183.75, "end": 186.5},
        {"chord": "F:maj", "start": 186.5, "end": 189.25},
        {"chord": "Bbm:min", "start": 189.25, "end": 192.0},
        {"chord": "Bbm:min", "start": 192.0, "end": 194.75},
        {"chord": "Gb:maj", "start": 194.75, "end": 197.5},
        {"chord": "F:maj", "start": 197.5, "end": 200.25},
        {"chord": "Bbm:min", "start": 200.25, "end": 203.0},
    ]

    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=7wtfhZwyrcc",
        "Bb Minor",
        believer_chords
    )
    
    # Example 10: "Dance Monkey" by Tones and I (F# Minor)
    dance_monkey_chords = [
        # Intro (0:00-0:14)
        {"chord": "F#:min", "start": 0.0, "end": 3.5},
        {"chord": "E:maj", "start": 3.5, "end": 7.0},
        {"chord": "D:maj", "start": 7.0, "end": 10.5},
        {"chord": "C#:min", "start": 10.5, "end": 14.0},
        
        # Verse 1 (0:14-0:27)
        {"chord": "F#:min", "start": 14.0, "end": 17.5},
        {"chord": "E:maj", "start": 17.5, "end": 21.0},
        {"chord": "D:maj", "start": 21.0, "end": 24.5},
        {"chord": "C#:min", "start": 24.5, "end": 27.0},
        
        # Verse 2 (0:27-0:41)
        {"chord": "F#:min", "start": 27.0, "end": 30.5},
        {"chord": "E:maj", "start": 30.5, "end": 34.0},
        {"chord": "D:maj", "start": 34.0, "end": 37.5},
        {"chord": "C#:min", "start": 37.5, "end": 41.0},
        
        # Pre-Chorus (0:41-0:55)
        {"chord": "B:maj", "start": 41.0, "end": 44.5},
        {"chord": "C#:min", "start": 44.5, "end": 48.0},
        {"chord": "D:maj", "start": 48.0, "end": 51.5},
        {"chord": "E:maj", "start": 51.5, "end": 55.0},
        
        # Chorus (0:55-1:23)
        {"chord": "F#:min", "start": 55.0, "end": 58.5},
        {"chord": "E:maj", "start": 58.5, "end": 62.0},
        {"chord": "D:maj", "start": 62.0, "end": 65.5},
        {"chord": "C#:min", "start": 65.5, "end": 69.0},
        {"chord": "F#:min", "start": 69.0, "end": 72.5},
        {"chord": "E:maj", "start": 72.5, "end": 76.0},
        {"chord": "D:maj", "start": 76.0, "end": 79.5},
        {"chord": "C#:min", "start": 79.5, "end": 83.0},
        
        # Post-Chorus (1:23-1:37)
        {"chord": "F#:min", "start": 83.0, "end": 86.5},
        {"chord": "E:maj", "start": 86.5, "end": 90.0},
        {"chord": "D:maj", "start": 90.0, "end": 93.5},
        {"chord": "C#:min", "start": 93.5, "end": 97.0},
        
        # Verse 3 (1:37-1:51)
        {"chord": "F#:min", "start": 97.0, "end": 100.5},
        {"chord": "E:maj", "start": 100.5, "end": 104.0},
        {"chord": "D:maj", "start": 104.0, "end": 107.5},
        {"chord": "C#:min", "start": 107.5, "end": 111.0},
        
        # Pre-Chorus (1:51-2:05)
        {"chord": "B:maj", "start": 111.0, "end": 114.5},
        {"chord": "C#:min", "start": 114.5, "end": 118.0},
        {"chord": "D:maj", "start": 118.0, "end": 121.5},
        {"chord": "E:maj", "start": 121.5, "end": 125.0},
        
        # Chorus (2:05-2:33)
        {"chord": "F#:min", "start": 125.0, "end": 128.5},
        {"chord": "E:maj", "start": 128.5, "end": 132.0},
        {"chord": "D:maj", "start": 132.0, "end": 135.5},
        {"chord": "C#:min", "start": 135.5, "end": 139.0},
        {"chord": "F#:min", "start": 139.0, "end": 142.5},
        {"chord": "E:maj", "start": 142.5, "end": 146.0},
        {"chord": "D:maj", "start": 146.0, "end": 149.5},
        {"chord": "C#:min", "start": 149.5, "end": 153.0},
        
        # Post-Chorus (2:33-2:47)
        {"chord": "F#:min", "start": 153.0, "end": 156.5},
        {"chord": "E:maj", "start": 156.5, "end": 160.0},
        {"chord": "D:maj", "start": 160.0, "end": 163.5},
        {"chord": "C#:min", "start": 163.5, "end": 167.0},
        
        # Bridge (2:47-3:01)
        {"chord": "B:maj", "start": 167.0, "end": 170.5},
        {"chord": "C#:min", "start": 170.5, "end": 174.0},
        {"chord": "D:maj", "start": 174.0, "end": 177.5},
        {"chord": "E:maj", "start": 177.5, "end": 181.0},
        
        # Final Chorus (3:01-3:29)
        {"chord": "F#:min", "start": 181.0, "end": 184.5},
        {"chord": "E:maj", "start": 184.5, "end": 188.0},
        {"chord": "D:maj", "start": 188.0, "end": 191.5},
        {"chord": "C#:min", "start": 191.5, "end": 195.0},
        {"chord": "F#:min", "start": 195.0, "end": 198.5},
        {"chord": "E:maj", "start": 198.5, "end": 202.0},
        {"chord": "D:maj", "start": 202.0, "end": 205.5},
        {"chord": "C#:min", "start": 205.5, "end": 209.0},
        
        # Outro (3:29-3:56)
        {"chord": "F#:min", "start": 209.0, "end": 212.5},
        {"chord": "E:maj", "start": 212.5, "end": 216.0},
        {"chord": "D:maj", "start": 216.0, "end": 219.5},
        {"chord": "C#:min", "start": 219.5, "end": 223.0},
        {"chord": "F#:min", "start": 223.0, "end": 226.5},
        {"chord": "E:maj", "start": 226.5, "end": 230.0},
        {"chord": "D:maj", "start": 230.0, "end": 233.5},
        {"chord": "C#:min", "start": 233.5, "end": 236.0},
    ]
    
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=q0hyYWKXF0Q",
        "F# Minor",
        dance_monkey_chords
    )

    # Rock Genre: "Bohemian Rhapsody" by Queen (Bb Major/Eb Major)
    bohemian_rhapsody_chords = [
        # Intro/Ballad Section (0:00-0:48) - Bb Major
        {"chord": "Bb:maj", "start": 0.0, "end": 4.0},
        {"chord": "Gm:min", "start": 4.0, "end": 8.0},
        {"chord": "Cm:min", "start": 8.0, "end": 12.0},
        {"chord": "F:7", "start": 12.0, "end": 16.0},
        {"chord": "Bb:maj", "start": 16.0, "end": 20.0},
        {"chord": "Gm:min", "start": 20.0, "end": 24.0},
        {"chord": "Cm:min", "start": 24.0, "end": 28.0},
        {"chord": "F:7", "start": 28.0, "end": 32.0},
        {"chord": "Bb:maj", "start": 32.0, "end": 36.0},
        {"chord": "Eb:maj", "start": 36.0, "end": 40.0},
        {"chord": "Bb:maj", "start": 40.0, "end": 44.0},
        {"chord": "F:7", "start": 44.0, "end": 48.0},
        
        # First Verse (0:48-1:10)
        {"chord": "Bb:maj", "start": 48.0, "end": 52.0},
        {"chord": "Gm:min", "start": 52.0, "end": 56.0},
        {"chord": "Cm:min", "start": 56.0, "end": 60.0},
        {"chord": "F:7", "start": 60.0, "end": 64.0},
        {"chord": "Bb:maj", "start": 64.0, "end": 66.0},
        {"chord": "Bbm:min", "start": 66.0, "end": 68.0},
        {"chord": "Eb:maj", "start": 68.0, "end": 70.0},
        
        # Pre-Opera Section (1:10-2:35) - Modulating
        {"chord": "Eb:maj", "start": 70.0, "end": 74.0},
        {"chord": "Bb:maj", "start": 74.0, "end": 78.0},
        {"chord": "Cm:min", "start": 78.0, "end": 82.0},
        {"chord": "Ab:maj", "start": 82.0, "end": 86.0},
        {"chord": "Eb:maj", "start": 86.0, "end": 90.0},
        {"chord": "Bb:maj", "start": 90.0, "end": 94.0},
        {"chord": "Ab:maj", "start": 94.0, "end": 98.0},
        {"chord": "Db:maj", "start": 98.0, "end": 102.0},
        {"chord": "Cm:min", "start": 102.0, "end": 106.0},
        {"chord": "Gm:min", "start": 106.0, "end": 110.0},
        {"chord": "Fm:min", "start": 110.0, "end": 114.0},
        {"chord": "Bb:7", "start": 114.0, "end": 118.0},
        {"chord": "Eb:maj", "start": 118.0, "end": 122.0},
        {"chord": "Cm:min", "start": 122.0, "end": 126.0},
        {"chord": "Ab:maj", "start": 126.0, "end": 130.0},
        {"chord": "Eb:maj", "start": 130.0, "end": 134.0},
        {"chord": "Bb:maj", "start": 134.0, "end": 138.0},
        {"chord": "Fm:min", "start": 138.0, "end": 142.0},
        {"chord": "Bb:7", "start": 142.0, "end": 146.0},
        {"chord": "Eb:maj", "start": 146.0, "end": 150.0},
        {"chord": "Ab:maj", "start": 150.0, "end": 155.0},
        
        # Opera Section (2:35-3:03) - Multiple Keys
        {"chord": "A:maj", "start": 155.0, "end": 156.0},
        {"chord": "E:7", "start": 156.0, "end": 157.0},
        {"chord": "A:maj", "start": 157.0, "end": 158.0},
        {"chord": "E:7", "start": 158.0, "end": 159.0},
        {"chord": "F#:min", "start": 159.0, "end": 160.0},
        {"chord": "Bm:min", "start": 160.0, "end": 161.0},
        {"chord": "Dm:min", "start": 161.0, "end": 162.0},
        {"chord": "E:7", "start": 162.0, "end": 163.0},
        {"chord": "A:maj", "start": 163.0, "end": 164.0},
        {"chord": "A:7", "start": 164.0, "end": 165.0},
        {"chord": "D:maj", "start": 165.0, "end": 166.0},
        {"chord": "Gm:min", "start": 166.0, "end": 167.0},
        {"chord": "Bb:maj", "start": 167.0, "end": 168.0},
        {"chord": "Cm:min", "start": 168.0, "end": 169.0},
        {"chord": "F:7", "start": 169.0, "end": 170.0},
        {"chord": "Bb:maj", "start": 170.0, "end": 171.0},
        {"chord": "Bb:7", "start": 171.0, "end": 172.0},
        {"chord": "Eb:maj", "start": 172.0, "end": 173.0},
        {"chord": "Ab:maj", "start": 173.0, "end": 174.0},
        {"chord": "Db:maj", "start": 174.0, "end": 175.0},
        {"chord": "Gb:maj", "start": 175.0, "end": 176.0},
        {"chord": "B:maj", "start": 176.0, "end": 177.0},
        {"chord": "E:maj", "start": 177.0, "end": 178.0},
        {"chord": "A:maj", "start": 178.0, "end": 179.0},
        {"chord": "D:maj", "start": 179.0, "end": 180.0},
        {"chord": "G:maj", "start": 180.0, "end": 181.0},
        {"chord": "C:maj", "start": 181.0, "end": 182.0},
        {"chord": "F:7", "start": 182.0, "end": 183.0},
        
        # Hard Rock Section (3:03-4:07) - Eb Major
        {"chord": "Eb:maj", "start": 183.0, "end": 187.0},
        {"chord": "Bb:maj", "start": 187.0, "end": 191.0},
        {"chord": "Gm:min", "start": 191.0, "end": 195.0},
        {"chord": "Cm:min", "start": 195.0, "end": 199.0},
        {"chord": "Ab:maj", "start": 199.0, "end": 203.0},
        {"chord": "Eb:maj", "start": 203.0, "end": 207.0},
        {"chord": "Bb:maj", "start": 207.0, "end": 211.0},
        {"chord": "Cm:min", "start": 211.0, "end": 215.0},
        {"chord": "Ab:maj", "start": 215.0, "end": 219.0},
        {"chord": "Eb:maj", "start": 219.0, "end": 223.0},
        {"chord": "Bb:maj", "start": 223.0, "end": 227.0},
        {"chord": "Cm:min", "start": 227.0, "end": 231.0},
        {"chord": "Db:maj", "start": 231.0, "end": 235.0},
        {"chord": "Abm:min", "start": 235.0, "end": 239.0},
        {"chord": "Eb:maj", "start": 239.0, "end": 243.0},
        {"chord": "F:7", "start": 243.0, "end": 247.0},
        
        # Outro (4:07-5:55) - Return to Bb Major
        {"chord": "Eb:maj", "start": 247.0, "end": 251.0},
        {"chord": "Bb:maj", "start": 251.0, "end": 255.0},
        {"chord": "Cm:min", "start": 255.0, "end": 259.0},
        {"chord": "Gm:min", "start": 259.0, "end": 263.0},
        {"chord": "Ab:maj", "start": 263.0, "end": 267.0},
        {"chord": "Eb:maj", "start": 267.0, "end": 271.0},
        {"chord": "Cm:min", "start": 271.0, "end": 275.0},
        {"chord": "Fm:min", "start": 275.0, "end": 279.0},
        {"chord": "Bb:7", "start": 279.0, "end": 283.0},
        {"chord": "Eb:maj", "start": 283.0, "end": 287.0},
        {"chord": "Bb:maj", "start": 287.0, "end": 291.0},
        {"chord": "Gm:min", "start": 291.0, "end": 295.0},
        {"chord": "Cm:min", "start": 295.0, "end": 299.0},
        {"chord": "F:7", "start": 299.0, "end": 303.0},
        {"chord": "Bb:maj", "start": 303.0, "end": 307.0},
        {"chord": "F:7", "start": 307.0, "end": 311.0},
        {"chord": "Bb:maj", "start": 311.0, "end": 315.0},
        {"chord": "Bb:maj7", "start": 315.0, "end": 319.0},
        {"chord": "Bb:6", "start": 319.0, "end": 323.0},
        {"chord": "Bb:maj", "start": 323.0, "end": 327.0},
        {"chord": "Eb:maj", "start": 327.0, "end": 331.0},
        {"chord": "F:7", "start": 331.0, "end": 335.0},
        {"chord": "Bb:maj", "start": 335.0, "end": 355.0},
    ]
    
    # Example 11: "Bohemian Rhapsody" by Queen (Bb Major/Eb Major) - Rock
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
        "Bb Major",
        bohemian_rhapsody_chords
    )

# Jazz Genre: "Fly Me to the Moon" by Frank Sinatra (C Major)
    fly_me_to_the_moon_chords = [
        # A Section - First 8 bars (0:00-0:20)
        {"chord": "Am:min7", "start": 0.0, "end": 2.5},
        {"chord": "Dm:min7", "start": 2.5, "end": 5.0},
        {"chord": "G:7", "start": 5.0, "end": 7.5},
        {"chord": "Cmaj:maj7", "start": 7.5, "end": 10.0},
        {"chord": "Fmaj:maj7", "start": 10.0, "end": 12.5},
        {"chord": "Bm:min7b5", "start": 12.5, "end": 15.0},
        {"chord": "E:7", "start": 15.0, "end": 17.5},
        {"chord": "Am:min7", "start": 17.5, "end": 20.0},
        
        # B Section - Second 8 bars (0:20-0:40)
        {"chord": "Dm:min7", "start": 20.0, "end": 22.5},
        {"chord": "G:7", "start": 22.5, "end": 25.0},
        {"chord": "Cmaj:maj7", "start": 25.0, "end": 27.5},
        {"chord": "E:7", "start": 27.5, "end": 30.0},
        {"chord": "A:7", "start": 30.0, "end": 32.5},
        {"chord": "Dm:min7", "start": 32.5, "end": 35.0},
        {"chord": "G:7", "start": 35.0, "end": 37.5},
        {"chord": "Cmaj:maj7", "start": 37.5, "end": 40.0},
        
        # A Section (repeat) - Third 8 bars (0:40-1:00)
        {"chord": "Am:min7", "start": 40.0, "end": 42.5},
        {"chord": "Dm:min7", "start": 42.5, "end": 45.0},
        {"chord": "G:7", "start": 45.0, "end": 47.5},
        {"chord": "Cmaj:maj7", "start": 47.5, "end": 50.0},
        {"chord": "Fmaj:maj7", "start": 50.0, "end": 52.5},
        {"chord": "Bm:min7b5", "start": 52.5, "end": 55.0},
        {"chord": "E:7", "start": 55.0, "end": 57.5},
        {"chord": "Am:min7", "start": 57.5, "end": 60.0},
        
        # C Section - Final 8 bars (1:00-1:20)
        {"chord": "Dm:min7", "start": 60.0, "end": 62.5},
        {"chord": "G:7", "start": 62.5, "end": 65.0},
        {"chord": "Cmaj:maj7", "start": 65.0, "end": 67.5},
        {"chord": "A:7", "start": 67.5, "end": 70.0},
        {"chord": "Dm:min7", "start": 70.0, "end": 72.5},
        {"chord": "G:7", "start": 72.5, "end": 75.0},
        {"chord": "Cmaj:maj7", "start": 75.0, "end": 77.5},
        {"chord": "Cmaj:6/9", "start": 77.5, "end": 80.0},
        
        # Jazz Turnaround (Optional)
        {"chord": "Dm:min7", "start": 80.0, "end": 82.5},
        {"chord": "G:7", "start": 82.5, "end": 85.0},
        {"chord": "Em:min7", "start": 85.0, "end": 87.5},
        {"chord": "A:7", "start": 87.5, "end": 90.0},
        {"chord": "Dm:min7", "start": 90.0, "end": 92.5},
        {"chord": "G:7", "start": 92.5, "end": 95.0},
        {"chord": "Cmaj:maj7", "start": 95.0, "end": 97.5},
        {"chord": "Cmaj:6", "start": 97.5, "end": 100.0},
        
        # Extended Jazz Harmonization
        {"chord": "Am:min9", "start": 100.0, "end": 102.5},
        {"chord": "Dm:min11", "start": 102.5, "end": 105.0},
        {"chord": "G:9", "start": 105.0, "end": 107.5},
        {"chord": "Cmaj:maj9", "start": 107.5, "end": 110.0},
        {"chord": "Fmaj:maj13", "start": 110.0, "end": 112.5},
        {"chord": "Bm:min7b5", "start": 112.5, "end": 115.0},
        {"chord": "E:7b9", "start": 115.0, "end": 117.5},
        {"chord": "Am:min9", "start": 117.5, "end": 120.0},
        
        # Jazz Ending
        {"chord": "Dm:min9", "start": 120.0, "end": 122.5},
        {"chord": "G:13", "start": 122.5, "end": 125.0},
        {"chord": "Cmaj:maj7", "start": 125.0, "end": 127.5},
        {"chord": "Ab:7", "start": 127.5, "end": 130.0},
        {"chord": "Db:maj7", "start": 130.0, "end": 132.5},
        {"chord": "Dm:min7", "start": 132.5, "end": 135.0},
        {"chord": "G:7", "start": 135.0, "end": 137.5},
        {"chord": "Cmaj:6/9", "start": 137.5, "end": 140.0}
    ]

    # Example 12: "Fly Me to the Moon" by Frank Sinatra (C Major) - Jazz
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=ZEcqHA7dbwM",
        "C Major",
        fly_me_to_the_moon_chords
    )

    # Classical Genre: "Clair de Lune" by Claude Debussy (Db Major)
    clair_de_lune_chords = [
        # Introduction (0:00-0:30)
        {"chord": "Db:maj", "start": 0.0, "end": 4.0},
        {"chord": "Bbm:min", "start": 4.0, "end": 8.0},
        {"chord": "Gb:maj", "start": 8.0, "end": 12.0},
        {"chord": "Ab:7", "start": 12.0, "end": 16.0},
        {"chord": "Db:maj", "start": 16.0, "end": 20.0},
        {"chord": "Fm:min", "start": 20.0, "end": 24.0},
        {"chord": "Bbm:min", "start": 24.0, "end": 26.0},
        {"chord": "Eb:min7", "start": 26.0, "end": 28.0},
        {"chord": "Ab:7", "start": 28.0, "end": 30.0},
        
        # First Theme (0:30-1:15)
        {"chord": "Db:maj", "start": 30.0, "end": 33.0},
        {"chord": "Ab:maj", "start": 33.0, "end": 36.0},
        {"chord": "Db:maj", "start": 36.0, "end": 39.0},
        {"chord": "Gb:maj", "start": 39.0, "end": 42.0},
        {"chord": "Db:maj", "start": 42.0, "end": 45.0},
        {"chord": "Bbm:min", "start": 45.0, "end": 48.0},
        {"chord": "Fm:min", "start": 48.0, "end": 51.0},
        {"chord": "Gb:maj", "start": 51.0, "end": 54.0},
        {"chord": "Abm:min", "start": 54.0, "end": 57.0},
        {"chord": "Db:maj", "start": 57.0, "end": 60.0},
        {"chord": "Ab:7", "start": 60.0, "end": 63.0},
        {"chord": "Db:maj", "start": 63.0, "end": 66.0},
        {"chord": "Ab:dim", "start": 66.0, "end": 69.0},
        {"chord": "Db:maj", "start": 69.0, "end": 72.0},
        {"chord": "Bbm:min", "start": 72.0, "end": 75.0},
        
        # Second Theme (1:15-2:30)
        {"chord": "Fb:maj", "start": 75.0, "end": 78.0},
        {"chord": "Db:maj", "start": 78.0, "end": 81.0},
        {"chord": "Gb:maj", "start": 81.0, "end": 84.0},
        {"chord": "Bbm:min", "start": 84.0, "end": 87.0},
        {"chord": "Db:maj", "start": 87.0, "end": 90.0},
        {"chord": "Abm:min", "start": 90.0, "end": 93.0},
        {"chord": "Db:maj7", "start": 93.0, "end": 96.0},
        {"chord": "Gb:maj", "start": 96.0, "end": 99.0},
        {"chord": "B:maj", "start": 99.0, "end": 102.0},
        {"chord": "Bb:dim", "start": 102.0, "end": 105.0},
        {"chord": "Abm:min", "start": 105.0, "end": 108.0},
        {"chord": "Gb:maj", "start": 108.0, "end": 111.0},
        {"chord": "F:dim", "start": 111.0, "end": 114.0},
        {"chord": "Bbm:min", "start": 114.0, "end": 117.0},
        {"chord": "Eb:min7", "start": 117.0, "end": 120.0},
        {"chord": "Ab:maj", "start": 120.0, "end": 123.0},
        {"chord": "Db:maj", "start": 123.0, "end": 126.0},
        {"chord": "Gb:maj", "start": 126.0, "end": 129.0},
        {"chord": "Db:maj", "start": 129.0, "end": 132.0},
        {"chord": "Ab:7", "start": 132.0, "end": 135.0},
        {"chord": "Db:maj", "start": 135.0, "end": 138.0},
        {"chord": "Fm:min", "start": 138.0, "end": 141.0},
        {"chord": "Bbm:min", "start": 141.0, "end": 144.0},
        {"chord": "Eb:min", "start": 144.0, "end": 147.0},
        {"chord": "Ab:maj", "start": 147.0, "end": 150.0},
        
        # Development (2:30-3:45)
        {"chord": "Db:maj", "start": 150.0, "end": 153.0},
        {"chord": "Ab:maj", "start": 153.0, "end": 156.0},
        {"chord": "Db:maj", "start": 156.0, "end": 159.0},
        {"chord": "Gb:maj", "start": 159.0, "end": 162.0},
        {"chord": "Db:maj", "start": 162.0, "end": 165.0},
        {"chord": "Abm:min", "start": 165.0, "end": 168.0},
        {"chord": "B:maj", "start": 168.0, "end": 171.0},
        {"chord": "E:maj", "start": 171.0, "end": 174.0},
        {"chord": "F#:maj", "start": 174.0, "end": 177.0},
        {"chord": "B:maj", "start": 177.0, "end": 180.0},
        {"chord": "F#:maj", "start": 180.0, "end": 183.0},
        {"chord": "B:maj", "start": 183.0, "end": 186.0},
        {"chord": "G#m:min", "start": 186.0, "end": 189.0},
        {"chord": "C#:7", "start": 189.0, "end": 192.0},
        {"chord": "F#:maj", "start": 192.0, "end": 195.0},
        {"chord": "Ebm:min", "start": 195.0, "end": 198.0},
        {"chord": "Bbm:min", "start": 198.0, "end": 201.0},
        {"chord": "Db:maj", "start": 201.0, "end": 204.0},
        {"chord": "Gb:maj", "start": 204.0, "end": 207.0},
        {"chord": "B:maj", "start": 207.0, "end": 210.0},
        {"chord": "Ab:maj", "start": 210.0, "end": 213.0},
        {"chord": "Db:maj", "start": 213.0, "end": 216.0},
        {"chord": "Gb:maj", "start": 216.0, "end": 219.0},
        {"chord": "Fb:maj", "start": 219.0, "end": 222.0},
        {"chord": "Bb:dim", "start": 222.0, "end": 225.0},
        
        # Final Section (3:45-5:00)
        {"chord": "Db:maj", "start": 225.0, "end": 228.0},
        {"chord": "Ab:maj", "start": 228.0, "end": 231.0},
        {"chord": "Db:maj", "start": 231.0, "end": 234.0},
        {"chord": "Gb:maj", "start": 234.0, "end": 237.0},
        {"chord": "Db:maj", "start": 237.0, "end": 240.0},
        {"chord": "Bbm:min", "start": 240.0, "end": 243.0},
        {"chord": "Eb:min7", "start": 243.0, "end": 246.0},
        {"chord": "Ab:7", "start": 246.0, "end": 249.0},
        {"chord": "Db:maj", "start": 249.0, "end": 252.0},
        {"chord": "Abm:min", "start": 252.0, "end": 255.0},
        {"chord": "Db:maj7", "start": 255.0, "end": 258.0},
        {"chord": "Gb:maj", "start": 258.0, "end": 261.0},
        {"chord": "Db:maj/Ab", "start": 261.0, "end": 264.0},
        {"chord": "Eb:min7", "start": 264.0, "end": 267.0},
        {"chord": "Ab:maj7", "start": 267.0, "end": 270.0},
        {"chord": "Db:maj", "start": 270.0, "end": 273.0},
        {"chord": "Gb:maj", "start": 273.0, "end": 276.0},
        {"chord": "Bbm:min", "start": 276.0, "end": 279.0},
        {"chord": "Ab:7", "start": 279.0, "end": 282.0},
        {"chord": "Db:maj", "start": 282.0, "end": 285.0},
        {"chord": "Abm:min", "start": 285.0, "end": 288.0},
        {"chord": "Gb:maj", "start": 288.0, "end": 291.0},
        {"chord": "Db:maj", "start": 291.0, "end": 294.0},
        {"chord": "Ab:7", "start": 294.0, "end": 297.0},
        {"chord": "Db:maj", "start": 297.0, "end": 300.0}
    ]

    # Example 13: "Clair de Lune" by Claude Debussy (Db Major) - Classical
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=CvFH_6DNRCY",
        "Db Major",
        clair_de_lune_chords
    )

    # Country Genre: "Jolene" by Dolly Parton (C# Minor)
    jolene_chords = [
        # Intro (0:00-0:09)
        {"chord": "C#:min", "start": 0.0, "end": 1.5},
        {"chord": "F#:min", "start": 1.5, "end": 3.0},
        {"chord": "A:maj", "start": 3.0, "end": 4.5},
        {"chord": "B:maj", "start": 4.5, "end": 6.0},
        {"chord": "C#:min", "start": 6.0, "end": 7.5},
        {"chord": "B:maj", "start": 7.5, "end": 9.0},
        
        # Verse 1 (0:09-0:26)
        {"chord": "C#:min", "start": 9.0, "end": 10.5},
        {"chord": "F#:min", "start": 10.5, "end": 12.0},
        {"chord": "A:maj", "start": 12.0, "end": 13.5},
        {"chord": "B:maj", "start": 13.5, "end": 15.0},
        {"chord": "C#:min", "start": 15.0, "end": 16.5},
        {"chord": "F#:min", "start": 16.5, "end": 18.0},
        {"chord": "A:maj", "start": 18.0, "end": 19.5},
        {"chord": "B:maj", "start": 19.5, "end": 21.0},
        {"chord": "C#:min", "start": 21.0, "end": 22.5},
        {"chord": "F#:min", "start": 22.5, "end": 24.0},
        {"chord": "A:maj", "start": 24.0, "end": 25.5},
        {"chord": "B:maj", "start": 25.5, "end": 26.0},
        
        # Chorus (0:26-0:43)
        {"chord": "C#:min", "start": 26.0, "end": 27.5},
        {"chord": "A:maj", "start": 27.5, "end": 29.0},
        {"chord": "B:maj", "start": 29.0, "end": 30.5},
        {"chord": "C#:min", "start": 30.5, "end": 32.0},
        {"chord": "C#:min", "start": 32.0, "end": 33.5},
        {"chord": "A:maj", "start": 33.5, "end": 35.0},
        {"chord": "B:maj", "start": 35.0, "end": 36.5},
        {"chord": "C#:min", "start": 36.5, "end": 38.0},
        {"chord": "C#:min", "start": 38.0, "end": 39.5},
        {"chord": "A:maj", "start": 39.5, "end": 41.0},
        {"chord": "B:maj", "start": 41.0, "end": 42.5},
        {"chord": "C#:min", "start": 42.5, "end": 43.0},
        
        # Verse 2 (0:43-1:00)
        {"chord": "C#:min", "start": 43.0, "end": 44.5},
        {"chord": "F#:min", "start": 44.5, "end": 46.0},
        {"chord": "A:maj", "start": 46.0, "end": 47.5},
        {"chord": "B:maj", "start": 47.5, "end": 49.0},
        {"chord": "C#:min", "start": 49.0, "end": 50.5},
        {"chord": "F#:min", "start": 50.5, "end": 52.0},
        {"chord": "A:maj", "start": 52.0, "end": 53.5},
        {"chord": "B:maj", "start": 53.5, "end": 55.0},
        {"chord": "C#:min", "start": 55.0, "end": 56.5},
        {"chord": "F#:min", "start": 56.5, "end": 58.0},
        {"chord": "A:maj", "start": 58.0, "end": 59.5},
        {"chord": "B:maj", "start": 59.5, "end": 60.0},
        
        # Chorus (1:00-1:17)
        {"chord": "C#:min", "start": 60.0, "end": 61.5},
        {"chord": "A:maj", "start": 61.5, "end": 63.0},
        {"chord": "B:maj", "start": 63.0, "end": 64.5},
        {"chord": "C#:min", "start": 64.5, "end": 66.0},
        {"chord": "C#:min", "start": 66.0, "end": 67.5},
        {"chord": "A:maj", "start": 67.5, "end": 69.0},
        {"chord": "B:maj", "start": 69.0, "end": 70.5},
        {"chord": "C#:min", "start": 70.5, "end": 72.0},
        {"chord": "C#:min", "start": 72.0, "end": 73.5},
        {"chord": "A:maj", "start": 73.5, "end": 75.0},
        {"chord": "B:maj", "start": 75.0, "end": 76.5},
        {"chord": "C#:min", "start": 76.5, "end": 77.0},
        
        # Verse 3 (1:17-1:34)
        {"chord": "C#:min", "start": 77.0, "end": 78.5},
        {"chord": "F#:min", "start": 78.5, "end": 80.0},
        {"chord": "A:maj", "start": 80.0, "end": 81.5},
        {"chord": "B:maj", "start": 81.5, "end": 83.0},
        {"chord": "C#:min", "start": 83.0, "end": 84.5},
        {"chord": "F#:min", "start": 84.5, "end": 86.0},
        {"chord": "A:maj", "start": 86.0, "end": 87.5},
        {"chord": "B:maj", "start": 87.5, "end": 89.0},
        {"chord": "C#:min", "start": 89.0, "end": 90.5},
        {"chord": "F#:min", "start": 90.5, "end": 92.0},
        {"chord": "A:maj", "start": 92.0, "end": 93.5},
        {"chord": "B:maj", "start": 93.5, "end": 94.0},
        
        # Chorus (1:34-1:51)
        {"chord": "C#:min", "start": 94.0, "end": 95.5},
        {"chord": "A:maj", "start": 95.5, "end": 97.0},
        {"chord": "B:maj", "start": 97.0, "end": 98.5},
        {"chord": "C#:min", "start": 98.5, "end": 100.0},
        {"chord": "C#:min", "start": 100.0, "end": 101.5},
        {"chord": "A:maj", "start": 101.5, "end": 103.0},
        {"chord": "B:maj", "start": 103.0, "end": 104.5},
        {"chord": "C#:min", "start": 104.5, "end": 106.0},
        {"chord": "C#:min", "start": 106.0, "end": 107.5},
        {"chord": "A:maj", "start": 107.5, "end": 109.0},
        {"chord": "B:maj", "start": 109.0, "end": 110.5},
        {"chord": "C#:min", "start": 110.5, "end": 111.0},
        
        # Verse 4 (1:51-2:08)
        {"chord": "C#:min", "start": 111.0, "end": 112.5},
        {"chord": "F#:min", "start": 112.5, "end": 114.0},
        {"chord": "A:maj", "start": 114.0, "end": 115.5},
        {"chord": "B:maj", "start": 115.5, "end": 117.0},
        {"chord": "C#:min", "start": 117.0, "end": 118.5},
        {"chord": "F#:min", "start": 118.5, "end": 120.0},
        {"chord": "A:maj", "start": 120.0, "end": 121.5},
        {"chord": "B:maj", "start": 121.5, "end": 123.0},
        {"chord": "C#:min", "start": 123.0, "end": 124.5},
        {"chord": "F#:min", "start": 124.5, "end": 126.0},
        {"chord": "A:maj", "start": 126.0, "end": 127.5},
        {"chord": "B:maj", "start": 127.5, "end": 128.0},
        
        # Final Chorus (2:08-2:42)
        {"chord": "C#:min", "start": 128.0, "end": 129.5},
        {"chord": "A:maj", "start": 129.5, "end": 131.0},
        {"chord": "B:maj", "start": 131.0, "end": 132.5},
        {"chord": "C#:min", "start": 132.5, "end": 134.0},
        {"chord": "C#:min", "start": 134.0, "end": 135.5},
        {"chord": "A:maj", "start": 135.5, "end": 137.0},
        {"chord": "B:maj", "start": 137.0, "end": 138.5},
        {"chord": "C#:min", "start": 138.5, "end": 140.0},
        {"chord": "C#:min", "start": 140.0, "end": 141.5},
        {"chord": "A:maj", "start": 141.5, "end": 143.0},
        {"chord": "B:maj", "start": 143.0, "end": 144.5},
        {"chord": "C#:min", "start": 144.5, "end": 146.0},
        {"chord": "C#:min", "start": 146.0, "end": 147.5},
        {"chord": "A:maj", "start": 147.5, "end": 149.0},
        {"chord": "B:maj", "start": 149.0, "end": 150.5},
        {"chord": "C#:min", "start": 150.5, "end": 152.0},
        {"chord": "C#:min", "start": 152.0, "end": 153.5},
        {"chord": "A:maj", "start": 153.5, "end": 155.0},
        {"chord": "B:maj", "start": 155.0, "end": 156.5},
        {"chord": "C#:min", "start": 156.5, "end": 158.0},
        {"chord": "C#:min", "start": 158.0, "end": 159.5},
        {"chord": "F#:min", "start": 159.5, "end": 161.0},
        {"chord": "B:maj", "start": 161.0, "end": 162.5},
        {"chord": "C#:min", "start": 162.5, "end": 162.0}
    ]

    # Example 14: "Jolene" by Dolly Parton (C# Minor) - Country
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=Ixrje2rXLMA",
        "C# Minor",
        jolene_chords
    )

    # Blues Genre: "The Thrill Is Gone" by B.B. King (B Minor)
    thrill_is_gone_chords = [
        # Intro (0:00-0:20)
        {"chord": "Bm:min", "start": 0.0, "end": 2.0},
        {"chord": "Bm:min7", "start": 2.0, "end": 4.0},
        {"chord": "Em:min7", "start": 4.0, "end": 6.0},
        {"chord": "Em:min9", "start": 6.0, "end": 8.0},
        {"chord": "Bm:min", "start": 8.0, "end": 10.0},
        {"chord": "Bm:min7", "start": 10.0, "end": 12.0},
        {"chord": "G:maj7", "start": 12.0, "end": 14.0},
        {"chord": "F#:7", "start": 14.0, "end": 16.0},
        {"chord": "Bm:min", "start": 16.0, "end": 18.0},
        {"chord": "A:7", "start": 18.0, "end": 20.0},
        
        # Verse 1 (0:20-0:39)
        {"chord": "Bm:min", "start": 20.0, "end": 22.0},
        {"chord": "Bm:min7", "start": 22.0, "end": 24.0},
        {"chord": "Em:min7", "start": 24.0, "end": 26.0},
        {"chord": "Em:min9", "start": 26.0, "end": 28.0},
        {"chord": "Bm:min", "start": 28.0, "end": 30.0},
        {"chord": "Bm:min7", "start": 30.0, "end": 32.0},
        {"chord": "G:maj7", "start": 32.0, "end": 34.0},
        {"chord": "F#:7", "start": 34.0, "end": 36.0},
        {"chord": "Bm:min", "start": 36.0, "end": 38.0},
        {"chord": "F#:7", "start": 38.0, "end": 39.0},
        
        # Verse 2 (0:39-0:59)
        {"chord": "Em:min7", "start": 39.0, "end": 41.0},
        {"chord": "Em:min9", "start": 41.0, "end": 43.0},
        {"chord": "Bm:min", "start": 43.0, "end": 45.0},
        {"chord": "Bm:min7", "start": 45.0, "end": 47.0},
        {"chord": "G:maj7", "start": 47.0, "end": 49.0},
        {"chord": "F#:7", "start": 49.0, "end": 51.0},
        {"chord": "Bm:min", "start": 51.0, "end": 53.0},
        {"chord": "A:7", "start": 53.0, "end": 55.0},
        {"chord": "D:maj7", "start": 55.0, "end": 57.0},
        {"chord": "F#:7", "start": 57.0, "end": 59.0},
        
        # Bridge (0:59-1:19)
        {"chord": "Em:min7", "start": 59.0, "end": 61.0},
        {"chord": "A:7", "start": 61.0, "end": 63.0},
        {"chord": "D:maj7", "start": 63.0, "end": 65.0},
        {"chord": "G:maj7", "start": 65.0, "end": 67.0},
        {"chord": "Em:min7", "start": 67.0, "end": 69.0},
        {"chord": "A:7", "start": 69.0, "end": 71.0},
        {"chord": "D:maj7", "start": 71.0, "end": 73.0},
        {"chord": "F#:7", "start": 73.0, "end": 75.0},
        {"chord": "Bm:min", "start": 75.0, "end": 77.0},
        {"chord": "F#:7", "start": 77.0, "end": 79.0},
        
        # Verse 3 (1:19-1:38)
        {"chord": "Bm:min", "start": 79.0, "end": 81.0},
        {"chord": "Bm:min7", "start": 81.0, "end": 83.0},
        {"chord": "Em:min7", "start": 83.0, "end": 85.0},
        {"chord": "Em:min9", "start": 85.0, "end": 87.0},
        {"chord": "Bm:min", "start": 87.0, "end": 89.0},
        {"chord": "Bm:min7", "start": 89.0, "end": 91.0},
        {"chord": "G:maj7", "start": 91.0, "end": 93.0},
        {"chord": "F#:7", "start": 93.0, "end": 95.0},
        {"chord": "Bm:min", "start": 95.0, "end": 97.0},
        {"chord": "A:7", "start": 97.0, "end": 98.0},
        
        # Guitar Solo (1:38-2:16)
        {"chord": "Bm:min", "start": 98.0, "end": 100.0},
        {"chord": "Bm:min7", "start": 100.0, "end": 102.0},
        {"chord": "Em:min7", "start": 102.0, "end": 104.0},
        {"chord": "Em:min9", "start": 104.0, "end": 106.0},
        {"chord": "Bm:min", "start": 106.0, "end": 108.0},
        {"chord": "Bm:min7", "start": 108.0, "end": 110.0},
        {"chord": "G:maj7", "start": 110.0, "end": 112.0},
        {"chord": "F#:7", "start": 112.0, "end": 114.0},
        {"chord": "Bm:min", "start": 114.0, "end": 116.0},
        {"chord": "A:7", "start": 116.0, "end": 118.0},
        {"chord": "Em:min7", "start": 118.0, "end": 120.0},
        {"chord": "A:7", "start": 120.0, "end": 122.0},
        {"chord": "D:maj7", "start": 122.0, "end": 124.0},
        {"chord": "G:maj7", "start": 124.0, "end": 126.0},
        {"chord": "Em:min7", "start": 126.0, "end": 128.0},
        {"chord": "A:7", "start": 128.0, "end": 130.0},
        {"chord": "D:maj7", "start": 130.0, "end": 132.0},
        {"chord": "F#:7", "start": 132.0, "end": 134.0},
        {"chord": "Bm:min", "start": 134.0, "end": 136.0},
        
        # Verse 4 (2:16-2:36)
        {"chord": "Bm:min", "start": 136.0, "end": 138.0},
        {"chord": "Bm:min7", "start": 138.0, "end": 140.0},
        {"chord": "Em:min7", "start": 140.0, "end": 142.0},
        {"chord": "Em:min9", "start": 142.0, "end": 144.0},
        {"chord": "Bm:min", "start": 144.0, "end": 146.0},
        {"chord": "Bm:min7", "start": 146.0, "end": 148.0},
        {"chord": "G:maj7", "start": 148.0, "end": 150.0},
        {"chord": "F#:7", "start": 150.0, "end": 152.0},
        {"chord": "Bm:min", "start": 152.0, "end": 154.0},
        {"chord": "A:7", "start": 154.0, "end": 156.0},
        
        # Outro (2:36-3:00)
        {"chord": "Em:min7", "start": 156.0, "end": 158.0},
        {"chord": "A:7", "start": 158.0, "end": 160.0},
        {"chord": "D:maj7", "start": 160.0, "end": 162.0},
        {"chord": "G:maj7", "start": 162.0, "end": 164.0},
        {"chord": "Em:min7", "start": 164.0, "end": 166.0},
        {"chord": "A:7", "start": 166.0, "end": 168.0},
        {"chord": "D:maj7", "start": 168.0, "end": 170.0},
        {"chord": "F#:7", "start": 170.0, "end": 172.0},
        {"chord": "Bm:min", "start": 172.0, "end": 174.0},
        {"chord": "Bm:min7", "start": 174.0, "end": 176.0},
        {"chord": "Bm:min6", "start": 176.0, "end": 178.0},
        {"chord": "Bm:min", "start": 178.0, "end": 180.0}
    ]

    # Example 15: "The Thrill Is Gone" by B.B. King (B Minor) - Blues
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=oica5jG7FpU",
        "B Minor",
        thrill_is_gone_chords
    )

    # R&B/Soul Genre: "Isn't She Lovely" by Stevie Wonder (E Major)
    isnt_she_lovely_chords = [
        # Intro (0:00-0:12)
        {"chord": "E:maj7", "start": 0.0, "end": 1.5},
        {"chord": "G#:min7", "start": 1.5, "end": 3.0},
        {"chord": "C#:min7", "start": 3.0, "end": 4.5},
        {"chord": "A:maj7", "start": 4.5, "end": 6.0},
        {"chord": "F#:min7", "start": 6.0, "end": 7.5},
        {"chord": "B:7", "start": 7.5, "end": 9.0},
        {"chord": "E:maj7", "start": 9.0, "end": 10.5},
        {"chord": "B:7sus4", "start": 10.5, "end": 12.0},
        
        # Verse 1 (0:12-0:36)
        {"chord": "E:maj7", "start": 12.0, "end": 13.5},
        {"chord": "G#:min7", "start": 13.5, "end": 15.0},
        {"chord": "C#:min7", "start": 15.0, "end": 16.5},
        {"chord": "A:maj7", "start": 16.5, "end": 18.0},
        {"chord": "F#:min7", "start": 18.0, "end": 19.5},
        {"chord": "B:7", "start": 19.5, "end": 21.0},
        {"chord": "E:maj7", "start": 21.0, "end": 22.5},
        {"chord": "E:maj7", "start": 22.5, "end": 24.0},
        {"chord": "A:maj7", "start": 24.0, "end": 25.5},
        {"chord": "F#:min7", "start": 25.5, "end": 27.0},
        {"chord": "B:7", "start": 27.0, "end": 28.5},
        {"chord": "E:maj7", "start": 28.5, "end": 30.0},
        {"chord": "C#:min7", "start": 30.0, "end": 31.5},
        {"chord": "F#:min7", "start": 31.5, "end": 33.0},
        {"chord": "B:7", "start": 33.0, "end": 34.5},
        {"chord": "E:maj7", "start": 34.5, "end": 36.0},
        
        # Chorus (0:36-0:48)
        {"chord": "E:maj7", "start": 36.0, "end": 37.5},
        {"chord": "C#:min7", "start": 37.5, "end": 39.0},
        {"chord": "F#:min7", "start": 39.0, "end": 40.5},
        {"chord": "B:7", "start": 40.5, "end": 42.0},
        {"chord": "E:maj7", "start": 42.0, "end": 43.5},
        {"chord": "A:maj7", "start": 43.5, "end": 45.0},
        {"chord": "B:7", "start": 45.0, "end": 46.5},
        {"chord": "E:maj7", "start": 46.5, "end": 48.0},
        
        # Verse 2 (0:48-1:12)
        {"chord": "E:maj7", "start": 48.0, "end": 49.5},
        {"chord": "G#:min7", "start": 49.5, "end": 51.0},
        {"chord": "C#:min7", "start": 51.0, "end": 52.5},
        {"chord": "A:maj7", "start": 52.5, "end": 54.0},
        {"chord": "F#:min7", "start": 54.0, "end": 55.5},
        {"chord": "B:7", "start": 55.5, "end": 57.0},
        {"chord": "E:maj7", "start": 57.0, "end": 58.5},
        {"chord": "E:maj7", "start": 58.5, "end": 60.0},
        {"chord": "A:maj7", "start": 60.0, "end": 61.5},
        {"chord": "F#:min7", "start": 61.5, "end": 63.0},
        {"chord": "B:7", "start": 63.0, "end": 64.5},
        {"chord": "E:maj7", "start": 64.5, "end": 66.0},
        {"chord": "C#:min7", "start": 66.0, "end": 67.5},
        {"chord": "F#:min7", "start": 67.5, "end": 69.0},
        {"chord": "B:7", "start": 69.0, "end": 70.5},
        {"chord": "E:maj7", "start": 70.5, "end": 72.0},
        
        # Chorus (1:12-1:24)
        {"chord": "E:maj7", "start": 72.0, "end": 73.5},
        {"chord": "C#:min7", "start": 73.5, "end": 75.0},
        {"chord": "F#:min7", "start": 75.0, "end": 76.5},
        {"chord": "B:7", "start": 76.5, "end": 78.0},
        {"chord": "E:maj7", "start": 78.0, "end": 79.5},
        {"chord": "A:maj7", "start": 79.5, "end": 81.0},
        {"chord": "B:7", "start": 81.0, "end": 82.5},
        {"chord": "E:maj7", "start": 82.5, "end": 84.0},
        
        # Bridge (1:24-1:48)
        {"chord": "A:maj7", "start": 84.0, "end": 85.5},
        {"chord": "B:7", "start": 85.5, "end": 87.0},
        {"chord": "E:maj7", "start": 87.0, "end": 88.5},
        {"chord": "C#:min7", "start": 88.5, "end": 90.0},
        {"chord": "F#:min7", "start": 90.0, "end": 91.5},
        {"chord": "B:7", "start": 91.5, "end": 93.0},
        {"chord": "E:maj7", "start": 93.0, "end": 94.5},
        {"chord": "G#:min7", "start": 94.5, "end": 96.0},
        {"chord": "C#:min7", "start": 96.0, "end": 97.5},
        {"chord": "F#:min7", "start": 97.5, "end": 99.0},
        {"chord": "B:7", "start": 99.0, "end": 100.5},
        {"chord": "E:maj7", "start": 100.5, "end": 102.0},
        {"chord": "A:maj7", "start": 102.0, "end": 103.5},
        {"chord": "B:7", "start": 103.5, "end": 105.0},
        {"chord": "E:maj7", "start": 105.0, "end": 106.5},
        {"chord": "B:7sus4", "start": 106.5, "end": 108.0},
        
        # Harmonica Solo (1:48-2:24)
        {"chord": "E:maj7", "start": 108.0, "end": 109.5},
        {"chord": "G#:min7", "start": 109.5, "end": 111.0},
        {"chord": "C#:min7", "start": 111.0, "end": 112.5},
        {"chord": "A:maj7", "start": 112.5, "end": 114.0},
        {"chord": "F#:min7", "start": 114.0, "end": 115.5},
        {"chord": "B:7", "start": 115.5, "end": 117.0},
        {"chord": "E:maj7", "start": 117.0, "end": 118.5},
        {"chord": "E:maj7", "start": 118.5, "end": 120.0},
        {"chord": "A:maj7", "start": 120.0, "end": 121.5},
        {"chord": "F#:min7", "start": 121.5, "end": 123.0},
        {"chord": "B:7", "start": 123.0, "end": 124.5},
        {"chord": "E:maj7", "start": 124.5, "end": 126.0},
        {"chord": "C#:min7", "start": 126.0, "end": 127.5},
        {"chord": "F#:min7", "start": 127.5, "end": 129.0},
        {"chord": "B:7", "start": 129.0, "end": 130.5},
        {"chord": "E:maj7", "start": 130.5, "end": 132.0},
        {"chord": "E:maj7", "start": 132.0, "end": 133.5},
        {"chord": "C#:min7", "start": 133.5, "end": 135.0},
        {"chord": "F#:min7", "start": 135.0, "end": 136.5},
        {"chord": "B:7", "start": 136.5, "end": 138.0},
        {"chord": "E:maj7", "start": 138.0, "end": 139.5},
        {"chord": "A:maj7", "start": 139.5, "end": 141.0},
        {"chord": "B:7", "start": 141.0, "end": 142.5},
        {"chord": "E:maj7", "start": 142.5, "end": 144.0},
        
        # Outro (2:24-2:48)
        {"chord": "A:maj7", "start": 144.0, "end": 145.5},
        {"chord": "B:7", "start": 145.5, "end": 147.0},
        {"chord": "G#:min7", "start": 147.0, "end": 148.5},
        {"chord": "C#:min7", "start": 148.5, "end": 150.0},
        {"chord": "F#:min7", "start": 150.0, "end": 151.5},
        {"chord": "B:7", "start": 151.5, "end": 153.0},
        {"chord": "E:maj7", "start": 153.0, "end": 154.5},
        {"chord": "A:maj7", "start": 154.5, "end": 156.0},
        {"chord": "F#:min7", "start": 156.0, "end": 157.5},
        {"chord": "B:7", "start": 157.5, "end": 159.0},
        {"chord": "E:maj7", "start": 159.0, "end": 160.5},
        {"chord": "A:maj7", "start": 160.5, "end": 162.0},
        {"chord": "B:7", "start": 162.0, "end": 163.5},
        {"chord": "E:maj9", "start": 163.5, "end": 165.0},
        {"chord": "E:maj7", "start": 165.0, "end": 166.5},
        {"chord": "E:6/9", "start": 166.5, "end": 168.0}
    ]

    # Example 16: "Isn't She Lovely" by Stevie Wonder (E Major) - R&B/Soul
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=IVvkjuEAwgU",
        "E Major",
        isnt_she_lovely_chords
    )

    # Reggae Genre: "Three Little Birds" by Bob Marley (A Major)
    three_little_birds_chords = [
        # Intro (0:00-0:16)
        {"chord": "A:maj", "start": 0.0, "end": 4.0},
        {"chord": "D:maj", "start": 4.0, "end": 8.0},
        {"chord": "A:maj", "start": 8.0, "end": 12.0},
        {"chord": "E:7", "start": 12.0, "end": 16.0},
        
        # Verse 1 (0:16-0:32)
        {"chord": "A:maj", "start": 16.0, "end": 20.0},
        {"chord": "D:maj", "start": 20.0, "end": 24.0},
        {"chord": "A:maj", "start": 24.0, "end": 28.0},
        {"chord": "E:7", "start": 28.0, "end": 32.0},
        
        # Chorus (0:32-0:48)
        {"chord": "A:maj", "start": 32.0, "end": 36.0},
        {"chord": "D:maj", "start": 36.0, "end": 40.0},
        {"chord": "A:maj", "start": 40.0, "end": 44.0},
        {"chord": "E:7", "start": 44.0, "end": 48.0},
        
        # Verse 2 (0:48-1:04)
        {"chord": "A:maj", "start": 48.0, "end": 52.0},
        {"chord": "D:maj", "start": 52.0, "end": 56.0},
        {"chord": "A:maj", "start": 56.0, "end": 60.0},
        {"chord": "E:7", "start": 60.0, "end": 64.0},
        
        # Chorus (1:04-1:20)
        {"chord": "A:maj", "start": 64.0, "end": 68.0},
        {"chord": "D:maj", "start": 68.0, "end": 72.0},
        {"chord": "A:maj", "start": 72.0, "end": 76.0},
        {"chord": "E:7", "start": 76.0, "end": 80.0},
        
        # Instrumental Break (1:20-1:52)
        {"chord": "A:maj", "start": 80.0, "end": 84.0},
        {"chord": "D:maj", "start": 84.0, "end": 88.0},
        {"chord": "A:maj", "start": 88.0, "end": 92.0},
        {"chord": "E:7", "start": 92.0, "end": 96.0},
        {"chord": "A:maj", "start": 96.0, "end": 100.0},
        {"chord": "D:maj", "start": 100.0, "end": 104.0},
        {"chord": "A:maj", "start": 104.0, "end": 108.0},
        {"chord": "E:7", "start": 108.0, "end": 112.0},
        
        # Verse 3 (1:52-2:08)
        {"chord": "A:maj", "start": 112.0, "end": 116.0},
        {"chord": "D:maj", "start": 116.0, "end": 120.0},
        {"chord": "A:maj", "start": 120.0, "end": 124.0},
        {"chord": "E:7", "start": 124.0, "end": 128.0},
        
        # Chorus (2:08-2:24)
        {"chord": "A:maj", "start": 128.0, "end": 132.0},
        {"chord": "D:maj", "start": 132.0, "end": 136.0},
        {"chord": "A:maj", "start": 136.0, "end": 140.0},
        {"chord": "E:7", "start": 140.0, "end": 144.0},
        
        # Final Chorus (2:24-2:40)
        {"chord": "A:maj", "start": 144.0, "end": 148.0},
        {"chord": "D:maj", "start": 148.0, "end": 152.0},
        {"chord": "A:maj", "start": 152.0, "end": 156.0},
        {"chord": "E:7", "start": 156.0, "end": 160.0},
        
        # Outro (2:40-3:00)
        {"chord": "A:maj", "start": 160.0, "end": 164.0},
        {"chord": "D:maj", "start": 164.0, "end": 168.0},
        {"chord": "A:maj", "start": 168.0, "end": 172.0},
        {"chord": "E:7", "start": 172.0, "end": 176.0},
        {"chord": "A:maj", "start": 176.0, "end": 180.0}
    ]

    # Example 17: "Three Little Birds" by Bob Marley (A Major) - Reggae
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=HNBCVM4KbUM",
        "A Major",
        three_little_birds_chords
    )

    # Electronic/EDM Genre: "Around the World" by Daft Punk (E Minor)
    around_the_world_chords = [
        # Intro (0:00-0:35)
        {"chord": "Em:min", "start": 0.0, "end": 4.0},
        {"chord": "D:maj", "start": 4.0, "end": 8.0},
        {"chord": "A:maj", "start": 8.0, "end": 12.0},
        {"chord": "C:maj", "start": 12.0, "end": 16.0},
        {"chord": "Em:min", "start": 16.0, "end": 20.0},
        {"chord": "D:maj", "start": 20.0, "end": 24.0},
        {"chord": "A:maj", "start": 24.0, "end": 28.0},
        {"chord": "C:maj", "start": 28.0, "end": 32.0},
        {"chord": "Em:min", "start": 32.0, "end": 35.0},
        
        # Main Groove (0:35-1:10)
        {"chord": "Em:min", "start": 35.0, "end": 39.0},
        {"chord": "D:maj", "start": 39.0, "end": 43.0},
        {"chord": "A:maj", "start": 43.0, "end": 47.0},
        {"chord": "C:maj", "start": 47.0, "end": 51.0},
        {"chord": "Em:min", "start": 51.0, "end": 55.0},
        {"chord": "D:maj", "start": 55.0, "end": 59.0},
        {"chord": "A:maj", "start": 59.0, "end": 63.0},
        {"chord": "C:maj", "start": 63.0, "end": 67.0},
        {"chord": "Em:min", "start": 67.0, "end": 70.0},
        
        # Vocal Entry (1:10-1:45)
        {"chord": "Em:min", "start": 70.0, "end": 74.0},
        {"chord": "D:maj", "start": 74.0, "end": 78.0},
        {"chord": "A:maj", "start": 78.0, "end": 82.0},
        {"chord": "C:maj", "start": 82.0, "end": 86.0},
        {"chord": "Em:min", "start": 86.0, "end": 90.0},
        {"chord": "D:maj", "start": 90.0, "end": 94.0},
        {"chord": "A:maj", "start": 94.0, "end": 98.0},
        {"chord": "C:maj", "start": 98.0, "end": 102.0},
        {"chord": "Em:min", "start": 102.0, "end": 105.0},
        
        # Bass Drop (1:45-2:20)
        {"chord": "Em:min", "start": 105.0, "end": 109.0},
        {"chord": "D:maj", "start": 109.0, "end": 113.0},
        {"chord": "A:maj", "start": 113.0, "end": 117.0},
        {"chord": "C:maj", "start": 117.0, "end": 121.0},
        {"chord": "Em:min", "start": 121.0, "end": 125.0},
        {"chord": "D:maj", "start": 125.0, "end": 129.0},
        {"chord": "A:maj", "start": 129.0, "end": 133.0},
        {"chord": "C:maj", "start": 133.0, "end": 137.0},
        {"chord": "Em:min", "start": 137.0, "end": 140.0},
        
        # Break (2:20-2:55)
        {"chord": "G:maj", "start": 140.0, "end": 144.0},
        {"chord": "Em:min", "start": 144.0, "end": 148.0},
        {"chord": "A:maj", "start": 148.0, "end": 152.0},
        {"chord": "D:maj", "start": 152.0, "end": 156.0},
        {"chord": "G:maj", "start": 156.0, "end": 160.0},
        {"chord": "Em:min", "start": 160.0, "end": 164.0},
        {"chord": "A:maj", "start": 164.0, "end": 168.0},
        {"chord": "D:maj", "start": 168.0, "end": 172.0},
        {"chord": "C:maj", "start": 172.0, "end": 175.0},
        
        # Main Groove Return (2:55-3:30)
        {"chord": "Em:min", "start": 175.0, "end": 179.0},
        {"chord": "D:maj", "start": 179.0, "end": 183.0},
        {"chord": "A:maj", "start": 183.0, "end": 187.0},
        {"chord": "C:maj", "start": 187.0, "end": 191.0},
        {"chord": "Em:min", "start": 191.0, "end": 195.0},
        {"chord": "D:maj", "start": 195.0, "end": 199.0},
        {"chord": "A:maj", "start": 199.0, "end": 203.0},
        {"chord": "C:maj", "start": 203.0, "end": 207.0},
        {"chord": "Em:min", "start": 207.0, "end": 210.0},
        
        # Build-up (3:30-4:05)
        {"chord": "Em:min", "start": 210.0, "end": 214.0},
        {"chord": "D:maj", "start": 214.0, "end": 218.0},
        {"chord": "A:maj", "start": 218.0, "end": 222.0},
        {"chord": "C:maj", "start": 222.0, "end": 226.0},
        {"chord": "Em:min", "start": 226.0, "end": 230.0},
        {"chord": "D:maj", "start": 230.0, "end": 234.0},
        {"chord": "A:maj", "start": 234.0, "end": 238.0},
        {"chord": "C:maj", "start": 238.0, "end": 242.0},
        {"chord": "Em:min", "start": 242.0, "end": 245.0},
        
        # Outro (4:05-4:30)
        {"chord": "Em:min", "start": 245.0, "end": 249.0},
        {"chord": "D:maj", "start": 249.0, "end": 253.0},
        {"chord": "A:maj", "start": 253.0, "end": 257.0},
        {"chord": "C:maj", "start": 257.0, "end": 261.0},
        {"chord": "Em:min", "start": 261.0, "end": 265.0},
        {"chord": "D:maj", "start": 265.0, "end": 267.0},
        {"chord": "A:maj", "start": 267.0, "end": 269.0},
        {"chord": "Em:min", "start": 269.0, "end": 270.0}
    ]

    # Example 18: "Around the World" by Daft Punk (E Minor) - Electronic/EDM
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=dwDns8x3Jb4",
        "E Minor",
        around_the_world_chords
    )

    # Alternative/Indie Genre: "Creep" by Radiohead (G Major)
    creep_chords = [
        # Intro (0:00-0:15)
        {"chord": "G:maj", "start": 0.0, "end": 3.75},
        {"chord": "B:maj", "start": 3.75, "end": 7.5},
        {"chord": "C:maj", "start": 7.5, "end": 11.25},
        {"chord": "Cm:min", "start": 11.25, "end": 15.0},
        
        # Verse 1 (0:15-0:45)
        {"chord": "G:maj", "start": 15.0, "end": 18.75},
        {"chord": "B:maj", "start": 18.75, "end": 22.5},
        {"chord": "C:maj", "start": 22.5, "end": 26.25},
        {"chord": "Cm:min", "start": 26.25, "end": 30.0},
        {"chord": "G:maj", "start": 30.0, "end": 33.75},
        {"chord": "B:maj", "start": 33.75, "end": 37.5},
        {"chord": "C:maj", "start": 37.5, "end": 41.25},
        {"chord": "Cm:min", "start": 41.25, "end": 45.0},
        
        # Chorus (0:45-1:05)
        {"chord": "G:maj", "start": 45.0, "end": 48.75},
        {"chord": "B:maj", "start": 48.75, "end": 52.5},
        {"chord": "C:maj", "start": 52.5, "end": 56.25},
        {"chord": "Cm:min", "start": 56.25, "end": 60.0},
        {"chord": "G:maj", "start": 60.0, "end": 63.75},
        {"chord": "B:maj", "start": 63.75, "end": 65.0},
        
        # Verse 2 (1:05-1:35)
        {"chord": "G:maj", "start": 65.0, "end": 68.75},
        {"chord": "B:maj", "start": 68.75, "end": 72.5},
        {"chord": "C:maj", "start": 72.5, "end": 76.25},
        {"chord": "Cm:min", "start": 76.25, "end": 80.0},
        {"chord": "G:maj", "start": 80.0, "end": 83.75},
        {"chord": "B:maj", "start": 83.75, "end": 87.5},
        {"chord": "C:maj", "start": 87.5, "end": 91.25},
        {"chord": "Cm:min", "start": 91.25, "end": 95.0},
        
        # Chorus (1:35-1:55)
        {"chord": "G:maj", "start": 95.0, "end": 98.75},
        {"chord": "B:maj", "start": 98.75, "end": 102.5},
        {"chord": "C:maj", "start": 102.5, "end": 106.25},
        {"chord": "Cm:min", "start": 106.25, "end": 110.0},
        {"chord": "G:maj", "start": 110.0, "end": 113.75},
        {"chord": "B:maj", "start": 113.75, "end": 115.0},
        
        # Bridge (1:55-2:35)
        {"chord": "C:maj", "start": 115.0, "end": 118.75},
        {"chord": "D:maj", "start": 118.75, "end": 122.5},
        {"chord": "G:maj", "start": 122.5, "end": 126.25},
        {"chord": "Em:min", "start": 126.25, "end": 130.0},
        {"chord": "C:maj", "start": 130.0, "end": 133.75},
        {"chord": "D:maj", "start": 133.75, "end": 137.5},
        {"chord": "G:maj", "start": 137.5, "end": 141.25},
        {"chord": "Em:min", "start": 141.25, "end": 145.0},
        {"chord": "C:maj", "start": 145.0, "end": 148.75},
        {"chord": "D:maj", "start": 148.75, "end": 150.0},
        {"chord": "Bm:min", "start": 150.0, "end": 152.5},
        {"chord": "G:maj", "start": 152.5, "end": 155.0},
        
        # Verse 3 (2:35-3:05)
        {"chord": "G:maj", "start": 155.0, "end": 158.75},
        {"chord": "B:maj", "start": 158.75, "end": 162.5},
        {"chord": "C:maj", "start": 162.5, "end": 166.25},
        {"chord": "Cm:min", "start": 166.25, "end": 170.0},
        {"chord": "G:maj", "start": 170.0, "end": 173.75},
        {"chord": "B:maj", "start": 173.75, "end": 177.5},
        {"chord": "C:maj", "start": 177.5, "end": 181.25},
        {"chord": "Cm:min", "start": 181.25, "end": 185.0},
        
        # Final Chorus (3:05-3:40)
        {"chord": "G:maj", "start": 185.0, "end": 188.75},
        {"chord": "B:maj", "start": 188.75, "end": 192.5},
        {"chord": "C:maj", "start": 192.5, "end": 196.25},
        {"chord": "Cm:min", "start": 196.25, "end": 200.0},
        {"chord": "G:maj", "start": 200.0, "end": 203.75},
        {"chord": "B:maj", "start": 203.75, "end": 207.5},
        {"chord": "C:maj", "start": 207.5, "end": 211.25},
        {"chord": "Cm:min", "start": 211.25, "end": 215.0},
        {"chord": "G:maj", "start": 215.0, "end": 218.75},
        {"chord": "B:maj", "start": 218.75, "end": 220.0},
        
        # Outro (3:40-3:56)
        {"chord": "G:maj", "start": 220.0, "end": 223.75},
        {"chord": "B:maj", "start": 223.75, "end": 227.5},
        {"chord": "C:maj", "start": 227.5, "end": 231.25},
        {"chord": "Cm:min", "start": 231.25, "end": 235.0},
        {"chord": "G:maj", "start": 235.0, "end": 236.0}
    ]

    # Example 19: "Creep" by Radiohead (G Major) - Alternative/Indie
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=XFkzRNyygfk",
        "G Major",
        creep_chords
    )

    # Latin Genre: "Despacito" by Luis Fonsi (D Major)
    despacito_chords = [
        # Intro (0:00-0:25)
        {"chord": "Bm:min", "start": 0.0, "end": 2.5},
        {"chord": "G:maj", "start": 2.5, "end": 5.0},
        {"chord": "D:maj", "start": 5.0, "end": 7.5},
        {"chord": "A:maj", "start": 7.5, "end": 10.0},
        {"chord": "Bm:min", "start": 10.0, "end": 12.5},
        {"chord": "G:maj", "start": 12.5, "end": 15.0},
        {"chord": "D:maj", "start": 15.0, "end": 17.5},
        {"chord": "A:maj", "start": 17.5, "end": 20.0},
        {"chord": "Bm:min", "start": 20.0, "end": 22.5},
        {"chord": "G:maj", "start": 22.5, "end": 25.0},
        
        # Verse 1 (0:25-0:55)
        {"chord": "Bm:min", "start": 25.0, "end": 27.5},
        {"chord": "G:maj", "start": 27.5, "end": 30.0},
        {"chord": "D:maj", "start": 30.0, "end": 32.5},
        {"chord": "A:maj", "start": 32.5, "end": 35.0},
        {"chord": "Bm:min", "start": 35.0, "end": 37.5},
        {"chord": "G:maj", "start": 37.5, "end": 40.0},
        {"chord": "D:maj", "start": 40.0, "end": 42.5},
        {"chord": "A:maj", "start": 42.5, "end": 45.0},
        {"chord": "Bm:min", "start": 45.0, "end": 47.5},
        {"chord": "G:maj", "start": 47.5, "end": 50.0},
        {"chord": "D:maj", "start": 50.0, "end": 52.5},
        {"chord": "A:maj", "start": 52.5, "end": 55.0},
        
        # Pre-Chorus (0:55-1:15)
        {"chord": "G:maj", "start": 55.0, "end": 57.5},
        {"chord": "D:maj", "start": 57.5, "end": 60.0},
        {"chord": "A:maj", "start": 60.0, "end": 62.5},
        {"chord": "Bm:min", "start": 62.5, "end": 65.0},
        {"chord": "G:maj", "start": 65.0, "end": 67.5},
        {"chord": "D:maj", "start": 67.5, "end": 70.0},
        {"chord": "A:maj", "start": 70.0, "end": 72.5},
        {"chord": "Bm:min", "start": 72.5, "end": 75.0},
        
        # Chorus (1:15-1:45)
        {"chord": "Bm:min", "start": 75.0, "end": 77.5},
        {"chord": "G:maj", "start": 77.5, "end": 80.0},
        {"chord": "D:maj", "start": 80.0, "end": 82.5},
        {"chord": "A:maj", "start": 82.5, "end": 85.0},
        {"chord": "Bm:min", "start": 85.0, "end": 87.5},
        {"chord": "G:maj", "start": 87.5, "end": 90.0},
        {"chord": "D:maj", "start": 90.0, "end": 92.5},
        {"chord": "A:maj", "start": 92.5, "end": 95.0},
        {"chord": "Bm:min", "start": 95.0, "end": 97.5},
        {"chord": "G:maj", "start": 97.5, "end": 100.0},
        {"chord": "D:maj", "start": 100.0, "end": 102.5},
        {"chord": "A:maj", "start": 102.5, "end": 105.0},
        
        # Verse 2 (1:45-2:15)
        {"chord": "Bm:min", "start": 105.0, "end": 107.5},
        {"chord": "G:maj", "start": 107.5, "end": 110.0},
        {"chord": "D:maj", "start": 110.0, "end": 112.5},
        {"chord": "A:maj", "start": 112.5, "end": 115.0},
        {"chord": "Bm:min", "start": 115.0, "end": 117.5},
        {"chord": "G:maj", "start": 117.5, "end": 120.0},
        {"chord": "D:maj", "start": 120.0, "end": 122.5},
        {"chord": "A:maj", "start": 122.5, "end": 125.0},
        {"chord": "Bm:min", "start": 125.0, "end": 127.5},
        {"chord": "G:maj", "start": 127.5, "end": 130.0},
        {"chord": "D:maj", "start": 130.0, "end": 132.5},
        {"chord": "A:maj", "start": 132.5, "end": 135.0},
        
        # Pre-Chorus (2:15-2:35)
        {"chord": "G:maj", "start": 135.0, "end": 137.5},
        {"chord": "D:maj", "start": 137.5, "end": 140.0},
        {"chord": "A:maj", "start": 140.0, "end": 142.5},
        {"chord": "Bm:min", "start": 142.5, "end": 145.0},
        {"chord": "G:maj", "start": 145.0, "end": 147.5},
        {"chord": "D:maj", "start": 147.5, "end": 150.0},
        {"chord": "A:maj", "start": 150.0, "end": 152.5},
        {"chord": "Bm:min", "start": 152.5, "end": 155.0},
        
        # Chorus (2:35-3:05)
        {"chord": "Bm:min", "start": 155.0, "end": 157.5},
        {"chord": "G:maj", "start": 157.5, "end": 160.0},
        {"chord": "D:maj", "start": 160.0, "end": 162.5},
        {"chord": "A:maj", "start": 162.5, "end": 165.0},
        {"chord": "Bm:min", "start": 165.0, "end": 167.5},
        {"chord": "G:maj", "start": 167.5, "end": 170.0},
        {"chord": "D:maj", "start": 170.0, "end": 172.5},
        {"chord": "A:maj", "start": 172.5, "end": 175.0},
        {"chord": "Bm:min", "start": 175.0, "end": 177.5},
        {"chord": "G:maj", "start": 177.5, "end": 180.0},
        {"chord": "D:maj", "start": 180.0, "end": 182.5},
        {"chord": "A:maj", "start": 182.5, "end": 185.0},
        
        # Bridge (3:05-3:35)
        {"chord": "G:maj", "start": 185.0, "end": 187.5},
        {"chord": "D:maj", "start": 187.5, "end": 190.0},
        {"chord": "Em:min", "start": 190.0, "end": 192.5},
        {"chord": "A:maj", "start": 192.5, "end": 195.0},
        {"chord": "G:maj", "start": 195.0, "end": 197.5},
        {"chord": "D:maj", "start": 197.5, "end": 200.0},
        {"chord": "Em:min", "start": 200.0, "end": 202.5},
        {"chord": "A:maj", "start": 202.5, "end": 205.0},
        {"chord": "G:maj", "start": 205.0, "end": 207.5},
        {"chord": "D:maj", "start": 207.5, "end": 210.0},
        {"chord": "Em:min", "start": 210.0, "end": 212.5},
        {"chord": "A:maj", "start": 212.5, "end": 215.0},
        
        # Final Chorus (3:35-4:05)
        {"chord": "Bm:min", "start": 215.0, "end": 217.5},
        {"chord": "G:maj", "start": 217.5, "end": 220.0},
        {"chord": "D:maj", "start": 220.0, "end": 222.5},
        {"chord": "A:maj", "start": 222.5, "end": 225.0},
        {"chord": "Bm:min", "start": 225.0, "end": 227.5},
        {"chord": "G:maj", "start": 227.5, "end": 230.0},
        {"chord": "D:maj", "start": 230.0, "end": 232.5},
        {"chord": "A:maj", "start": 232.5, "end": 235.0},
        {"chord": "Bm:min", "start": 235.0, "end": 237.5},
        {"chord": "G:maj", "start": 237.5, "end": 240.0},
        {"chord": "D:maj", "start": 240.0, "end": 242.5},
        {"chord": "A:maj", "start": 242.5, "end": 245.0},
        
        # Outro (4:05-4:15)
        {"chord": "Bm:min", "start": 245.0, "end": 247.5},
        {"chord": "G:maj", "start": 247.5, "end": 250.0},
        {"chord": "D:maj", "start": 250.0, "end": 252.5},
        {"chord": "A:maj", "start": 252.5, "end": 255.0}
    ]

    # Example 20: "Despacito" by Luis Fonsi (D Major) - Latin
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
        "D Major",
        despacito_chords
    )

    # Metal Genre: "Enter Sandman" by Metallica (E Minor)
    enter_sandman_chords = [
        # Intro (0:00-0:53)
        {"chord": "Em:min", "start": 0.0, "end": 4.0},
        {"chord": "D:maj", "start": 4.0, "end": 8.0},
        {"chord": "Em:min", "start": 8.0, "end": 12.0},
        {"chord": "D:maj", "start": 12.0, "end": 16.0},
        {"chord": "Em:min", "start": 16.0, "end": 20.0},
        {"chord": "D:maj", "start": 20.0, "end": 24.0},
        {"chord": "Em:min", "start": 24.0, "end": 28.0},
        {"chord": "D:maj", "start": 28.0, "end": 32.0},
        {"chord": "Em:min", "start": 32.0, "end": 36.0},
        {"chord": "D:maj", "start": 36.0, "end": 40.0},
        {"chord": "Em:min", "start": 40.0, "end": 44.0},
        {"chord": "D:maj", "start": 44.0, "end": 48.0},
        {"chord": "Em:min", "start": 48.0, "end": 51.0},
        {"chord": "D:maj", "start": 51.0, "end": 53.0},
        
        # Verse 1 (0:53-1:20)
        {"chord": "Em:min", "start": 53.0, "end": 57.0},
        {"chord": "D:maj", "start": 57.0, "end": 61.0},
        {"chord": "C:maj", "start": 61.0, "end": 65.0},
        {"chord": "D:maj", "start": 65.0, "end": 69.0},
        {"chord": "Em:min", "start": 69.0, "end": 73.0},
        {"chord": "D:maj", "start": 73.0, "end": 77.0},
        {"chord": "C:maj", "start": 77.0, "end": 81.0},
        {"chord": "D:maj", "start": 81.0, "end": 85.0},
        
        # Pre-Chorus (1:20-1:36)
        {"chord": "C:maj", "start": 85.0, "end": 87.0},
        {"chord": "B:maj", "start": 87.0, "end": 89.0},
        {"chord": "C:maj", "start": 89.0, "end": 91.0},
        {"chord": "B:maj", "start": 91.0, "end": 93.0},
        {"chord": "C:maj", "start": 93.0, "end": 95.0},
        {"chord": "B:maj", "start": 95.0, "end": 97.0},
        {"chord": "C:maj", "start": 97.0, "end": 99.0},
        {"chord": "B:maj", "start": 99.0, "end": 101.0},
        
        # Chorus (1:36-1:54)
        {"chord": "Em:min", "start": 101.0, "end": 103.0},
        {"chord": "G:maj", "start": 103.0, "end": 105.0},
        {"chord": "D:maj", "start": 105.0, "end": 107.0},
        {"chord": "A:maj", "start": 107.0, "end": 109.0},
        {"chord": "Em:min", "start": 109.0, "end": 111.0},
        {"chord": "G:maj", "start": 111.0, "end": 113.0},
        {"chord": "D:maj", "start": 113.0, "end": 115.0},
        {"chord": "A:maj", "start": 115.0, "end": 117.0},
        {"chord": "C:maj", "start": 117.0, "end": 119.0},
        
        # Interlude (1:54-2:36)
        {"chord": "Em:min", "start": 119.0, "end": 123.0},
        {"chord": "D:maj", "start": 123.0, "end": 127.0},
        {"chord": "Em:min", "start": 127.0, "end": 131.0},
        {"chord": "D:maj", "start": 131.0, "end": 135.0},
        {"chord": "Em:min", "start": 135.0, "end": 139.0},
        {"chord": "D:maj", "start": 139.0, "end": 143.0},
        {"chord": "Em:min", "start": 143.0, "end": 147.0},
        {"chord": "D:maj", "start": 147.0, "end": 151.0},
        {"chord": "Em:min", "start": 151.0, "end": 155.0},
        {"chord": "D:maj", "start": 155.0, "end": 156.0},
        
        # Verse 2 (2:36-3:03)
        {"chord": "Em:min", "start": 156.0, "end": 160.0},
        {"chord": "D:maj", "start": 160.0, "end": 164.0},
        {"chord": "C:maj", "start": 164.0, "end": 168.0},
        {"chord": "D:maj", "start": 168.0, "end": 172.0},
        {"chord": "Em:min", "start": 172.0, "end": 176.0},
        {"chord": "D:maj", "start": 176.0, "end": 180.0},
        {"chord": "C:maj", "start": 180.0, "end": 184.0},
        {"chord": "D:maj", "start": 184.0, "end": 188.0},
        
        # Pre-Chorus (3:03-3:20)
        {"chord": "C:maj", "start": 188.0, "end": 190.0},
        {"chord": "B:maj", "start": 190.0, "end": 192.0},
        {"chord": "C:maj", "start": 192.0, "end": 194.0},
        {"chord": "B:maj", "start": 194.0, "end": 196.0},
        {"chord": "C:maj", "start": 196.0, "end": 198.0},
        {"chord": "B:maj", "start": 198.0, "end": 200.0},
        {"chord": "C:maj", "start": 200.0, "end": 202.0},
        {"chord": "B:maj", "start": 202.0, "end": 204.0},
        
        # Chorus (3:20-3:38)
        {"chord": "Em:min", "start": 204.0, "end": 206.0},
        {"chord": "G:maj", "start": 206.0, "end": 208.0},
        {"chord": "D:maj", "start": 208.0, "end": 210.0},
        {"chord": "A:maj", "start": 210.0, "end": 212.0},
        {"chord": "Em:min", "start": 212.0, "end": 214.0},
        {"chord": "G:maj", "start": 214.0, "end": 216.0},
        {"chord": "D:maj", "start": 216.0, "end": 218.0},
        {"chord": "A:maj", "start": 218.0, "end": 220.0},
        {"chord": "C:maj", "start": 220.0, "end": 222.0},
        
        # Guitar Solo (3:38-4:35)
        {"chord": "Em:min", "start": 222.0, "end": 226.0},
        {"chord": "D:maj", "start": 226.0, "end": 230.0},
        {"chord": "C:maj", "start": 230.0, "end": 234.0},
        {"chord": "D:maj", "start": 234.0, "end": 238.0},
        {"chord": "Em:min", "start": 238.0, "end": 242.0},
        {"chord": "D:maj", "start": 242.0, "end": 246.0},
        {"chord": "C:maj", "start": 246.0, "end": 250.0},
        {"chord": "D:maj", "start": 250.0, "end": 254.0},
        {"chord": "Em:min", "start": 254.0, "end": 258.0},
        {"chord": "D:maj", "start": 258.0, "end": 262.0},
        {"chord": "C:maj", "start": 262.0, "end": 266.0},
        {"chord": "D:maj", "start": 266.0, "end": 270.0},
        {"chord": "Em:min", "start": 270.0, "end": 274.0},
        {"chord": "D:maj", "start": 274.0, "end": 275.0},
        
        # Final Pre-Chorus (4:35-4:53)
        {"chord": "C:maj", "start": 275.0, "end": 277.0},
        {"chord": "B:maj", "start": 277.0, "end": 279.0},
        {"chord": "C:maj", "start": 279.0, "end": 281.0},
        {"chord": "B:maj", "start": 281.0, "end": 283.0},
        {"chord": "C:maj", "start": 283.0, "end": 285.0},
        {"chord": "B:maj", "start": 285.0, "end": 287.0},
        {"chord": "C:maj", "start": 287.0, "end": 289.0},
        {"chord": "B:maj", "start": 289.0, "end": 291.0},
        {"chord": "C:maj", "start": 291.0, "end": 293.0},
        
        # Final Chorus (4:53-5:13)
        {"chord": "Em:min", "start": 293.0, "end": 295.0},
        {"chord": "G:maj", "start": 295.0, "end": 297.0},
        {"chord": "D:maj", "start": 297.0, "end": 299.0},
        {"chord": "A:maj", "start": 299.0, "end": 301.0},
        {"chord": "Em:min", "start": 301.0, "end": 303.0},
        {"chord": "G:maj", "start": 303.0, "end": 305.0},
        {"chord": "D:maj", "start": 305.0, "end": 307.0},
        {"chord": "A:maj", "start": 307.0, "end": 309.0},
        {"chord": "Em:min", "start": 309.0, "end": 311.0},
        {"chord": "G:maj", "start": 311.0, "end": 313.0},
        
        # Outro (5:13-5:30)
        {"chord": "Em:min", "start": 313.0, "end": 315.0},
        {"chord": "D:maj", "start": 315.0, "end": 317.0},
        {"chord": "Em:min", "start": 317.0, "end": 319.0},
        {"chord": "D:maj", "start": 319.0, "end": 321.0},
        {"chord": "Em:min", "start": 321.0, "end": 323.0},
        {"chord": "D:maj", "start": 323.0, "end": 325.0},
        {"chord": "Em:min", "start": 325.0, "end": 327.0},
        {"chord": "D:maj", "start": 327.0, "end": 329.0},
        {"chord": "Em:min", "start": 329.0, "end": 330.0}
    ]

    # Example 21: "Enter Sandman" by Metallica (E Minor) - Metal
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=CD-E-LDc384",
        "E Minor",
        enter_sandman_chords
    )

    # Funk Genre: "Superstition" by Stevie Wonder (Eb Minor)
    superstition_chords = [
        # Intro (0:00-0:25)
        {"chord": "Ebm:min7", "start": 0.0, "end": 4.0},
        {"chord": "Ebm:min7", "start": 4.0, "end": 8.0},
        {"chord": "Ebm:min7", "start": 8.0, "end": 12.0},
        {"chord": "Ebm:min7", "start": 12.0, "end": 16.0},
        {"chord": "Ebm:min7", "start": 16.0, "end": 20.0},
        {"chord": "Ebm:min7", "start": 20.0, "end": 24.0},
        {"chord": "Ebm:min7", "start": 24.0, "end": 25.0},
        
        # Verse 1 (0:25-0:56)
        {"chord": "Ebm:min7", "start": 25.0, "end": 29.0},
        {"chord": "Ebm:min7", "start": 29.0, "end": 33.0},
        {"chord": "Ebm:min7", "start": 33.0, "end": 37.0},
        {"chord": "Ebm:min7", "start": 37.0, "end": 41.0},
        {"chord": "Abm:min7", "start": 41.0, "end": 45.0},
        {"chord": "Abm:min7", "start": 45.0, "end": 49.0},
        {"chord": "Ebm:min7", "start": 49.0, "end": 53.0},
        {"chord": "Ebm:min7", "start": 53.0, "end": 56.0},
        
        # Chorus (0:56-1:17)
        {"chord": "Bbm:min7", "start": 56.0, "end": 60.0},
        {"chord": "Ab:7", "start": 60.0, "end": 64.0},
        {"chord": "Db:maj7", "start": 64.0, "end": 68.0},
        {"chord": "Db:maj7", "start": 68.0, "end": 72.0},
        {"chord": "Bbm:min7", "start": 72.0, "end": 76.0},
        {"chord": "Ebm:min7", "start": 76.0, "end": 77.0},
        
        # Interlude (1:17-1:30)
        {"chord": "Ebm:min7", "start": 77.0, "end": 81.0},
        {"chord": "Ebm:min7", "start": 81.0, "end": 85.0},
        {"chord": "Ebm:min7", "start": 85.0, "end": 89.0},
        {"chord": "Ebm:min7", "start": 89.0, "end": 90.0},
        
        # Verse 2 (1:30-2:00)
        {"chord": "Ebm:min7", "start": 90.0, "end": 94.0},
        {"chord": "Ebm:min7", "start": 94.0, "end": 98.0},
        {"chord": "Ebm:min7", "start": 98.0, "end": 102.0},
        {"chord": "Ebm:min7", "start": 102.0, "end": 106.0},
        {"chord": "Abm:min7", "start": 106.0, "end": 110.0},
        {"chord": "Abm:min7", "start": 110.0, "end": 114.0},
        {"chord": "Ebm:min7", "start": 114.0, "end": 118.0},
        {"chord": "Ebm:min7", "start": 118.0, "end": 120.0},
        
        # Chorus (2:00-2:21)
        {"chord": "Bbm:min7", "start": 120.0, "end": 124.0},
        {"chord": "Ab:7", "start": 124.0, "end": 128.0},
        {"chord": "Db:maj7", "start": 128.0, "end": 132.0},
        {"chord": "Db:maj7", "start": 132.0, "end": 136.0},
        {"chord": "Bbm:min7", "start": 136.0, "end": 140.0},
        {"chord": "Ebm:min7", "start": 140.0, "end": 141.0},
        
        # Instrumental Solo (2:21-3:04)
        {"chord": "Ebm:min7", "start": 141.0, "end": 145.0},
        {"chord": "Ebm:min7", "start": 145.0, "end": 149.0},
        {"chord": "Ebm:min7", "start": 149.0, "end": 153.0},
        {"chord": "Ebm:min7", "start": 153.0, "end": 157.0},
        {"chord": "Abm:min7", "start": 157.0, "end": 161.0},
        {"chord": "Abm:min7", "start": 161.0, "end": 165.0},
        {"chord": "Ebm:min7", "start": 165.0, "end": 169.0},
        {"chord": "Ebm:min7", "start": 169.0, "end": 173.0},
        {"chord": "Bbm:min7", "start": 173.0, "end": 177.0},
        {"chord": "Ab:7", "start": 177.0, "end": 181.0},
        {"chord": "Db:maj7", "start": 181.0, "end": 184.0},
        
        # Verse 3 (3:04-3:35)
        {"chord": "Ebm:min7", "start": 184.0, "end": 188.0},
        {"chord": "Ebm:min7", "start": 188.0, "end": 192.0},
        {"chord": "Ebm:min7", "start": 192.0, "end": 196.0},
        {"chord": "Ebm:min7", "start": 196.0, "end": 200.0},
        {"chord": "Abm:min7", "start": 200.0, "end": 204.0},
        {"chord": "Abm:min7", "start": 204.0, "end": 208.0},
        {"chord": "Ebm:min7", "start": 208.0, "end": 212.0},
        {"chord": "Ebm:min7", "start": 212.0, "end": 215.0},
        
        # Final Chorus (3:35-3:56)
        {"chord": "Bbm:min7", "start": 215.0, "end": 219.0},
        {"chord": "Ab:7", "start": 219.0, "end": 223.0},
        {"chord": "Db:maj7", "start": 223.0, "end": 227.0},
        {"chord": "Db:maj7", "start": 227.0, "end": 231.0},
        {"chord": "Bbm:min7", "start": 231.0, "end": 235.0},
        {"chord": "Ebm:min7", "start": 235.0, "end": 236.0},
        
        # Outro (3:56-4:25)
        {"chord": "Ebm:min7", "start": 236.0, "end": 240.0},
        {"chord": "Ebm:min7", "start": 240.0, "end": 244.0},
        {"chord": "Ebm:min7", "start": 244.0, "end": 248.0},
        {"chord": "Ebm:min7", "start": 248.0, "end": 252.0},
        {"chord": "Ebm:min7", "start": 252.0, "end": 256.0},
        {"chord": "Ebm:min7", "start": 256.0, "end": 260.0},
        {"chord": "Ebm:min7", "start": 260.0, "end": 265.0}
    ]

    # Example 22: "Superstition" by Stevie Wonder (Eb Minor) - Funk
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=0CFuCYNx-1g",
        "Eb Minor",
        superstition_chords
    )

    # Electronic/EDM Genre: "Animals" by Martin Garrix (F Minor)
    animals_chords = [
        # Intro (0:00-0:30)
        {"chord": "Fm:min", "start": 0.0, "end": 3.75},
        {"chord": "Bb:min", "start": 3.75, "end": 7.5},
        {"chord": "C:min", "start": 7.5, "end": 11.25},
        {"chord": "Db:maj", "start": 11.25, "end": 15.0},
        {"chord": "Fm:min", "start": 15.0, "end": 18.75},
        {"chord": "Bb:min", "start": 18.75, "end": 22.5},
        {"chord": "C:min", "start": 22.5, "end": 26.25},
        {"chord": "Db:maj", "start": 26.25, "end": 30.0},
        
        # Build-up (0:30-1:00)
        {"chord": "Fm:min", "start": 30.0, "end": 33.75},
        {"chord": "Bb:min", "start": 33.75, "end": 37.5},
        {"chord": "C:min", "start": 37.5, "end": 41.25},
        {"chord": "Db:maj", "start": 41.25, "end": 45.0},
        {"chord": "Fm:min", "start": 45.0, "end": 48.75},
        {"chord": "Bb:min", "start": 48.75, "end": 52.5},
        {"chord": "C:min", "start": 52.5, "end": 56.25},
        {"chord": "Db:maj", "start": 56.25, "end": 60.0},
        
        # Drop (1:00-1:30)
        {"chord": "Fm:min", "start": 60.0, "end": 63.75},
        {"chord": "Bb:min", "start": 63.75, "end": 67.5},
        {"chord": "C:min", "start": 67.5, "end": 71.25},
        {"chord": "Db:maj", "start": 71.25, "end": 75.0},
        {"chord": "Fm:min", "start": 75.0, "end": 78.75},
        {"chord": "Bb:min", "start": 78.75, "end": 82.5},
        {"chord": "C:min", "start": 82.5, "end": 86.25},
        {"chord": "Db:maj", "start": 86.25, "end": 90.0},
        
        # Breakdown (1:30-2:00)
        {"chord": "Ab:maj", "start": 90.0, "end": 93.75},
        {"chord": "Eb:maj", "start": 93.75, "end": 97.5},
        {"chord": "Fm:min", "start": 97.5, "end": 101.25},
        {"chord": "Db:maj", "start": 101.25, "end": 105.0},
        {"chord": "Ab:maj", "start": 105.0, "end": 108.75},
        {"chord": "Eb:maj", "start": 108.75, "end": 112.5},
        {"chord": "Fm:min", "start": 112.5, "end": 116.25},
        {"chord": "Db:maj", "start": 116.25, "end": 120.0},
        
        # Build-up (2:00-2:30)
        {"chord": "Fm:min", "start": 120.0, "end": 123.75},
        {"chord": "Bb:min", "start": 123.75, "end": 127.5},
        {"chord": "C:min", "start": 127.5, "end": 131.25},
        {"chord": "Db:maj", "start": 131.25, "end": 135.0},
        {"chord": "Fm:min", "start": 135.0, "end": 138.75},
        {"chord": "Bb:min", "start": 138.75, "end": 142.5},
        {"chord": "C:min", "start": 142.5, "end": 146.25},
        {"chord": "Db:maj", "start": 146.25, "end": 150.0},
        
        # Main Drop (2:30-3:00)
        {"chord": "Fm:min", "start": 150.0, "end": 153.75},
        {"chord": "Bb:min", "start": 153.75, "end": 157.5},
        {"chord": "C:min", "start": 157.5, "end": 161.25},
        {"chord": "Db:maj", "start": 161.25, "end": 165.0},
        {"chord": "Fm:min", "start": 165.0, "end": 168.75},
        {"chord": "Bb:min", "start": 168.75, "end": 172.5},
        {"chord": "C:min", "start": 172.5, "end": 176.25},
        {"chord": "Db:maj", "start": 176.25, "end": 180.0},
        
        # Second Drop (3:00-3:30)
        {"chord": "Fm:min", "start": 180.0, "end": 183.75},
        {"chord": "Bb:min", "start": 183.75, "end": 187.5},
        {"chord": "C:min", "start": 187.5, "end": 191.25},
        {"chord": "Db:maj", "start": 191.25, "end": 195.0},
        {"chord": "Fm:min", "start": 195.0, "end": 198.75},
        {"chord": "Bb:min", "start": 198.75, "end": 202.5},
        {"chord": "C:min", "start": 202.5, "end": 206.25},
        {"chord": "Db:maj", "start": 206.25, "end": 210.0},
        
        # Outro (3:30-4:00)
        {"chord": "Fm:min", "start": 210.0, "end": 213.75},
        {"chord": "Bb:min", "start": 213.75, "end": 217.5},
        {"chord": "C:min", "start": 217.5, "end": 221.25},
        {"chord": "Db:maj", "start": 221.25, "end": 225.0},
        {"chord": "Fm:min", "start": 225.0, "end": 228.75},
        {"chord": "Bb:min", "start": 228.75, "end": 232.5},
        {"chord": "C:min", "start": 232.5, "end": 236.25},
        {"chord": "Db:maj", "start": 236.25, "end": 240.0}
    ]

    # Example 23: "Animals" by Martin Garrix (F Minor) - Electronic/EDM
    collector.add_youtube_song(
        "https://www.youtube.com/watch?v=gCYcHz2k5x0",
        "F Minor",
        animals_chords
    )
    
    # Save dataset
    collector.save_dataset()
    
    # Train model
    if collector.train_model():
        print("Model trained successfully!")
    else:
        print("Model training failed.")

if __name__ == "__main__":
    main()