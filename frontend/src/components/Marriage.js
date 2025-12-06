import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Marriage() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Helper function to format surname
  const formatSurname = (surname) => {
    return surname || '';
  };

  // Helper function to format firstname (First character uppercase, rest lowercase)
  const formatFirstname = (firstname) => {
    if (!firstname) return '';
    return firstname.charAt(0).toUpperCase() + firstname.slice(1).toLowerCase();
  };

  // Parse individual name into surname and firstname
  const parseName = (fullName) => {
    if (!fullName) return { surname: '', firstname: '' };
    const parts = fullName.split(' ');
    if (parts.length === 1) {
      return { surname: parts[0], firstname: '' };
    }
    return { surname: parts[parts.length - 1], firstname: parts.slice(0, -1).join(' ') };
  };

  // Format couple names with proper case
  const formatCoupleName = (coupleStr) => {
    if (!coupleStr) return 'Unknown';
    // Split by " and "
    const names = coupleStr.split(' and ');
    return names.map(name => {
      const { surname, firstname } = parseName(name.trim());
      const formattedFirst = formatFirstname(firstname);
      const formattedLast = formatSurname(surname);
      return (
        <span key={name}>
          {formattedFirst} <span style={{ fontVariant: 'small-caps', fontWeight: '600' }}>{formattedLast}</span>
        </span>
      );
    }).reduce((prev, curr) => [prev, ' & ', curr]);
  };

  useEffect(() => {
    axios.get('http://localhost:8001/api/marriages')
      .then(res => {
        // Sort by date in descending order (newest/most recent first)
        // Put null/unknown dates at the end
        const sortedEvents = res.data.sort((a, b) => {
          // If both have no date, maintain order
          if (!a.date && !b.date) return 0;
          // Put null dates at the end
          if (!a.date) return 1;
          if (!b.date) return -1;
          // Sort by date descending (most recent first)
          return new Date(b.date) - new Date(a.date);
        });
        setEvents(sortedEvents);
        setFilteredEvents(sortedEvents);
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
      setFilteredEvents(events);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = events.filter(event => {
      const family = (event.family || '').toLowerCase();
      const place = (event.place || '').toLowerCase();
      const date = (event.date || '').toLowerCase();

      return family.includes(query) || place.includes(query) || date.includes(query);
    });
    setFilteredEvents(filtered);
  }, [searchQuery, events]);

  const handleRowClick = (eventId) => {
    navigate(`/marriage/${eventId}`);
  };

  if (loading) return <div><h2>Marriage Events</h2><p>Loading...</p></div>;
  if (error) return <div><h2>Marriage Events</h2><p>Error: {error}</p></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>💍</span>
          <h2 style={{ margin: 0 }}>Marriage Events</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
          </div>
          <input
            type="text"
            placeholder="Search marriages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-bar"
            style={{ margin: 0, maxWidth: '300px' }}
          />
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #dee2e6'
        }}>
          <p style={{ color: '#6c757d', margin: 0 }}>
            {searchQuery ? 'No marriage events found matching your search.' : 'No marriage events found in the database.'}
          </p>
        </div>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Couple</th>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Place</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map(e => (
              <tr
                key={e.id}
                onClick={() => handleRowClick(e.id)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(event) => event.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(event) => event.currentTarget.style.backgroundColor = 'white'}
              >
                <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>{e.date || 'Unknown'}</td>
                <td style={{ padding: '10px 8px' }}>{formatCoupleName(e.family)}</td>
                <td style={{ padding: '10px 8px' }}>{e.place || 'Unknown'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Marriage;