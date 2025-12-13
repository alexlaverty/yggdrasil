import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Toast from './Toast';

function PersonForm() {
  const { personId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!personId;
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    sex: '',
    birth_date: '',
    birth_place: '',
    death_date: '',
    death_place: '',
    burial_date: '',
    burial_place: ''
  });

  const [profileImageId, setProfileImageId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Load existing person data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      axios.get(`http://localhost:8001/api/people/${personId}`)
        .then(res => {
          setFormData({
            first_name: res.data.first_name || '',
            last_name: res.data.last_name || '',
            sex: res.data.sex || '',
            birth_date: res.data.births && res.data.births[0] ? res.data.births[0].date : '',
            birth_place: res.data.births && res.data.births[0] ? res.data.births[0].place : '',
            death_date: res.data.deaths && res.data.deaths[0] ? res.data.deaths[0].date : '',
            death_place: res.data.deaths && res.data.deaths[0] ? res.data.deaths[0].place : '',
            burial_date: res.data.burials && res.data.burials[0] ? res.data.burials[0].date : '',
            burial_place: res.data.burials && res.data.burials[0] ? res.data.burials[0].place : ''
          });
          setProfileImageId(res.data.profile_image_id || null);
          setLoading(false);
        })
        .catch(err => {
          setToast({ message: 'Failed to load person data', type: 'error' });
          setLoading(false);
        });
    }
  }, [personId, isEditMode]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setToast({ message: 'Please select an image file', type: 'error' });
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `http://localhost:8001/api/people/${personId}/profile-image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setProfileImageId(response.data.id);
      setToast({ message: 'Profile image uploaded successfully!', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to upload image', type: 'error' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveProfileImage = async () => {
    try {
      await axios.put(`http://localhost:8001/api/people/${personId}`, {
        profile_image_id: 0  // 0 means remove
      });
      setProfileImageId(null);
      setToast({ message: 'Profile image removed', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to remove profile image', type: 'error' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEditMode) {
        // Update existing person
        const updateData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          sex: formData.sex,
          birth_date: formData.birth_date || null,
          birth_place: formData.birth_place || null,
          death_date: formData.death_date || null,
          death_place: formData.death_place || null,
          burial_date: formData.burial_date || null,
          burial_place: formData.burial_place || null
        };
        const response = await axios.put(`http://localhost:8001/api/people/${personId}`, updateData);
        setToast({ message: `${formData.first_name} ${formData.last_name} updated successfully!`, type: 'success' });
        setTimeout(() => navigate(`/person/${personId}`), 1500);
      } else {
        // Create new person
        const response = await axios.post('http://localhost:8001/api/people', formData);
        setToast({ message: `${formData.first_name} ${formData.last_name} created successfully!`, type: 'success' });
        setTimeout(() => navigate(`/person/${response.data.id}`), 1500);
      }
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'An error occurred', type: 'error' });
    }
  };

  if (loading) return <div><h2>Loading...</h2></div>;

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2>{isEditMode ? 'Edit Person' : 'Add New Person'}</h2>

        <form onSubmit={handleSubmit}>
        {/* Personal Information Section */}
        <div className="form-section">
          <div className="form-section-title">Personal Information</div>

          {/* Profile Image Upload */}
          <div className="avatar-upload" style={{ marginBottom: '20px' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: '#e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 15px auto',
                overflow: 'hidden',
                border: '3px solid #ccc',
                position: 'relative',
                cursor: isEditMode ? 'pointer' : 'default'
              }}
              onClick={() => isEditMode && fileInputRef.current?.click()}
            >
              {profileImageId ? (
                <img
                  src={`http://localhost:8001/api/media/${profileImageId}/file`}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '36px', color: '#666' }}>
                  {formData.first_name && formData.last_name
                    ? `${formData.first_name.charAt(0)}${formData.last_name.charAt(0)}`.toUpperCase()
                    : '👤'
                  }
                </span>
              )}
              {uploadingImage && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px'
                }}>
                  Uploading...
                </div>
              )}
            </div>

            {isEditMode && (
              <div style={{ textAlign: 'center' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2c5282',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: uploadingImage ? 'not-allowed' : 'pointer',
                    marginRight: '8px',
                    fontSize: '14px'
                  }}
                >
                  {profileImageId ? 'Change Photo' : 'Upload Photo'}
                </button>
                {profileImageId && (
                  <button
                    type="button"
                    onClick={handleRemoveProfileImage}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
            {!isEditMode && (
              <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginTop: '10px' }}>
                You can add a profile photo after creating this person.
              </p>
            )}
          </div>

          {/* Name Fields in Grid */}
          <div className="form-row">
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                First Name *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '8px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Last Name *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '8px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Sex
            </label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
            >
              <option value="">Unknown</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
        </div>

        {/* Vital Events Section */}
        <div className="form-section">
          <div className="form-section-title">Vital Events</div>

          {/* Birth Information */}
          <div className="form-row">
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Birth Date
              </label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Birth Place
              </label>
              <input
                type="text"
                name="birth_place"
                value={formData.birth_place}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
              />
            </div>
          </div>

          {/* Death Information */}
          <div className="form-row">
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Death Date
              </label>
              <input
                type="date"
                name="death_date"
                value={formData.death_date}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Death Place
              </label>
              <input
                type="text"
                name="death_place"
                value={formData.death_place}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
              />
            </div>
          </div>

          {/* Burial Information */}
          <div className="form-row">
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Burial Date
              </label>
              <input
                type="date"
                name="burial_date"
                value={formData.burial_date}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Burial Place
              </label>
              <input
                type="text"
                name="burial_place"
                value={formData.burial_place}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
              />
            </div>
          </div>

          {/* Note about marriage events */}
          {isEditMode && (
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px', fontSize: '14px', color: '#1976d2' }}>
              <strong>Note:</strong> Marriage events are associated with families. To edit marriage information, please visit the family detail page.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '2rem' }}>
          <button
            type="submit"
            style={{
              padding: '12px 24px',
              backgroundColor: '#1abc9c',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {isEditMode ? 'Update Person' : 'Create Person'}
          </button>

          <button
            type="button"
            onClick={() => navigate(isEditMode ? `/person/${personId}` : '/people')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
      </div>
    </>
  );
}

export default PersonForm;
