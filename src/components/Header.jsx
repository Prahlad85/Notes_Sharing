import React, { useState, useEffect } from 'react';
import { Search, GraduationCap, Sun, Moon, Menu, X, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Header = () => {
  // Force cache refresh
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  // const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Unused
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

  // Check Auth State for "Back to Dashboard" button
  const [user, setUser] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
          .ilike('subject', `%${searchTerm}%`)
          .limit(20);
        
        if (error) throw error;
        setResults(data || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchNotes, 50);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleResultClick = (fileUrl) => {
    window.open(fileUrl, '_blank');
    setSearchTerm('');
  };

  // Helper to highlight text
  const highlightText = (text, highlight) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
        <span key={i} style={{ background: 'rgba(255, 255, 0, 0.4)', color: 'inherit' }}>{part}</span> : part
    );
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
            placeholder="Search subjects..."
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
                    <div style={{ fontWeight: '600' }}>{highlightText(note.subject, searchTerm)}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>By {note.written_by} • Sem {note.semester}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No results found</div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={toggleTheme} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {user && (
            <Link to="/admin" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
               <LayoutDashboard size={16} /> Dashboard
            </Link>
          )}
          
          {/* Admin link removed from here */}
        </div>
      </div>
    </header>
  );
};

export default Header;
