#!/usr/bin/env python3
import argparse
import time
import sys
import subprocess
import os
from chord_detector import ChordProgressionDetector
from piano_visualizer_integration import PianoVisualizerIntegration, export_for_piano_visualizer

def main():
    parser = argparse.ArgumentParser(description='Analyze YouTube video and send chord data to piano visualizer')
    parser.add_argument('url', type=str, help='YouTube URL of the video to analyze')
    parser.add_argument('--host', type=str, default='localhost', help='Piano visualizer WebSocket host')
    parser.add_argument('--port', type=int, default=8080, help='Piano visualizer WebSocket port')
    parser.add_argument('--export', type=str, help='Export chord data to file without connecting to visualizer')
    parser.add_argument('--play', action='store_true', help='Start playback automatically')
    
    args = parser.parse_args()
    
    # Create a detector instance
    detector = ChordProgressionDetector()
    
    print(f"Analyzing chord progression from: {args.url}")
    print("This may take a few minutes depending on the length of the video...")
    
    # Analyze the video
    results = detector.analyze_youtube_video(args.url, visualize=True)
    
    if results is None:
        print("Analysis failed. Please check the URL and try again.")
        sys.exit(1)
    
    # Print basic information
    print(f"\nAnalysis complete! Detected {len(results['chord_sequence'])} chords.")
    print(f"Estimated key: {results['estimated_key']}")
    
    # Export data if requested
    if args.export:
        export_for_piano_visualizer(
            results['chord_sequence'], 
            results['estimated_key'], 
            args.export
        )
        print(f"Chord data exported to {args.export}")
        return
    
    # Connect to piano visualizer
    piano_viz = PianoVisualizerIntegration(host=args.host, port=args.port)
    
    print(f"\nAttempting to connect to piano visualizer at {args.host}:{args.port}...")
    if not piano_viz.connect():
        print("Could not connect to piano visualizer. Please make sure it's running.")
        
        # Offer to export the data instead
        export_option = input("Would you like to export the chord data to a file instead? (y/n): ")
        if export_option.lower() == 'y':
            export_file = input("Enter filename to export to: ")
            export_for_piano_visualizer(
                results['chord_sequence'], 
                results['estimated_key'], 
                export_file
            )
            print(f"Chord data exported to {export_file}")
        
        sys.exit(1)
    
    # Send song data to visualizer
    print("Sending chord data to piano visualizer...")
    piano_viz.send_metadata(results['estimated_key'])
    piano_viz.send_chord_data(results['chord_sequence'])
    
    # Ask user if they want to play the audio with the visualization
    if args.play or input("\nWould you like to play the audio with synchronized visualization? (y/n): ").lower() == 'y':
        # Get the audio file path
        audio_path = detector.download_youtube_audio(args.url)
        
        if not audio_path or not os.path.exists(audio_path):
            print("Could not find audio file. Playback not available.")
            sys.exit(1)
        
        print("\nStarting playback. Press Ctrl+C to stop.")
        
        try:
            # Start chord playback in visualizer
            piano_viz.start_playback(results['chord_sequence'])
            
            # Play the audio file using a suitable player
            if sys.platform == "win32":
                subprocess.Popen(["start", audio_path], shell=True)
            elif sys.platform == "darwin":
                subprocess.Popen(["afplay", audio_path])
            else:
                subprocess.Popen(["ffplay", "-nodisp", "-autoexit", audio_path])
            
            # Wait until playback is complete
            total_duration = results['chord_sequence'][-1]['end_time'] if results['chord_sequence'] else 0
            for i in range(int(total_duration) + 1):
                time.sleep(1)
                sys.stdout.write(f"\rPlayback: {i}/{int(total_duration)} seconds")
                sys.stdout.flush()
            
            print("\nPlayback complete!")
            
        except KeyboardInterrupt:
            print("\nPlayback stopped by user.")
        finally:
            piano_viz.stop_playback()
            piano_viz.disconnect()
            
            # Clean up the audio file
            if audio_path and os.path.exists(audio_path):
                os.remove(audio_path)
    
    print("\nDisconnected from piano visualizer.")

if __name__ == "__main__":
    main()