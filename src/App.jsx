import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import FridgeView from './components/FridgeView';
import ScanView from './components/ScanView';
import AddProductView from './components/AddProductView';
import RecipesView from './components/RecipesView';
import GalleryView from './components/GalleryView';
import ShoppingListView from './components/ShoppingListView';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  handleReset() {
    localStorage.clear();
    window.location.reload();
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          background: '#f9fafb'
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 8 }}>
            Qualcosa è andato storto
          </h2>
          <p style={{ color: '#6b7280', marginBottom: 32, fontSize: 14 }}>
            Si è verificato un errore imprevisto. Premi il pulsante per ripristinare l'app.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '14px 28px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Ripristina App
          </button>
          <p style={{ color: '#9ca3af', marginTop: 16, fontSize: 12 }}>
            I dati salvati verranno azzerati
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { currentView } = useApp();
  return (
    <div className="min-h-screen pb-24">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {currentView === 'fridge' && <FridgeView />}
        {currentView === 'gallery' && <GalleryView />}
        {currentView === 'shopping' && <ShoppingListView />}
        {currentView === 'recipes' && <RecipesView />}
        {currentView === 'scan' && <ScanView />}
        {currentView === 'add' && <AddProductView />}
      </main>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
