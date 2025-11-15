import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface Mission {
  id: number;
  alchemist_id: number;
  alchemist_name: string;
  alchemist_rank: string;
  title: string;
  description: string;
  objective: string;
  status: 'open' | 'closed';
  assigned_date: string;
  completion_date?: string;
  reward: number;
  difficulty: 'baja' | 'media' | 'alta';
}

export default function Misiones() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [missions, setMissions] = useState<Mission[]>([
    {
      id: 1,
      alchemist_id: 1,
      alchemist_name: 'Edward Elric',
      alchemist_rank: 'Major',
      title: 'Investigación de Transmutación',
      description: 'Investigar nuevos métodos de transmutación en la región norte',
      objective: 'Completar 5 experimentos de transmutación',
      status: 'open',
      assigned_date: '2025-11-08',
      reward: 5000,
      difficulty: 'alta'
    },
    {
      id: 2,
      alchemist_id: 2,
      alchemist_name: 'Roy Mustang',
      alchemist_rank: 'Colonel',
      title: 'Búsqueda de Criminales',
      description: 'Localizar y capturar a criminales del estado',
      objective: 'Capturar 3 delincuentes buscados',
      status: 'open',
      assigned_date: '2025-11-10',
      reward: 3000,
      difficulty: 'media'
    },
    {
      id: 3,
      alchemist_id: 1,
      alchemist_name: 'Edward Elric',
      alchemist_rank: 'Major',
      title: 'Misión de Reconocimiento',
      description: 'Reconocer el área fronteriza de Drachma',
      objective: 'Mapear zonas de actividad anómala',
      status: 'closed',
      assigned_date: '2025-11-01',
      completion_date: '2025-11-12',
      reward: 2000,
      difficulty: 'media'
    }
  ]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleCloseMission = (id: number) => {
    setMissions(missions.map(m =>
      m.id === id
        ? {
            ...m,
            status: 'closed',
            completion_date: new Date().toISOString().split('T')[0]
          }
        : m
    ));
  };

  const handleApproveMission = (id: number) => {
    //envia solicitud al backend
    alert(`Misión ${id} aprobada`);
  };

  const handleRejectMission = (id: number) => {
    setMissions(missions.filter(m => m.id !== id));
  };

  const openMissions = missions.filter(m => m.status === 'open');
  const closedMissions = missions.filter(m => m.status === 'closed');

  return (
    <>
      <Head>
        <title>Misiones - Amestris</title>
      </Head>

      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-red-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-sm"></span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                Departamento de Alquimia Estatal
              </h1>
            </div>
            <div className="flex items-center space-x-4">
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
            <button 
              onClick={() => router.push('/transmutaciones')}
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            >
              Transmutaciones
            </button>
            <button className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md">
              Misiones
            </button>
          </div>
        </div>
      </nav>

      <main 
        className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 min-h-screen"
        style={{
          backgroundImage: 'url(/FMAIMAGE.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestión de Misiones</h2>

          {}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('open')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'open'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Misiones Abiertas ({openMissions.length})
              </button>
              <button
                onClick={() => setActiveTab('closed')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'closed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Misiones Completadas ({closedMissions.length})
              </button>
            </div>
          </div>

          {/* Misiones Abiertas */}
          {activeTab === 'open' && (
            <div className="space-y-4">
              {openMissions.length === 0 ? (
                <div className="bg-white shadow rounded-lg p-6 text-center text-gray-600">
                  No hay misiones abiertas en este momento
                </div>
              ) : (
                openMissions.map(mission => (
                  <div key={mission.id} className="bg-white shadow rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {mission.title}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              mission.difficulty === 'alta'
                                ? 'bg-red-100 text-red-800'
                                : mission.difficulty === 'media'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            Dificultad {mission.difficulty}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Alquimista:</strong> {mission.alchemist_name} ({mission.alchemist_rank})
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Descripción:</strong> {mission.description}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Objetivo:</strong> {mission.objective}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Fecha Asignada:</strong> {mission.assigned_date}
                        </p>
                        <p className="text-sm font-semibold text-green-600 mt-2">
                          Recompensa: ${mission.reward.toLocaleString()}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCloseMission(mission.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
                        >
                          Completar
                        </button>
                        <button
                          onClick={() => handleRejectMission(mission.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Misiones Completadas */}
          {activeTab === 'closed' && (
            <div className="space-y-4">
              {closedMissions.length === 0 ? (
                <div className="bg-white shadow rounded-lg p-6 text-center text-gray-600">
                  No hay misiones completadas aún
                </div>
              ) : (
                closedMissions.map(mission => (
                  <div key={mission.id} className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {mission.title}
                          </h3>
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Completada
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Alquimista:</strong> {mission.alchemist_name} ({mission.alchemist_rank})
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Descripción:</strong> {mission.description}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Objetivo:</strong> {mission.objective}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Fecha Asignada:</strong> {mission.assigned_date}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Fecha Completada:</strong> {mission.completion_date}
                        </p>
                        <p className="text-sm font-semibold text-green-600 mt-2">
                          Recompensa Otorgada: ${mission.reward.toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Misión Cerrada
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}