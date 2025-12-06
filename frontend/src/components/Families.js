import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Families() {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:8001/api/families')
      .then(res => {
        setFamilies(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div><h2>Families</h2><p>Loading...</p></div>;
  if (error) return <div><h2>Families</h2><p>Error: {error}</p></div>;

  return (
    <div>
      <h2>Families</h2>
      {families.length === 0 ? (
        <p>No families found in the database.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Spouse 1</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Spouse 2</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Children</th>
            </tr>
          </thead>
          <tbody>
            {families.map(f => (
              <tr
                key={f.id}
                style={{ borderBottom: '1px solid #ddd', cursor: 'pointer' }}
                onClick={() => navigate(`/family/${f.id}`)}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ padding: '8px' }}>
                  {f.spouse1_id ? (
                    <Link
                      to={`/person/${f.spouse1_id}`}
                      style={{ color: '#0066cc', textDecoration: 'none', cursor: 'pointer' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {f.spouse1_name || 'Unknown'}
                    </Link>
                  ) : (
                    'Unknown'
                  )}
                </td>
                <td style={{ padding: '8px' }}>
                  {f.spouse2_id ? (
                    <Link
                      to={`/person/${f.spouse2_id}`}
                      style={{ color: '#0066cc', textDecoration: 'none', cursor: 'pointer' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {f.spouse2_name || 'Unknown'}
                    </Link>
                  ) : (
                    'Unknown'
                  )}
                </td>
                <td style={{ padding: '8px' }}>{f.children_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Families;
