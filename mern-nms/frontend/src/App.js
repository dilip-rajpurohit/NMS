import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './styles/enhanced.css';
import './styles/dark-theme.css';

// Lazy load components for better performance
const Login = lazy(() => import('./components/Auth/Login'));
const Layout = lazy(() => import('./components/Layout/Layout'));

// Enhanced loading component with better UX
const Loading = () => (
  <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '100vh', backgroundColor: '#0f1419' }}>
    <div className="text-center text-white mb-4">
      <h3 className="fw-bold">
        <i className="fas fa-network-wired me-2 text-primary"></i>
        NMS
      </h3>
      <p className="text-light">Loading Network Management System...</p>
    </div>
    <div className="spinner-border text-light" role="status" style={{ width: '3rem', height: '3rem' }}>
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

// Main app content component
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  // Show login if not authenticated
  if (!user) {
    return (
      <Suspense fallback={<Loading />}>
        <Login />
      </Suspense>
    );
  }

  // Show main dashboard if authenticated
  return (
    <Suspense fallback={<Loading />}>
      <Layout />
    </Suspense>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <AppContent />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;