import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom emoji icons for each event type
const createEmojiIcon = (emoji, color) => {
  return L.divIcon({
    className: 'custom-emoji-icon',
    html: `<div style="
      background-color: ${color};
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    ">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const eventIcons = {
  BIRT: createEmojiIcon('👶', '#4CAF50'),  // Green for birth
  DEAT: createEmojiIcon('🕊️', '#9E9E9E'),  // Gray for death
  BURI: createEmojiIcon('⚰️', '#795548'),  // Brown for burial
  MARR: createEmojiIcon('💍', '#E91E63'),  // Pink for marriage
};

// Simple geocoding cache using localStorage
const geocodeCache = {
  get: (place) => {
    try {
      const cache = JSON.parse(localStorage.getItem('geocodeCache') || '{}');
      return cache[place];
    } catch {
      return null;
    }
  },
  set: (place, coords) => {
    try {
      const cache = JSON.parse(localStorage.getItem('geocodeCache') || '{}');
      cache[place] = coords;
      localStorage.setItem('geocodeCache', JSON.stringify(cache));
    } catch {
      // Ignore storage errors
    }
  }
};

// Geocode a place name using Nominatim (OpenStreetMap)
const geocodePlace = async (place) => {
  // Check cache first
  const cached = geocodeCache.get(place);
  if (cached) return cached;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`,
      { headers: { 'User-Agent': 'YggdrasilGenealogy/1.0' } }
    );
    const data = await response.json();

    if (data && data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(place, coords);
      return coords;
    }
  } catch (error) {
    console.error('Geocoding error for', place, error);
  }
  return null;
};

// Component to fit map bounds to markers
function FitBounds({ markers }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.coords.lat, m.coords.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);

  return null;
}

