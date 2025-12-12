import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Tree from 'react-d3-tree';
import html2canvas from 'html2canvas';
import './Tree.css';

function FamilyTree() {
  const navigate = useNavigate();

  // State management
  const [rootPersonId, setRootPersonId] = useState('');
  const [allPeople, setAllPeople] = useState([]);
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [showAddParentModal, setShowAddParentModal] = useState(null);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [parentType, setParentType] = useState('');
  const [relationshipMessage, setRelationshipMessage] = useState(null);

  const treeContainerRef = useRef(null);
  const treeRef = useRef(null);

  // Helper function to get initials (pattern from People.js)
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    const first = parts[0].charAt(0).toUpperCase();
    const last = parts[parts.length - 1].charAt(0).toUpperCase();
    return first + last;
  };

  // Helper function to extract year from event array
  const extractYear = (events) => {
    if (!events || events.length === 0) return null;
    const event = events[0];
    if (event.date) {
      // Try to extract year from date string (various formats)
      const yearMatch = event.date.match(/\b(\d{4})\b/);
      if (yearMatch) return yearMatch[1];
    }
    return null;
  };

  // Fetch all people on mount
  useEffect(() => {
    axios.get('http://localhost:8001/api/people')
      .then(res => {
        setAllPeople(res.data);
      })
      .catch(err => {
        console.error('Failed to load people:', err);
        setError('Failed to load people list');
      });
  }, []);

  // Center tree on container size change - position root person near bottom with tree growing upward
  useEffect(() => {
    if (treeContainerRef.current && treeData) {
      const dimensions = treeContainerRef.current.getBoundingClientRect();
      setTranslate({
        x: dimensions.width / 2,
        y: dimensions.height - 100  // Position root person near bottom, tree grows upward
      });
    }
  }, [treeData]);

  // Helper to fetch person data with caching
  const personCache = useRef({});

  const fetchPersonData = useCallback(async (personId) => {
    if (personCache.current[personId]) {
      return personCache.current[personId];
    }

    try {
      const response = await axios.get(`http://localhost:8001/api/people/${personId}`);
      personCache.current[personId] = response.data;
      return response.data;
    } catch (err) {
      console.error(`Failed to fetch person ${personId}:`, err);
      return null;
    }
  }, []);


  // Simple tree building: selected person at root, parents above (max 2 generations)
  const buildAncestorTree = async (personId, visitedIds = new Set(), depth = 0, maxDepth = 2) => {
    if (depth > maxDepth || visitedIds.has(personId)) {
      return null;
    }

    visitedIds.add(personId);

    const person = await fetchPersonData(personId);
    if (!person) return null;

    const firstName = person.first_name || 'Unknown';
    const lastName = person.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    const birthYear = extractYear(person.births) || person.birth_year;
    const deathYear = extractYear(person.deaths);

    const node = {
      name: fullName,
      attributes: {
        birthYear: birthYear || '',
        deathYear: deathYear || '',
        profileImageId: person.profile_image_id,
        personId: person.id,
        sex: person.sex
      },
      children: []
    };

    // Add parents as children (they will render above due to tree orientation)
    if (person.parents && person.parents.length > 0 && depth < maxDepth) {
      for (const parent of person.parents) {
        const parentNode = await buildAncestorTree(parent.id, visitedIds, depth + 1, maxDepth);
        if (parentNode) {
          node.children.push(parentNode);
        }
      }
    }

    return node;
  };

  // Load tree when root person is selected
  useEffect(() => {
    if (!rootPersonId) {
      setTreeData(null);
      return;
    }

    let isCancelled = false;

    setLoading(true);
    setError(null);
    personCache.current = {}; // Clear cache

    const buildTree = async () => {
      try {
        const targetId = parseInt(rootPersonId);
        const data = await buildAncestorTree(targetId);

        if (isCancelled) return;

        if (data) {
          setTreeData(data);
        } else {
          setError('Failed to build family tree');
        }
        setLoading(false);
      } catch (err) {
        if (isCancelled) return;
        console.error('Error building tree:', err);
        setError('Failed to build family tree');
        setLoading(false);
      }
    };

    buildTree();

    return () => {
      isCancelled = true;
    };
  }, [rootPersonId]);

  // Custom node rendering
  const renderCustomNode = useCallback(({ nodeDatum, toggleNode }) => {
    const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;
    const isCollapsed = nodeDatum.__rd3t?.collapsed;

    return (
      <g>
        {/* Profile Image Circle */}
        <foreignObject x="-60" y="-80" width="120" height="120">
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #1abc9c',
            backgroundColor: '#34495e',
            cursor: 'pointer'
          }}>
            {nodeDatum.attributes.profileImageId ? (
              <img
                src={`http://localhost:8001/api/media/${nodeDatum.attributes.profileImageId}/thumbnail`}
                alt={nodeDatum.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                loading="lazy"
                onError={(e) => {
                  // Fallback to initials on image load error
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '36px',
                fontWeight: 'bold'
              }}>
                {getInitials(nodeDatum.name)}
              </div>
            )}
          </div>
        </foreignObject>

        {/* Name Card */}
        <foreignObject x="-100" y="50" width="200" height="80">
          <div style={{
            backgroundColor: 'white',
            border: '2px solid #1abc9c',
            borderRadius: '8px',
            padding: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer'
          }}>
            <div style={{
              fontWeight: 'bold',
              fontSize: '14px',
              marginBottom: '5px',
              color: '#2c3e50'
            }}>
              {nodeDatum.name}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {nodeDatum.attributes.birthYear && `b. ${nodeDatum.attributes.birthYear}`}
              {nodeDatum.attributes.birthYear && nodeDatum.attributes.deathYear && ' - '}
              {nodeDatum.attributes.deathYear && `d. ${nodeDatum.attributes.deathYear}`}
              {!nodeDatum.attributes.birthYear && !nodeDatum.attributes.deathYear && '\u00A0'}
            </div>
          </div>
        </foreignObject>

        {/* Expand/Collapse Indicator - positioned above since tree grows upward */}
        {hasChildren && (
          <g onClick={toggleNode} style={{ cursor: 'pointer' }}>
            <circle r="15" fill="#1abc9c" stroke="white" strokeWidth="2" y="-100" />
            <text y="-95" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
              {isCollapsed ? '+' : '-'}
            </text>
          </g>
        )}
      </g>
    );
  }, []);

  // Handle node click for context menu
  const handleNodeClick = (nodeData, evt) => {
    // Prevent context menu on toggle button click
    if (evt.target.tagName === 'circle' || evt.target.tagName === 'text') {
      return;
    }

    const menuWidth = 200;
    const menuHeight = 150;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let x = evt.clientX;
    let y = evt.clientY;

    // Adjust if menu would overflow right edge
    if (x + menuWidth > windowWidth) {
      x = windowWidth - menuWidth - 10;
    }

    // Adjust if menu would overflow bottom edge
    if (y + menuHeight > windowHeight) {
      y = windowHeight - menuHeight - 10;
    }

    setContextMenu({
      x,
      y,
      personId: nodeData.attributes.personId,
      personName: nodeData.name
    });
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu && !e.target.closest('.context-menu')) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Handle add parent
  const handleAddParent = async () => {
    if (!selectedParentId) {
      alert('Please select a person');
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:8001/api/people/${showAddParentModal.personId}/add-parent`,
        { related_person_id: parseInt(selectedParentId) }
      );

      setRelationshipMessage({ type: 'success', text: response.data.message });
      setShowAddParentModal(null);
      setSelectedParentId('');
      setParentType('');

      // Reload tree
      personCache.current = {}; // Clear cache
      const targetId = parseInt(rootPersonId);
      const data = await buildAncestorTree(targetId);
      if (data) {
        setTreeData(data);
      }

      setTimeout(() => setRelationshipMessage(null), 3000);
    } catch (err) {
      setRelationshipMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to add parent'
      });
      setTimeout(() => setRelationshipMessage(null), 3000);
    }
  };

  // Export as SVG
  const exportAsSVG = () => {
    const svgElement = treeContainerRef.current?.querySelector('svg');
    if (!svgElement) {
      alert('No tree to export');
      return;
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `family-tree-${rootPersonId}-${Date.now()}.svg`;
    link.click();

    URL.revokeObjectURL(url);
  };

  // Export as PNG
  const exportAsPNG = async () => {
    if (!treeContainerRef.current) {
      alert('No tree to export');
      return;
    }

    try {
      const canvas = await html2canvas(treeContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `family-tree-${rootPersonId}-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export tree as PNG');
    }
  };

  // Context Menu Component
  const ContextMenu = ({ x, y, personId, personName }) => (
    <div
      className="context-menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        backgroundColor: 'white',
        border: '2px solid #1abc9c',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        zIndex: 2000,
        padding: '8px 0',
        minWidth: '200px'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          navigate(`/person/${personId}`);
          setContextMenu(null);
        }}
        className="context-menu-item"
      >
        View Profile
      </button>
      <button
        onClick={() => {
          navigate(`/person/${personId}/edit`);
          setContextMenu(null);
        }}
        className="context-menu-item"
      >
        Edit Person
      </button>
      <button
        onClick={() => {
          setShowAddParentModal({ personId, personName });
          setContextMenu(null);
        }}
        className="context-menu-item"
      >
        Add Parent
      </button>
    </div>
  );

  return (
    <div className="family-tree-page">
      <h2>Family Tree</h2>

      {/* Root Person Selector */}
      <div className="person-selector">
        <label htmlFor="root-person-select">Select Person:</label>
        <select
          id="root-person-select"
          value={rootPersonId}
          onChange={(e) => setRootPersonId(e.target.value)}
        >
          <option value="">Choose a person...</option>
          {allPeople.map(p => (
            <option key={p.id} value={p.id}>
              {p.first_name} {p.last_name}
              {p.birth_year ? ` (b. ${p.birth_year})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Relationship Message */}
      {relationshipMessage && (
        <div className={`relationship-message ${relationshipMessage.type}`}>
          {relationshipMessage.text}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-skeleton">
          <div className="spinner"></div>
          <p>Building family tree...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !treeData && !error && (
        <div className="empty-state">
          <div className="empty-state-icon">🌳</div>
          <h3>No Tree Generated</h3>
          <p>Select a person above to view their family tree</p>
        </div>
      )}

      {/* Tree Container */}
      {treeData && !loading && (
        <div ref={treeContainerRef} className="tree-container">
          <Tree
            ref={treeRef}
            data={treeData}
            orientation="vertical"
            translate={translate}
            pathFunc="step"
            separation={{ siblings: 1.5, nonSiblings: 2 }}
            nodeSize={{ x: 250, y: 200 }}
            depthFactor={-200}
            zoom={0.8}
            scaleExtent={{ min: 0.1, max: 2 }}
            enableLegacyTransitions={true}
            transitionDuration={500}
            renderCustomNodeElement={renderCustomNode}
            onNodeClick={handleNodeClick}
            collapsible={true}
            shouldCollapseNeighborNodes={false}
          />
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          personId={contextMenu.personId}
          personName={contextMenu.personName}
        />
      )}

      {/* Add Parent Modal */}
      {showAddParentModal && (
        <div className="modal-overlay" onClick={() => setShowAddParentModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Parent to {showAddParentModal.personName}</h3>

            <div className="form-group">
              <label htmlFor="parent-type-select">Parent Type:</label>
              <select
                id="parent-type-select"
                value={parentType}
                onChange={(e) => setParentType(e.target.value)}
              >
                <option value="">Select parent type...</option>
                <option value="father">Father</option>
                <option value="mother">Mother</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="parent-select">Select Person:</label>
              <select
                id="parent-select"
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
              >
                <option value="">Choose a person...</option>
                {allPeople
                  .filter(p => p.id !== showAddParentModal.personId)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                      {p.birth_year ? ` (b. ${p.birth_year})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div className="modal-actions">
              <button onClick={handleAddParent} className="btn-primary">
                Add Parent
              </button>
              <button onClick={() => {
                setShowAddParentModal(null);
                setSelectedParentId('');
                setParentType('');
              }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      {treeData && !loading && (
        <div className="export-buttons">
          <button onClick={exportAsPNG} className="fab" title="Export as PNG">
            PNG
          </button>
          <button onClick={exportAsSVG} className="fab" title="Export as SVG">
            SVG
          </button>
        </div>
      )}
    </div>
  );
}

export default FamilyTree;
