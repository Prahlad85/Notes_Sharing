import React from 'react';
import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SemesterCard = ({ semester }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="semester-card" 
      onClick={() => navigate(`/semester/${semester}`)}
    >
      <BookOpen className="semester-icon" />
      <h3>Semester {semester}</h3>
      <p>Browse study materials</p>
    </div>
  );
};

export default SemesterCard;
