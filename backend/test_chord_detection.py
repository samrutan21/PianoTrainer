import os
import sys
from chord_detector import ChordProgressionDetector
import matplotlib.pyplot as plt

def test_chord_detection(youtube_url=None, audio_file=None):
    """
    Test the chord detection system with either a YouTube URL or local audio file.
    
    Args:
        youtube_url (str): YouTube URL to analyze
        audio_file (str): Path to local audio file to analyze
    """
    # Initialize the chord detector
    detector = ChordProgressionDetector()
    
    try:
        if youtube_url:
            print(f"Analyzing YouTube video: {youtube_url}")
            # Download and analyze the YouTube video
            results = detector.analyze_youtube_video(youtube_url)
            if results is None:
                print("Failed to analyze YouTube video. Please check the URL and try again.")
                return
        elif audio_file:
            print(f"Analyzing audio file: {audio_file}")
            # Load and analyze the local audio file
            results = detector.analyze_audio_file(audio_file)
            if results is None:
                print("Failed to analyze audio file. Please check the file path and try again.")
                return
        else:
            raise ValueError("Either youtube_url or audio_file must be provided")
        
        # Print results
        print("\nAnalysis Results:")
        print(f"Estimated Key: {results['estimated_key']}")
        
        # Print chord sequence
        print("\nDetected Chord Sequence:")
        for chord_info in results['chord_sequence']:
            print(f"{chord_info['chord']} ({chord_info['start_time']:.2f}s - {chord_info['end_time']:.2f}s)")
        
        # Print detected progressions
        print("\nDetected Chord Progressions:")
        for prog in results['progressions']:
            print(f"{' → '.join(prog['progression'])} (occurs {prog['count']} times)")
        
        # Visualize the results if visualization was successful
        if 'visualization_path' in results:
            print(f"\nVisualization saved as: {results['visualization_path']}")
        
    except Exception as e:
        print(f"Error during analysis: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Example usage
    if len(sys.argv) > 1:
        # If a YouTube URL is provided as command line argument
        test_chord_detection(youtube_url=sys.argv[1])
    else:
        # Interactive mode
        print("Chord Detection Test")
        print("1. Analyze YouTube video")
        print("2. Analyze local audio file")
        choice = input("Enter your choice (1 or 2): ")
        
        if choice == "1":
            url = input("Enter YouTube URL: ")
            test_chord_detection(youtube_url=url)
        elif choice == "2":
            file_path = input("Enter path to audio file: ")
            test_chord_detection(audio_file=file_path)
        else:
            print("Invalid choice") 