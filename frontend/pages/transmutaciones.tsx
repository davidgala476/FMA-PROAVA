import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MATERIALS, { valueToLabel } from '../constants/materials';

interface TransmutationRequest {
  id: number;
  alchemist: string;
  material: string;
  target: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  description: string;
  cost?: number;
  successRate?: number;
  result?: string;
  resultQuantity?: number;
}

interface AuditLog {
  id: number;
  action: string;
  alchemist: string;
  timestamp: string;
  details: string;
  status: string;
}

export default function Transmutaciones() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'approvals' | 'request' | 'audit'>('approvals');
  const [transmutationRequests, setTransmutationRequests] = useState<TransmutationRequest[]>([
    {
      id: 1,
      alchemist: 'Edward Elric',
      material: 'iron',
      target: 'steel',
      status: 'pending',
      requestDate: '2025-11-10',
      description: 'Transmutar mineral de hierro a acero de alta calidad'
    },
    {
      id: 2,
      alchemist: 'Roy Mustang',
      material: 'carbon',
      target: 'diamond',
      status: 'approved',
      requestDate: '2025-11-09',
      description: 'Crear diamantes para investigación'
    },
  ]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 1,
      action: 'Nueva solicitud de transmutación: acero → carbono',
      alchemist: 'Edward Elric',
      timestamp: '14/11/2025, 0:35:17',
      details: 'Solicitud de transmutación de hierro a acero',
      status: 'pending'
    },
    {
      id: 2,
      action: 'Solicitud 1 aprobada',
      alchemist: 'Edward Elric',
      timestamp: '14/11/2025, 0:35:06',
      details: 'Solicitud de transmutación aprobada',
      status: 'approved'
    },
    {
      id: 3,
      action: 'Solicitud Enviada',
      alchemist: 'Edward Elric',
      timestamp: '2025-11-10 14:30:00',
      details: 'Solicitud de transmutación de hierro a acero',
      status: 'pending'
    },
    {
      id: 4,
      action: 'Solicitud Aprobada',
      alchemist: 'Roy Mustang',
      timestamp: '2025-11-09 10:15:00',
      details: 'Solicitud de transmutación aprobada',
      status: 'approved'
    },
  ]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [formData, setFormData] = useState({
    material: '',
    target: '',
    description: ''
  });
  const [simulationData, setSimulationData] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleApproveRequest = (id: number) => {
    setTransmutationRequests(prev =>
      prev.map(req => req.id === id ? { ...req, status: 'approved' } : req)
    );
    // Log en auditoría
    addAuditLog(`Request ${id} approved`, 'approved');
  };

  const handleRejectRequest = (id: number) => {
    setTransmutationRequests(prev =>
      prev.map(req => req.id === id ? { ...req, status: 'rejected' } : req)
    );
    addAuditLog(`Request ${id} rejected`, 'rejected');
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.material || !formData.target) {
      alert('Por favor completa todos los campos');
      return;
    }

    const newRequest: TransmutationRequest = {
      id: Math.max(...transmutationRequests.map(r => r.id), 0) + 1,
      alchemist: user?.name || 'Unknown Alchemist',
      material: formData.material,
      target: formData.target,
      status: 'pending',
      requestDate: new Date().toISOString().split('T')[0],
      description: formData.description,
      cost: simulationData?.cost || 0,
      successRate: simulationData?.success_rate || 50,
      result: simulationData?.result || 'pending',
      resultQuantity: simulationData?.result_quantity || 0
    };

    setTransmutationRequests(prev => [newRequest, ...prev]);
    addAuditLog(
      `New transmutation request: ${formData.material} → ${formData.target}`,
      'pending'
    );

    setFormData({ material: '', target: '', description: '' });
    setSimulationData(null);
    setShowRequestModal(false);
  };

  const addAuditLog = (action: string, status: string) => {
    const newLog: AuditLog = {
      id: Math.max(...auditLogs.map(l => l.id), 0) + 1,
      action: action,
      alchemist: user?.name || 'System',
      timestamp: new Date().toLocaleString('es-ES'),
      details: action,
      status: status
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSimulate = async () => {
    if (!formData.material || !formData.target) {
      alert('Por favor completa Material de Origen y Material Destino');
      return;
    }

    setIsSimulating(true);
    try {
      const response = await fetch('/api/transmutations/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_material: formData.material,
          output_material: formData.target,
          quantity: 1.0
        })
      });

      if (!response.ok) {

        try {
          const errBody = await response.json();
          console.warn('Simulation API error:', errBody);
        } catch (e) {
          console.warn('Simulation API returned non-JSON error or unreachable');
        }
        const local = localSimulate(formData.material, formData.target);
        setSimulationData(local);
        return;
      }

      const data = await response.json();
      if (data && data.success) {
        setSimulationData(data.data);
      } else {
        console.warn('Simulation API returned unexpected payload', data);
        const local = localSimulate(formData.material, formData.target);
        setSimulationData(local);
      }
    } catch (error) {
      console.error('Error:', error);
      const local = localSimulate(formData.material, formData.target);
      setSimulationData(local);
    } finally {
      setIsSimulating(false);
    }
  };
  const localSimulate = (input: string, output: string) => {
    const materialValue: Record<string, number> = {
      iron: 2,
      steel: 6,
      carbon: 8,
      diamond: 1200,
      water: 0.2,
      ice: 0.5,
      gold: 180,
      silver: 45,
      copper: 8,
      stone: 0.4
    };

    const inVal = materialValue[input] ?? 1;
    const outVal = materialValue[output] ?? 1;

    const qty = 1.0;
    const rarityFactor = Math.max(1, outVal / Math.max(inVal, 1));
    const baseUnitCost = (inVal + outVal) * 2.5; 
    const cost = parseFloat((baseUnitCost * rarityFactor * qty).toFixed(2));
    const relativeDiff = Math.abs(outVal - inVal) / Math.max(outVal, inVal);
    let successRate = Math.round(90 - relativeDiff * 60 - (rarityFactor - 1) * 10);
    if (output === 'diamond') successRate = Math.round(successRate * 0.35);
    successRate = Math.min(95, Math.max(5, successRate));
    const efficiency = Math.min(1, inVal / Math.max(outVal, 1));
    const result_quantity = parseFloat((qty * (successRate / 100) * efficiency).toFixed(2));

    let result: string = 'partial';
    if (successRate >= 80) result = 'success';
    else if (successRate <= 30) result = 'failure';

    return {
      cost,
      success_rate: successRate,
      result,
      result_quantity
    };
  };

  return (
    <>
      <Head>
        <title>Transmutaciones - Amestris</title>
      </Head>
      
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-red-500 rounded-lg mr-3"></div>
              <h1 className="text-xl font-bold text-gray-900">
                Departamento de Alquimia Estatal
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.name} ({user?.title})
              </span>
              <button
                onClick={handleLogout}
                className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button 
              onClick={() => router.push('/alquimistas')}
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            >
              Alquimistas
            </button>
            <button className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md">
              Transmutaciones
            </button>
            <button 
              onClick={() => router.push('/misiones')}
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            >
              Misiones
            </button>
          </div>
        </div>
      </nav>

      <main 
        className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8"
        style={{
          backgroundImage: 'url(/FMAIMAGE.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Gestión de Transmutaciones</h2>
            <button
              onClick={() => setShowRequestModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
            >
              + Nueva Solicitud
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('approvals')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'approvals'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Aprobaciones Pendientes
              </button>
              <button
                onClick={() => setActiveTab('request')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'request'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mis Solicitudes
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'audit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Registro de Auditoría
              </button>
            </div>
          </div>

          {/* Aprobaciones Pendientes */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              {transmutationRequests.filter(r => r.status === 'pending').length === 0 ? (
                <div className="bg-white shadow rounded-lg p-6 text-center text-gray-600">
                  No hay solicitudes pendientes de aprobación
                </div>
              ) : (
                transmutationRequests
                  .filter(r => r.status === 'pending')
                  .map(request => (
                    <div key={request.id} className="bg-white shadow rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {valueToLabel(request.material)} → {valueToLabel(request.target)}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Solicitante: <strong>{request.alchemist}</strong>
                          </p>
                          <p className="text-sm text-gray-600">
                            Fecha de solicitud: <strong>{request.requestDate}</strong>
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            Descripción: {request.description}
                          </p>
                          
                          {/* Información de simulación */}
                          {request.cost !== undefined && (
                            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                              <h4 className="font-semibold text-blue-900 text-sm mb-2">Simulación de Transmutación</h4>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-600">Costo Estimado:</p>
                                  <p className="font-bold text-blue-600">${request.cost?.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Tasa de Éxito:</p>
                                  <p className="font-bold text-blue-600">{request.successRate}%</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Resultado Esperado:</p>
                                  <p className="font-bold text-blue-600 capitalize">{request.result}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Cantidad Esperada:</p>
                                  <p className="font-bold text-blue-600">{request.resultQuantity?.toFixed(2)} unidades</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveRequest(request.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition-colors"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* Mis Solicitudes */}
          {activeTab === 'request' && (
            <div className="space-y-4">
              {transmutationRequests.length === 0 ? (
                <div className="bg-white shadow rounded-lg p-6 text-center text-gray-600">
                  No tienes solicitudes registradas
                </div>
              ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Material Origen → Destino
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Costo Est.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Éxito
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Resultado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transmutationRequests.map(request => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {valueToLabel(request.material)} → {valueToLabel(request.target)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            ${request.cost?.toFixed(2) || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {request.successRate || 'N/A'}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded capitalize ${
                              request.result === 'success' ? 'bg-green-100 text-green-800' :
                              request.result === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              request.result === 'failure' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.result || 'Pendiente'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {request.requestDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              request.status === 'approved' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {request.status === 'pending' ? 'Pendiente' :
                               request.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Registro de Auditoría */}
          {activeTab === 'audit' && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alquimista
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.alchemist}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.timestamp}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          log.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {log.status === 'pending' ? 'Pendiente' :
                           log.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal para nueva solicitud */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowRequestModal(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Nueva Solicitud de Transmutación
                </h3>

                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Material de Origen *
                    </label>
                    <select
                      name="material"
                      value={formData.material}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Selecciona un material...</option>
                      {MATERIALS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Material Destino *
                    </label>
                    <select
                      name="target"
                      value={formData.target}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Selecciona un material...</option>
                      {MATERIALS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Descripción
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Detalla el propósito y detalles de la transmutación"
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    ></textarea>
                  </div>

                  {/* Botón de simulación */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSimulate}
                      disabled={isSimulating || !formData.material || !formData.target}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {isSimulating ? 'Simulando...' : 'Simular Transmutación'}
                    </button>
                  </div>

                  {/* Resultado de simulación */}
                  {simulationData && (
                    <div className="p-3 bg-green-50 rounded border border-green-200">
                      <h4 className="font-semibold text-green-900 text-sm mb-2"> Resultado de Simulación</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Costo Estimado:</p>
                          <p className="font-bold text-green-600">${simulationData.cost?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Tasa de Éxito:</p>
                          <p className="font-bold text-green-600">{simulationData.success_rate}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Resultado Probable:</p>
                          <p className="font-bold text-green-600 capitalize">{simulationData.result}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Cantidad Esperada:</p>
                          <p className="font-bold text-green-600">{simulationData.result_quantity?.toFixed(2)} unidades</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Enviar Solicitud
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRequestModal(false);
                        setSimulationData(null);
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}