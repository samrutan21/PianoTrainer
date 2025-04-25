Piano Visualizer Integration
This guide explains how to integrate the YouTube Chord Progression Detector with your Java, HTML, and CSS piano visualizer application.
Overview
The integration enables your piano visualizer to:

Receive detected chord data from YouTube videos
Visualize chords on your digital piano interface
Play chords in sync with the original audio
Show chord progressions and music theory information

Integration Methods
There are two ways to integrate with your piano visualizer:
1. WebSocket Connection (Real-time)
The chord detector connects directly to your piano visualizer application via WebSockets, sending chord data and playback events in real-time. This is ideal for interactive use.
2. File Export (Offline)
The chord detector exports a JSON file containing the chord sequence, which your piano visualizer can load. This is simpler to implement and good for offline use.
Setup Instructions
Prerequisites

Your piano visualizer should be running and accessible
For WebSocket integration, your visualizer needs a WebSocket server endpoint
For file export, your visualizer needs the ability to load JSON files

Using WebSocket Integration

Start your piano visualizer application

Ensure it's running and listening for WebSocket connections on the configured port


Run the chord detector with visualizer connection
bashCopypython piano_visualizer_demo.py "https://www.youtube.com/watch?v=YOUR_VIDEO_ID" --host localhost --port 8080

Options

--host: The hostname where your piano visualizer is running (default: localhost)
--port: The WebSocket port your visualizer is listening on (default: 8080)
--play: Automatically start playback after analysis



Using File Export

Export chord data to a JSON file
bashCopypython piano_visualizer_demo.py "https://www.youtube.com/watch?v=YOUR_VIDEO_ID" --export chord_data.json

Load the JSON file in your piano visualizer

Implement a file loader in your visualizer that can parse the exported JSON format
Use the timing information to sync visual feedback with audio playback



Implementing the WebSocket Server
Your piano visualizer needs to implement a WebSocket server endpoint to receive chord data. See the WebSocket Bridge Specification for detailed protocol information.
Simplified Java Implementation Example
javaCopy@ServerEndpoint("/chords")
public class ChordWebSocketEndpoint {
    
    @OnMessage
    public void onMessage(String message, Session session) {
        JSONObject jsonMessage = new JSONObject(message);
        String type = jsonMessage.getString("type");
        
        if (type.equals("chord_sequence")) {
            JSONArray chords = jsonMessage.getJSONArray("chords");
            // Process chord data and update your piano visualizer
        }
        else if (type.equals("playback_event")) {
            // Handle playback events
        }
    }
}
Piano Key Mapping
Chord data includes MIDI note numbers for each chord:

Middle C is MIDI note 60
Each higher semitone adds 1 (C# = 61, D = 62, etc.)
Notes can be displayed on your piano interface at the appropriate positions

Synchronization
For accurate playback synchronization:

The chord detector can play the YouTube audio
Simultaneously, it sends "chord_active" events at the appropriate times
Your visualizer highlights the keys corresponding to the active chord
This provides a synchronized piano visualization with the original audio

Customization
You can modify the integration to better fit your piano visualizer's features:

Adjust the coloring of keys based on chord function
Display chord names and progression information
Add music theory annotations from the analysis
Create practice modes that slow down or repeat difficult progressions

Troubleshooting

Connection issues: Verify host, port, and that your WebSocket server is running
Sync problems: Check timing configurations and ensure smooth playback
Visualization errors: Verify the chord-to-key mapping in your visualizer

Further Development
Consider extending the integration with:

Two-way communication to allow controlling playback from your visualizer
Custom chord voicing options for different piano styles
Integration with your visualizer's learning features
Adding visual cues for finger positions and hand movements