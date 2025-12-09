import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Toast from './Toast';

function Upload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Backup/Restore state
  const [backupFile, setBackupFile] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // GitHub backup state
  const [githubRepo, setGithubRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('Yggdrasil backup');
  const [githubExportLoading, setGithubExportLoading] = useState(false);
  const [githubImportLoading, setGithubImportLoading] = useState(false);
  const [githubConfigLoaded, setGithubConfigLoaded] = useState(false);

  // Geocoding state
  const [geocodeStats, setGeocodeStats] = useState(null);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState(null);

  // GEDCOM export state
  const [gedcomExportLoading, setGedcomExportLoading] = useState(false);

  // Load GitHub config and geocode stats on mount
  useEffect(() => {
    const loadGithubConfig = async () => {
      try {
        const res = await axios.get('http://localhost:8001/api/backup/github/config');
        const config = res.data;

        // Use ENV values if set, otherwise fall back to localStorage
        setGithubRepo(config.repo || localStorage.getItem('yggdrasil_github_repo') || '');
        setGithubToken(config.token || localStorage.getItem('yggdrasil_github_token') || '');
        setGithubBranch(config.branch || localStorage.getItem('yggdrasil_github_branch') || 'main');
      } catch (err) {
        // Fall back to localStorage if API fails
        setGithubRepo(localStorage.getItem('yggdrasil_github_repo') || '');
        setGithubToken(localStorage.getItem('yggdrasil_github_token') || '');
        setGithubBranch(localStorage.getItem('yggdrasil_github_branch') || 'main');
      }
      setGithubConfigLoaded(true);
    };

    const loadGeocodeStats = async () => {
      try {
        const res = await axios.get('http://localhost:8001/api/map/places/stats');
        setGeocodeStats(res.data);
      } catch (err) {
        console.error('Error loading geocode stats:', err);
      }
    };

    loadGithubConfig();
    loadGeocodeStats();
  }, []);

  // Handle geocoding
  const handleGeocode = async (force = false) => {
    setGeocodeLoading(true);
    setGeocodeResults(null);

    try {
      const res = await axios.post('http://localhost:8001/api/map/places/geocode', { force });
      setGeocodeResults(res.data.results);
      setGeocodeStats(res.data.stats);
      setToast({
        message: `Geocoding complete! ${res.data.results.success} places found, ${res.data.results.failed} failed.`,
        type: 'success'
      });
    } catch (err) {
      if (err.response?.status === 409) {
        setToast({ message: 'Geocoding already in progress', type: 'error' });
      } else {
        setToast({ message: err.response?.data?.detail || 'Error during geocoding', type: 'error' });
      }
    } finally {
      setGeocodeLoading(false);
    }
  };

  // Handle GEDCOM export
  const handleGedcomExport = async () => {
    setGedcomExportLoading(true);
    try {
      const response = await axios.get('http://localhost:8001/api/export-gedcom', {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'yggdrasil_export.ged';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setToast({ message: 'GEDCOM file exported successfully!', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Error exporting GEDCOM file', type: 'error' });
    } finally {
      setGedcomExportLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setToast({ message: 'Please select a GEDCOM file', type: 'error' });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:8001/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setToast({ message: res.data.message || 'GEDCOM file uploaded and processed successfully!', type: 'success' });
      setFile(null);
      // Reset file input
      document.getElementById('gedcom-file-input').value = '';
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Error uploading file', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle backup export
  const handleExportBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await axios.get('http://localhost:8001/api/backup/export', {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'yggdrasil_backup.zip';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setToast({ message: 'Backup exported successfully!', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Error exporting backup', type: 'error' });
    } finally {
      setBackupLoading(false);
    }
  };

  // Handle backup import/restore
  const handleRestoreBackup = async (e) => {
    e.preventDefault();
    if (!backupFile) {
      setToast({ message: 'Please select a backup file', type: 'error' });
      return;
    }

    if (!window.confirm('This will replace ALL existing data with the backup. Are you sure you want to continue?')) {
      return;
    }

    setRestoreLoading(true);
    const formData = new FormData();
    formData.append('file', backupFile);

    try {
      const res = await axios.post('http://localhost:8001/api/backup/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const imported = res.data.imported;
      setToast({
        message: `Backup restored! Imported ${imported.individuals} people, ${imported.families} families, ${imported.events} events, ${imported.media} media items.`,
        type: 'success'
      });
      setBackupFile(null);
      document.getElementById('backup-file-input').value = '';
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Error restoring backup', type: 'error' });
    } finally {
      setRestoreLoading(false);
    }
  };

  // Save GitHub config to localStorage
  const saveGithubConfig = () => {
    localStorage.setItem('yggdrasil_github_repo', githubRepo);
    localStorage.setItem('yggdrasil_github_token', githubToken);
    localStorage.setItem('yggdrasil_github_branch', githubBranch);
  };

  // Handle GitHub export
  const handleGithubExport = async () => {
    if (!githubRepo || !githubToken) {
      setToast({ message: 'Please enter GitHub repository and token', type: 'error' });
      return;
    }

    saveGithubConfig();
    setGithubExportLoading(true);

    try {
      const res = await axios.post('http://localhost:8001/api/backup/github/export', {
        repo: githubRepo,
        token: githubToken,
        branch: githubBranch,
        commit_message: commitMessage || 'Yggdrasil backup'
      });

      const exported = res.data.exported;
      setToast({
        message: `Exported to GitHub! ${exported.individuals} people, ${exported.families} families, ${exported.events} events, ${exported.media_files} media files. Commit: ${res.data.commit_sha.substring(0, 7)}`,
        type: 'success'
      });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Error exporting to GitHub', type: 'error' });
    } finally {
      setGithubExportLoading(false);
    }
  };

  // Handle GitHub import
  const handleGithubImport = async () => {
    if (!githubRepo || !githubToken) {
      setToast({ message: 'Please enter GitHub repository and token', type: 'error' });
      return;
    }

    if (!window.confirm('This will replace ALL existing data with the backup from GitHub. Are you sure you want to continue?')) {
      return;
    }

    saveGithubConfig();
    setGithubImportLoading(true);

    try {
      const res = await axios.post('http://localhost:8001/api/backup/github/import', {
        repo: githubRepo,
        token: githubToken,
        branch: githubBranch
      });

      const imported = res.data.imported;
      setToast({
        message: `Imported from GitHub! ${imported.individuals} people, ${imported.families} families, ${imported.events} events, ${imported.media_files} media files.`,
        type: 'success'
      });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Error importing from GitHub', type: 'error' });
    } finally {
      setGithubImportLoading(false);
    }
  };

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2>GEDCOM Import Tool</h2>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', color: '#495057' }}>About GEDCOM Files</h3>
          <p style={{ color: '#6c757d', lineHeight: '1.6', marginBottom: '10px' }}>
            GEDCOM (Genealogical Data Communication) is a standard file format for exchanging genealogical data.
            Upload your .ged file to import your family tree into Yggdrasil.
          </p>
          <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0 }}>
            <strong>Note:</strong> The import process will parse individuals, families, and events from your GEDCOM file
            and store them in the database.
          </p>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          border: '2px dashed #dee2e6'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>📤</div>
              <label
                htmlFor="gedcom-file-input"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#34495e',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'background-color 0.3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2c3e50'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
              >
                Choose GEDCOM File (.ged)
              </label>
              <input
                id="gedcom-file-input"
                type="file"
                accept=".ged"
                onChange={e => setFile(e.target.files[0])}
                disabled={loading}
                style={{ display: 'none' }}
              />
            </div>

            {file && (
              <div style={{
                padding: '15px',
                backgroundColor: '#e8f5e9',
                borderRadius: '6px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <strong>Selected file:</strong> {file.name}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !file}
              style={{
                width: '100%',
                padding: '14px 24px',
                backgroundColor: '#1abc9c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading || !file ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: loading || !file ? 0.6 : 1,
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!loading && file) {
                  e.currentTarget.style.backgroundColor = '#16a085';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && file) {
                  e.currentTarget.style.backgroundColor = '#1abc9c';
                }
              }}
            >
              {loading ? 'Processing GEDCOM File...' : 'Upload and Import'}
            </button>
          </form>
        </div>

        {/* GEDCOM Export Section */}
        <h2 style={{ marginTop: '50px' }}>GEDCOM Export</h2>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', color: '#495057' }}>About GEDCOM Export</h3>
          <p style={{ color: '#6c757d', lineHeight: '1.6', marginBottom: '10px' }}>
            Export your entire family tree as a standard GEDCOM file that can be imported into other
            genealogy software like Ancestry.com, FamilySearch, Gramps, or any GEDCOM-compatible application.
          </p>
          <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0 }}>
            <strong>Included data:</strong> All individuals, families, births, deaths, burials, marriages,
            and their dates and places.
          </p>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          border: '2px solid #9b59b6'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
            <h3 style={{ marginTop: 0 }}>Export as GEDCOM</h3>
            <p style={{ color: '#6c757d', marginBottom: '20px' }}>
              Download your family tree in standard GEDCOM format (.ged file).
            </p>
            <button
              onClick={handleGedcomExport}
              disabled={gedcomExportLoading}
              style={{
                width: '100%',
                padding: '14px 24px',
                backgroundColor: '#9b59b6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: gedcomExportLoading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: gedcomExportLoading ? 0.6 : 1,
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!gedcomExportLoading) e.currentTarget.style.backgroundColor = '#8e44ad';
              }}
              onMouseLeave={(e) => {
                if (!gedcomExportLoading) e.currentTarget.style.backgroundColor = '#9b59b6';
              }}
            >
              {gedcomExportLoading ? 'Exporting...' : 'Download GEDCOM File'}
            </button>
          </div>
        </div>

        {/* Backup & Restore Section */}
        <h2 style={{ marginTop: '50px' }}>Backup & Restore</h2>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', color: '#495057' }}>About Backups</h3>
          <p style={{ color: '#6c757d', lineHeight: '1.6', marginBottom: '10px' }}>
            Export your entire family tree database including all people, families, events, and media files
            as a ZIP archive. This backup can be stored in a Git repository for version control and
            restored later to recover your data.
          </p>
          <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0 }}>
            <strong>Backup contents:</strong> JSON files for all data tables plus all uploaded media files.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Export Section */}
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            border: '2px solid #27ae60'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>💾</div>
              <h3 style={{ marginTop: 0 }}>Export Backup</h3>
              <p style={{ color: '#6c757d', marginBottom: '20px' }}>
                Download a complete backup of your database and media files.
              </p>
              <button
                onClick={handleExportBackup}
                disabled={backupLoading}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: backupLoading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  opacity: backupLoading ? 0.6 : 1,
                  transition: 'background-color 0.3s'
                }}
                onMouseEnter={(e) => {
                  if (!backupLoading) e.currentTarget.style.backgroundColor = '#219a52';
                }}
                onMouseLeave={(e) => {
                  if (!backupLoading) e.currentTarget.style.backgroundColor = '#27ae60';
                }}
              >
                {backupLoading ? 'Exporting...' : 'Download Backup'}
              </button>
            </div>
          </div>

          {/* Restore Section */}
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            border: '2px solid #e74c3c'
          }}>
            <form onSubmit={handleRestoreBackup}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📥</div>
                <h3 style={{ marginTop: 0 }}>Restore Backup</h3>
                <p style={{ color: '#6c757d', marginBottom: '20px' }}>
                  Restore from a previously exported backup file.
                </p>

                <label
                  htmlFor="backup-file-input"
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    backgroundColor: '#34495e',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    marginBottom: '15px',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2c3e50'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
                >
                  Choose Backup File (.zip)
                </label>
                <input
                  id="backup-file-input"
                  type="file"
                  accept=".zip"
                  onChange={e => setBackupFile(e.target.files[0])}
                  disabled={restoreLoading}
                  style={{ display: 'none' }}
                />

                {backupFile && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#fef9e7',
                    borderRadius: '6px',
                    marginBottom: '15px'
                  }}>
                    <strong>Selected:</strong> {backupFile.name}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={restoreLoading || !backupFile}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: restoreLoading || !backupFile ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    opacity: restoreLoading || !backupFile ? 0.6 : 1,
                    transition: 'background-color 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    if (!restoreLoading && backupFile) e.currentTarget.style.backgroundColor = '#c0392b';
                  }}
                  onMouseLeave={(e) => {
                    if (!restoreLoading && backupFile) e.currentTarget.style.backgroundColor = '#e74c3c';
                  }}
                >
                  {restoreLoading ? 'Restoring...' : 'Restore Backup'}
                </button>

                <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '10px', marginBottom: 0 }}>
                  Warning: Restoring will replace ALL existing data!
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* GitHub Backup Section */}
        <h2 style={{ marginTop: '50px' }}>GitHub Backup</h2>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', color: '#495057' }}>Direct GitHub Integration</h3>
          <p style={{ color: '#6c757d', lineHeight: '1.6', marginBottom: '10px' }}>
            Export your family tree directly to a private GitHub repository for version-controlled backups.
            Each export creates a new commit with all your data and media files.
          </p>
          <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0 }}>
            <strong>Required:</strong> A GitHub Personal Access Token with <code>repo</code> scope.
            <a href="https://github.com/settings/tokens/new?scopes=repo&description=Yggdrasil%20Backup" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: '#2c5282' }}>
              Create token
            </a>
          </p>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          border: '2px solid #6f42c1',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🐙</span> GitHub Configuration
          </h3>

          <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px' }}>
                Repository (owner/repo) *
              </label>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="e.g., username/family-tree-backup"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px' }}>
                Personal Access Token *
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}
              />
              <p style={{ fontSize: '12px', color: '#6c757d', margin: '4px 0 0 0' }}>
                Your token is stored locally in your browser and sent directly to GitHub.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px' }}>
                  Branch
                </label>
                <input
                  type="text"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  placeholder="main"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px' }}>
                  Commit Message (for export)
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Yggdrasil backup"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button
              onClick={handleGithubExport}
              disabled={githubExportLoading || !githubRepo || !githubToken}
              style={{
                padding: '14px 24px',
                backgroundColor: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: githubExportLoading || !githubRepo || !githubToken ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: githubExportLoading || !githubRepo || !githubToken ? 0.6 : 1,
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!githubExportLoading && githubRepo && githubToken) e.currentTarget.style.backgroundColor = '#219a52';
              }}
              onMouseLeave={(e) => {
                if (!githubExportLoading && githubRepo && githubToken) e.currentTarget.style.backgroundColor = '#27ae60';
              }}
            >
              {githubExportLoading ? 'Exporting to GitHub...' : '💾 Export to GitHub'}
            </button>

            <button
              onClick={handleGithubImport}
              disabled={githubImportLoading || !githubRepo || !githubToken}
              style={{
                padding: '14px 24px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: githubImportLoading || !githubRepo || !githubToken ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: githubImportLoading || !githubRepo || !githubToken ? 0.6 : 1,
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!githubImportLoading && githubRepo && githubToken) e.currentTarget.style.backgroundColor = '#c0392b';
              }}
              onMouseLeave={(e) => {
                if (!githubImportLoading && githubRepo && githubToken) e.currentTarget.style.backgroundColor = '#e74c3c';
              }}
            >
              {githubImportLoading ? 'Importing from GitHub...' : '📥 Import from GitHub'}
            </button>
          </div>

          <p style={{ color: '#6c757d', fontSize: '12px', marginTop: '12px', marginBottom: 0, textAlign: 'center' }}>
            Export creates a new commit. Import replaces ALL existing data.
          </p>
        </div>

        {/* Geocoding Section */}
        <h2 style={{ marginTop: '50px' }}>Map Geocoding</h2>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', color: '#495057' }}>About Geocoding</h3>
          <p style={{ color: '#6c757d', lineHeight: '1.6', marginBottom: '10px' }}>
            Geocoding converts place names (like "London, England") into map coordinates (latitude/longitude).
            This is required for displaying events on the Map page.
          </p>
          <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0 }}>
            <strong>Note:</strong> Geocoding uses OpenStreetMap's Nominatim service and respects their rate limit (1 request/second).
            For 300 places, this takes about 5 minutes. Coordinates are stored in the database so you only need to do this once.
          </p>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          border: '2px solid #3498db'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🗺️</div>
            <h3 style={{ marginTop: 0 }}>Geocode Places</h3>
          </div>

          {/* Stats display */}
          {geocodeStats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '15px',
              marginBottom: '24px'
            }}>
              <div style={{
                padding: '15px',
                backgroundColor: '#e8f5e9',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
                  {geocodeStats.success}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Geocoded</div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#fff3e0',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>
                  {geocodeStats.pending + geocodeStats.unsynced}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Pending</div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#ffebee',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>
                  {geocodeStats.failed}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Failed</div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
                  {geocodeStats.total}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Total</div>
              </div>
            </div>
          )}

          {/* Progress/Results */}
          {geocodeLoading && (
            <div style={{
              padding: '20px',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, color: '#1565c0' }}>
                Geocoding in progress... This may take several minutes.
              </p>
              <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#666' }}>
                Processing at ~1 place per second to respect API rate limits.
              </p>
            </div>
          )}

          {geocodeResults && !geocodeLoading && (
            <div style={{
              padding: '15px',
              backgroundColor: '#e8f5e9',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: 0 }}>
                <strong>Last run:</strong> {geocodeResults.success} successful, {geocodeResults.failed} failed
                {geocodeResults.new_places > 0 && `, ${geocodeResults.new_places} new places synced`}
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button
              onClick={() => handleGeocode(false)}
              disabled={geocodeLoading}
              style={{
                padding: '14px 24px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: geocodeLoading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: geocodeLoading ? 0.6 : 1,
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!geocodeLoading) e.currentTarget.style.backgroundColor = '#2980b9';
              }}
              onMouseLeave={(e) => {
                if (!geocodeLoading) e.currentTarget.style.backgroundColor = '#3498db';
              }}
            >
              {geocodeLoading ? 'Geocoding...' : '📍 Geocode New Places'}
            </button>

            <button
              onClick={() => {
                if (window.confirm('This will re-geocode ALL places, including ones that previously failed. Continue?')) {
                  handleGeocode(true);
                }
              }}
              disabled={geocodeLoading}
              style={{
                padding: '14px 24px',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: geocodeLoading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: geocodeLoading ? 0.6 : 1,
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!geocodeLoading) e.currentTarget.style.backgroundColor = '#7f8c8d';
              }}
              onMouseLeave={(e) => {
                if (!geocodeLoading) e.currentTarget.style.backgroundColor = '#95a5a6';
              }}
            >
              🔄 Re-geocode All Places
            </button>
          </div>

          <p style={{ color: '#6c757d', fontSize: '12px', marginTop: '12px', marginBottom: 0, textAlign: 'center' }}>
            "Geocode New Places" only processes places that haven't been geocoded yet.
            "Re-geocode All" retries everything including previously failed places.
          </p>
        </div>
      </div>
    </>
  );
}

export default Upload;