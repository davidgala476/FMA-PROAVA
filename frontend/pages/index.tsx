import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.push('/alquimistas');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <>
      <Head>
        <title>Departamento de Alquimia Estatal - Amestris</title>
        <meta name="description" content="Sistema de gestión para alquimistas estatales de Amestris" />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Departamento de Alquimia Estatal</h1>
          <p className="text-xl opacity-80">Cargando sistema...</p>
          <div className="mt-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    </>
  );
}