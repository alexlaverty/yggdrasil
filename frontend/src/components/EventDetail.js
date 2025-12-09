import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import PrevNextNav from './PrevNextNav';

function EventDetail({ eventType }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [individuals, setIndividuals] = useState([]);
  const [families, setFamilies] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [navInfo, setNavInfo] = useState({ max_id: 0 });

  // Upload form state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDate, setUploadDate] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

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

  // Get event type label and icon
  const getEventMeta = () => {
    switch (eventType) {
      case 'birth':
        return { label: 'Birth Event', icon: '👶', listPath: '/birth' };
      case 'death':
        return { label: 'Death Event', icon: '🕊️', listPath: '/death' };
      case 'burial':
        return { label: 'Burial Event', icon: '⚰️', listPath: '/burial' };
      case 'marriage':
        return { label: 'Marriage Event', icon: '💍', listPath: '/marriage' };
      default:
        return { label: 'Event', icon: '📅', listPath: '/' };
    }
  };

  const eventMeta = getEventMeta();

  // Fetch event details
  useEffect(() => {
    axios.get(`http://localhost:8001/api/events/${eventId}`)
      .then(res => {
        setEvent(res.data.event);
        setIndividuals(res.data.individuals || []);
        setFamilies(res.data.families || []);
        setMedia(res.data.media || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    // Get navigation info for events
    axios.get('http://localhost:8001/api/nav/events')
      .then(res => setNavInfo(res.data))
      .catch(err => console.error('Failed to load nav info:', err));
  }, [eventId, uploadSuccess]);

  // Handle media upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select a file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    // Backend expects metadata as a JSON string
    const metadata = {
      media_date: uploadDate || null,
      description: uploadDescription || null,
      event_id: parseInt(eventId),
      individual_ids: []
    };
    formData.append('metadata', JSON.stringify(metadata));

    try {
      await axios.post('http://localhost:8001/api/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Reset form
      setUploadFile(null);
      setUploadDate('');
      setUploadDescription('');
      setUploading(false);
      setUploadSuccess(!uploadSuccess); // Toggle to trigger refetch

      // Show success message
      alert('Media uploaded successfully and tagged to all people in this event!');
    } catch (err) {
      alert('Upload failed: ' + err.message);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h2>{eventMeta.label}</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2>{eventMeta.label}</h2>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div>
        <h2>{eventMeta.label}</h2>
        <p>Event not found</p>
      </div>
    );
  }

  // Get all people involved (from individuals and families)
  const allPeople = [...individuals];
  families.forEach(family => {
    if (family.spouse1 && !allPeople.find(p => p.id === family.spouse1.id)) {
      allPeople.push(family.spouse1);
    }
    if (family.spouse2 && !allPeople.find(p => p.id === family.spouse2.id)) {
      allPeople.push(family.spouse2);
    }
  });

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: '1.5rem', fontSize: '14px', color: '#666' }}>
        <Link to={eventMeta.listPath} style={{ color: '#2c5282', textDecoration: 'none' }}>
          ← Back to {eventMeta.label}s
        </Link>
      </div>

      <PrevNextNav
        currentId={eventId}
        maxId={navInfo.max_id}
        baseUrl={eventMeta.listPath}
        label="Event"
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
        <span style={{ fontSize: '28px' }}>{eventMeta.icon}</span>
        <h2 style={{ margin: 0 }}>{eventMeta.label} Details</h2>
      </div>

      {/* Event Details Card */}
      <div style={{
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '2rem',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ marginTop: 0 }}>Event Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '15px' }}>
          <div style={{ fontWeight: '600', color: '#495057' }}>Date:</div>
          <div>{event.date || 'Unknown'}</div>

          <div style={{ fontWeight: '600', color: '#495057' }}>Place:</div>
          <div>{event.place || 'Unknown'}</div>

          {event.description && (
            <>
              <div style={{ fontWeight: '600', color: '#495057' }}>Description:</div>
              <div>{event.description}</div>
            </>
          )}
        </div>
      </div>

      {/* People Involved */}
      {allPeople.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>People Involved</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {allPeople.map(person => {
              const { surname, firstname } = parseName(`${person.first_name || ''} ${person.last_name || ''}`);
              return (
                <Link
                  key={person.id}
                  to={`/person/${person.id}`}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#e7f3ff',
                    borderRadius: '20px',
                    textDecoration: 'none',
                    color: '#2c5282',
                    fontSize: '14px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bee3f8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e7f3ff'}
                >
                  {formatFirstname(firstname)} <span style={{ fontVariant: 'small-caps', fontWeight: '600' }}>{formatSurname(surname)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Media Gallery */}
      <div style={{ marginBottom: '2rem' }}>
        <h3>Media ({media.length})</h3>
        {media.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #dee2e6'
          }}>
            <p style={{ color: '#6c757d', margin: 0 }}>
              No media files associated with this event yet. Upload one below!
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            {media.map(item => (
              <Link
                key={item.id}
                to={`/media/${item.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '100%',
                  height: '150px',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {item.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={`http://localhost:8001/api/media/${item.id}/thumbnail`}
                      alt={item.description || 'Media'}
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '48px' }}>📄</span>
                  )}
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    {item.date || 'No date'}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                    {item.filename}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: '13px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upload Form */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '24px',
        border: '2px solid #2c5282',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginTop: 0 }}>Upload Media to This Event</h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          Files uploaded here will be automatically tagged to all {allPeople.length} {allPeople.length === 1 ? 'person' : 'people'} involved in this event.
        </p>
        <form onSubmit={handleUpload}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px' }}>
                File *
              </label>
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files[0])}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px' }}>
                Date
              </label>
              <input
                type="text"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                placeholder="e.g., 1950-01-15"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Describe this media..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              style={{
                padding: '12px 24px',
                backgroundColor: uploading ? '#ccc' : '#2c5282',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: uploading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!uploading) e.currentTarget.style.backgroundColor = '#1a365d';
              }}
              onMouseLeave={(e) => {
                if (!uploading) e.currentTarget.style.backgroundColor = '#2c5282';
              }}
            >
              {uploading ? 'Uploading...' : 'Upload Media'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventDetail;
