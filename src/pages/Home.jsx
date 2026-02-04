import React, { useState, useEffect } from 'react';
import { Layers, AlertTriangle, Users } from 'lucide-react';
import SemesterCard from '../components/SemesterCard';
import { supabase } from '../lib/supabaseClient';

const Home = () => {
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
  const [notice, setNotice] = useState(null);
  const [examNotes, setExamNotes] = useState([]);
  const [selectedExamGroup, setSelectedExamGroup] = useState(null); // 'MST1' | 'MST2' | 'Final Exam'
  const [activeUsers, setActiveUsers] = useState(100);

  // Helper to group notes
  const getGroupedNotes = () => {
    const groups = { MST1: [], MST2: [], 'Final Exam': [] };
    examNotes.forEach(note => {
      if (groups[note.exam_type]) {
        groups[note.exam_type].push(note);
      }
    });
    return groups;
  };
  
  const groupedNotes = getGroupedNotes();

  useEffect(() => {
    const fetchNotice = async () => {
      const { data } = await supabase
        .from('notices')
        .select('*')
        .eq('id', 1)
        .eq('is_active', true)
        .single();
      
      if (data) setNotice(data.content);
    };

    const fetchExamNotes = async () => {
      const { data } = await supabase
        .from('notes')
        .select('*')
        .in('exam_type', ['MST1', 'MST2', 'Final Exam'])
        .order('created_at', { ascending: false }); // Fetch all to group them locally, or limit reasonably high
      
      if (data) setExamNotes(data);
    };

    fetchNotice();
    fetchExamNotes();

    // Simulate Active Users: 100 + Random + 1 (Real User)
    const updateActiveUsers = () => {
      const randomUsers = Math.floor(Math.random() * 40) + 10; // Random between 10-50
      setActiveUsers(100 + randomUsers + 1);
    };
    
    updateActiveUsers(); // Initial set
    const interval = setInterval(updateActiveUsers, 4000); // Update every 4s

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ paddingTop: '80px' }}>
      {/* Active Users Badge - Mobile Only */}
      <div className="mobile-only" style={{
        position: 'fixed',
        top: '135px',
        right: '10px',
        zIndex: 40,
        background: 'var(--bg-card)',
        border: '1px solid var(--primary)',
        padding: '0.5rem 1rem',
        borderRadius: '999px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        boxShadow: 'var(--shadow-md)',
        color: 'var(--text-main)',
        fontWeight: '600',
        fontSize: '0.9rem',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <span style={{
          display: 'block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#22c55e',
          boxShadow: '0 0 8px #22c55e'
        }}></span>
        <Users size={18} style={{ color: 'var(--primary)' }} />
        <span>{activeUsers} Active</span>
      </div>
      {/* Notice Board Marquee */}
      {notice && (
        <div className="notice-board">
          <div className="marquee-content">
            <span style={{ marginRight: '50px' }}>📢 {notice}</span>
            <span style={{ marginRight: '50px' }}>📢 {notice}</span>
            <span style={{ marginRight: '50px' }}>📢 {notice}</span>
            <span style={{ marginRight: '50px' }}>📢 {notice}</span>
          </div>
        </div>
      )}

        {/* Recent Exam Papers Section - Grouped */}
        {examNotes.length > 0 && (
          <div className="container" style={{ marginBottom: '4rem', marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span role="img" aria-label="books">📚</span> Latest Exam Papers
            </h2>
            <div className="grid-cards">
              {['MST1', 'MST2', 'Final Exam'].map(type => {
                const count = groupedNotes[type]?.length || 0;
                if (count === 0) return null;

                return (
                  <div 
                    key={type} 
                    className="note-card animate-fade-in" 
                    style={{ borderColor: 'var(--primary)', cursor: 'pointer' }}
                    onClick={() => setSelectedExamGroup(type)}
                  >
                     <div className="note-header">
                      <div className="badge" style={{ background: 'var(--primary)', color: 'white' }}>{type}</div>
                      <div className="badge">{count} Papers</div>
                    </div>
                    <div style={{ marginBottom: '1rem', marginTop: '1rem' }}>
                      <h4 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{type} Papers</h4>
                       <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                         Click to view all {type} question papers and notes.
                       </p>
                    </div>
                    <button className="btn btn-outline btn-full">
                      View All {type}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="container" style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Semester Notes</h2>
          <div className="grid-cards">
            {semesters.map((sem) => (
              <SemesterCard key={sem} semester={sem} />
            ))}
          </div>
        </div>

      {/* Exam Group Modal */}
      {selectedExamGroup && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setSelectedExamGroup(null)}>
          <div 
            className="glass-panel" 
            style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{selectedExamGroup} Materials</h3>
              <button className="btn btn-ghost" onClick={() => setSelectedExamGroup(null)}>✕</button>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {groupedNotes[selectedExamGroup].map(note => (
                <div key={note.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1rem', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                  background: 'rgba(255,255,255,0.03)'
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem' }}>{note.subject}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Sem {note.semester} • By {note.written_by}
                    </p>
                  </div>
                  <a 
                    href={note.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-primary"
                    style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
