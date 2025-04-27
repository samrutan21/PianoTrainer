Example Use Cases
Analyzing Popular Songs
The YouTube Chord Progression Detector can analyze popular songs to identify their chord progressions, which can be valuable for musicians, producers, and music theorists. Here are some example use cases:
1. Learning Music Theory from Popular Songs
Analyze hit songs to understand why they're catchy or emotional:
bashCopypython main_cli.py "https://www.youtube.com/watch?v=VIDEO_ID_OF_HIT_SONG" -o "hit_song_analysis.json"
The results will show:

The song's key
Common chord progressions used
When and how often these progressions occur
Music theory explanations of the progressions (e.g., "I-V-vi-IV (Pop progression)")

2. Songwriting Inspiration
Find chord progressions from your favorite artists:
bashCopypython main_cli.py "https://www.youtube.com/watch?v=VIDEO_ID_OF_INSPIRATION" -o "inspiration.json"
Use the detected progressions as a starting point for your own compositions, or analyze multiple songs from an artist to understand their harmonic language.
3. Cover Song Preparation
When learning to play a song without available sheet music:
bashCopypython main_cli.py "https://www.youtube.com/watch?v=VIDEO_ID_OF_SONG_TO_COVER"
Get a precise breakdown of:

Which chords are played
When chord changes happen (with timestamps)
The song's key and progression patterns

Advanced Use Cases
4. Music Genre Analysis
Compare chord progressions across different genres:
bashCopypython main_cli.py "https://www.youtube.com/watch?v=VIDEO_ID_BLUES" -o "blues.json"
python main_cli.py "https://www.youtube.com/watch?v=VIDEO_ID_JAZZ" -o "jazz.json"
python main_cli.py "https://www.youtube.com/watch?v=VIDEO_ID_POP" -o "pop.json"
Create a comparative analysis of chord usage patterns in different genres.
5. Music Production Reference
During music production, analyze reference tracks:
bashCopypython main_cli.py "https://www.youtube.com/watch?v=VIDEO_ID_REFERENCE" -o "reference.json"
Use the analysis to ensure your production follows similar harmonic patterns to your reference tracks.
6. Educational Tool
For music teachers and students:
bashCopypython main_cli.py "https://www.youtube.com/watch?v=VIDEO_ID_LESSON" --no-viz -o "lesson.json"
Create lesson materials showing how music theory concepts are applied in real songs.
Output Example
The tool generates visualization and structured data output like:
jsonCopy{
  "chord_sequence": [
    {
      "chord": "C:maj",
      "start_time": 0.0,
      "end_time": 3.25,
      "duration": 3.25
    },
    {
      "chord": "G:maj",
      "start_time": 3.25,
      "end_time": 6.5,
      "duration": 3.25
    },
    {
      "chord": "A:min",
      "start_time": 6.5,
      "end_time": 9.75,
      "duration": 3.25
    },
    {
      "chord": "F:maj",
      "start_time": 9.75,
      "end_time": 13.0,
      "duration": 3.25
    }
  ],
  "progressions": [
    {
      "progression": ["C:maj", "G:maj", "A:min", "F:maj"],
      "count": 4,
      "length": 4,
      "function": "I-V-vi-IV (Pop progression)"
    }
  ],
  "estimated_key": "C Major"
}
This data can be used for further analysis or integrated into music composition software.