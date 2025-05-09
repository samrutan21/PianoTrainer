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
import uuid


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
        
        # Try to load trained model
        if not self.detector.load_model():
            logger.warning("No trained model found. Using default weights.")
            
        self.active_detections = {}  # Track ongoing detections by client
        
    async def register(self, websocket):
        """Register a client websocket connection"""
        client_id = id(websocket)
        self.clients.add(websocket)
        logger.info(f"Client connected: {client_id}, Total clients: {len(self.clients)}")
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
        try:
            data = json.loads(message)
            client_id = id(websocket)
            
            if data['type'] == 'detect_chords':
                # Check if there's already an active detection for this URL
                url = data['url']
                
                # Add URL check to prevent duplicate analysis of the same URL
                if client_id in self.active_detections and 'url' in self.active_detections[client_id]:
                    if self.active_detections[client_id]['url'] == url:
                        # Same URL, already processing
                        await self.send_status(websocket, "Already processing this URL", self.active_detections[client_id].get('progress', 0))
                        return
                
                # Cancel any existing detection for this client
                if client_id in self.active_detections:
                    self.active_detections[client_id]['cancel'] = True
                
                # Start new detection
                self.active_detections[client_id] = {'cancel': False, 'url': url, 'progress': 0}
                
                # Start detection in a separate thread
                detection_thread = threading.Thread(
                    target=self.run_chord_detection,
                    args=(websocket, url, client_id)
                )
                detection_thread.start()
                
            elif data['type'] == 'cancel_detection':
                if client_id in self.active_detections:
                    self.active_detections[client_id]['cancel'] = True
                    await self.send_status(websocket, "Chord detection cancelled.", 0)
                    
            elif data['type'] == 'train_model':
                # Start model training in a separate thread
                training_thread = threading.Thread(
                    target=self.run_model_training,
                    args=(websocket, client_id)
                )
                training_thread.start()
                
        except json.JSONDecodeError:
            await self.send_error(websocket, "Invalid message format")
        except KeyError as e:
            await self.send_error(websocket, f"Missing required field: {str(e)}")
        except Exception as e:
            logger.error(f"Error handling message: {str(e)}")
            await self.send_error(websocket, "Internal server error")
    
    def run_chord_detection(self, websocket, youtube_url, client_id):
        """Run chord detection in a separate thread"""
        job_id = str(uuid.uuid4())[:8]  # Short unique ID
        logger.info(f"[{job_id}] Starting chord detection for URL: {youtube_url}")
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
            'type': 'status',  # Changed from 'detection_status'
            'message': status,  # Changed from 'status'
            'progress': progress
        }))

    async def send_error(self, websocket, error_message):
        """Send an error message"""
        try:
            await websocket.send(json.dumps({
                'type': 'error',
                'message': error_message  # Changed from 'error'
            }))
        except:
            logger.error(f"Failed to send error message to client")
    
    async def handler(self, websocket, path):
        """Handle WebSocket connection"""
        try:
            await self.register(websocket)
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister(websocket)
    
    async def start_server(self):
        """Start the WebSocket server"""
        # Create a standalone handler function that works with what the library actually passes
        async def websocket_handler(websocket, path=None):
            try:
                await self.register(websocket)
                async for message in websocket:
                    await self.handle_message(websocket, message)
            except websockets.exceptions.ConnectionClosed:
                pass
            finally:
                await self.unregister(websocket)
        
        server = await websockets.serve(websocket_handler, self.host, self.port)
        logger.info(f"WebSocket server started at ws://{self.host}:{self.port}")
        return server

    def run_model_training(self, websocket, client_id):
        """Run model training in a separate thread"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Send training status
            loop.run_until_complete(self.send_status(websocket, "Starting model training...", 0))
            
            # Train the models
            success = self.detector.train_models()
            
            if success:
                loop.run_until_complete(self.send_status(websocket, "Model training complete!", 100))
            else:
                loop.run_until_complete(self.send_error(websocket, "Model training failed. Please check the logs."))
                
        except Exception as e:
            logger.error(f"Error in model training: {str(e)}")
            loop.run_until_complete(self.send_error(websocket, f"Error training model: {str(e)}"))
            
        finally:
            loop.close()

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