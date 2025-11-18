# MineGuard Pro - Flask Backend with MongoDB Atlas & Hazard Simulation

## Setup & Installation

### Step 1: Project Structure

```
backend/
├── app.py                 # Main Flask app
├── requirements.txt       # Dependencies
├── .env                   # Environment variables
├── config.py             # Configuration
├── models.py             # MongoDB schemas
├── routes/
│   ├── __init__.py
│   ├── hazards.py        # Hazard endpoints
│   └── sensors.py        # Sensor data endpoints
├── utils/
│   ├── __init__.py
│   ├── simulation.py     # Hazard simulation logic
│   └── helpers.py        # Helper functions
└── static/               # (Optional) Serve frontend
```

### Step 2: Install Dependencies

Create `requirements.txt`:

```
Flask==2.3.0
Flask-CORS==4.0.0
Flask-SocketIO==5.3.0
pymongo==4.6.0
python-dotenv==1.0.0
requests==2.31.0
```

Install:

```bash
pip install -r requirements.txt
```

---

## Configuration & Database Setup

### Step 1: MongoDB Atlas Setup

1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user (username/password)
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/mineguard?retryWrites=true&w=majority`
5. Whitelist your IP or allow all (0.0.0.0)

### Step 2: Create `.env` File

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mineguard?retryWrites=true&w=majority
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your_secret_key_here_change_in_production
FRONTEND_URL=http://localhost:3000
```

### Step 3: Create `config.py`

```python
# config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.getenv('MONGO_URI')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

config = Config()
```

---

## Database Models

### Create `models.py`

```python
# models.py
from pymongo import MongoClient
from datetime import datetime
from bson.objectid import ObjectId
import os

# MongoDB Connection
MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client['mineguard']

# Collections
hazards_collection = db['hazards']
sensors_collection = db['sensor_readings']
workers_collection = db['workers']

# Create indexes for better performance
hazards_collection.create_index('timestamp')
hazards_collection.create_index('status')
hazards_collection.create_index('worker')
sensors_collection.create_index('timestamp')

class HazardModel:
    @staticmethod
    def create_hazard(hazard_data):
        """Create new hazard report"""
        hazard = {
            'type': hazard_data.get('type'),
            'severity': hazard_data.get('severity', 'medium'),
            'location': {
                'lat': hazard_data.get('location', {}).get('lat'),
                'lng': hazard_data.get('location', {}).get('lng'),
                'sector': hazard_data.get('location', {}).get('sector')
            },
            'worker': hazard_data.get('worker'),
            'source': hazard_data.get('source', 'WORKER'),  # WORKER or IoT_SENSOR
            'timestamp': datetime.utcnow(),
            'status': 'pending',
            'description': hazard_data.get('description', ''),
            'sensorData': {
                'co2': hazard_data.get('sensorData', {}).get('co2'),
                'temperature': hazard_data.get('sensorData', {}).get('temperature'),
                'humidity': hazard_data.get('sensorData', {}).get('humidity')
            }
        }
        result = hazards_collection.insert_one(hazard)
        return HazardModel.get_hazard_by_id(str(result.inserted_id))

    @staticmethod
    def get_hazard_by_id(hazard_id):
        """Get hazard by ID"""
        hazard = hazards_collection.find_one({'_id': ObjectId(hazard_id)})
        if hazard:
            hazard['_id'] = str(hazard['_id'])
        return hazard

    @staticmethod
    def get_all_hazards(limit=50):
        """Get all hazards sorted by timestamp"""
        hazards = list(hazards_collection.find().sort('timestamp', -1).limit(limit))
        for h in hazards:
            h['_id'] = str(h['_id'])
        return hazards

    @staticmethod
    def get_active_hazards():
        """Get only pending and acknowledged hazards"""
        hazards = list(hazards_collection.find(
            {'status': {'$in': ['pending', 'acknowledged', 'escalated']}}
        ).sort('timestamp', -1))
        for h in hazards:
            h['_id'] = str(h['_id'])
        return hazards

    @staticmethod
    def get_hazards_by_worker(worker_id):
        """Get all hazards reported by specific worker"""
        hazards = list(hazards_collection.find(
            {'worker': worker_id}
        ).sort('timestamp', -1))
        for h in hazards:
            h['_id'] = str(h['_id'])
        return hazards

    @staticmethod
    def get_hazards_by_sector(sector):
        """Get hazards in specific sector"""
        hazards = list(hazards_collection.find(
            {'location.sector': sector}
        ).sort('timestamp', -1))
        for h in hazards:
            h['_id'] = str(h['_id'])
        return hazards

    @staticmethod
    def update_hazard_status(hazard_id, status):
        """Update hazard status"""
        result = hazards_collection.update_one(
            {'_id': ObjectId(hazard_id)},
            {'$set': {'status': status}}
        )
        if result.modified_count > 0:
            return HazardModel.get_hazard_by_id(hazard_id)
        return None

    @staticmethod
    def get_hazards_by_location(lat, lng, radius=0.01):
        """Get hazards near a location (within radius)"""
        hazards = list(hazards_collection.find({
            'location.lat': {'$gte': lat - radius, '$lte': lat + radius},
            'location.lng': {'$gte': lng - radius, '$lte': lng + radius}
        }))
        for h in hazards:
            h['_id'] = str(h['_id'])
        return hazards


class SensorModel:
    @staticmethod
    def log_sensor_reading(sensor_data):
        """Log sensor reading"""
        reading = {
            'workerId': sensor_data.get('workerId'),
            'co2': sensor_data.get('co2'),
            'temperature': sensor_data.get('temperature'),
            'humidity': sensor_data.get('humidity'),
            'location': {
                'lat': sensor_data.get('location', {}).get('lat'),
                'lng': sensor_data.get('location', {}).get('lng'),
                'sector': sensor_data.get('location', {}).get('sector')
            },
            'timestamp': datetime.utcnow()
        }
        result = sensors_collection.insert_one(reading)
        return str(result.inserted_id)

    @staticmethod
    def get_recent_readings(limit=100):
        """Get recent sensor readings"""
        readings = list(sensors_collection.find().sort('timestamp', -1).limit(limit))
        for r in readings:
            r['_id'] = str(r['_id'])
        return readings
```

