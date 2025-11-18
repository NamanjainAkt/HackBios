# routes/sensors.py
from flask import Blueprint, request, jsonify, current_app
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

            # Emit WebSocket event so connected supervisors receive the new hazard
            try:
                if hasattr(current_app, 'socketio'):
                    current_app.socketio.emit('new-hazard', hazard, broadcast=True)
                    current_app.socketio.emit('start-simulation', {'hazardId': hazard['_id']}, broadcast=True)
            except Exception as e:
                # don't fail the request because socket emit failed; log for debugging
                print('Socket emit failed:', e)

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