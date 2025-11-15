import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MATERIALS, { valueToLabel } from '../constants/materials';
interface Alchemist {
  id: number;
  military_id: string;
  name: string;
  title: string;
  specialization: string;
  rank: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}
interface FormData {
  military_id: string;
  name: string;
  title: string;
  specialization: string;
  rank: string;
  status: string;
}
export default function Alquimistas() {
  const [alchemists, setAlchemists] = useState<Alchemist[]>([
    {
      id: 1,
      military_id: 'A-001',
      name: 'Edward Elric',
      title: 'Alquimista de Acero',
      specialization: 'steel',
      rank: 'Major',
      status: 'active',
    },
    {
      id: 2,
      military_id: 'A-002',
      name: 'Roy Mustang',
      title: 'Alquimista de Fuego',
      specialization: 'carbon',
      rank: 'Colonel',
      status: 'active',
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    military_id: '',
    name: '',
    title: '',
    specialization: '',
    rank: 'Lieutenant',
    status: 'active',
  });
  const router = useRouter();
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
    fetchAlchemists();
  }, [router]);
  const fetchAlchemists = async () => {
    try {
      setLoading(true);
      console.log(' Obteniendo lista de alquimistas...');
      const response = await fetch('/api/alchemists');
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }
      const responseData = await response.json();
      console.log(' Respuesta de alquimistas:', responseData);
      if (responseData.success && responseData.data) {
        setAlchemists(responseData.data);
        console.log(` ${responseData.data.length} alquimistas cargados`);
      } else {
        setAlchemists([]);
        console.warn('  Sin datos en respuesta, usando lista vacía');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error(' Error al cargar alquimistas:', errorMsg);
      setAlchemists([]);
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    router.push('/login');
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormLoading(true);
    try {
      if (!formData.military_id || !formData.name) {
        setError('El ID Militar y Nombre son obligatorios');
        setFormLoading(false);
        return;
      }
      console.log(' Enviando datos del formulario:', formData);
      const response = await fetch('/api/alchemists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      console.log(' Respuesta del servidor:', data, 'Status:', response.status);
      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Error desconocido al crear alquimista';
        console.error(' Error :', errorMsg);
        setError(errorMsg);
        setFormLoading(false);
        return;
      }
      console.log(' Alquimista creado :', data.data);
//limpiar formulario
      setFormData({
        military_id: '',
        name: '',
        title: '',
        specialization: '',
        rank: 'Lieutenant',
        status: 'active',
      });
      setShowModal(false);
//recargar lista alquimistas
      await fetchAlchemists();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error de conexión con el servidor';
      console.error(' Error ', err);
      setError(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  return (
    <>
      <Head>
        <title>Alquimistas Estatales </title>
      </Head>
      {/*cabecera*/}
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
      {/*navegacion*/}
      <nav className="bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md">
              Alquimistas
            </button>
            <button 
              onClick={() => router.push('/transmutaciones')}
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            >
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
      {/*contenido*/}
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Alquimistas Estatales</h2>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-red-400 hover:bg-red-500 text-white px-4 py-2 rounded-md text-sm transition-colors">
              + Nuevo Alquimista
            </button>
          </div>
          {/* estadisticas*/}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Alquimistas</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{alchemists.length}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Activos</dt>
                <dd className="mt-1 text-3xl font-semibold text-green-600">
                  {alchemists.filter(a => a.status === 'active').length}
                </dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Rango Major</dt>
                <dd className="mt-1 text-3xl font-semibold text-blue-600">
                  {alchemists.filter(a => a.rank.includes('Major')).length}
                </dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Especialidades</dt>
                <dd className="mt-1 text-3xl font-semibold text-purple-600">
                  {new Set(alchemists.map(a => a.specialization)).size}
                </dd>
              </div>
            </div>
          </div>
          {/*tabla*/}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID Militar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialización
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rango
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alchemists.map((alchemist) => (
                  <tr key={alchemist.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {alchemist.military_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {alchemist.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {alchemist.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {valueToLabel(alchemist.specialization)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {alchemist.rank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        alchemist.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {alchemist.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      {/*nuevoalquimista*/}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowModal(false)}
            ></div>
            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Crear Nuevo Alquimista
                    </h3>

                    {error && (
                      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                      </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          ID Militar *
                        </label>
                        <input
                          type="text"
                          name="military_id"
                          value={formData.military_id}
                          onChange={handleInputChange}
                          placeholder="Ej: A-001"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Nombre *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Ej: Edward Elric"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Título
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          placeholder="Ej: Alquimista de Acero"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Especialización
                        </label>
                          <select
                            name="specialization"
                            value={formData.specialization}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Seleccionar material...</option>
                            {MATERIALS.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Rango
                        </label>
                        <select
                          name="rank"
                          value={formData.rank}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option>Lieutenant</option>
                          <option>Captain</option>
                          <option>Major</option>
                          <option>Colonel</option>
                          <option>General</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Estado
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="active">Activo</option>
                          <option value="inactive">Inactivo</option>
                        </select>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          disabled={formLoading}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          {formLoading ? 'Guardando...' : 'Crear Alquimista'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowModal(false)}
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
          </div>
        </div>
      )}
    </>
  );
}