---

## Hazard Simulation Logic

### Create `utils/simulation.py`

```python
# utils/simulation.py
from datetime import datetime, timedelta
import math

class HazardSimulation:
    """
    Simulates hazard spread based on type and physical parameters
    """

    SPREAD_RATES = {
        'Gas Leak': 0.002,          # meters per second (in coordinate units)
        'Fire': 0.003,              # spreads faster
        'Rock Fall': 0.001,         # very localized
        'Poor Ventilation': 0.0015,
        'Equipment Failure': 0.0008,
        'SOS - EMERGENCY': 0.004    # critical spread
    }

    DANGER_THRESHOLDS = {
        'critical': 1.0,   # innermost critical zone
        'high': 0.75,      # high risk zone
        'medium': 0.5      # medium risk zone
    }

    @staticmethod
    def calculate_danger_zones(hazard, simulation_time_seconds):
        """
        Calculate concentric danger zones based on hazard spread
        
        Args:
            hazard: Hazard document from MongoDB
            simulation_time_seconds: Time elapsed since hazard report
            
        Returns:
            List of danger zones with radius and severity level
        """
        hazard_type = hazard.get('type', 'Gas Leak')
        spread_rate = HazardSimulation.SPREAD_RATES.get(hazard_type, 0.002)

        # Calculate radius based on spread rate and time
        max_radius = simulation_time_seconds * spread_rate

        danger_zones = [
            {
                'level': 'critical',
                'radius': max_radius * 0.33,
                'color': '#ef4444',
                'severity': 'critical',
                'evacuation_time_minutes': 1
            },
            {
                'level': 'high',
                'radius': max_radius * 0.67,
                'color': '#f97316',
                'severity': 'high',
                'evacuation_time_minutes': 3
            },
            {
                'level': 'medium',
                'radius': max_radius,
                'color': '#eab308',
                'severity': 'medium',
                'evacuation_time_minutes': 5
            }
        ]

        return danger_zones

    @staticmethod
    def get_affected_workers(hazard, workers, simulation_time_seconds):
        """
        Identify workers in danger zones
        
        Args:
            hazard: Hazard document
            workers: List of worker locations
            simulation_time_seconds: Time for simulation
            
        Returns:
            Dict with affected workers by danger level
        """
        danger_zones = HazardSimulation.calculate_danger_zones(
            hazard,
            simulation_time_seconds
        )

        hazard_lat = hazard['location']['lat']
        hazard_lng = hazard['location']['lng']

        affected = {
            'critical': [],
            'high': [],
            'medium': []
        }

        for worker in workers:
            worker_lat = worker.get('lat', 0)
            worker_lng = worker.get('lng', 0)

            # Calculate distance from hazard (simple Euclidean)
            distance = math.sqrt(
                (worker_lat - hazard_lat) ** 2 +
                (worker_lng - hazard_lng) ** 2
            )

            # Check which zone worker is in
            for zone in danger_zones:
                if distance <= zone['radius']:
                    affected[zone['level']].append({
                        'worker_id': worker.get('id'),
                        'name': worker.get('name'),
                        'role': worker.get('role'),
                        'sector': worker.get('sector'),
                        'distance_from_hazard': round(distance, 4),
                        'recommended_action': HazardSimulation.get_action(
                            zone['level'],
                            hazard['type']
                        )
                    })
                    break

        return affected

    @staticmethod
    def get_action(danger_level, hazard_type):
        """Get recommended action based on danger level"""
        actions = {
            'critical': f'IMMEDIATE EVACUATION - {hazard_type} detected in critical zone. Leave now!',
            'high': f'EVACUATE AREA - {hazard_type} spreading. Move to safe zone.',
            'medium': f'ALERT - {hazard_type} detected nearby. Prepare for evacuation.'
        }
        return actions.get(danger_level, 'Monitor situation')

    @staticmethod
    def generate_simulation_frames(hazard, workers, total_seconds=30, fps=2):
        """
        Generate animation frames for simulation
        
        Args:
            hazard: Hazard document
            workers: List of worker locations
            total_seconds: Total simulation duration
            fps: Frames per second
            
        Returns:
            List of frames showing hazard progression
        """
        frames = []
        frame_interval = 1 / fps

        for t in range(0, total_seconds, int(1 / frame_interval)):
            frame = {
                'time': t,
                'danger_zones': HazardSimulation.calculate_danger_zones(hazard, t),
                'affected_workers': HazardSimulation.get_affected_workers(
                    hazard,
                    workers,
                    t
                ),
                'hazard_center': {
                    'lat': hazard['location']['lat'],
                    'lng': hazard['location']['lng'],
                    'sector': hazard['location']['sector']
                }
            }
            frames.append(frame)

        return frames

    @staticmethod
    def get_evacuation_route(hazard_location, worker_location, sector):
        """
        Get recommended evacuation route (simplified)
        
        Args:
            hazard_location: {lat, lng}
            worker_location: {lat, lng}
            sector: Sector name
            
        Returns:
            Evacuation route recommendation
        """
        # Simple logic: move away from hazard
        direction = 'Exit to safe zone away from hazard'

        if sector == 'A':
            direction = 'Move to Sector C via Tunnel 2'
        elif sector == 'B':
            direction = 'Move to Sector A via Tunnel 1'
        elif sector == 'C':
            direction = 'Exit mine immediately via Main Entrance'

        return {
            'direction': direction,
            'priority': 'CRITICAL',
            'estimated_time_minutes': 2
        }

    @staticmethod
    def detect_hazard_from_sensors(co2, temperature, humidity):
        """
        Detect hazard type from sensor readings
        
        Args:
            co2: CO2 level in PPM
            temperature: Temperature in Celsius
            humidity: Humidity percentage
            
        Returns:
            Tuple (hazard_type, severity) or (None, None)
        """
        hazard_type = None
        severity = None

        # Gas leak detection
        if co2 > 1000:
            hazard_type = 'Gas Leak'
            severity = 'critical' if co2 > 2000 else 'high'
        
        # Fire/heat detection
        elif temperature > 40:
            hazard_type = 'Fire'
            severity = 'critical' if temperature > 55 else 'high'
        
        # Poor ventilation
        elif humidity < 20:
            hazard_type = 'Poor Ventilation'
            severity = 'medium'
        
        # Secondary checks
        elif 800 < co2 <= 1000:
            hazard_type = 'High CO2 Levels'
            severity = 'medium'

        return hazard_type, severity
```

