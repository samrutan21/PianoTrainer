import os
import sys
import argparse

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    parser = argparse.ArgumentParser(description='YouTube Chord Piano Visualizer')
    parser.add_argument('--http-port', type=int, default=8000, help='Frontend HTTP server port')
    parser.add_argument('--ws-port', type=int, default=8080, help='WebSocket server port')
    parser.add_argument('--host', type=str, default='localhost', help='Host to bind servers to')
    parser.add_argument('--no-browser', action='store_true', help='Do not open browser automatically')
    
    args = parser.parse_args()
    
    # Import the integrated system runner
    from utils.run_integrated_system import run_system
    
    # Run the integrated system
    return run_system(
        http_port=args.http_port,
        ws_port=args.ws_port,
        host=args.host,
        open_browser=not args.no_browser,
        frontend_dir=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')
    )

if __name__ == "__main__":
    sys.exit(main())