import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Places() {
  const [places, setPlaces] = useState([]);
  const [filteredPlaces, setFilteredPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    axios.get('http://localhost:8001/api/places')
      .then(res => {
        // Sort by count in descending order (highest first)
        const sortedPlaces = res.data.sort((a, b) => b.count - a.count);
        setPlaces(sortedPlaces);
        setFilteredPlaces(sortedPlaces);
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
      setFilteredPlaces(places);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = places.filter(place => {
      const placeName = (place.name || '').toLowerCase();
      return placeName.includes(query);
    });
    setFilteredPlaces(filtered);
  }, [searchQuery, places]);

  if (loading) return <div><h2>Places</h2><p>Loading...</p></div>;
  if (error) return <div><h2>Places</h2><p>Error: {error}</p></div>;

  // Calculate total events
  const totalEvents = filteredPlaces.reduce((sum, place) => sum + place.count, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>📍</span>
          <h2 style={{ margin: 0 }}>Places</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {filteredPlaces.length} {filteredPlaces.length === 1 ? 'place' : 'places'} • {totalEvents} {totalEvents === 1 ? 'event' : 'events'}
          </div>
          <input
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-bar"
            style={{ margin: 0, maxWidth: '300px' }}
          />
        </div>
      </div>

      {filteredPlaces.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #dee2e6'
        }}>
          <p style={{ color: '#6c757d', margin: 0 }}>
            {searchQuery ? 'No places found matching your search.' : 'No places found in the database.'}
          </p>
        </div>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Place</th>
              <th style={{ padding: '12px 8px', textAlign: 'right', width: '100px' }}>Events</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlaces.map((place, idx) => (
              <tr key={idx}>
                <td style={{ padding: '10px 8px' }}>
                  <Link
                    to={`/place/${encodeURIComponent(place.name)}`}
                    style={{
                      color: '#0066cc',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    {place.name}
                  </Link>
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                  <span style={{
                    backgroundColor: '#e8f5e9',
                    color: '#2e7d32',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {place.count}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Places;