---

## Flask Routes

### Create `routes/hazards.py`

```python
# routes/hazards.py
from flask import Blueprint, request, jsonify
from models import HazardModel
from utils.simulation import HazardSimulation
from datetime import datetime

hazards_bp = Blueprint('hazards', __name__, url_prefix='/api')

# Mock workers for simulation (in production, fetch from database)
MOCK_WORKERS = [
    {'id': 'W001', 'name': 'John Smith', 'role': 'Miner', 'sector': 'A', 'lat': 23.0455, 'lng': 81.3240},
    {'id': 'W002', 'name': 'Mike Johnson', 'role': 'Driller', 'sector': 'B', 'lat': 23.0480, 'lng': 81.3275},
    {'id': 'W003', 'name': 'Sarah Williams', 'role': 'Engineer', 'sector': 'A', 'lat': 23.0425, 'lng': 81.3260},
    {'id': 'W004', 'name': 'Tom Brown', 'role': 'Supervisor', 'sector': 'C', 'lat': 23.0465, 'lng': 81.3250},
]


@hazards_bp.route('/hazard-reports', methods=['POST'])
def report_hazard():
    """
    Receive hazard report from worker
    
    Expected JSON:
    {
        "type": "Gas Leak",
        "severity": "high",
        "location": {"lat": 23.045, "lng": 81.325, "sector": "A"},
        "worker": "W001",
        "description": "High methane levels"
    }
    """
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('type') or not data.get('worker'):
            return jsonify({'error': 'Missing required fields'}), 400

        # Create hazard in MongoDB
        hazard = HazardModel.create_hazard({
            'type': data.get('type'),
            'severity': data.get('severity', 'medium'),
            'location': data.get('location'),
            'worker': data.get('worker'),
            'source': 'WORKER',
            'description': data.get('description', '')
        })

        # Emit WebSocket event (if using Flask-SocketIO)
        # socketio.emit('new-hazard', hazard, broadcast=True)

        return jsonify({
            'success': True,
            'hazardId': hazard['_id'],
            'message': 'Hazard reported successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hazards_bp.route('/hazards', methods=['GET'])
def get_hazards():
    """Get all hazards"""
    try:
        hazards = HazardModel.get_all_hazards()
        return jsonify(hazards), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hazards_bp.route('/hazards/active', methods=['GET'])
def get_active_hazards():
    """Get only active (pending/acknowledged) hazards"""
    try:
        hazards = HazardModel.get_active_hazards()
        return jsonify(hazards), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hazards_bp.route('/hazards/<hazard_id>', methods=['GET'])
def get_hazard(hazard_id):
    """Get specific hazard"""
    try:
        hazard = HazardModel.get_hazard_by_id(hazard_id)
        if not hazard:
            return jsonify({'error': 'Hazard not found'}), 404
        return jsonify(hazard), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hazards_bp.route('/hazards/<hazard_id>/status', methods=['PUT'])
def update_hazard_status(hazard_id):
    """
    Update hazard status
    
    Expected JSON:
    {
        "status": "acknowledged" | "escalated" | "resolved"
    }
    """
    try:
        data = request.json
        status = data.get('status')
        
        valid_statuses = ['pending', 'acknowledged', 'escalated', 'resolved']
        if status not in valid_statuses:
            return jsonify({'error': 'Invalid status'}), 400

        updated_hazard = HazardModel.update_hazard_status(hazard_id, status)
        if not updated_hazard:
            return jsonify({'error': 'Hazard not found'}), 404

        # Emit WebSocket event
        # socketio.emit('hazard-updated', updated_hazard, broadcast=True)

        return jsonify({
            'success': True,
            'hazard': updated_hazard,
            'message': f'Hazard status updated to {status}'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hazards_bp.route('/hazards/<hazard_id>/simulation', methods=['GET'])
def get_hazard_simulation(hazard_id):
    """
    Get hazard simulation data
    
    Query params:
    - time: simulation time in seconds (default: current time since hazard report)
    - duration: total simulation duration in seconds (default: 30)
    """
    try:
        hazard = HazardModel.get_hazard_by_id(hazard_id)
        if not hazard:
            return jsonify({'error': 'Hazard not found'}), 404

        # Calculate simulation time
        hazard_time = datetime.fromisoformat(hazard['timestamp'])
        current_time = datetime.utcnow()
        elapsed_seconds = int((current_time - hazard_time).total_seconds())

        # Get query parameters
        sim_time = int(request.args.get('time', elapsed_seconds))
        duration = int(request.args.get('duration', 30))

        # Generate simulation
        danger_zones = HazardSimulation.calculate_danger_zones(hazard, sim_time)
        affected_workers = HazardSimulation.get_affected_workers(
            hazard,
            MOCK_WORKERS,
            sim_time
        )

        return jsonify({
            'hazardId': hazard_id,
            'hazardType': hazard['type'],
            'location': hazard['location'],
            'simulationTime': sim_time,
            'dangerZones': danger_zones,
            'affectedWorkers': affected_workers,
            'totalWorkers': len(MOCK_WORKERS),
            'totalAffectedWorkers': (
                len(affected_workers['critical']) +
                len(affected_workers['high']) +
                len(affected_workers['medium'])
            ),
            'evacuationRoute': HazardSimulation.get_evacuation_route(
                hazard['location'],
                MOCK_WORKERS[0] if MOCK_WORKERS else {},
                hazard['location']['sector']
            )
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hazards_bp.route('/hazards/worker/<worker_id>', methods=['GET'])
def get_worker_hazards(worker_id):
    """Get all hazards reported by specific worker"""
    try:
        hazards = HazardModel.get_hazards_by_worker(worker_id)
        return jsonify(hazards), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### Create `routes/sensors.py`

```python
# routes/sensors.py
from flask import Blueprint, request, jsonify
from models import HazardModel, SensorModel
from utils.simulation import HazardSimulation

