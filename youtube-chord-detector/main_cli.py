#!/usr/bin/env python3
import argparse
import sys
from chord_detector import ChordProgressionDetector

def main():
    parser = argparse.ArgumentParser(description='Detect chord progressions from YouTube videos')
    parser.add_argument('url', type=str, help='YouTube URL of the video to analyze')
    parser.add_argument('--no-viz', action='store_true', help='Disable visualization generation')
    parser.add_argument('--output', '-o', type=str, help='Output file for chord analysis results')
    
    args = parser.parse_args()
    
    # Create a detector instance
    detector = ChordProgressionDetector()
    
    print(f"Analyzing chord progression from: {args.url}")
    print("This may take a few minutes depending on the length of the video...")
    
    # Analyze the video
    results = detector.analyze_youtube_video(args.url, visualize=not args.no_viz)
    
    if results is None:
        print("Analysis failed. Please check the URL and try again.")
        sys.exit(1)
    
    # Print chord sequence
    print("\n===== Detected Chord Sequence =====")
    for i, chord_info in enumerate(results['chord_sequence']):
        print(f"{i+1:3d}. {chord_info['chord']:8s} ({chord_info['start_time']:.2f}s - {chord_info['end_time']:.2f}s, {chord_info['duration']:.2f}s)")
    
    # Print estimated key
    print(f"\n===== Estimated Key: {results['estimated_key']} =====")
    
    # Print detected progressions
    print("\n===== Detected Chord Progressions =====")
    if not results['progressions']:
        print("No clear chord progressions detected.")
    else:
        for i, prog in enumerate(results['progressions']):
            chord_names = ' → '.join(prog['progression'])
            print(f"{i+1}. {chord_names}")
            print(f"   Occurs {prog['count']} times, {prog['length']} chords")
            if 'function' in prog and prog['function'] != "Unknown":
                print(f"   Likely function: {prog['function']}")
            print()
    
    # Save results to file if requested
    if args.output:
        import json
        
        # Convert sequence information to serializable format
        serializable_results = {
            'chord_sequence': [
                {
                    'chord': c['chord'],
                    'start_time': c['start_time'],
                    'end_time': c['end_time'],
                    'duration': c['duration']
                }
                for c in results['chord_sequence']
            ],
            'progressions': [
                {
                    'progression': list(p['progression']),
                    'count': p['count'],
                    'length': p.get('length', len(p['progression'])),
                    'function': p.get('function', 'Unknown')
                }
                for p in results['progressions']
            ],
            'estimated_key': results['estimated_key']
        }
        
        with open(args.output, 'w') as f:
            json.dump(serializable_results, f, indent=2)
        
        print(f"\nResults saved to {args.output}")
    
    print("\nAnalysis complete!")
    if not args.no_viz:
        print("Visualization saved as 'chord_analysis.png'")
    
if __name__ == "__main__":
    main()