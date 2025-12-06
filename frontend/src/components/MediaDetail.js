import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import PrevNextNav from './PrevNextNav';

function MediaDetail() {
  const { mediaId } = useParams();
  const [media, setMedia] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [mediaDate, setMediaDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractMessage, setExtractMessage] = useState('');
  const [navInfo, setNavInfo] = useState({ max_id: 0 });

  useEffect(() => {
    fetchMediaDetails();
    fetchPeople();

    // Get navigation info
    axios.get('http://localhost:8001/api/nav/media')
      .then(res => setNavInfo(res.data))
      .catch(err => console.error('Failed to load nav info:', err));
  }, [mediaId]);

  const fetchMediaDetails = () => {
    axios.get(`http://localhost:8001/api/media`)
      .then(res => {
        const foundMedia = res.data.find(m => m.id === parseInt(mediaId));
        if (foundMedia) {
          setMedia(foundMedia);
          setMediaDate(foundMedia.media_date || '');
          setDescription(foundMedia.description || '');
          setSelectedPeople(foundMedia.tagged_individuals?.map(ind => ind.id) || []);
        } else {
          setError('Media not found');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  const fetchPeople = () => {
    axios.get('http://localhost:8001/api/people')
      .then(res => {
        setPeople(res.data);
      })
      .catch(err => console.error('Error fetching people:', err));
  };

  const handlePeopleChange = (e) => {
    const personId = parseInt(e.target.value);
    setSelectedPeople(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else {
        return [...prev, personId];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('Saving...');

    try {
      await axios.put(`http://localhost:8001/api/media/${mediaId}`, {
        media_date: mediaDate || null,
        description: description || null,
        individual_ids: selectedPeople
      });

      setSaveMessage('Successfully saved!');
      setIsEditing(false);

      // Refresh media details
      fetchMediaDetails();

      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveMessage(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setMediaDate(media.media_date || '');
    setDescription(media.description || '');
    setSelectedPeople(media.tagged_individuals?.map(ind => ind.id) || []);
    setIsEditing(false);
    setSaveMessage('');
  };

  const handleExtractText = async () => {
    setExtracting(true);
    setExtractMessage('Extracting text...');

    try {
      const response = await axios.post(`http://localhost:8001/api/media/${mediaId}/extract-text`);
      setExtractMessage('Text extracted successfully!');

      // Refresh media details to show extracted text
      fetchMediaDetails();

      setTimeout(() => setExtractMessage(''), 3000);
    } catch (err) {
      setExtractMessage(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setExtracting(false);
    }
  };

  // Check if file supports text extraction
  const supportsTextExtraction = () => {
    if (!media) return false;
    const extension = media.filename.toLowerCase().split('.').pop();
    return ['pdf', 'docx', 'doc', 'jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif', 'gif'].includes(extension);
  };

  // Filter people based on name filter
  const filteredPeople = people.filter(person => {
    const fullName = `${person.first_name} ${person.last_name}`.toLowerCase();
    return fullName.includes(nameFilter.toLowerCase());
  });

  if (loading) return <div><h2>Loading...</h2></div>;
  if (error) return <div><h2>Error: {error}</h2></div>;
  if (!media) return <div><h2>Media not found</h2></div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <Link to="/media-list" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Media Library
      </Link>

      <PrevNextNav
        currentId={mediaId}
        maxId={navInfo.max_id}
        baseUrl="/media"
        label="Media"
      />

      <h2>{media.filename}</h2>

      {/* Metadata Section */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Metadata</h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Edit
            </button>
          )}
        </div>

        {!isEditing ? (
          // View Mode
          <div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Filename:</strong> {media.filename}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Type:</strong> {media.media_type}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Size:</strong> {media.file_size ? (media.file_size / 1024).toFixed(2) + ' KB' : 'Unknown'}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Date:</strong> {media.media_date || 'Not specified'}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Description:</strong> {media.description || 'No description'}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Tagged People:</strong>{' '}
              {media.tagged_individuals && media.tagged_individuals.length > 0 ? (
                <div style={{ marginTop: '8px' }}>
                  {media.tagged_individuals.map(ind => (
                    <Link
                      key={ind.id}
                      to={`/person/${ind.id}`}
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        marginRight: '8px',
                        marginBottom: '8px',
                        backgroundColor: '#e0e0e0',
                        borderRadius: '3px',
                        color: '#333',
                        textDecoration: 'none'
                      }}
                    >
                      {ind.name}
                    </Link>
                  ))}
                </div>
              ) : (
                'No people tagged'
              )}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Uploaded:</strong> {media.created_at ? new Date(media.created_at).toLocaleString() : 'Unknown'}
            </div>
          </div>
        ) : (
          // Edit Mode
          <div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Filename:</strong> {media.filename} (cannot be changed)
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Type:</strong> {media.media_type}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>
                <strong>Media Date:</strong>
                <input
                  type="date"
                  value={mediaDate}
                  onChange={(e) => setMediaDate(e.target.value)}
                  style={{ display: 'block', marginTop: '5px', width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '3px' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>
                <strong>Description:</strong>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description..."
                  style={{ display: 'block', marginTop: '5px', width: '100%', minHeight: '80px', padding: '8px', border: '1px solid #ddd', borderRadius: '3px' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>
                <strong>Tag People:</strong>
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  style={{
                    display: 'block',
                    marginTop: '5px',
                    marginBottom: '5px',
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '3px'
                  }}
                />
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '3px', backgroundColor: 'white' }}>
                  {filteredPeople.length > 0 ? (
                    filteredPeople.map(person => (
                      <div key={person.id} style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            value={person.id}
                            checked={selectedPeople.includes(person.id)}
                            onChange={handlePeopleChange}
                            style={{ marginRight: '8px' }}
                          />
                          {person.first_name} {person.last_name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No people found matching "{nameFilter}"</p>
                  )}
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
            </div>

            {saveMessage && (
              <p style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: saveMessage.includes('Error') ? '#ffcccc' : '#ccffcc',
                borderRadius: '3px'
              }}>
                {saveMessage}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Media Display */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Media Preview</h3>
        <div style={{ textAlign: 'center', backgroundColor: 'white', padding: '20px', borderRadius: '5px' }}>
          {media.media_type === 'image' && (
            <img
              src={`http://localhost:8001/api/media/${media.id}/file`}
              alt={media.filename}
              style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
            />
          )}
          {media.media_type === 'video' && (
            <video
              controls
              style={{ maxWidth: '100%', maxHeight: '600px' }}
            >
              <source src={`http://localhost:8001/api/media/${media.id}/file`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
          {media.media_type === 'document' && (
            <div style={{ padding: '40px' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>📄</div>
              <a
                href={`http://localhost:8001/api/media/${media.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0066cc', textDecoration: 'none', fontSize: '18px' }}
              >
                Download Document
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Text Extraction Section */}
      {supportsTextExtraction() && (
        <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Extracted Text</h3>
            {!media.extracted_text && (
              <button
                onClick={handleExtractText}
                disabled={extracting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: extracting ? 'not-allowed' : 'pointer'
                }}
              >
                {extracting ? 'Extracting...' : 'Extract Text'}
              </button>
            )}
          </div>

          {extractMessage && (
            <p style={{
              padding: '10px',
              marginBottom: '15px',
              backgroundColor: extractMessage.includes('Error') ? '#ffcccc' : '#ccffcc',
              borderRadius: '3px'
            }}>
              {extractMessage}
            </p>
          )}

          {media.extracted_text ? (
            <div style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '5px',
              maxHeight: '400px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.6',
              border: '1px solid #ddd'
            }}>
              {media.extracted_text}
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              No text has been extracted yet. Click "Extract Text" to extract text from this document.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default MediaDetail;
