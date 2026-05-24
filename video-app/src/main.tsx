import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#050608', color: '#f0f0f0',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '2rem', textAlign: 'center',
          fontFamily: 'monospace'
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#e85d26' }}>
            Error en la aplicación
          </h1>
          <p style={{ color: '#999', fontSize: '0.85rem', maxWidth: '500px', marginBottom: '2rem' }}>
            {this.state.error}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: '' })}
            style={{
              background: '#e85d26', color: '#fff', border: 'none',
              padding: '12px 28px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '0.9rem', fontWeight: 'bold'
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);