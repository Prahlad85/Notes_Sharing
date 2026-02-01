import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';

const NoteCard = ({ note, onView }) => {
  const date = new Date(note.created_at).toLocaleDateString();

  return (
    <div className="note-card animate-fade-in">
      <div className="note-header">
        <div className="badge">Sem {note.semester}</div>
        <div className="note-icon">
          <FileText size={20} />
        </div>
      </div>
      
      <div style={{ marginBottom: '1rem', flex: 1 }}>
        <h4 title={note.subject} style={{ fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          {note.subject}
        </h4>
        <div className="note-meta">
          <span>By {note.written_by}</span>
          <span>•</span>
          <span>{date}</span>
        </div>
      </div>

      <div className="note-actions">
        <button 
          onClick={() => onView(note)}
          className="btn btn-outline btn-full"
        >
          <Eye size={16} /> View
        </button>
        
        {/* For direct download, we add 'download' attribute, 
            though for some cloud providers this requires response header config */}
        <a 
          href={`${note.file_url}?download=`} 
          download
          target="_blank" 
          rel="noreferrer"
          className="btn btn-primary btn-full"
        >
          <Download size={16} /> Save
        </a>
      </div>
    </div>
  );
};

export default NoteCard;
