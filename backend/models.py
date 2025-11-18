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