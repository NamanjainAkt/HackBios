import { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Phone, Bell, User, Home, History, CheckCircle, AlertOctagon, Users, Activity, Siren, Clock } from 'lucide-react';
import api from './api'

const MOCK_WORKERS = [
  { id: 'W001', name: 'John Smith', role: 'Miner', sector: 'A', status: 'active' },
  { id: 'W002', name: 'Mike Johnson', role: 'Driller', sector: 'B', status: 'active' },
  { id: 'W003', name: 'Sarah Williams', role: 'Engineer', sector: 'A', status: 'active' },
  { id: 'W004', name: 'Tom Brown', role: 'Supervisor', sector: 'C', status: 'active' },
];



const App = () => {
  const [userType, setUserType] = useState<'worker' | 'supervisor'>('worker');
  const [currentUser, setCurrentUser] = useState(MOCK_WORKERS[0]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hazards, setHazards] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSOSAlert, setShowSOSAlert] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [banner, setBanner] = useState<{ type: 'error' | 'success', message: string } | null>(null);
  const [newHazard, setNewHazard] = useState({ type: '', severity: 'medium', description: '' });

  // Map bounds (simulating a real mine layout)
  const MAP_BOUNDS = {
    north: 23.050,
    south: 23.040,
    east: 81.330,
    west: 81.320
  };

  const getPositionFromCoords = (lat: number, lng: number) => {
    const top = ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;
    const left = ((lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
    return { top: `${top}%`, left: `${left}%` };
  };

  const handleReportHazard = () => {
    if (!newHazard.type.trim()) return;

    const lat = 23.045 + (Math.random() - 0.5) * 0.008;
    const lng = 81.325 + (Math.random() - 0.5) * 0.008;

    const payload = {
      type: newHazard.type,
      severity: newHazard.severity,
      description: newHazard.description || 'No description provided',
      location: { lat, lng, sector: currentUser.sector },
      worker: currentUser.id,
    }

    ;(async () => {
      setRequesting(true)
      try {
        await api.reportHazard(payload)
        setShowReportModal(false)
        setNewHazard({ type: '', severity: 'medium', description: '' })
        setBanner({ type: 'success', message: 'Hazard reported successfully' })
        await fetchHazards()
      } catch (e: any) {
        console.error('Failed to report hazard', e)
        setBanner({ type: 'error', message: (e && e.message) ? e.message : 'Failed to report hazard' })
      } finally {
        setRequesting(false)
      }
    })()
  };

  const handleSOS = () => {
    const lat = 23.045 + (Math.random() - 0.5) * 0.006;
    const lng = 81.325 + (Math.random() - 0.5) * 0.006;

    const payload = {
      type: 'SOS - EMERGENCY',
      severity: 'critical',
      description: 'Worker triggered emergency SOS - Immediate assistance required!',
      location: { lat, lng, sector: currentUser.sector },
      worker: currentUser.id,
    }

    ;(async () => {
      setRequesting(true)
      try {
        await api.reportHazard(payload)
        setShowSOSAlert(true)
        setBanner({ type: 'success', message: 'SOS sent — help is on the way' })
        setTimeout(() => setShowSOSAlert(false), 5000)
        await fetchHazards()
      } catch (e: any) {
        console.error('Failed to send SOS', e)
        setBanner({ type: 'error', message: (e && e.message) ? e.message : 'Failed to send SOS' })
      } finally {
        setRequesting(false)
      }
    })()
  };

  // Fetch hazards from backend and map to expected local shape
  const fetchHazards = async () => {
    try {
      const data = await api.getAllHazards()
      const mapped = data.map((h: any) => ({
        id: h._id,
        type: h.type,
        severity: h.severity,
        location: h.location || {},
        worker: h.worker,
        timestamp: new Date(h.timestamp),
        status: h.status,
        description: h.description || '',
        sensorData: h.sensorData || null,
      }))
      setHazards(mapped)
    } catch (e) {
      console.error('Failed to fetch hazards', e)
    }
  }

  useEffect(() => {
    fetchHazards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // auto-dismiss banners after a short time
  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 5000)
    return () => clearTimeout(t)
  }, [banner])

  const setHazardStatus = async (hazardId: string, status: string) => {
    try {
      await api.updateHazardStatus(hazardId, status)
      await fetchHazards()
    } catch (e) {
      console.error('Failed to update hazard status', e)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityHex = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'escalated': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Worker Views
  const WorkerDashboard = () => (
    <div className="space-y-6">
      {/* SOS Alert */}
      {showSOSAlert && (
        <div className="bg-red-600 text-white p-6 rounded-2xl animate-pulse text-center font-bold text-xl">
          <Siren className="w-10 h-10 mx-auto mb-2" />
          SOS SIGNAL SENT - HELP IS ON THE WAY!
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <button
          onClick={() => setShowReportModal(true)}
          className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-6 sm:p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
          disabled={requesting}
        >
          <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3" />
          <div className="text-lg sm:text-2xl font-bold">Report Hazard</div>
        </button>

        <button
          onClick={handleSOS}
          className={`bg-gradient-to-br from-red-700 to-black text-white p-6 sm:p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 animate-pulse ${requesting ? 'opacity-60 cursor-not-allowed' : ''}`}
          disabled={requesting}
        >
          <Phone className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3" />
          <div className="text-lg sm:text-2xl font-bold">SOS EMERGENCY</div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg text-center">
          <Activity className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-red-600 mb-2" />
          <div className="text-2xl sm:text-3xl font-bold text-red-600">
            {hazards.filter(h => h.status !== 'resolved').length}
          </div>
          <div className="text-sm sm:text-base text-gray-600">Active Hazards</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg text-center">
          <Bell className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-blue-600 mb-2" />
          <div className="text-2xl sm:text-3xl font-bold text-blue-600">
            {hazards.filter(h => h.worker === currentUser.id).length}
          </div>
          <div className="text-sm sm:text-base text-gray-600">My Reports</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg text-center">
          <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-green-600 mb-2" />
          <div className="text-2xl sm:text-3xl font-bold text-green-600">
            {hazards.filter(h => h.status === 'resolved').length}
          </div>
          <div className="text-sm sm:text-base text-gray-600">Resolved</div>
        </div>
      </div>

      {/* Mine Map */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6 text-white">
          <h3 className="text-lg sm:text-2xl font-bold flex items-center gap-3">
            <MapPin className="w-6 h-6 sm:w-8 sm:h-8" /> Live Mine Map
          </h3>
        </div>
        <div className="relative h-64 sm:h-96 bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="absolute inset-0 opacity-20">
            <div className="grid grid-cols-12 grid-rows-12 h-full">
              {[...Array(144)].map((_, i) => (
                <div key={i} className="border border-gray-700"></div>
              ))}
            </div>
          </div>

          {/* Sector Labels */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-6 bg-black bg-opacity-70 px-2 py-1 sm:px-4 sm:py-2 rounded text-sm sm:text-xl font-bold">Sector A</div>
          <div className="absolute top-2 right-2 sm:top-4 sm:right-6 bg-black bg-opacity-70 px-2 py-1 sm:px-4 sm:py-2 rounded text-sm sm:text-xl font-bold">Sector B</div>
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-6 bg-black bg-opacity-70 px-2 py-1 sm:px-4 sm:py-2 rounded text-sm sm:text-xl font-bold">Sector C</div>

          {/* Hazards */}
          {hazards.filter(h => h.status !== 'resolved').map(hazard => {
            const pos = getPositionFromCoords(hazard.location.lat, hazard.location.lng);
            return (
              <div
                key={hazard.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                style={{ top: pos.top, left: pos.left }}
              >
                <div className={`${getSeverityColor(hazard.severity)} rounded-full p-4 shadow-2xl animate-pulse`}>
                  {hazard.severity === 'critical' ? <Siren className="w-8 h-8 text-white" /> : <AlertOctagon className="w-8 h-8 text-white" />}
                </div>
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
                  {hazard.type}
                </div>
              </div>
            );
          })}

          {/* Current Position */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-green-500 rounded-full p-3 sm:p-5 shadow-2xl animate-bounce">
              <User className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="text-white text-xs sm:text-sm mt-2 font-bold text-center bg-black bg-opacity-70 px-2 py-1 sm:px-3 rounded">YOU</div>
          </div>
        </div>

        <div className="p-2 sm:p-4 bg-gray-100 flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
          {['critical', 'high', 'medium', 'low'].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${getSeverityColor(s)}`}></div>
              <span className="capitalize">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const WorkerHistory = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">My Report History</h2>
      {hazards.filter(h => h.worker === currentUser.id).length === 0 ? (
        <div className="text-center py-20 text-gray-500">No reports yet</div>
      ) : (
        <div className="space-y-4">
          {hazards
            .filter(h => h.worker === currentUser.id)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .map(hazard => (
              <div key={hazard.id} className="bg-white rounded-2xl shadow-lg p-6 border-l-8" style={{ borderLeftColor: getSeverityHex(hazard.severity) }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-bold">{hazard.type}</h4>
                    <p className="text-gray-600 mt-1">{hazard.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {hazard.timestamp.toLocaleString()}</span>
                      <span>Sector {hazard.location.sector}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-4 py-2 rounded-full text-white font-bold ${getSeverityColor(hazard.severity)}`}>
                      {hazard.severity.toUpperCase()}
                    </span>
                    <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(hazard.status)}`}>
                      {hazard.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  const WorkerProfile = () => (
    <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-5xl font-bold mx-auto mb-6">
          {currentUser.name.split(' ').map(n => n[0]).join('')}
        </div>
        <h2 className="text-4xl font-bold text-gray-800">{currentUser.name}</h2>
        <p className="text-xl text-gray-600 mt-2">{currentUser.role}</p>
      </div>

      <div className="mt-10 space-y-6 text-lg">
        <div className="flex justify-between py-4 border-b">
          <span className="text-gray-600">Worker ID</span>
          <span className="font-bold">{currentUser.id}</span>
        </div>
        <div className="flex justify-between py-4 border-b">
          <span className="text-gray-600">Sector</span>
          <span className="font-bold text-blue-600">Sector {currentUser.sector}</span>
        </div>
        <div className="flex justify-between py-4 border-b">
          <span className="text-gray-600">Total Reports</span>
          <span className="font-bold text-orange-600">{hazards.filter(h => h.worker === currentUser.id).length}</span>
        </div>
        <div className="flex justify-between py-4">
          <span className="text-gray-600">Status</span>
          <span className="font-bold text-green-600">Active & Safe</span>
        </div>
      </div>
    </div>
  );

  // Supervisor Views
  const SupervisorDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Pending', value: hazards.filter(h => h.status === 'pending').length, color: 'from-red-500 to-red-700', icon: AlertTriangle },
          { label: 'Active', value: hazards.filter(h => ['pending', 'acknowledged'].includes(h.status)).length, color: 'from-orange-500 to-yellow-600', icon: Activity },
          { label: 'Resolved', value: hazards.filter(h => h.status === 'resolved').length, color: 'from-green-500 to-emerald-700', icon: CheckCircle },
          { label: 'Workers', value: MOCK_WORKERS.length, color: 'from-blue-500 to-indigo-700', icon: Users },
        ].map((stat, i) => (
          <div key={i} className={`bg-gradient-to-br ${stat.color} text-white p-4 sm:p-6 lg:p-8 rounded-3xl shadow-2xl`}>
            <stat.icon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mb-2 sm:mb-3" />
            <div className="text-2xl sm:text-3xl lg:text-5xl font-bold">{stat.value}</div>
            <div className="text-sm sm:text-base lg:text-lg opacity-90">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Big Map */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-purple-800 text-white p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">Mine Overview - Live Status</h2>
        </div>
        <div className="relative h-64 sm:h-80 lg:h-96 bg-gray-900">
          {hazards.map(hazard => {
            const pos = getPositionFromCoords(hazard.location.lat, hazard.location.lng);
            const worker = MOCK_WORKERS.find(w => w.id === hazard.worker);
            return (
              <div key={hazard.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 group" style={{ top: pos.top, left: pos.left }}>
                <div className={`${getSeverityColor(hazard.severity)} rounded-full p-5 shadow-2xl ${hazard.status !== 'resolved' ? 'animate-pulse' : 'opacity-60'}`}>
                  {hazard.severity === 'critical' ? <Siren className="w-10 h-10 text-white" /> : <AlertOctagon className="w-10 h-10 text-white" />}
                </div>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-2 rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
                  {hazard.type} by {worker?.name}
                </div>
              </div>
            );
          })}

          {MOCK_WORKERS.map(worker => {
            const lat = 23.045 + (Math.random() - 0.5) * 0.006;
            const lng = 81.325 + (Math.random() - 0.5) * 0.006;
            const pos = getPositionFromCoords(lat, lng);
            return (
              <div key={worker.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 group" style={{ top: pos.top, left: pos.left }}>
                <div className="bg-green-500 rounded-full p-3 shadow-2xl">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-2 rounded text-xs opacity-0 group-hover:opacity-100">
                  {worker.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const SupervisorHazards = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">All Hazard Reports</h2>
      <div className="space-y-6">
        {hazards
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .map(hazard => {
            const worker = MOCK_WORKERS.find(w => w.id === hazard.worker);
            return (
              <div key={hazard.id} className="bg-white rounded-2xl shadow-xl p-6 border-l-8" style={{ borderLeftColor: hazard.severity === 'critical' ? '#ef4444' : hazard.severity === 'high' ? '#f97316' : '#eab308' }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold">{hazard.type}</h3>
                      <span className={`px-4 py-2 rounded-full text-white font-bold ${getSeverityColor(hazard.severity)}`}>
                        {hazard.severity.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(hazard.status)}`}>
                        {hazard.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-lg mb-3">{hazard.description}</p>
                    <div className="text-sm text-gray-600">
                      Reported by <strong>{worker?.name}</strong> ({worker?.id}) • {hazard.timestamp.toLocaleTimeString()} • Sector {hazard.location.sector}
                    </div>
                  </div>
                </div>

                {hazard.status !== 'resolved' && (
                  <div className="flex gap-3 mt-6">
                    {hazard.status === 'pending' && (
                      <button onClick={() => setHazardStatus(hazard.id, 'acknowledged')} className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" /> Acknowledge
                      </button>
                    )}
                    <button onClick={() => setHazardStatus(hazard.id, 'escalated')} className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Escalate
                    </button>
                    <button onClick={() => setHazardStatus(hazard.id, 'resolved')} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" /> Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-800 to-purple-900 text-white shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">MineGuard Pro</h1>
                <p className="text-blue-200 text-sm sm:text-base lg:text-lg">Real-time Safety & Hazard Management System</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                <button
                  onClick={() => { setUserType('worker'); setCurrentUser(MOCK_WORKERS[0]); }}
                  className={`px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 rounded-xl font-bold text-sm sm:text-base lg:text-lg transition-all ${userType === 'worker' ? 'bg-white text-blue-800 shadow-lg' : 'bg-blue-700 hover:bg-blue-600'}`}
                >
                  Worker View
                </button>
                <button
                  onClick={() => setUserType('supervisor')}
                  className={`px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 rounded-xl font-bold text-sm sm:text-base lg:text-lg transition-all ${userType === 'supervisor' ? 'bg-white text-blue-800 shadow-lg' : 'bg-blue-700 hover:bg-blue-600'}`}
                >
                  Supervisor View
                </button>
                <button onClick={() => fetchHazards()} className="ml-2 px-3 py-2 rounded bg-white text-sm font-medium text-gray-800">Refresh</button>
              </div>
            </div>
          </div>
        </header>

        {banner && (
          <div className={`max-w-7xl mx-auto mt-4 px-4 sm:px-6`}> 
            <div className={`p-3 rounded-lg ${banner.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{banner.message}</div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {userType === 'worker' ? (
            <>
              <div className="flex gap-2 sm:gap-4 mb-6 sm:mb-8 bg-white rounded-2xl shadow-xl p-2 sm:p-3">
                {[{ tab: 'dashboard', icon: Home, label: 'Dashboard' }, { tab: 'history', icon: History, label: 'History' }, { tab: 'profile', icon: User, label: 'Profile' }].map(t => (
                  <button
                    key={t.tab}
                    onClick={() => setActiveTab(t.tab)}
                    className={`flex-1 py-2 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 rounded-xl font-bold text-sm sm:text-base lg:text-lg transition-all flex items-center justify-center gap-2 sm:gap-3 ${activeTab === t.tab ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <t.icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" /> <span className="hidden sm:inline">{t.label}</span><span className="sm:hidden">{t.label.slice(0, 4)}</span>
                  </button>
                ))}
              </div>

              {activeTab === 'dashboard' && <WorkerDashboard />}
              {activeTab === 'history' && <WorkerHistory />}
              {activeTab === 'profile' && <WorkerProfile />}
            </>
          ) : (
            <>
              <div className="flex gap-2 sm:gap-4 mb-6 sm:mb-8 bg-white rounded-2xl shadow-xl p-2 sm:p-3">
                <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-2 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 rounded-xl font-bold text-sm sm:text-base lg:text-lg transition-all ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'}`}>
                  Dashboard
                </button>
                <button onClick={() => setActiveTab('hazards')} className={`flex-1 py-2 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 rounded-xl font-bold text-sm sm:text-base lg:text-lg transition-all ${activeTab === 'hazards' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'}`}>
                  All Hazards
                </button>
              </div>

              {activeTab === 'dashboard' && <SupervisorDashboard />}
              {activeTab === 'hazards' && <SupervisorHazards />}
            </>
          )}
        </div>

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-3xl p-6 sm:p-8 lg:p-10 max-w-lg w-full mx-4">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-6 sm:mb-8">Report New Hazard</h2>
              <div className="space-y-4 sm:space-y-6">
                <input
                  type="text"
                  placeholder="Hazard Type (e.g., Gas Leak, Rock Fall)"
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 rounded-xl text-base sm:text-lg focus:border-blue-500 focus:outline-none"
                  value={newHazard.type}
                  onChange={e => setNewHazard({ ...newHazard, type: e.target.value })}
                />
                <select
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 rounded-xl text-base sm:text-lg"
                  value={newHazard.severity}
                  onChange={e => setNewHazard({ ...newHazard, severity: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <textarea
                  placeholder="Description (optional)"
                  rows={4}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 rounded-xl text-base sm:text-lg focus:border-blue-500 focus:outline-none"
                  value={newHazard.description}
                  onChange={e => setNewHazard({ ...newHazard, description: e.target.value })}
                />
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button onClick={handleReportHazard} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 sm:py-4 rounded-xl font-bold text-lg sm:text-xl">
                    Submit Report
                  </button>
                  <button onClick={() => setShowReportModal(false)} className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-3 sm:py-4 rounded-xl font-bold text-lg sm:text-xl">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default App;