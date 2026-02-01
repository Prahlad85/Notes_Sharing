import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';

const NoteCard = ({ note }) => {
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
        <h4 title={note.title}>{note.title}</h4>
        <div className="note-meta">
          <span>{note.subject}</span>
          <span>•</span>
          <span>{date}</span>
        </div>
      </div>

      <div className="note-actions">
        <a 
          href={note.file_url} 
          target="_blank" 
          rel="noreferrer"
          className="btn btn-outline btn-full"
        >
          <Eye size={16} /> View
        </a>
        
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
