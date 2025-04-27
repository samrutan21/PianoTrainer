import json
import logging
import threading
import time
import os
import signal
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import websocket
from chord_detector import ChordProgressionDetector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("chord_service")

class ChordAnalysisService:
    """
    Service that provides chord analysis capabilities to the piano visualizer.
    """
    
    def __init__(self, host='localhost', port=8765):
        self.host = host
        self.port = port
        self.detector = ChordProgressionDetector()
        self.current_analysis_thread = None
        self.server = None
        self.is_running = False
        self.websocket_clients = set()
        
    def start(self):
        """Start the chord analysis service."""
        # Start HTTP server in a separate thread
        self.is_running = True
        server_thread = threading.Thread(target=self._run_server)
        server_thread.daemon = True
        server_thread.start()
        
        logger.info(f"Chord Analysis Service started on http://{self.host}:{self.port}")
        
        # Keep the main thread running
        try:
            while self.is_running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received, shutting down...")
            self.stop()
            
    def stop(self):
        """Stop the chord analysis service."""
        self.is_running = False
        
        # Stop any ongoing analysis
        if self.current_analysis_thread and self.current_analysis_thread.is_alive():
            logger.info("Stopping current analysis...")
            
        # Stop HTTP server
        if self.server:
            logger.info("Stopping HTTP server...")
            self.server.shutdown()
            
        logger.info("Chord Analysis Service stopped")
            
    def _run_server(self):
        """Run the HTTP server."""
        class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
            """Handle requests in a separate thread."""
            pass
            
        class ChordRequestHandler(BaseHTTPRequestHandler):
            """Handle HTTP requests for chord analysis."""
            
            def do_GET(self):
                """Handle GET requests (health check)."""
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'status': 'ok',
                    'message': 'Chord Analysis Service is running'
                }
                
                self.wfile.write(json.dumps(response).encode())
                
            def do_OPTIONS(self):
                """Handle OPTIONS requests (CORS)."""
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                
            def do_POST(self):
                """Handle POST requests (analyze chords)."""
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                try:
                    request = json.loads(post_data.decode())
                    
                    # Process based on request type
                    if self.path == '/analyze':
                        # Forward to the outer class instance
                        threading.Thread(
                            target=self.server.outer_instance.analyze_youtube_url,
                            args=(request.get('url'),)
                        ).start()
                        
                        self.send_response(202)  # Accepted
                        self.send_header('Content-type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        
                        response = {
                            'status': 'processing',
                            'message': 'Chord analysis started'
                        }
                        
                    else:
                        self.send_response(404)
                        self.send_header('Content-type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        
                        response = {
                            'status': 'error',
                            'message': 'Unknown endpoint'
                        }
                        
                    self.wfile.write(json.dumps(response).encode())
                    
                except json.JSONDecodeError:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    
                    response = {
                        'status': 'error',
                        'message': 'Invalid JSON'
                    }
                    
                    self.wfile.write(json.dumps(response).encode())
                    
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    
                    response = {
                        'status': 'error',
                        'message': str(e)
                    }
                    
                    self.wfile.write(json.dumps(response).encode())
        
        # Extend the server class to store a reference to this instance
        server_class = ThreadedHTTPServer
        server_class.outer_instance = self
        
        # Create and start the server
        self.server = server_class((self.host, self.port), ChordRequestHandler)
        logger.info(f"HTTP server started on http://{self.host}:{self.port}")
        self.server.serve_forever()
        
    def register_websocket_client(self, ws):
        """Register a new WebSocket client."""
        self.websocket_clients.add(ws)
        
    def unregister_websocket_client(self, ws):
        """Unregister a WebSocket client."""
        if ws in self.websocket_clients:
            self.websocket_clients.remove(ws)
            
    def send_to_clients(self, message):
        """Send a message to all connected clients."""
        clients_to_remove = set()
        for client in self.websocket_clients:
            try:
                client.send(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending to client: {e}")
                clients_to_remove.add(client)
                
        # Remove any clients that errored
        for client in clients_to_remove:
            self.unregister_websocket_client(client)

    def analyze_youtube_url(self, url):
        """
        Analyze a YouTube URL for chord progressions.
        
        Args:
            url: YouTube URL to analyze
        """
        if not url or not url.startswith("http"):
            logger.error(f"Invalid YouTube URL: {url}")
            self.send_to_clients({
                "type": "status_update", 
                "status": "error", 
                "message": "Invalid YouTube URL"
            })
            return
            
        # Store thread reference to allow cancellation
        self.current_analysis_thread = threading.current_thread()
        
        try:
            # Send status updates during analysis
            self.send_to_clients({
                "type": "status_update", 
                "status": "downloading", 
                "progress": 0, 
                "message": "Downloading audio from YouTube..."
            })
            
            # Download audio using the detector
            audio_path = self.detector.download_youtube_audio(url)
            if not audio_path:
                self.send_to_clients({
                    "type": "status_update", 
                    "status": "error", 
                    "message": "Failed to download audio"
                })
                return
                
            self.send_to_clients({
                "type": "status_update", 
                "status": "analyzing", 
                "progress": 20, 
                "message": "Extracting audio features..."
            })
            
            # Analyze the YouTube video (don't generate visualization)
            results = self.detector.analyze_youtube_video(url, visualize=False)
            
            if results is None:
                self.send_to_clients({
                    "type": "status_update", 
                    "status": "error", 
                    "message": "Analysis failed"
                })
                return
                
            self.send_to_clients({
                "type": "status_update", 
                "status": "processing", 
                "progress": 80, 
                "message": "Processing chord data..."
            })
            
            # Format and send metadata
            metadata = {
                "type": "metadata",
                "key": results["estimated_key"],
                "source": "youtube",
                "url": url
            }
            
            self.send_to_clients(metadata)
            
            # Format and send chord sequence
            # Adapt chords to the piano's available range (A3-B5)
            limited_range_chords = self.limit_chords_to_piano_range(results["chord_sequence"])
            
            chord_data = {
                "type": "chord_sequence",
                "chords": limited_range_chords
            }
            
            self.send_to_clients(chord_data)
            
            # Send completion status
            self.send_to_clients({
                "type": "status_update", 
                "status": "complete", 
                "progress": 100, 
                "message": "Analysis complete"
            })
            
            # Clean up audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
                
        except Exception as e:
            logger.error(f"Error analyzing YouTube URL: {e}")
            self.send_to_clients({
                "type": "status_update", 
                "status": "error", 
                "message": f"Analysis error: {str(e)}"
            })
            
        finally:
            self.current_analysis_thread = None
            
    def limit_chords_to_piano_range(self, chord_sequence):
        """
        Adjust chords to fit within the piano's A3-B5 range.
        
        Args:
            chord_sequence: Original chord sequence
            
        Returns:
            Adjusted chord sequence with notes in the piano's range
        """
        chord_to_notes = ChordToNotesConverter()
        formatted_chords = []
        
        # Define the piano's range
        min_note = 57  # A3 in MIDI
        max_note = 83  # B5 in MIDI
        
        for chord_info in chord_sequence:
            if chord_info["chord"] == "N":  # Skip "no chord"
                continue
                
            # Get MIDI notes for the chord
            original_midi_notes = chord_to_notes.chord_to_midi_notes(chord_info["chord"])
            
            # Adjust notes to fit within the piano's range
            adjusted_midi_notes = []
            for note in original_midi_notes:
                # Move notes that are too low up by octaves
                while note < min_note:
                    note += 12
                    
                # Move notes that are too high down by octaves
                while note > max_note:
                    note -= 12
                    
                # Only add the note if it's now in range
                if min_note <= note <= max_note:
                    adjusted_midi_notes.append(note)
            
            # Only include the chord if it has at least one valid note
            if adjusted_midi_notes:
                formatted_chords.append({
                    "time": chord_info["start_time"],
                    "duration": chord_info["duration"],
                    "notes": adjusted_midi_notes,
                    "chord": chord_info["chord"]
                })
                
        return formatted_chords


class ChordToNotesConverter:
    """
    Utility class to convert chord names to MIDI notes.
    """
    
    def __init__(self):
        # Map root notes to MIDI numbers (C4 = 60)
        self.root_to_midi = {
            "C": 60, "C#": 61, "D": 62, "D#": 63, "E": 64, 
            "F": 65, "F#": 66, "G": 67, "G#": 68, "A": 69, 
            "A#": 70, "B": 71
        }
        
        # Intervals for different chord types (semitones from root)
        self.chord_intervals = {
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
        
    def chord_to_midi_notes(self, chord_name):
        """
        Convert a chord name to a list of MIDI note numbers.
        
        Args:
            chord_name: Chord name (e.g., "C:maj", "G:7")
            
        Returns:
            List of MIDI note numbers
        """
        if chord_name == "N" or ":" not in chord_name:
            return []
            
        root, chord_type = chord_name.split(":")
        
        # Get the root note MIDI number
        root_midi = self.root_to_midi.get(root, 60)
        
        # Get the intervals for this chord type
        intervals = self.chord_intervals.get(chord_type, self.chord_intervals["maj"])
        
        # Generate MIDI notes for the chord
        return [root_midi + interval for interval in intervals]


class WebSocketHandler:
    """WebSocket handler to manage client connections."""
    
    def __init__(self, host='localhost', port=8766, service=None):
        self.host = host
        self.port = port
        self.service = service
        self.server = None
        self.is_running = False
        
    def start(self):
        """Start the WebSocket server."""
        from websocket_server import WebsocketServer
        
        self.is_running = True
        self.server = WebsocketServer(host=self.host, port=self.port)
        
        # Set callbacks
        self.server.set_fn_new_client(self.new_client)
        self.server.set_fn_client_left(self.client_left)
        self.server.set_fn_message_received(self.message_received)
        
        # Start the server
        server_thread = threading.Thread(target=self.server.run_forever)
        server_thread.daemon = True
        server_thread.start()
        
        logger.info(f"WebSocket server started on ws://{self.host}:{self.port}")
        
    def stop(self):
        """Stop the WebSocket server."""
        if self.server:
            self.server.shutdown_gracefully()
            self.is_running = False
            logger.info("WebSocket server stopped")
            
    def new_client(self, client, server):
        """Handle new client connection."""
        logger.info(f"New client connected: {client['id']}")
        
        # Register with the service
        if self.service:
            self.service.register_websocket_client(client)
            
        # Send welcome message
        self.server.send_message(client, json.dumps({
            "type": "service_info",
            "name": "Chord Analysis Service",
            "version": "1.0.0"
        }))
            
    def client_left(self, client, server):
        """Handle client disconnection."""
        logger.info(f"Client disconnected: {client['id']}")
        
        # Unregister from the service
        if self.service:
            self.service.unregister_websocket_client(client)
            
    def message_received(self, client, server, message):
        """Handle message from client."""
        logger.info(f"Message from client {client['id']}: {message}")
        
        try:
            data = json.loads(message)
            
            # Process commands from clients
            if data.get("type") == "command":
                command = data.get("command")
                
                if command == "analyze_youtube":
                    url = data.get("url")
                    if url and self.service:
                        logger.info(f"Received analyze command for URL: {url}")
                        threading.Thread(
                            target=self.service.analyze_youtube_url,
                            args=(url,)
                        ).start()
                    else:
                        logger.warning("Received analyze command without URL or service")
                        
                else:
                    logger.warning(f"Unknown command: {command}")
                    
        except json.JSONDecodeError:
            logger.error("Received invalid JSON message")
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Start Chord Analysis Service')
    parser.add_argument('--host', type=str, default='localhost', 
                        help='Host to bind the server to')
    parser.add_argument('--http-port', type=int, default=8765, 
                        help='Port for HTTP server')
    parser.add_argument('--ws-port', type=int, default=8766, 
                        help='Port for WebSocket server')
    
    args = parser.parse_args()
    
    # Create and start the service
    service = ChordAnalysisService(host=args.host, port=args.http_port)
    
    # Create and start the WebSocket handler
    ws_handler = WebSocketHandler(host=args.host, port=args.ws_port, service=service)
    ws_handler.start()
    
    # Handle SIGINT (Ctrl+C) gracefully
    def signal_handler(sig, frame):
        logger.info("Received SIGINT, shutting down...")
        ws_handler.stop()
        service.stop()
        sys.exit(0)
        
    signal.signal(signal.SIGINT, signal_handler)
    
    # Start the service
    service.start()
    

if __name__ == "__main__":
    main()