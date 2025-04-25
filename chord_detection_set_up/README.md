YouTube Chord Progression Detector
This Python project detects musical chord progressions from songs on YouTube. It downloads audio from YouTube videos, analyzes the audio to identify chords, and detects common chord progressions.
Features

Download audio from YouTube videos
Extract chromagram features from audio
Identify chords based on pitch class energy distribution
Detect common chord progressions
Visualize chord analysis with chromagrams and chord segmentation
Handle major and minor chords in all 12 keys

Requirements

Python 3.7+
numpy
librosa (for audio processing)
pytube (for YouTube downloads)
scipy
scikit-learn
matplotlib

Installation

Clone this repository or download the source code
Install the required dependencies:

bashCopypip install -r requirements.txt
Usage
Basic Usage
pythonCopyfrom chord_detector import ChordProgressionDetector

# Create a detector instance
detector = ChordProgressionDetector()

# Analyze a YouTube video
youtube_url = "https://www.youtube.com/watch?v=YOUR_VIDEO_ID"
results = detector.analyze_youtube_video(youtube_url)

# Print the results
if results is not None:
    # Print chord sequence
    print("\nDetected Chord Sequence:")
    for chord_info in results['chord_sequence']:
        print(f"{chord_info['chord']} ({chord_info['start_time']:.2f}s - {chord_info['end_time']:.2f}s)")
    
    # Print estimated key
    print(f"\nEstimated Key: {results['estimated_key']}")
    
    # Print detected progressions
    print("\nDetected Chord Progressions:")
    for prog in results['progressions']:
        print(f"{' → '.join(prog['progression'])} (occurs {prog['count']} times)")
        if 'function' in prog:
            print(f"Musical function: {prog['function']}")
Command Line Usage
You can also run the script directly from the command line:
bashCopypython main_cli.py "https://www.youtube.com/watch?v=YOUR_VIDEO_ID"
Command line options:
Copyusage: main_cli.py [-h] [--no-viz] [--output OUTPUT] url

Detect chord progressions from YouTube videos

positional arguments:
  url                   YouTube URL of the video to analyze

optional arguments:
  -h, --help            show this help message and exit
  --no-viz              Disable visualization generation
  --output OUTPUT, -o OUTPUT
                        Output file for chord analysis results
How It Works

Audio Download: The program downloads the audio track from the YouTube video using pytube.
Feature Extraction: It extracts chroma features (pitch class energy distribution) using librosa.
Chord Identification: The program matches the chroma features against chord templates to identify chords.
Pattern Detection: It analyzes the chord sequence to find common patterns and progressions.
Visualization: Optionally generates visualizations of the chord analysis.

Limitations

The chord detection is not perfect and may struggle with complex harmonies
Performance may vary depending on the audio quality and musical complexity
Detects a wide range of chord types including major, minor, dominant 7th, major 7th, minor 7th, diminished, augmented, suspended, and extended chords
May struggle with music that has strong non-harmonic elements

Features Added

Detection for complex chord types (7ths, suspended, diminished, augmented, extended chords)
Musical key detection using the Krumhansl-Schmuckler key-finding algorithm
Music theory analysis to identify common progression types (e.g., Blues, Jazz ii-V-I)
Enhanced chord identification with context-aware smoothing
Improved visualization with chord type coloring and distribution analysis

Future Improvements

Add machine learning models for improved chord recognition
Add support for local audio files
Create a web interface
Implement more sophisticated key change detection
Add MIDI export functionality

License
This project is open source and available under the MIT License.