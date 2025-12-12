import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import People from './components/People';
import PersonProfile from './components/PersonProfile';
import PersonForm from './components/PersonForm';
import Places from './components/Places';
import PlaceDetail from './components/PlaceDetail';
import Families from './components/Families';
import FamilyDetail from './components/FamilyDetail';
import Birth from './components/Birth';
import Death from './components/Death';
import Burial from './components/Burial';
import Marriage from './components/Marriage';
import Upload from './components/Upload';
import MediaUpload from './components/MediaUpload';
import MediaList from './components/MediaList';
import MediaDetail from './components/MediaDetail';
import EventDetail from './components/EventDetail';
import BulkMediaUpload from './components/BulkMediaUpload';
import Map from './components/Map';
import Chat from './components/Chat';

function App() {
  return (
    <Router>
      <div className="App">
        <header style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img
            src="/logo2.png"
            alt="Yggdrasil Logo"
            style={{ height: '150px', width: 'auto' }}
          />
          <div>
            <h1 style={{ margin: '0' }}>Yggdrasil</h1>
            <p style={{ margin: '5px 0 0 0' }}>Family History & Genealogy</p>
          </div>
        </header>
        <div className="container">
          <nav>
            <Link to="/people">People</Link>
            <Link to="/families">Families</Link>
            <Link to="/media-list">Media</Link>
            <Link to="/places">Places</Link>
            <Link to="/map">Map</Link>
            <Link to="/chat">Chat</Link>
            <Link to="/birth">Birth</Link>
            <Link to="/death">Death</Link>
            <Link to="/burial">Burial</Link>
            <Link to="/marriage">Marriage</Link>
            <Link to="/upload">Tools</Link>
          </nav>
          <main>
            <Routes>
              <Route path="/" element={<People />} />
              <Route path="/people" element={<People />} />
              <Route path="/people/new" element={<PersonForm />} />
              <Route path="/person/:personId" element={<PersonProfile />} />
              <Route path="/person/:personId/edit" element={<PersonForm />} />
              <Route path="/families" element={<Families />} />
              <Route path="/family/:familyId" element={<FamilyDetail />} />
              <Route path="/places" element={<Places />} />
              <Route path="/place/:placeName" element={<PlaceDetail />} />
              <Route path="/map" element={<Map />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/media-list" element={<MediaList />} />
              <Route path="/media/:mediaId" element={<MediaDetail />} />
              <Route path="/birth" element={<Birth />} />
              <Route path="/birth/:eventId" element={<EventDetail eventType="birth" />} />
              <Route path="/death" element={<Death />} />
              <Route path="/death/:eventId" element={<EventDetail eventType="death" />} />
              <Route path="/burial" element={<Burial />} />
              <Route path="/burial/:eventId" element={<EventDetail eventType="burial" />} />
              <Route path="/marriage" element={<Marriage />} />
              <Route path="/marriage/:eventId" element={<EventDetail eventType="marriage" />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/media-upload" element={<MediaUpload />} />
              <Route path="/bulk-upload" element={<BulkMediaUpload />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;