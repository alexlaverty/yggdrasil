import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SearchableMultiSelect from './SearchableMultiSelect';
import Toast from './Toast';

function MediaUpload() {
  const [file, setFile] = useState(null);
  const [mediaDate, setMediaDate] = useState('');
  const [description, setDescription] = useState('');
  const [people, setPeople] = useState([]);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [mediaList, setMediaList] = useState([]);
  const [showMediaList, setShowMediaList] = useState(false);

  useEffect(() => {
    // Fetch all people for tagging
    axios.get('http://localhost:8001/api/people')
      .then(res => {
        setPeople(res.data);
      })
      .catch(err => console.error('Error fetching people:', err));

    // Fetch all media
    fetchMedia();
  }, []);

  const fetchMedia = () => {
    axios.get('http://localhost:8001/api/media')
      .then(res => {
        setMediaList(res.data);
      })
      .catch(err => console.error('Error fetching media:', err));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setToast({ message: 'Please select a file', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const metadata = {
        media_date: mediaDate || null,
        description: description || null,
        individual_ids: selectedPeople
      };
      formData.append('metadata', JSON.stringify(metadata));

      const response = await axios.post('http://localhost:8001/api/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setToast({ message: `Media uploaded successfully: ${response.data.filename}`, type: 'success' });
      setFile(null);
      setMediaDate('');
      setDescription('');
      setSelectedPeople([]);
      document.getElementById('file-input').value = '';

      // Refresh media list
      fetchMedia();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2>Media Upload</h2>

      {/* Upload Form */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Upload Media File</h3>
        <form onSubmit={handleUpload}>
          <div style={{ marginBottom: '15px' }}>
            <label>
              Select File (Image, Video, or Document):
              <input
                id="file-input"
                type="file"
                onChange={handleFileChange}
                style={{ display: 'block', marginTop: '5px' }}
              />
            </label>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>
              Media Date (Optional):
              <input
                type="date"
                value={mediaDate}
                onChange={(e) => setMediaDate(e.target.value)}
                style={{ display: 'block', marginTop: '5px' }}
              />
            </label>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>
              Description (Optional):
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
                style={{ display: 'block', marginTop: '5px', width: '100%', minHeight: '80px' }}
              />
            </label>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Tag People (Optional):
            </label>
            <SearchableMultiSelect
              options={people}
              selectedIds={selectedPeople}
              onChange={setSelectedPeople}
              placeholder="Search and select people to tag..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Uploading...' : 'Upload Media'}
          </button>
        </form>
      </section>

      {/* Media List Toggle */}
      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={() => setShowMediaList(!showMediaList)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#34495e',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          {showMediaList ? 'Hide' : 'Show'} All Media ({mediaList.length})
        </button>
      </div>

      {/* Media List */}
      {showMediaList && (
        <section style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <h3>All Media Files</h3>
          {mediaList.length === 0 ? (
            <p>No media files uploaded yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
              {mediaList.map(media => (
                <div key={media.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: 'white' }}>
                  {media.media_type === 'image' && (
                    <img
                      src={`http://localhost:8001/api/media/${media.id}/file`}
                      alt={media.filename}
                      style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '3px', marginBottom: '10px' }}
                    />
                  )}
                  {media.media_type === 'video' && (
                    <video
                      controls
                      style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '3px', marginBottom: '10px' }}
                    >
                      <source src={`http://localhost:8001/api/media/${media.id}/file`} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  )}
                  {media.media_type === 'document' && (
                    <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#eee', borderRadius: '3px', marginBottom: '10px' }}>
                      📄 Document
                    </div>
                  )}
                  <h4 style={{ margin: '0 0 10px 0' }}>{media.filename}</h4>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Type:</strong> {media.media_type}
                  </p>
                  {media.media_date && (
                    <p style={{ margin: '5px 0' }}>
                      <strong>Date:</strong> {media.media_date}
                    </p>
                  )}
                  {media.description && (
                    <p style={{ margin: '5px 0' }}>
                      <strong>Description:</strong> {media.description}
                    </p>
                  )}
                  {media.tagged_individuals && media.tagged_individuals.length > 0 && (
                    <p style={{ margin: '5px 0' }}>
                      <strong>Tagged:</strong> {media.tagged_individuals.map(ind => ind.name).join(', ')}
                    </p>
                  )}
                  <a
                    href={`http://localhost:8001/api/media/${media.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#0066cc', textDecoration: 'none', display: 'block', marginTop: '10px' }}
                  >
                    View/Download Full Size
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      </div>
    </>
  );
}

export default MediaUpload;
