import { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from 'react-query';
import Notifications from '../components/Notifications';
import '../styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <Component {...pageProps} />
        <Notifications />
      </div>
    </QueryClientProvider>
  );
}