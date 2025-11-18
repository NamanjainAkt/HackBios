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