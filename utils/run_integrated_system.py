def run_system(http_port=8000, ws_port=8080, host='localhost', open_browser=True, frontend_dir='.'):
    """
    Run the integrated Piano Visualizer with YouTube Chord Detection system
    
    Args:
        http_port: HTTP server port (default: 8000)
        ws_port: WebSocket server port (default: 8080)
        host: Host to bind servers to (default: localhost)
        open_browser: Whether to open browser automatically (default: True)
        frontend_dir: Directory containing the Piano Visualizer app
    
    Returns:
        int: Exit code (0 for success, non-zero for errors)
    """
    import os
    import sys
    import time
    import threading
    import webbrowser
    import http.server
    import socketserver
    from pathlib import Path
    
    # Add the backend directory to the Python path
    backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
    if backend_dir not in sys.path:
        sys.path.append(backend_dir)
    
    # Validate frontend directory
    app_dir = Path(frontend_dir)
    if not app_dir.exists() or not app_dir.is_dir():
        print(f"Error: Frontend directory {frontend_dir} does not exist or is not a directory")
        return 1
        
    if not (app_dir / 'index.html').exists():
        print(f"Error: index.html not found in {frontend_dir}")
        return 1
    
    # Import the WebSocket server
    try:
        from backend.piano_websocket_server import PianoVisualizerServer
        import asyncio
    except ImportError:
        print("Error: Could not import WebSocket server. Make sure 'websockets' package is installed.")
        print("Run: pip install websockets")
        return 1
    
    # Define WebSocket server function
    def start_websocket_server(host, port):
        """Start the WebSocket server for chord detection"""
        print(f"Starting WebSocket server at ws://{host}:{port}")
        
        server = PianoVisualizerServer(host=host, port=port)
        
        # Create and set event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Start the server
        server_task = loop.run_until_complete(server.start_server())
        
        try:
            loop.run_forever()
        except KeyboardInterrupt:
            pass
        finally:
            # Clean up
            server_task.close()
            loop.run_until_complete(server_task.wait_closed())
            loop.close()
    
    # Define HTTP server function
    def start_http_server(directory, port):
        """Start a simple HTTP server to serve the Piano Visualizer app"""
        handler = http.server.SimpleHTTPRequestHandler
        
        # Change to the specified directory
        os.chdir(directory)
        
        # Create and start the server
        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"HTTP server started at http://{host}:{port}")
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nHTTP server stopped")
                httpd.shutdown()
    
    # Start the WebSocket server in a separate thread
    ws_thread = threading.Thread(
        target=start_websocket_server,
        args=(host, ws_port),
        daemon=True
    )
    ws_thread.start()
    
    # Start the HTTP server in a separate thread
    http_thread = threading.Thread(
        target=start_http_server,
        args=(frontend_dir, http_port),
        daemon=True
    )
    http_thread.start()
    
    # Wait for servers to start
    time.sleep(1)
    
    # Open browser if requested
    if open_browser:
        url = f"http://{host}:{http_port}"
        print(f"Opening browser to {url}")
        webbrowser.open(url)
    
    print("\nPress Ctrl+C to stop the servers")
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
    
    return 0


if __name__ == "__main__":
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='Run the Piano Visualizer with YouTube Chord Detection')
    parser.add_argument('--http-port', type=int, default=8000, help='HTTP server port (default: 8000)')
    parser.add_argument('--ws-port', type=int, default=8080, help='WebSocket server port (default: 8080)')
    parser.add_argument('--host', type=str, default='localhost', help='Host to bind servers to (default: localhost)')
    parser.add_argument('--no-browser', action='store_true', help='Do not open browser automatically')
    parser.add_argument('--app-dir', type=str, default='.', help='Directory containing the Piano Visualizer app')
    
    args = parser.parse_args()
    
    sys.exit(run_system(
        http_port=args.http_port,
        ws_port=args.ws_port,
        host=args.host,
        open_browser=not args.no_browser,
        frontend_dir=args.app_dir
    ))