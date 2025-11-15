import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
interface LoginForm {
  militaryId: string;
  password: string;
}
export default function Login() {
  const [form, setForm] = useState<LoginForm>({ militaryId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (form.militaryId === 'A-001' && form.password === 'elric') {
        localStorage.setItem('auth_token', 'demo_token_amestris');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          militaryId: 'A-001',
          name: 'Edward Elric',
          title: 'Alquimista'
        }));
        router.push('/alquimistas');
      } else if (form.militaryId === 'A-002' && form.password === 'mustang') {
        localStorage.setItem('auth_token', 'demo_token_amestris');
        localStorage.setItem('user', JSON.stringify({
          id: 2,
          militaryId: 'A-002',
          name: 'Roy Mustang',
          title: 'Alquimista'
        }));
        router.push('/alquimistas');
      } else {
        setError('Credenciales inválidas.  A-001/elric o A-002/mustang');
      }
    } catch (err) {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login - Departamento de Alquimia</title>
      </Head>
      <div 
        className="login-root min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative"
        style={{
          backgroundImage: 'url(/FMAIMAGE.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="max-w-md w-full space-y-8 relative z-10">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
              Departamento de Alquimia Estatal
            </h2>
            <p className="mt-2 text-center text-sm text-gray-300">
              Sistema de Gestión de Alquimistas
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="militaryId" className="sr-only">
                  ID Militar
                </label>
                <input
                  id="militaryId"
                  name="militaryId"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="ID Militar (ej: A-001)"
                  value={form.militaryId}
                  onChange={(e) => setForm({ ...form, militaryId: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Contraseña"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-300">
                A-001/elric o A-002/mustang
              </p>
            </div>
          </form>
        </div>
        {}
        <style jsx>{`
          .login-root .w-8.h-8 { display: none !important; }
        `}</style>
      </div>
    </>
  );
}