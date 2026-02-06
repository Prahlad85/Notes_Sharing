import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import NoteCard from '../components/NoteCard';

const SemesterNotes = () => {
  const { id } = useParams();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewNote, setViewNote] = useState(null);
  const [iframeLoading, setIframeLoading] = useState(true);

  const handleViewNote = (note) => {
    setViewNote(note);
    setIframeLoading(true);
    
    try {
      const saved = localStorage.getItem('recentReads');
      let currentHistory = saved ? JSON.parse(saved) : [];
      currentHistory = currentHistory.filter(n => n.id !== note.id);
      const updated = [note, ...currentHistory].slice(0, 5);
      localStorage.setItem('recentReads', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('semester', id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotes(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [id]);

  return (
    <div className="container" style={{ paddingTop: '100px', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link to="/" className="btn btn-ghost" style={{ padding: '0.5rem' }}>
          <ArrowLeft />
        </Link>
        <h1>Semester {id} Materials</h1>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          Error loading notes: {error}
        </div>
      ) : notes.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
          <h3>No notes found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            There are currently no materials uploaded for this semester.
          </p>
        </div>
      ) : (
        <div className="grid-cards">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onView={handleViewNote} />
          ))}
        </div>
      )}

      {viewNote && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }} onClick={() => setViewNote(null)}>
           <div style={{
             width: '100%',
             height: '100%',
             background: 'var(--bg-page)',
             display: 'flex',
             flexDirection: 'column',
             position: 'relative',
             animation: 'slideUp 0.3s ease-out'
           }} onClick={e => e.stopPropagation()}>
             {/* Modal Header */}
             <div style={{
               padding: '0.75rem 1.5rem',
               borderBottom: '1px solid var(--border-color)',
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               background: 'var(--bg-card)',
               boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
             }}>
               <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{viewNote.subject}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>By {viewNote.written_by}</p>
               </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                   <a href={viewNote.file_url} download className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={e => e.stopPropagation()}>Download</a>
                   <button 
                    onClick={() => setViewNote(null)}
                    className="btn btn-ghost"
                    style={{ padding: '0.5rem', borderRadius: '50%' }}
                  >
                    <X size={24} />
                  </button>
                </div>
             </div>
             
             {/* PDF/Image Container */}
             <div style={{ flex: 1, background: '#333', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               {iframeLoading && (
                 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                   <div className="loading-spinner"></div>
                 </div>
               )}
               {viewNote.file_url.toLowerCase().endsWith('.pdf') ? (
                 <iframe 
                   src={viewNote.file_url} 
                   style={{ width: '100%', height: '100%', border: 'none', opacity: iframeLoading ? 0 : 1, transition: 'opacity 0.3s' }}
                   title="PDF Preview"
                   onLoad={() => setIframeLoading(false)}
                 />
               ) : (
                 <img 
                   src={viewNote.file_url} 
                   alt="Note Preview" 
                   style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: iframeLoading ? 0 : 1, transition: 'opacity 0.3s' }}
                   onLoad={() => setIframeLoading(false)}
                 />
               )}
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SemesterNotes;
