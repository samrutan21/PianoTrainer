#!/usr/bin/env python3
import json
import argparse
import asyncio
import websockets
import time
import threading
import traceback
import logging
from chord_detector import ChordProgressionDetector

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('websocket_server')

class PianoVisualizerServer:
    def __init__(self, host='localhost', port=8080):
        self.host = host
        self.port = port
        self.clients = set()
        self.detector = ChordProgressionDetector()
        self.active_detections = {}  # Track ongoing detections by client
        
    async def register(self, websocket):
        """Register a client websocket connection"""
        client_id = id(websocket)
        self.clients.add(websocket)
        logger.info(f"Client connected: {client_id}")
        return client_id
        
    async def unregister(self, websocket):
        """Unregister a client websocket connection"""
        client_id = id(websocket)
        self.clients.remove(websocket)
        
        # Cancel any active detection for this client
        if client_id in self.active_detections:
            self.active_detections[client_id]['cancel'] = True
            del self.active_detections[client_id]
            
        logger.info(f"Client disconnected: {client_id}")
        
    async def handle_message(self, websocket, message):
        """Handle incoming messages from clients"""
        client_id = id(websocket)
        
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            logger.info(f"Received {message_type} message from client {client_id}")
            
            if message_type == 'detection_request':
                # Process YouTube detection request
                youtube_url = data.get('url')
                
                if not youtube_url:
                    await self.send_error(websocket, "Missing YouTube URL")
                    return
                
                # Initialize detection tracking for this client
                self.active_detections[client_id] = {
                    'cancel': False,
                    'progress': 0
                }
                
                # Run detection in a separate thread to avoid blocking
                detection_thread = threading.Thread(
                    target=self.run_chord_detection,
                    args=(websocket, youtube_url, client_id)
                )
                detection_thread.daemon = True
                detection_thread.start()
                
            elif message_type == 'playback_control':
                # Handle playback control messages
                command = data.get('command')
                
                if command == 'play':
                    # Handle play command - could start audio playback or chord sequence
                    pass
                elif command == 'stop':
                    # Handle stop command
                    pass
                elif command == 'seek':
                    # Handle seek command
                    position = data.get('position', 0)
                    # Seek to position
                    pass
            
            else:
                logger.warning(f"Unknown message type: {message_type}")
                await self.send_error(websocket, f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON message")
            await self.send_error(websocket, "Invalid JSON message")
        except Exception as e:
            logger.error(f"Error handling message: {str(e)}")
            logger.error(traceback.format_exc())
            await self.send_error(websocket, f"Server error: {str(e)}")
    
    def run_chord_detection(self, websocket, youtube_url, client_id):
        """Run chord detection in a separate thread"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Send initial status update
            loop.run_until_complete(self.send_status(websocket, "Starting chord detection...", 5))
            
            # Check if detection was cancelled
            if self.active_detections.get(client_id, {}).get('cancel', False):
                return
                
            # Send downloading status
            loop.run_until_complete(self.send_status(websocket, "Downloading audio from YouTube...", 10))
            
            # Run the chord detection
            results = self.detector.analyze_youtube_video(youtube_url, visualize=False)
            
            # Check if detection was cancelled
            if self.active_detections.get(client_id, {}).get('cancel', False):
                return
                
            if results is None:
                loop.run_until_complete(self.send_error(websocket, "Failed to analyze video. Please check the URL and try again."))
                return
                
            # Send metadata
            loop.run_until_complete(self.send_status(websocket, "Processing detected chords...", 70))
            loop.run_until_complete(websocket.send(json.dumps({
                'type': 'metadata',
                'key': results['estimated_key'],
                'tempo': 120.0  # Default tempo
            })))
            
            # Check if detection was cancelled
            if self.active_detections.get(client_id, {}).get('cancel', False):
                return
                
            # Send chord sequence
            chord_data = []
            for chord_info in results['chord_sequence']:
                if chord_info['chord'] == "N":  # Skip "no chord"
                    continue
                
                # Convert chord to MIDI notes for the visualizer
                notes = self.chord_to_midi_notes(chord_info['chord'])
                
                chord_data.append({
                    'time': chord_info['start_time'],
                    'duration': chord_info['duration'],
                    'notes': notes,
                    'chord': chord_info['chord']
                })
            
            loop.run_until_complete(websocket.send(json.dumps({
                'type': 'chord_sequence',
                'chords': chord_data
            })))
            
            # Send completion message
            loop.run_until_complete(self.send_status(websocket, "Chord detection complete!", 100))
            loop.run_until_complete(websocket.send(json.dumps({
                'type': 'detection_complete'
            })))
            
            # Clean up detection tracking
            if client_id in self.active_detections:
                del self.active_detections[client_id]
                
        except Exception as e:
            logger.error(f"Error in chord detection: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Send error message
            try:
                loop.run_until_complete(self.send_error(websocket, f"Error detecting chords: {str(e)}"))
            except:
                pass
                
            # Clean up detection tracking
            if client_id in self.active_detections:
                del self.active_detections[client_id]
        finally:
            loop.close()
    
    def chord_to_midi_notes(self, chord_name):
        """Convert a chord to MIDI note numbers"""
        if chord_name == "N":  # No chord
            return []
            
        # Parse the chord name
        if ":" in chord_name:
            root, chord_type = chord_name.split(":")
        else:
            root, chord_type = chord_name, "maj"
            
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
        }
        
        # Get intervals for this chord type
        intervals = chord_intervals.get(chord_type, chord_intervals["maj"])
        
        # Get the root note MIDI number
        root_midi = root_to_midi.get(root, 60)
        
        # Generate MIDI notes for the chord
        return [root_midi + interval for interval in intervals]
    
    async def send_status(self, websocket, status, progress):
        """Send a status update message"""
        await websocket.send(json.dumps({
            'type': 'detection_status',
            'status': status,
            'progress': progress
        }))
    
    async def send_error(self, websocket, error_message):
        """Send an error message"""
        try:
            await websocket.send(json.dumps({
                'type': 'error',
                'error': error_message
            }))
        except:
            logger.error(f"Failed to send error message to client")
    
    async def handler(self, websocket, path):
        """Handle a WebSocket connection"""
        client_id = await self.register(websocket)
        
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Connection closed by client: {client_id}")
        finally:
            await self.unregister(websocket)
    
    async def start_server(self):
        """Start the WebSocket server"""
        server = await websockets.serve(self.handler, self.host, self.port)
        logger.info(f"WebSocket server started at ws://{self.host}:{self.port}")
        return server

def main():
    parser = argparse.ArgumentParser(description='Piano Visualizer WebSocket Server')
    parser.add_argument('--host', type=str, default='localhost', help='Host to bind the server to')
    parser.add_argument('--port', type=int, default=8080, help='Port to bind the server to')
    
    args = parser.parse_args()
    
    server = PianoVisualizerServer(host=args.host, port=args.port)
    
    # Start the server
    logger.info(f"Starting WebSocket server at ws://{args.host}:{args.port}")
    
    # Create event loop
    loop = asyncio.get_event_loop()
    
    try:
        # Start server
        server_task = loop.run_until_complete(server.start_server())
        
        # Keep running until interrupted
        loop.run_forever()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    finally:
        # Clean up
        if 'server_task' in locals():
            server_task.close()
            loop.run_until_complete(server_task.wait_closed())
        
        # Close the event loop
        loop.close()
        logger.info("Server shutdown")

if __name__ == "__main__":
    main()