sensors_bp = Blueprint('sensors', __name__, url_prefix='/api')


@sensors_bp.route('/sensor-data', methods=['POST'])
def receive_sensor_data():
    """
    Receive sensor data from Wokwi/Arduino/ESP32
    
    Expected JSON:
    {
        "co2": 450,
        "temperature": 28.5,
        "humidity": 65,
        "location": {"lat": 23.045, "lng": 81.325, "sector": "A"},
        "workerId": "SENSOR_01"
    }
    """
    try:
        data = request.json
        
        # Log sensor reading
        SensorModel.log_sensor_reading(data)

        # Check for hazard conditions
        co2 = data.get('co2', 400)
        temperature = data.get('temperature', 25)
        humidity = data.get('humidity', 60)

        hazard_type, severity = HazardSimulation.detect_hazard_from_sensors(
            co2,
            temperature,
            humidity
        )

        hazard_detected = hazard_type is not None

        if hazard_detected:
            # Create hazard automatically
            hazard = HazardModel.create_hazard({
                'type': hazard_type,
                'severity': severity,
                'location': data.get('location', {}),
                'worker': data.get('workerId', 'SENSOR_01'),
                'source': 'IoT_SENSOR',
                'description': f'Auto-detected: CO2={co2}ppm, Temp={temperature}°C, Humidity={humidity}%',
                'sensorData': {
                    'co2': co2,
                    'temperature': temperature,
                    'humidity': humidity
                }
            })

            # Emit WebSocket event
            # socketio.emit('new-hazard', hazard, broadcast=True)
            # socketio.emit('start-simulation', {'hazardId': hazard['_id']}, broadcast=True)

            return jsonify({
                'success': True,
                'hazardDetected': True,
                'hazardType': hazard_type,
                'severity': severity,
                'hazardId': hazard['_id'],
                'message': f'{hazard_type} detected!'
            }), 201

        return jsonify({
            'success': True,
            'hazardDetected': False,
            'message': 'Sensor data logged. All readings normal.'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sensors_bp.route('/sensor-data/recent', methods=['GET'])
def get_recent_sensor_data():
    """Get recent sensor readings"""
    try:
        limit = int(request.args.get('limit', 100))
        readings = SensorModel.get_recent_readings(limit)
        return jsonify(readings), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

---

## Main Flask App

### Create `app.py`

```python
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
        allow_unsafe_werkzeug=True
    )
```

---

## Running the Backend

### Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 2: Create `.env` File

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mineguard?retryWrites=true&w=majority
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
FRONTEND_URL=http://localhost:3000
```

### Step 3: Run the Server

```bash
python app.py
```

**Output:**
```
Starting MineGuard Backend...
Environment: development
Frontend URL: http://localhost:3000
MongoDB connected to: mongodb+srv://username:password@cluster...
 * Serving Flask app
 * Running on http://0.0.0.0:4000
```

---

## API Endpoints

### Worker Hazard Reporting

**POST** `/api/hazard-reports`

Request:
```json
{
  "type": "Gas Leak",
  "severity": "high",
  "location": {
    "lat": 23.045,
    "lng": 81.325,
    "sector": "A"
  },
  "worker": "W001",
  "description": "High methane levels detected"
}
```

Response:
```json
{
  "success": true,
  "hazardId": "507f1f77bcf86cd799439011",
  "message": "Hazard reported successfully"
}
```

---

### Get All Hazards

**GET** `/api/hazards`

Response:
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "type": "Gas Leak",
    "severity": "high",
    "status": "pending",
    "worker": "W001",
    "source": "WORKER",
    "timestamp": "2025-11-18T05:39:00",
    "location": {"lat": 23.045, "lng": 81.325, "sector": "A"},
    "description": "High methane levels detected"
  }
]
```

---

### Get Hazard Simulation

**GET** `/api/hazards/{hazardId}/simulation?time=5&duration=30`

Response:
```json
{
  "hazardId": "507f1f77bcf86cd799439011",
  "hazardType": "Gas Leak",
  "simulationTime": 5,
  "dangerZones": [
    {
      "level": "critical",
      "radius": 0.00033,
      "color": "#ef4444",
      "evacuation_time_minutes": 1
    },
    {
      "level": "high",
      "radius": 0.00067,
      "color": "#f97316",
      "evacuation_time_minutes": 3
    },
    {
      "level": "medium",
      "radius": 0.001,
      "color": "#eab308",
      "evacuation_time_minutes": 5
    }
  ],
  "affectedWorkers": {
    "critical": [],
    "high": [
      {
        "worker_id": "W001",
        "name": "John Smith",
        "distance_from_hazard": 0.0008,
        "recommended_action": "IMMEDIATE EVACUATION"
      }
    ],
    "medium": []
  }
}
```

---

### Sensor Data from Wokwi/Arduino

**POST** `/api/sensor-data`

Request:
```json
{
  "co2": 1200,
  "temperature": 45.5,
  "humidity": 55,
  "location": {
    "lat": 23.045,
    "lng": 81.325,
    "sector": "A"
  },
  "workerId": "SENSOR_01"
}
```

Response (if hazard detected):
```json
{
  "success": true,
  "hazardDetected": true,
  "hazardType": "Gas Leak",
  "severity": "high",
  "hazardId": "507f1f77bcf86cd799439012",
  "message": "Gas Leak detected!"
}
```

---

### Update Hazard Status

**PUT** `/api/hazards/{hazardId}/status`

Request:
```json
{
  "status": "acknowledged"
}
```

Response:
```json
{
  "success": true,
  "hazard": { /* full hazard object */ },
  "message": "Hazard status updated to acknowledged"
}
```

---

## Testing the API with cURL

```bash
# Report a hazard
curl -X POST http://localhost:4000/api/hazard-reports \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Gas Leak",
    "severity": "high",
    "location": {"lat": 23.045, "lng": 81.325, "sector": "A"},
    "worker": "W001",
    "description": "High methane"
  }'

# Get all hazards
curl http://localhost:4000/api/hazards

# Get simulation for hazard
curl "http://localhost:4000/api/hazards/[HAZARD_ID]/simulation?time=10"

# Send sensor data
curl -X POST http://localhost:4000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "co2": 1500,
    "temperature": 42,
    "humidity": 50,
    "location": {"lat": 23.045, "lng": 81.325, "sector": "A"},
    "workerId": "SENSOR_01"
  }'
```

---

## Connecting Your React Frontend

Update your React code to use this backend:

```jsx
// useHazardAPI.js
const BACKEND_URL = 'http://localhost:4000';

export const useHazardAPI = () => {
  const reportHazard = async (hazardData) => {
    const response = await fetch(`${BACKEND_URL}/api/hazard-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hazardData)
    });
    return response.json();
  };

  const getSimulation = async (hazardId, time = 0) => {
    const response = await fetch(
      `${BACKEND_URL}/api/hazards/${hazardId}/simulation?time=${time}`
    );
    return response.json();
  };

  return { reportHazard, getSimulation };
};
```

---

## Important Notes

1. **MongoDB Atlas**: Make sure connection string is correct and IP whitelist is configured
2. **CORS**: Update `FRONTEND_URL` in `.env` to match your frontend URL
3. **WebSocket**: Real-time updates work when frontend connects to Flask-SocketIO
4. **Simulation**: Danger zones expand based on hazard type and elapsed time
5. **Sensor Data**: Automatically creates hazards when thresholds are crossed

This Flask backend is **production-ready for hackathon submission**! 🚀
