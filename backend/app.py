# app.py
from flask import Flask, render_template, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from config import config
from routes.hazards import hazards_bp
from routes.sensors import sensors_bp
from models import db
import os

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = config.SECRET_KEY
app.config['MONGO_URI'] = config.MONGO_URI

# Enable CORS
CORS(app, resources={r"/api/*": {"origins": config.FRONTEND_URL}})

# Initialize SocketIO for real-time updates
socketio = SocketIO(app, cors_allowed_origins=config.FRONTEND_URL)
# attach socketio to app so blueprints can emit without circular imports
app.socketio = socketio

# Register blueprints
app.register_blueprint(hazards_bp)
app.register_blueprint(sensors_bp)

# Store connected clients
connected_supervisors = set()


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'MineGuard Backend is running'}), 200


@app.route('/', methods=['GET'])
def index():
    """Index page"""
    return jsonify({
        'app': 'MineGuard Pro - Mine Safety System',
        'version': '1.0.0',
        'documentation': '/api/docs',
        'status': 'operational'
    }), 200


# ============ WebSocket Events ============

@socketio.on('connect')
def handle_connect():
    """Handle new supervisor connection"""
    print(f'Client connected: {request.sid}')
    emit('response', {'data': 'Connected to MineGuard Backend'})


@socketio.on('supervisor-join')
def supervisor_join(data):
    """Supervisor joins monitoring room"""
    supervisor_id = data.get('supervisor_id')
    connected_supervisors.add(request.sid)
    print(f'Supervisor {supervisor_id} joined. Total: {len(connected_supervisors)}')
    emit('supervisor-joined', {'message': f'Supervisor {supervisor_id} connected'}, broadcast=True)


@socketio.on('disconnect')
def handle_disconnect():
    """Handle supervisor disconnection"""
    print(f'Client disconnected: {request.sid}')
    connected_supervisors.discard(request.sid)
    emit('supervisor-left', {'message': 'Supervisor disconnected'}, broadcast=True)


@socketio.on('acknowledge-hazard')
def acknowledge_hazard(data):
    """Broadcast hazard acknowledgment"""
    hazard_id = data.get('hazard_id')
    emit('hazard-acknowledged', {
        'hazardId': hazard_id,
        'message': 'Hazard acknowledged'
    }, broadcast=True)


@socketio.on('escalate-hazard')
def escalate_hazard(data):
    """Broadcast hazard escalation"""
    hazard_id = data.get('hazard_id')
    emit('hazard-escalated', {
        'hazardId': hazard_id,
        'message': 'Hazard escalated to critical'
    }, broadcast=True)


@socketio.on('resolve-hazard')
def resolve_hazard(data):
    """Broadcast hazard resolution"""
    hazard_id = data.get('hazard_id')
    emit('hazard-resolved', {
        'hazardId': hazard_id,
        'message': 'Hazard marked as resolved'
    }, broadcast=True)


# ============ Error Handlers ============

@app.errorhandler(404)
def not_found(error):
    """404 error handler"""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """500 error handler"""
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print(f"Starting MineGuard Backend...")
    print(f"Environment: {config.FLASK_ENV}")
    print(f"Frontend URL: {config.FRONTEND_URL}")
    print(f"MongoDB connected to: {config.MONGO_URI[:50]}...")
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=4000,
        debug=(config.FLASK_ENV == 'development'),
    )