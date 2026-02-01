import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import SemesterNotes from './pages/SemesterNotes';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css'; // Importing empty file just to be safe

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/semester/:id" element={<SemesterNotes />} />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
        
        <footer style={{ 
          textAlign: 'center', 
          padding: '2rem', 
          color: 'var(--text-muted)', 
          borderTop: '1px solid var(--glass-border)',
          marginTop: 'auto'
        }}>
          <p>© {new Date().getFullYear()} NoteShare. Built for Engineers.</p>
          <div style={{ marginTop: '0.5rem' }}>
            <a href="/login" style={{ fontSize: '0.8rem', opacity: 0.7 }}>Admin Access</a>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