function Map() {
  const [events, setEvents] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0 });
  const [yearRange, setYearRange] = useState({ min: null, max: null });
  const [currentYear, setCurrentYear] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleEvents, setVisibleEvents] = useState([]);
  const [filterTypes, setFilterTypes] = useState({
    BIRT: true,
    DEAT: true,
    BURI: true,
    MARR: true
  });
  const playIntervalRef = useRef(null);
  const navigate = useNavigate();

  // Fetch events
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, yearsRes] = await Promise.all([
          axios.get('http://localhost:8001/api/map/events'),
          axios.get('http://localhost:8001/api/map/years')
        ]);

        setEvents(eventsRes.data);
        setYearRange({ min: yearsRes.data.min_year, max: yearsRes.data.max_year });
        setCurrentYear(yearsRes.data.max_year);
      } catch (error) {
        console.error('Error fetching map data:', error);
      }
    };

    fetchData();
  }, []);

  // Geocode places
  useEffect(() => {
    const geocodeEvents = async () => {
      if (events.length === 0) return;

      // Get unique places
      const uniquePlaces = [...new Set(events.map(e => e.place).filter(Boolean))];
      setGeocodingProgress({ current: 0, total: uniquePlaces.length });

      const placeCoords = {};

      for (let i = 0; i < uniquePlaces.length; i++) {
        const place = uniquePlaces[i];
        const coords = await geocodePlace(place);
        if (coords) {
          placeCoords[place] = coords;
        }
        setGeocodingProgress({ current: i + 1, total: uniquePlaces.length });

        // Small delay to respect Nominatim rate limits
        if (!geocodeCache.get(place)) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Create markers for events with coordinates
      const newMarkers = events
        .filter(e => placeCoords[e.place])
        .map(e => ({
          ...e,
          coords: placeCoords[e.place]
        }));

      setMarkers(newMarkers);
      setVisibleEvents(newMarkers);
      setLoading(false);
    };

    geocodeEvents();
  }, [events]);

  // Filter visible events based on year and event types
  useEffect(() => {
    if (!currentYear) {
      setVisibleEvents(markers.filter(m => filterTypes[m.event_type]));
      return;
    }

    const filtered = markers.filter(m => {
      const yearMatch = m.year && m.year <= currentYear;
      const typeMatch = filterTypes[m.event_type];
      return yearMatch && typeMatch;
    });

    setVisibleEvents(filtered);
  }, [currentYear, markers, filterTypes]);

  // Timeline playback
  const startPlayback = useCallback(() => {
    if (!yearRange.min || !yearRange.max) return;

    setIsPlaying(true);
    setCurrentYear(yearRange.min);

    playIntervalRef.current = setInterval(() => {
      setCurrentYear(prev => {
        if (prev >= yearRange.max) {
          clearInterval(playIntervalRef.current);
          setIsPlaying(false);
          return yearRange.max;
        }
        return prev + 1;
      });
    }, 100); // Speed: 100ms per year
  }, [yearRange]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
  }, []);

  const resetPlayback = useCallback(() => {
    stopPlayback();
    setCurrentYear(yearRange.max);
  }, [stopPlayback, yearRange.max]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  const toggleFilter = (type) => {
    setFilterTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleEventClick = (event) => {
    if (event.event_type === 'MARR' && event.family_id) {
      navigate(`/family/${event.family_id}`);
    } else if (event.person_id) {
      navigate(`/person/${event.person_id}`);
    }
  };

  const getEventTypeLabel = (type) => {
    switch (type) {
      case 'BIRT': return 'Birth';
      case 'DEAT': return 'Death';
      case 'BURI': return 'Burial';
      case 'MARR': return 'Marriage';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
          <span style={{ fontSize: '28px' }}>🗺️</span>
          <h2 style={{ margin: 0 }}>Event Map</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Loading map data...</p>
          {geocodingProgress.total > 0 && (
            <div>
              <p>Geocoding locations: {geocodingProgress.current} / {geocodingProgress.total}</p>
              <div style={{
                width: '300px',
                height: '10px',
                backgroundColor: '#e0e0e0',
                borderRadius: '5px',
                margin: '10px auto',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(geocodingProgress.current / geocodingProgress.total) * 100}%`,
                  height: '100%',
                  backgroundColor: '#1abc9c',
                  transition: 'width 0.2s'
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>🗺️</span>
          <h2 style={{ margin: 0 }}>Event Map</h2>
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          {visibleEvents.length} events displayed
        </div>
      </div>

      {/* Filter buttons */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: '500', marginRight: '5px' }}>Filter:</span>
        {Object.entries(filterTypes).map(([type, enabled]) => (
          <button
            key={type}
            onClick={() => toggleFilter(type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '20px',
              backgroundColor: enabled ? (
                type === 'BIRT' ? '#E8F5E9' :
                type === 'DEAT' ? '#F5F5F5' :
                type === 'BURI' ? '#EFEBE9' :
                '#FCE4EC'
              ) : '#fff',
              opacity: enabled ? 1 : 0.5,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <span>
              {type === 'BIRT' ? '👶' : type === 'DEAT' ? '🕊️' : type === 'BURI' ? '⚰️' : '💍'}
            </span>
            {getEventTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Timeline controls */}
      {yearRange.min && yearRange.max && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '1rem',
          padding: '10px 15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              onClick={isPlaying ? stopPlayback : startPlayback}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1abc9c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <button
              onClick={resetPlayback}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ↺ Reset
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>{yearRange.min}</span>
            <input
              type="range"
              min={yearRange.min}
              max={yearRange.max}
              value={currentYear || yearRange.max}
              onChange={(e) => {
                stopPlayback();
                setCurrentYear(parseInt(e.target.value));
              }}
              style={{ flex: 1, cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', color: '#666' }}>{yearRange.max}</span>
          </div>

          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            minWidth: '60px',
            textAlign: 'center',
            color: '#2c3e50'
          }}>
            {currentYear || yearRange.max}
          </div>
        </div>
      )}

      {/* Map */}
      <div style={{
        height: '600px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #ddd'
      }}>
        <MapContainer
          center={[30, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {visibleEvents.length > 0 && <FitBounds markers={visibleEvents} />}

          {visibleEvents.map((event, index) => (
            <Marker
              key={`${event.id}-${index}`}
              position={[event.coords.lat, event.coords.lng]}
              icon={eventIcons[event.event_type] || eventIcons.BIRT}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #eee'
                  }}>
                    <span style={{ fontSize: '20px' }}>
                      {event.event_type === 'BIRT' ? '👶' :
                       event.event_type === 'DEAT' ? '🕊️' :
                       event.event_type === 'BURI' ? '⚰️' : '💍'}
                    </span>
                    <strong>{getEventTypeLabel(event.event_type)}</strong>
                  </div>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Name:</strong> {event.name || 'Unknown'}
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Date:</strong> {event.date || 'Unknown'}
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Place:</strong> {event.place}
                  </p>
                  <button
                    onClick={() => handleEventClick(event)}
                    style={{
                      marginTop: '10px',
                      padding: '6px 12px',
                      backgroundColor: '#1abc9c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '30px',
        marginTop: '1rem',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            backgroundColor: '#4CAF50',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}>👶</span>
          <span>Birth</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            backgroundColor: '#9E9E9E',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}>🕊️</span>
          <span>Death</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            backgroundColor: '#795548',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}>⚰️</span>
          <span>Burial</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            backgroundColor: '#E91E63',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}>💍</span>
          <span>Marriage</span>
        </div>
      </div>
    </div>
  );
}

export default Map;
