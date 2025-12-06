import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function People() {
  const [people, setPeople] = useState([]);
  const [filteredPeople, setFilteredPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Helper function to get initials for avatar
  const getInitials = (firstName, lastName) => {
    const first = (firstName || '').charAt(0).toUpperCase();
    const last = (lastName || '').charAt(0).toUpperCase();
    return first + last || '?';
  };

  // Helper function to format surname with small caps styling
  const formatSurname = (surname) => {
    return surname || '';
  };

  // Helper function to format firstname
  const formatFirstname = (firstname) => {
    if (!firstname) return '';
    return firstname.charAt(0).toUpperCase() + firstname.slice(1).toLowerCase();
  };

  useEffect(() => {
    axios.get('http://localhost:8001/api/people')
      .then(res => {
        setPeople(res.data);
        setFilteredPeople(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Search/filter handler
  useEffect(() => {
    if (!searchQuery) {
      setFilteredPeople(people);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = people.filter(person => {
      const firstName = (person.first_name || '').toLowerCase();
      const lastName = (person.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      const birthYear = (person.birth_year || '').toString();

      return fullName.includes(query) || birthYear.includes(query);
    });
    setFilteredPeople(filtered);
  }, [searchQuery, people]);

  const handleDelete = async (personId, personName) => {
    if (!window.confirm(`Are you sure you want to delete ${personName}?`)) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8001/api/people/${personId}`);
      setPeople(people.filter(p => p.id !== personId));
    } catch (err) {
      alert('Failed to delete person: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) return <div><h2>People</h2><p>Loading...</p></div>;
  if (error) return <div><h2>People</h2><p>Error: {error}</p></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>People</h2>
        <input
          type="text"
          placeholder="Search by name or year..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-bar"
          style={{ margin: 0 }}
        />
      </div>

      {filteredPeople.length === 0 ? (
        <p>{searchQuery ? 'No people found matching your search.' : 'No people found in the database.'}</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}></th>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Birth Year</th>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Sex</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPeople.map(p => (
              <tr key={p.id}>
                <td style={{ padding: '8px', width: '50px' }}>
                  {p.profile_image_id ? (
                    <img
                      src={`http://localhost:8001/api/media/${p.profile_image_id}/file`}
                      alt={`${p.first_name} ${p.last_name}`}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#34495e',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {getInitials(p.first_name, p.last_name)}
                    </div>
                  )}
                </td>
                <td style={{ padding: '8px' }}>
                  <Link to={`/person/${p.id}`} style={{ color: '#0066cc', textDecoration: 'none', cursor: 'pointer', fontSize: '16px' }}>
                    {formatFirstname(p.first_name)} <span style={{ fontVariant: 'small-caps', fontWeight: '600' }}>{formatSurname(p.last_name)}</span>
                  </Link>
                </td>
                <td style={{ padding: '8px' }}>{p.birth_year || 'Unknown'}</td>
                <td style={{ padding: '8px' }}>{p.sex || 'Unknown'}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  <button
                    onClick={() => navigate(`/person/${p.id}`)}
                    style={{
                      padding: '6px 12px',
                      marginRight: '8px',
                      backgroundColor: '#1abc9c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title="View Profile"
                  >
                    👁️ View
                  </button>
                  <button
                    onClick={() => navigate(`/person/${p.id}/edit`)}
                    style={{
                      padding: '6px 12px',
                      marginRight: '8px',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title="Edit Person"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, `${p.first_name} ${p.last_name}`)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title="Delete Person"
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Floating Action Button */}
      <Link to="/people/new" className="fab" title="Add New Person">
        +
      </Link>
    </div>
  );
}

export default People;