import React from 'react';
import { Layers } from 'lucide-react';
import SemesterCard from '../components/SemesterCard';

const Home = () => {
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="container" style={{ paddingTop: '100px', paddingBottom: '4rem' }}>
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
  );
};

export default Home;
