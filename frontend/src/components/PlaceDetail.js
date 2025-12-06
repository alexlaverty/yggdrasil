import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

function PlaceDetail() {
  const { placeName } = useParams();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to format surname (UPPERCASE)
  const formatSurname = (surname) => {
    return (surname || '').toUpperCase();
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

  // Helper function to sort events by date
  const sortEventsByDate = (events) => {
    return events.sort((a, b) => {
      // Put null/undefined dates at the end
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      
      // Sort dates in descending order (newest/most recent first, oldest last)
      return new Date(b.date) - new Date(a.date);
    });
  };

  useEffect(() => {
    axios.get(`http://localhost:8001/api/places/${placeName}`)
      .then(res => {
        // Sort all event arrays by date
        const sortedData = {
          ...res.data,
          births: sortEventsByDate([...res.data.births]),
          deaths: sortEventsByDate([...res.data.deaths]),
          marriages: sortEventsByDate([...res.data.marriages])
        };
        setPlace(sortedData);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [placeName]);

  if (loading) return <div><h2>Loading...</h2></div>;
  if (error) return <div><h2>Error: {error}</h2></div>;
  if (!place) return <div><h2>Place not found</h2></div>;

  return (
    <div style={{ maxWidth: '900px' }}>
      <Link to="/places" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Places
      </Link>
      
      <h2>{place.place_name}</h2>
      
      {/* Place Summary */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Summary</h3>
        <table style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold', paddingRight: '10px', paddingBottom: '10px' }}>Total Events:</td>
              <td style={{ paddingBottom: '10px' }}>{place.event_count}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', paddingRight: '10px', paddingBottom: '10px' }}>People Associated:</td>
              <td style={{ paddingBottom: '10px' }}>{place.people_count}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Birth Events */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Births ({place.births.length})</h3>
        {place.births && place.births.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Surname</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Firstname</th>
              </tr>
            </thead>
            <tbody>
              {place.births.map((birth, idx) => {
                const { surname, firstname } = parseName(birth.individual_name);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px' }}>{birth.date || 'Unknown'}</td>
                    <td style={{ padding: '8px' }}>
                      <Link to={`/person/${birth.individual_id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                        {formatSurname(surname)}
                      </Link>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <Link to={`/person/${birth.individual_id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                        {formatFirstname(firstname)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No births recorded at this place.</p>
        )}
      </section>

      {/* Death Events */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Deaths ({place.deaths.length})</h3>
        {place.deaths && place.deaths.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Surname</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Firstname</th>
              </tr>
            </thead>
            <tbody>
              {place.deaths.map((death, idx) => {
                const { surname, firstname } = parseName(death.individual_name);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px' }}>{death.date || 'Unknown'}</td>
                    <td style={{ padding: '8px' }}>
                      <Link to={`/person/${death.individual_id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                        {formatSurname(surname)}
                      </Link>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <Link to={`/person/${death.individual_id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                        {formatFirstname(firstname)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No deaths recorded at this place.</p>
        )}
      </section>

      {/* Marriage Events */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Marriages ({place.marriages.length})</h3>
        {place.marriages && place.marriages.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Surname</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Firstname</th>
              </tr>
            </thead>
            <tbody>
              {place.marriages.map((marriage, idx) => {
                const { surname, firstname } = parseName(marriage.individual_name);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px' }}>{marriage.date || 'Unknown'}</td>
                    <td style={{ padding: '8px' }}>
                      <Link to={`/person/${marriage.individual_id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                        {formatSurname(surname)}
                      </Link>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <Link to={`/person/${marriage.individual_id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                        {formatFirstname(firstname)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No marriages recorded at this place.</p>
        )}
      </section>

      {/* People Associated with Place */}
      {place.people && place.people.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <h3>People Associated with This Place</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Sex</th>
              </tr>
            </thead>
            <tbody>
              {place.people.map((person) => (
                <tr key={person.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px' }}>
                    <Link to={`/person/${person.id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                      {person.name}
                    </Link>
                  </td>
                  <td style={{ padding: '8px' }}>{person.sex === 'M' ? 'Male' : person.sex === 'F' ? 'Female' : 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default PlaceDetail;
