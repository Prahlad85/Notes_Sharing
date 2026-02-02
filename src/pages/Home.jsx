import React, { useState, useEffect } from 'react';
import { Layers, AlertTriangle } from 'lucide-react';
import SemesterCard from '../components/SemesterCard';
import { supabase } from '../lib/supabaseClient';

const Home = () => {
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
  const [notice, setNotice] = useState(null);

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
    fetchNotice();
  }, []);

  return (
    <div style={{ paddingTop: '80px' }}>
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

      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Engineering Resources
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Access curated notes and study materials for all semesters.
            Organized, free, and accessible.
          </p>
        </div>

        <div className="grid-cards">
          {semesters.map((sem) => (
            <SemesterCard key={sem} semester={sem} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
