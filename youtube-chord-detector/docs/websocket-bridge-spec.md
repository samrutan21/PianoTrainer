Piano Visualizer WebSocket Bridge Specification
This document outlines the WebSocket API specification for connecting the chord detection system with your Java/HTML/CSS piano visualizer application.
WebSocket Server Configuration
Your piano visualizer application should implement a WebSocket server that listens for chord data. The chord detection system will connect as a client.
Connection Endpoint
Copyws://[host]:[port]/chords
Default: ws://localhost:8080/chords
Message Format
All messages are sent as JSON strings. Each message has a type field that indicates its purpose.
Message Types

Metadata Message
jsonCopy{
  "type": "metadata",
  "key": "C Major",
  "tempo": 120.0
}

Chord Sequence Message
jsonCopy{
  "type": "chord_sequence",
  "chords": [
    {
      "time": 0.0,
      "duration": 3.25,
      "notes": [60, 64, 67],
      "chord": "C:maj"
    },
    {
      "time": 3.25,
      "duration": 3.25,
      "notes": [67, 71, 74],
      "chord": "G:maj"
    }
  ]
}

Playback Event Message
jsonCopy{
  "type": "playback_event",
  "event": "playback_started",
  "time": 0.0
}
jsonCopy{
  "type": "playback_event",
  "event": "chord_active",
  "chord_index": 5,
  "time": 15.75
}
jsonCopy{
  "type": "playback_event",
  "event": "playback_ended",
  "time": 180.5
}


Implementation in Java
Your Java-based piano visualizer should implement the server side of this WebSocket connection. Here's a simplified example of how to implement this using Java WebSockets:
javaCopyimport javax.websocket.*;
import javax.websocket.server.ServerEndpoint;
import org.json.JSONObject;

@ServerEndpoint("/chords")
public class PianoVisualizerWebSocket {
    
    @OnOpen
    public void onOpen(Session session) {
        System.out.println("WebSocket connection opened: " + session.getId());
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        try {
            JSONObject jsonMessage = new JSONObject(message);
            String messageType = jsonMessage.getString("type");
            
            switch (messageType) {
                case "metadata":
                    handleMetadata(jsonMessage);
                    break;
                case "chord_sequence":
                    handleChordSequence(jsonMessage);
                    break;
                case "playback_event":
                    handlePlaybackEvent(jsonMessage);
                    break;
                default:
                    System.out.println("Unknown message type: " + messageType);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleMetadata(JSONObject metadata) {
        String key = metadata.getString("key");
        double tempo = metadata.getDouble("tempo");
        
        // Update your application's UI with the key and tempo
        System.out.println("Received metadata - Key: " + key + ", Tempo: " + tempo);
    }

    private void handleChordSequence(JSONObject chordData) {
        // Process and store the chord sequence
        System.out.println("Received chord sequence data");
        
        // Your implementation to store the chord data and prepare the piano visualization
    }

    private void handlePlaybackEvent(JSONObject event) {
        String eventType = event.getString("event");
        double time = event.getDouble("time");
        
        switch (eventType) {
            case "playback_started":
                // Start your visualization
                break;
            case "chord_active":
                int chordIndex = event.getInt("chord_index");
                // Update your visualization to highlight the current chord
                break;
            case "playback_ended":
                // Reset your visualization
                break;
        }
    }

    @OnClose
    public void onClose(Session session) {
        System.out.println("WebSocket connection closed: " + session.getId());
    }

    @OnError
    public void onError(Throwable error) {
        error.printStackTrace();
    }
}
File Export Format
If direct WebSocket connection isn't possible, the chord detection system can export a JSON file with the chord data that your piano visualizer can load:
jsonCopy{
  "metadata": {
    "key": "C Major",
    "tempo": 120.0
  },
  "chords": [
    {
      "time": 0.0,
      "duration": 3.25,
      "chord": "C:maj"
    },
    {
      "time": 3.25,
      "duration": 3.25,
      "chord": "G:maj"
    }
  ]
}
MIDI Note Mapping
For the piano visualization, you'll need to map chord names to actual piano keys. The notes array in the chord message contains MIDI note numbers that correspond to the keys that should be highlighted:

Middle C is MIDI note 60
Each semitone higher is +1 to the MIDI note number
Each semitone lower is -1 to the MIDI note number

For example, a C major triad (C-E-G) would be represented as MIDI notes [60, 64, 67].
Synchronization
The chord detection system manages timing based on the time field in each chord object, which represents the number of seconds from the start of the audio. For accurate synchronization:

The piano visualizer should buffer all chord data when received
Wait for the "playback_started" event to begin visualization
Use the "chord_active" events to highlight chords at the right time
End visualization on the "playback_ended" event

This approach ensures that the piano visualization stays in sync with the audio playback.