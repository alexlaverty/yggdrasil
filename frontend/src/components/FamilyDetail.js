import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PrevNextNav from './PrevNextNav';

function FamilyDetail() {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [navInfo, setNavInfo] = useState({ max_id: 0 });

  useEffect(() => {
    axios.get(`http://localhost:8001/api/families/${familyId}`)
      .then(res => {
        setFamily(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    // Get navigation info
    axios.get('http://localhost:8001/api/nav/families')
      .then(res => setNavInfo(res.data))
      .catch(err => console.error('Failed to load nav info:', err));
  }, [familyId]);

  if (loading) return <div><h2>Loading...</h2></div>;
  if (error) return <div><h2>Error: {error}</h2></div>;
  if (!family) return <div><h2>Family not found</h2></div>;

  // Build family title
  const spouse1Name = family.spouse1 ? `${family.spouse1.first_name} ${family.spouse1.last_name}` : 'Unknown';
  const spouse2Name = family.spouse2 ? `${family.spouse2.first_name} ${family.spouse2.last_name}` : 'Unknown';
  const familyTitle = `${spouse1Name} & ${spouse2Name}`;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/families" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        &larr; Back to Families
      </Link>

      <PrevNextNav
        currentId={familyId}
        maxId={navInfo.max_id}
        baseUrl="/family"
        label="Family"
      />

      <h2>{familyTitle}</h2>

      {/* Parents Section */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Parents</h3>
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          {family.spouse1 && (
            <div>
              <Link
                to={`/person/${family.spouse1.id}`}
                style={{ color: '#0066cc', textDecoration: 'none', fontSize: '18px' }}
              >
                {family.spouse1.first_name} {family.spouse1.last_name}
              </Link>
              <span style={{ marginLeft: '10px', color: '#666' }}>
                ({family.spouse1.sex === 'M' ? 'Male' : family.spouse1.sex === 'F' ? 'Female' : 'Unknown'})
              </span>
            </div>
          )}
          {family.spouse2 && (
            <div>
              <Link
                to={`/person/${family.spouse2.id}`}
                style={{ color: '#0066cc', textDecoration: 'none', fontSize: '18px' }}
              >
                {family.spouse2.first_name} {family.spouse2.last_name}
              </Link>
              <span style={{ marginLeft: '10px', color: '#666' }}>
                ({family.spouse2.sex === 'M' ? 'Male' : family.spouse2.sex === 'F' ? 'Female' : 'Unknown'})
              </span>
            </div>
          )}
          {!family.spouse1 && !family.spouse2 && (
            <p>No parent information available.</p>
          )}
        </div>
      </section>

      {/* Marriage Section */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Marriage</h3>
        {family.marriages && family.marriages.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: '0' }}>
            {family.marriages.map((marriage, idx) => (
              <li key={idx} style={{ paddingBottom: '10px' }}>
                <strong>Date:</strong> {marriage.date || 'Unknown'}<br />
                <strong>Place:</strong> {marriage.place || 'Unknown'}
              </li>
            ))}
          </ul>
        ) : (
          <p>No marriage information available.</p>
        )}
      </section>

      {/* Children Section */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Children ({family.children ? family.children.length : 0})</h3>
        {family.children && family.children.length > 0 ? (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Sex</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Birth Year</th>
              </tr>
            </thead>
            <tbody>
              {family.children.map(child => (
                <tr
                  key={child.id}
                  style={{ borderBottom: '1px solid #ddd', cursor: 'pointer' }}
                  onClick={() => navigate(`/person/${child.id}`)}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e8e8e8'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '8px' }}>
                    <Link
                      to={`/person/${child.id}`}
                      style={{ color: '#0066cc', textDecoration: 'none' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {child.first_name} {child.last_name}
                    </Link>
                  </td>
                  <td style={{ padding: '8px' }}>
                    {child.sex === 'M' ? 'Male' : child.sex === 'F' ? 'Female' : 'Unknown'}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {child.birth_year || 'Unknown'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No children in this family.</p>
        )}
      </section>

      {/* Media Section */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Family Media ({family.media ? family.media.length : 0})</h3>
        {family.media && family.media.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {family.media.map((media) => (
              <div key={media.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: 'white' }}>
                <Link to={`/media/${media.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ cursor: 'pointer' }}>
                    {media.media_type === 'image' && (
                      <img
                        src={`http://localhost:8001/api/media/${media.id}/thumbnail`}
                        alt={media.filename}
                        loading="lazy"
                        decoding="async"
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '3px' }}
                      />
                    )}
                    {media.media_type === 'video' && (
                      <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#eee', borderRadius: '3px' }}>
                        Video
                      </div>
                    )}
                    {media.media_type === 'document' && (
                      <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#eee', borderRadius: '3px' }}>
                        Document
                      </div>
                    )}
                    <h4 style={{ margin: '10px 0 5px 0' }}>{media.filename}</h4>
                    {media.media_date && (
                      <p style={{ margin: '5px 0' }}>
                        <strong>Date:</strong> {media.media_date}
                      </p>
                    )}
                    {media.description && (
                      <p style={{ margin: '5px 0', fontSize: '13px', color: '#666' }}>
                        {media.description}
                      </p>
                    )}
                    {media.tagged_individuals && media.tagged_individuals.length > 0 && (
                      <p style={{ margin: '5px 0', fontSize: '12px', color: '#888' }}>
                        <strong>Tagged:</strong> {media.tagged_individuals.map(i => i.name).join(', ')}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p>No media tagged to family members.</p>
        )}
      </section>
    </div>
  );
}

export default FamilyDetail;
