import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Sales from './pages/Sales';
import Dashboard from './pages/Dashboard';
import CashRegister from './pages/CashRegister';
import CurrentTurn from './pages/CurrentTurn';
import Products from './pages/Products';
import Stock from './pages/Stock';
import Movements from './pages/Movements';
import Transactions from './pages/Transactions';

function App() {
  const { refreshData, isAdmin } = useStore();
  
  useEffect(() => {
    refreshData();
  }, []);

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Sales />} />
            <Route 
              path="dashboard" 
              element={isAdmin ? <Dashboard /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="arqueo" 
              element={isAdmin ? <CashRegister /> : <Navigate to="/" replace />} 
            />
            <Route path="turno-actual" element={<CurrentTurn />} />
            <Route 
              path="products" 
              element={isAdmin ? <Products /> : <Navigate to="/" replace />} 
            />
            <Route path="stock" element={isAdmin ? <Stock /> : <Navigate to="/" replace />} />
            <Route path="movements" element={isAdmin ? <Movements /> : <Navigate to="/" replace />} />
            <Route path="transactions" element={isAdmin ? <Transactions /> : <Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;