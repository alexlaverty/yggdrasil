import React from 'react';
import { useNavigate } from 'react-router-dom';

function PrevNextNav({ currentId, maxId, baseUrl, label = 'Record' }) {
  const navigate = useNavigate();
  const id = parseInt(currentId);

  const hasPrev = id > 1;
  const hasNext = id < maxId;

  const buttonStyle = (enabled) => ({
    padding: '8px 16px',
    backgroundColor: enabled ? '#2c5282' : '#ccc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontSize: '14px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.2s'
  });

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderTop: '1px solid #eee',
      borderBottom: '1px solid #eee',
      marginBottom: '20px'
    }}>
      <button
        onClick={() => hasPrev && navigate(`${baseUrl}/${id - 1}`)}
        disabled={!hasPrev}
        style={buttonStyle(hasPrev)}
        onMouseEnter={(e) => {
          if (hasPrev) e.currentTarget.style.backgroundColor = '#1a365d';
        }}
        onMouseLeave={(e) => {
          if (hasPrev) e.currentTarget.style.backgroundColor = '#2c5282';
        }}
      >
        ← Previous
      </button>

      <span style={{ color: '#666', fontSize: '14px' }}>
        {label} {id} of {maxId}
      </span>

      <button
        onClick={() => hasNext && navigate(`${baseUrl}/${id + 1}`)}
        disabled={!hasNext}
        style={buttonStyle(hasNext)}
        onMouseEnter={(e) => {
          if (hasNext) e.currentTarget.style.backgroundColor = '#1a365d';
        }}
        onMouseLeave={(e) => {
          if (hasNext) e.currentTarget.style.backgroundColor = '#2c5282';
        }}
      >
        Next →
      </button>
    </div>
  );
}

export default PrevNextNav;
