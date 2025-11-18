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