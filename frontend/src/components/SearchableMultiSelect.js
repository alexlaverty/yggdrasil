import React, { useState, useRef, useEffect } from 'react';

function SearchableMultiSelect({ options, selectedIds, onChange, placeholder = "Search and select..." }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search query
  const filteredOptions = options.filter(option => {
    const fullName = `${option.first_name} ${option.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Get selected items for display
  const selectedItems = options.filter(option => selectedIds.includes(option.id));

  const handleToggleOption = (optionId) => {
    if (selectedIds.includes(optionId)) {
      onChange(selectedIds.filter(id => id !== optionId));
    } else {
      onChange([...selectedIds, optionId]);
    }
  };

  const handleRemoveSelected = (optionId) => {
    onChange(selectedIds.filter(id => id !== optionId));
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Selected Tags */}
      {selectedItems.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '8px'
        }}>
          {selectedItems.map(item => (
            <div key={item.id} style={{
              backgroundColor: '#1abc9c',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px'
            }}>
              <span>{item.first_name} {item.last_name}</span>
              <button
                type="button"
                onClick={() => handleRemoveSelected(item.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        style={{
          width: '100%',
          padding: '10px',
          border: '2px solid #bdc3c7',
          borderRadius: '5px',
          fontSize: '16px',
          outline: 'none'
        }}
      />

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '5px',
          maxHeight: '250px',
          overflowY: 'auto',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 1000
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <div
                key={option.id}
                onClick={() => handleToggleOption(option.id)}
                style={{
                  padding: '10px',
                  cursor: 'pointer',
                  backgroundColor: selectedIds.includes(option.id) ? '#e8f5e9' : 'white',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = selectedIds.includes(option.id) ? '#d4edda' : '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedIds.includes(option.id) ? '#e8f5e9' : 'white'}
              >
                <span>{option.first_name} {option.last_name}</span>
                {selectedIds.includes(option.id) && (
                  <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✓</span>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: '10px', color: '#999', fontStyle: 'italic' }}>
              {searchQuery ? `No people found matching "${searchQuery}"` : 'No people available'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchableMultiSelect;
