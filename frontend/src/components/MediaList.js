import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ITEMS_PER_PAGE = 10;

function MediaList() {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = () => {
    setLoading(true);
    axios.get('http://localhost:8001/api/media')
      .then(res => {
        setMediaList(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  if (loading) return <div><h2>Loading...</h2></div>;
  if (error) return <div><h2>Error: {error}</h2></div>;

  const totalPages = Math.ceil(mediaList.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentMedia = mediaList.slice(startIndex, endIndex);

  const goToPrevious = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNext = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Media Library</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {mediaList.length} {mediaList.length === 1 ? 'file' : 'files'}
          </div>
          <Link
            to="/bulk-upload"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#2c5282',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a365d'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2c5282'}
          >
            <span>📤</span> Bulk Upload
          </Link>
        </div>
      </div>

      {mediaList.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'center',
          border: '2px dashed #dee2e6'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📁</div>
          <h3 style={{ marginBottom: '10px', color: '#495057' }}>No media files yet</h3>
          <p style={{ color: '#6c757d', marginBottom: '30px' }}>
            Start building your family history by uploading photos, documents, and videos.
          </p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/bulk-upload"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#2c5282',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '16px',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a365d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2c5282'}
            >
              📤 Bulk Upload (Multiple Files)
            </Link>
            <Link
              to="/media-upload"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#1abc9c',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '16px',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#16a085'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1abc9c'}
            >
              Upload Single File
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {currentMedia.map(media => (
            <Link
              key={media.id}
              to={`/media/${media.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                border: '1px solid #ddd',
                padding: '15px',
                borderRadius: '5px',
                backgroundColor: 'white',
                transition: 'box-shadow 0.2s',
                cursor: 'pointer',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                {/* Media Preview */}
                <div style={{ marginBottom: '10px', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '3px', overflow: 'hidden', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {media.media_type === 'image' && (
                    <img
                      src={`http://localhost:8001/api/media/${media.id}/thumbnail`}
                      alt={media.filename}
                      loading="lazy"
                      decoding="async"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  )}
                  {media.media_type === 'video' && (
                    <div style={{ fontSize: '48px' }}>🎥</div>
                  )}
                  {media.media_type === 'document' && (
                    <div style={{ fontSize: '48px' }}>📄</div>
                  )}
                </div>

                {/* Media Info */}
                <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>{media.filename}</h4>

                <div style={{ fontSize: '14px', color: '#666' }}>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Type:</strong> {media.media_type}
                  </p>
                  {media.media_date && (
                    <p style={{ margin: '5px 0' }}>
                      <strong>Date:</strong> {media.media_date}
                    </p>
                  )}
                  {media.tagged_individuals && media.tagged_individuals.length > 0 && (
                    <p style={{ margin: '5px 0' }}>
                      <strong>Tagged:</strong> {media.tagged_individuals.length} {media.tagged_individuals.length === 1 ? 'person' : 'people'}
                    </p>
                  )}
                  {media.description && (
                    <p style={{ margin: '5px 0', fontSize: '13px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {media.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {mediaList.length > ITEMS_PER_PAGE && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
          marginTop: '30px',
          paddingBottom: '20px'
        }}>
          <button
            onClick={goToPrevious}
            disabled={currentPage === 1}
            style={{
              padding: '10px 20px',
              backgroundColor: currentPage === 1 ? '#ccc' : '#2c5282',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'background-color 0.2s'
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '14px', color: '#666' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={goToNext}
            disabled={currentPage === totalPages}
            style={{
              padding: '10px 20px',
              backgroundColor: currentPage === totalPages ? '#ccc' : '#2c5282',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'background-color 0.2s'
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Floating Action Button for Upload */}
      {mediaList.length > 0 && (
        <Link to="/media-upload" className="fab" title="Upload Media">
          +
        </Link>
      )}
    </div>
  );
}

export default MediaList;
