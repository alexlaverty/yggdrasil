import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Toast from './Toast';

function BulkMediaUpload() {
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadResults, setUploadResults] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file selection from input
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  // Add files to the queue (deduplicating by name)
  const addFiles = (newFiles) => {
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name));
      return [...prev, ...uniqueNewFiles];
    });
  };

  // Remove a file from the queue
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all files
  const clearFiles = () => {
    setFiles([]);
    setUploadProgress({});
    setUploadResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    // Filter for media files
    const mediaFiles = droppedFiles.filter(file =>
      file.type.startsWith('image/') ||
      file.type.startsWith('video/') ||
      file.type === 'application/pdf' ||
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    if (mediaFiles.length < droppedFiles.length) {
      setToast({
        message: `${droppedFiles.length - mediaFiles.length} file(s) skipped (unsupported type)`,
        type: 'error'
      });
    }

    addFiles(mediaFiles);
  }, []);

  // Upload all files
  const handleUploadAll = async () => {
    if (files.length === 0) {
      setToast({ message: 'No files to upload', type: 'error' });
      return;
    }

    setUploading(true);
    setUploadResults([]);
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(prev => ({ ...prev, [file.name]: 'uploading' }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const metadata = {
          media_date: null,
          description: null,
          individual_ids: []
        };
        formData.append('metadata', JSON.stringify(metadata));

        const response = await axios.post('http://localhost:8001/api/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setUploadProgress(prev => ({ ...prev, [file.name]: 'success' }));
        results.push({
          filename: file.name,
          status: 'success',
          mediaId: response.data.id,
          message: 'Uploaded successfully'
        });
      } catch (err) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 'error' }));
        results.push({
          filename: file.name,
          status: 'error',
          message: err.response?.data?.detail || err.message
        });
      }
    }

    setUploadResults(results);
    setUploading(false);

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    if (errorCount === 0) {
      setToast({ message: `All ${successCount} files uploaded successfully!`, type: 'success' });
    } else if (successCount === 0) {
      setToast({ message: `All ${errorCount} uploads failed`, type: 'error' });
    } else {
      setToast({ message: `${successCount} succeeded, ${errorCount} failed`, type: 'error' });
    }
  };

  // Get file icon based on type
  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎬';
    if (file.type === 'application/pdf') return '📄';
    return '📎';
  };

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get status icon
  const getStatusIcon = (filename) => {
    const status = uploadProgress[filename];
    if (status === 'uploading') return '⏳';
    if (status === 'success') return '✅';
    if (status === 'error') return '❌';
    return null;
  };

  const successfulUploads = uploadResults.filter(r => r.status === 'success');

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2>Bulk Media Upload</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Upload multiple files at once. After uploading, you can edit each file to tag people and add details.
        </p>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `3px dashed ${isDragOver ? '#2c5282' : '#ccc'}`,
            borderRadius: '12px',
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: isDragOver ? '#e7f3ff' : '#fafafa',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '20px'
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '15px' }}>
            {isDragOver ? '📥' : '📁'}
          </div>
          <h3 style={{ margin: '0 0 10px 0', color: isDragOver ? '#2c5282' : '#333' }}>
            {isDragOver ? 'Drop files here!' : 'Drag & Drop Files Here'}
          </h3>
          <p style={{ color: '#666', margin: '0 0 15px 0' }}>
            or click to browse
          </p>
          <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
            Supports: Images (JPG, PNG, GIF), Videos (MP4, MOV), Documents (PDF, DOCX)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* File Queue */}
        {files.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #ddd',
            marginBottom: '20px'
          }}>
            <div style={{
              padding: '15px 20px',
              borderBottom: '1px solid #ddd',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0 }}>
                Files to Upload ({files.length})
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={clearFiles}
                  disabled={uploading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: uploading ? 0.6 : 1
                  }}
                >
                  Clear All
                </button>
                <button
                  onClick={handleUploadAll}
                  disabled={uploading || files.length === 0}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    opacity: uploading ? 0.6 : 1
                  }}
                >
                  {uploading ? 'Uploading...' : `Upload All (${files.length})`}
                </button>
              </div>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    backgroundColor: uploadProgress[file.name] === 'success' ? '#f0fff4' :
                                    uploadProgress[file.name] === 'error' ? '#fff5f5' : 'white'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{getFileIcon(file)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '500',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {formatSize(file.size)}
                    </div>
                  </div>
                  <span style={{ fontSize: '20px' }}>{getStatusIcon(file.name)}</span>
                  {!uploading && !uploadProgress[file.name] && (
                    <button
                      onClick={() => removeFile(index)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        color: '#999',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Results - Links to edit */}
        {successfulUploads.length > 0 && (
          <div style={{
            backgroundColor: '#f0fff4',
            borderRadius: '8px',
            border: '2px solid #27ae60',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#27ae60' }}>
              ✅ Successfully Uploaded ({successfulUploads.length})
            </h3>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Click on any file below to edit and tag people:
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '10px'
            }}>
              {successfulUploads.map((result, index) => (
                <Link
                  key={index}
                  to={`/media/${result.mediaId}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 15px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: '#2c5282',
                    border: '1px solid #bee3f8',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e7f3ff';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>🖼️</span>
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {result.filename}
                  </span>
                  <span style={{ marginLeft: 'auto' }}>→</span>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <Link
                to="/media-list"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#2c5282',
                  color: 'white',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 'bold'
                }}
              >
                View All Media
              </Link>
            </div>
          </div>
        )}

        {/* Error Results */}
        {uploadResults.filter(r => r.status === 'error').length > 0 && (
          <div style={{
            backgroundColor: '#fff5f5',
            borderRadius: '8px',
            border: '2px solid #e74c3c',
            padding: '20px',
            marginTop: '20px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#e74c3c' }}>
              ❌ Failed Uploads ({uploadResults.filter(r => r.status === 'error').length})
            </h3>
            {uploadResults.filter(r => r.status === 'error').map((result, index) => (
              <div
                key={index}
                style={{
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}
              >
                <strong>{result.filename}</strong>
                <div style={{ color: '#e74c3c', fontSize: '14px' }}>{result.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default BulkMediaUpload;
