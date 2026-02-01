import React, { useState, useEffect } from 'react';
import { Search, GraduationCap, Sun, Moon, Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Header = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Dark Mode Logic
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.body.classList.add('dark');
    } else {
      setDarkMode(false);
      document.body.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (darkMode) {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  // Search Logic
  useEffect(() => {
    const searchNotes = async () => {
      if (searchTerm.trim().length === 0) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .or(`title.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%`)
          .limit(5);
        
        if (error) throw error;
        setResults(data || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchNotes, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleResultClick = (fileUrl) => {
    window.open(fileUrl, '_blank');
    setSearchTerm('');
  };

  return (
    <header className="header">
      <div className="container nav-content">
        <Link to="/" className="logo">
          <GraduationCap size={28} />
          <span>Noteshare</span>
        </Link>
        
        {/* Desktop Search */}
        <div className="search-container">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {/* Search Dropdown */}
          {searchTerm && (
            <div className="glass-panel" style={{
              position: 'absolute',
              top: '120%',
              left: 0,
              right: 0,
              padding: '0.5rem',
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 100,
              background: 'var(--bg-card)'
            }}>
              {isSearching ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Searching...</div>
              ) : results.length > 0 ? (
                results.map(note => (
                  <div 
                    key={note.id}
                    onClick={() => handleResultClick(note.file_url)}
                    style={{
                      padding: '0.75rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-page)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <div style={{ fontWeight: '600' }}>{note.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{note.subject} • Sem {note.semester}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No results found</div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={toggleTheme} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <Link to="/login" className="btn btn-ghost" style={{ fontSize: '0.9rem' }}>Admin</Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
