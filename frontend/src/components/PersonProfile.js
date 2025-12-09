import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import mermaid from 'mermaid';
import PrevNextNav from './PrevNextNav';

function PersonProfile() {
  const { personId } = useParams();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddParent, setShowAddParent] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [allPeople, setAllPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [relationshipMessage, setRelationshipMessage] = useState(null);
  const [navInfo, setNavInfo] = useState({ max_id: 0 });
  const diagramRef = React.useRef(null);
  const expandedDiagramRef = React.useRef(null);

  // Initialize Mermaid once with default settings
  React.useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      flowchart: {
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }, []);

  // Function to generate Mermaid diagram
  const generateFamilyTreeDiagram = (person) => {
    let diagram = 'graph TD\n';
    const personNode = `P["${person.first_name} ${person.last_name}"]`;
    diagram += `${personNode}\n`;

    // Add parents
    if (person.parents && person.parents.length > 0) {
      person.parents.forEach((parent, idx) => {
        const parentNode = `PARENT${idx}["${parent.name}"]`;
        diagram += `${parentNode}\n`;
        diagram += `${parentNode} --> ${personNode}\n`;
      });
    }

    // Add children
    if (person.children && person.children.length > 0) {
      person.children.forEach((child, idx) => {
        const childNode = `CHILD${idx}["${child.name}"]`;
        diagram += `${childNode}\n`;
        diagram += `${personNode} --> ${childNode}\n`;
      });
    }

    return diagram;
  };

  useEffect(() => {
    axios.get(`http://localhost:8001/api/people/${personId}`)
      .then(res => {
        setPerson(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    // Get navigation info
    axios.get('http://localhost:8001/api/nav/people')
      .then(res => setNavInfo(res.data))
      .catch(err => console.error('Failed to load nav info:', err));
  }, [personId]);

  useEffect(() => {
    // Render diagram when person data is loaded
    if (person && diagramRef.current && ((person.parents && person.parents.length > 0) || (person.children && person.children.length > 0))) {
      const diagramContent = generateFamilyTreeDiagram(person);
      diagramRef.current.innerHTML = diagramContent;
      diagramRef.current.removeAttribute('data-processed');

      // Render the diagram
      mermaid.run({
        querySelector: '.mermaid'
      });
    }
  }, [person]);

  useEffect(() => {
    // Render expanded diagram when modal opens
    if (isExpanded && person && expandedDiagramRef.current && ((person.parents && person.parents.length > 0) || (person.children && person.children.length > 0))) {
      const diagramContent = generateFamilyTreeDiagram(person);
      expandedDiagramRef.current.innerHTML = diagramContent;
      expandedDiagramRef.current.removeAttribute('data-processed');

      // Render the diagram
      mermaid.run({
        querySelector: '.mermaid-expanded'
      });
    }
  }, [isExpanded, person]);

  // Load all people when opening add parent/child modals
  useEffect(() => {
    if (showAddParent || showAddChild) {
      axios.get('http://localhost:8001/api/people')
        .then(res => setAllPeople(res.data))
        .catch(err => console.error('Failed to load people:', err));
    }
  }, [showAddParent, showAddChild]);

  const handleAddParent = async () => {
    if (!selectedPersonId) {
      alert('Please select a person');
      return;
    }

    try {
      const response = await axios.post(`http://localhost:8001/api/people/${personId}/add-parent`, {
        related_person_id: parseInt(selectedPersonId)
      });
      setRelationshipMessage({ type: 'success', text: response.data.message });
      setShowAddParent(false);
      setSelectedPersonId('');
      // Reload person data
      const personResponse = await axios.get(`http://localhost:8001/api/people/${personId}`);
      setPerson(personResponse.data);
    } catch (err) {
      setRelationshipMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to add parent' });
    }
  };

  const handleAddChild = async () => {
    if (!selectedPersonId) {
      alert('Please select a person');
      return;
    }

    try {
      const response = await axios.post(`http://localhost:8001/api/people/${personId}/add-child`, {
        related_person_id: parseInt(selectedPersonId)
      });
      setRelationshipMessage({ type: 'success', text: response.data.message });
      setShowAddChild(false);
      setSelectedPersonId('');
      // Reload person data
      const personResponse = await axios.get(`http://localhost:8001/api/people/${personId}`);
      setPerson(personResponse.data);
    } catch (err) {
      setRelationshipMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to add child' });
    }
  };

  if (loading) return <div><h2>Loading...</h2></div>;
  if (error) return <div><h2>Error: {error}</h2></div>;
  if (!person) return <div><h2>Person not found</h2></div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/people" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to People
      </Link>

      <PrevNextNav
        currentId={personId}
        maxId={navInfo.max_id}
        baseUrl="/person"
        label="Person"
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>{person.first_name} {person.last_name}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            to={`/person/${personId}/edit`}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0066cc',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Edit Person
          </Link>
          <button
            onClick={() => setShowAddParent(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Add Parent
          </button>
          <button
            onClick={() => setShowAddChild(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Add Child
          </button>
        </div>
      </div>

      {relationshipMessage && (
        <div
          style={{
            padding: '10px',
            backgroundColor: relationshipMessage.type === 'success' ? '#e8f5e9' : '#ffebee',
            color: relationshipMessage.type === 'success' ? '#2e7d32' : '#c62828',
            borderRadius: '5px',
            marginBottom: '20px'
          }}
        >
          {relationshipMessage.text}
        </div>
      )}
      
      {/* Basic Information */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Basic Information</h3>
        <table style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold', paddingRight: '10px', paddingBottom: '10px' }}>Name:</td>
              <td style={{ paddingBottom: '10px' }}>{person.first_name} {person.last_name}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', paddingRight: '10px', paddingBottom: '10px' }}>Sex:</td>
              <td style={{ paddingBottom: '10px' }}>{person.sex === 'M' ? 'Male' : person.sex === 'F' ? 'Female' : 'Unknown'}</td>
            </tr>
            {person.gedcom_id && (
              <tr>
                <td style={{ fontWeight: 'bold', paddingRight: '10px', paddingBottom: '10px' }}>GEDCOM ID:</td>
                <td style={{ paddingBottom: '10px' }}>{person.gedcom_id}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Family Tree Diagram */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>Family Tree</h3>
          {((person.parents && person.parents.length > 0) || (person.children && person.children.length > 0)) && (
            <button
              onClick={() => setIsExpanded(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#0052a3'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#0066cc'}
            >
              Expand Diagram
            </button>
          )}
        </div>
        {(person.parents && person.parents.length > 0) || (person.children && person.children.length > 0) ? (
          <div className="mermaid" ref={diagramRef}></div>
        ) : (
          <p>No parents or children information available.</p>
        )}
      </section>

      {/* Birth Events */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Birth</h3>
        {person.births && person.births.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: '0' }}>
            {person.births.map((birth, idx) => (
              <li key={idx} style={{ paddingBottom: '10px' }}>
                <strong>Date:</strong> {birth.date || 'Unknown'}<br />
                <strong>Place:</strong> {birth.place || 'Unknown'}
              </li>
            ))}
          </ul>
        ) : (
          <p>No birth information available.</p>
        )}
      </section>

      {/* Death Events */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Death</h3>
        {person.deaths && person.deaths.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: '0' }}>
            {person.deaths.map((death, idx) => (
              <li key={idx} style={{ paddingBottom: '10px' }}>
                <strong>Date:</strong> {death.date || 'Unknown'}<br />
                <strong>Place:</strong> {death.place || 'Unknown'}
              </li>
            ))}
          </ul>
        ) : (
          <p>No death information available.</p>
        )}
      </section>

      {/* Marriage Events */}
      <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Marriage</h3>
        {person.marriages && person.marriages.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: '0' }}>
            {person.marriages.map((marriage, idx) => (
              <li key={idx} style={{ paddingBottom: '10px' }}>
                <strong>Spouse:</strong> {marriage.spouse || 'Unknown'}<br />
                <strong>Date:</strong> {marriage.date || 'Unknown'}<br />
                <strong>Place:</strong> {marriage.place || 'Unknown'}
              </li>
            ))}
          </ul>
        ) : (
          <p>No marriage information available.</p>
        )}
      </section>

      {/* Spouses */}
      {person.spouses && person.spouses.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <h3>Spouse(s)</h3>
          <ul style={{ listStyle: 'none', padding: '0' }}>
            {person.spouses.map((spouse) => (
              <li key={spouse.id} style={{ paddingBottom: '10px' }}>
                <Link to={`/person/${spouse.id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                  {spouse.name}
                </Link>
                {' '} ({spouse.sex === 'M' ? 'Male' : spouse.sex === 'F' ? 'Female' : 'Unknown'})
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Parents */}
      {person.parents && person.parents.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <h3>Parent(s)</h3>
          <ul style={{ listStyle: 'none', padding: '0' }}>
            {person.parents.map((parent) => (
              <li key={parent.id} style={{ paddingBottom: '10px' }}>
                <Link to={`/person/${parent.id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                  {parent.name}
                </Link>
                {' '} ({parent.sex === 'M' ? 'Male' : parent.sex === 'F' ? 'Female' : 'Unknown'})
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Children */}
      {person.children && person.children.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <h3>Children</h3>
          <ul style={{ listStyle: 'none', padding: '0' }}>
            {person.children.map((child) => (
              <li key={child.id} style={{ paddingBottom: '10px' }}>
                <Link to={`/person/${child.id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                  {child.name}
                </Link>
                {' '} ({child.sex === 'M' ? 'Male' : child.sex === 'F' ? 'Female' : 'Unknown'})
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Media */}
      {person.media && person.media.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <h3>Media</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {person.media.map((media) => (
              <div key={media.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: 'white' }}>
                <Link to={`/media/${media.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ cursor: 'pointer' }}>
                    {media.media_type === 'image' && (
                      <img
                        src={`http://localhost:8001/api/media/${media.id}/thumbnail`}
                        alt={media.filename}
                        loading="lazy"
                        decoding="async"
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '3px' }}
                      />
                    )}
                    {media.media_type === 'video' && (
                      <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#eee', borderRadius: '3px' }}>
                        🎥 Video
                      </div>
                    )}
                    {media.media_type === 'document' && (
                      <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#eee', borderRadius: '3px' }}>
                        📄 Document
                      </div>
                    )}
                    <h4 style={{ margin: '10px 0 5px 0' }}>{media.filename}</h4>
                    {media.media_date && (
                      <p style={{ margin: '5px 0' }}>
                        <strong>Date:</strong> {media.media_date}
                      </p>
                    )}
                    {media.description && (
                      <p style={{ margin: '5px 0', fontSize: '13px', color: '#666' }}>
                        {media.description}
                      </p>
                    )}
                  </div>
                </Link>
                <a
                  href={`http://localhost:8001/api/media/${media.id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc', textDecoration: 'none', display: 'inline-block', marginTop: '10px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Direct Download
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Expanded Diagram Modal */}
      {isExpanded && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setIsExpanded(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '10px',
              padding: '40px',
              width: '95vw',
              height: '95vh',
              overflow: 'auto',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '28px' }}>Family Tree - {person.first_name} {person.last_name}</h2>
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
              >
                Close
              </button>
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'auto',
                minHeight: 0
              }}
            >
              <div
                className="mermaid-expanded"
                ref={expandedDiagramRef}
                style={{
                  transform: 'scale(2.5)',
                  transformOrigin: 'center center',
                  minWidth: '100%',
                  padding: '150px'
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Add Parent Modal */}
      {showAddParent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => { setShowAddParent(false); setSelectedPersonId(''); }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '10px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Add Parent to {person.first_name} {person.last_name}</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                Select Person:
              </label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '16px',
                  borderRadius: '5px',
                  border: '1px solid #ccc'
                }}
              >
                <option value="">-- Select a person --</option>
                {allPeople
                  .filter(p => p.id !== parseInt(personId))
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} {p.birth_year ? `(${p.birth_year})` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAddParent}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Add Parent
              </button>
              <button
                onClick={() => { setShowAddParent(false); setSelectedPersonId(''); }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#999',
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
          </div>
        </div>
      )}

      {/* Add Child Modal */}
      {showAddChild && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => { setShowAddChild(false); setSelectedPersonId(''); }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '10px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Add Child to {person.first_name} {person.last_name}</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                Select Person:
              </label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '16px',
                  borderRadius: '5px',
                  border: '1px solid #ccc'
                }}
              >
                <option value="">-- Select a person --</option>
                {allPeople
                  .filter(p => p.id !== parseInt(personId))
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} {p.birth_year ? `(${p.birth_year})` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAddChild}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Add Child
              </button>
              <button
                onClick={() => { setShowAddChild(false); setSelectedPersonId(''); }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#999',
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
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonProfile;
