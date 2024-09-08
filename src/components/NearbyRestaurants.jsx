import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';
import FisheyeImage from './FisheyeImage';
import axios from 'axios';

// Fix Leaflet's default icon path issues
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function NearbyRestaurants() {
  const [bestPlaces, setBestPlaces] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFirstPage, setShowFirstPage] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [restReady, setRestReady] = useState(false);
  const [mostRepeatedNouns, setMostRepeatedNouns] = useState([]);
  const [travelTimes, setTravelTimes] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRestaurantMode, setIsRestaurantMode] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const mapRef = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = { lat: latitude, lng: longitude };
          setCurrentLocation(location);
          setSelectedLocation(location);
        },
        (error) => {
          console.error("Error getting user's location:", error);
          // You might want to handle this error, perhaps by showing a message to the user
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      // You might want to handle this case, perhaps by showing a message to the user
    }
  }, []);

  function MapEvents() {
    const map = useMap();
    mapRef.current = map;
    useMapEvents({
      click(e) {
        setSelectedLocation(e.latlng);
        fetchLocationName(e.latlng.lat, e.latlng.lng);
      },
    });

    useEffect(() => {
      if (selectedLocation) {
        map.setView([selectedLocation.lat, selectedLocation.lng], map.getZoom());
      }
    }, [selectedLocation, map]);

    return null;
  }

  const fetchLocationName = async (lat, lng) => {
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (response.data && response.data.display_name) {
        // Extract just the place name from the display_name
        const placeName = response.data.display_name.split(',')[0].trim();
        setSearchResult(placeName);
      } else {
        setSearchResult('');
      }
    } catch (error) {
      console.error('Error fetching location name:', error);
      setSearchResult('');
    }
  };

  const fetchNearbyPlaces = useCallback(async (position) => {
    if (isLoading) return; // Prevent refetching if already loading

    const { lat, lng } = position;
    setCurrentLocation({ lat, lng });
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = isRestaurantMode ? 'nearby-restaurants' : 'nearby-cafes';
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/${endpoint}`,
        { latitude: lat, longitude: lng },
        { withCredentials: true }
      );
      
      const data = response.data;
      setBestPlaces(isRestaurantMode ? data.restaurants : data.cafes);
      setTravelTimes(data.travelTimes);
      setMostRepeatedNouns(data.mostRepeatedNouns);
      setRestReady(true);
    } catch (error) {
      console.error(`Error fetching nearby ${isRestaurantMode ? 'restaurants' : 'cafes'}:`, error);
      setError(`Failed to fetch nearby ${isRestaurantMode ? 'restaurants' : 'cafes'}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  }, [isRestaurantMode]);

  const moveToNextPlace = useCallback(() => {
    setCurrentIndex(prevIndex => {
      if (prevIndex === bestPlaces.length - 1) {
        alert(`You have reached the last ${isRestaurantMode ? 'restaurant' : 'cafe'}.`);
        return prevIndex;
      }
      return prevIndex + 1;
    });
  }, [bestPlaces.length, isRestaurantMode]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prevIndex => {
      if (prevIndex === 0) {
        alert(`You have reached the first ${isRestaurantMode ? 'restaurant' : 'cafe'}.`);
        return prevIndex;
      }
      return prevIndex - 1;
    });
  }, [isRestaurantMode]);

  const handleButtonClick = useCallback(() => {
    if (selectedLocation) {
      setIsSpinning(true);
      setTimeout(() => {
        setShowFirstPage(false);
        fetchNearbyPlaces(selectedLocation);
      }, 1000);
    } else {
      alert("Please select a location on the map first.");
    }
  }, [selectedLocation, fetchNearbyPlaces]);

  const handleToggle = useCallback(() => {
    setIsRestaurantMode(prev => !prev);
    if (!showFirstPage) {
      setCurrentIndex(0);
      setRestReady(false);
      setBestPlaces([]);
      if (selectedLocation) {
        fetchNearbyPlaces(selectedLocation);
      }
    }
  }, [showFirstPage, fetchNearbyPlaces, selectedLocation]);

  const handleMapToggle = () => {
    setShowMap(prev => !prev);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      if (response.data && response.data.length > 0) {
        const { lat, lon, display_name } = response.data[0];
        const newLocation = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setSelectedLocation(newLocation);
        
        // Extract just the place name from the display_name
        const placeName = display_name.split(',')[0].trim();
        setSearchResult(placeName);
        
        if (mapRef.current) {
          mapRef.current.setView([newLocation.lat, newLocation.lng], 13);
        }
      } else {
        setSearchResult('Location not found');
      }
    } catch (error) {
      console.error('Error searching for location:', error);
      setSearchResult('Error searching location');
    }
  };

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: moveToNextPlace,
    onSwipedRight: handlePrevious,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  const renderDots = (priceLevel = 0, estimatedWalkTime = 0, isLowerComponent = true) => {
    const greenDots = Math.min(3, Math.max(0, priceLevel));  // Cap at 3, ensure non-negative
    const redDots = Math.min(3, estimatedWalkTime);  // Cap at 3, safely parsed
  
    if (isLowerComponent) {
      // Lower component behavior remains the same
      return (
        <div className="dots-container">
          {[3, 2, 1].map((level) => (
            <div className="dots-row" key={`row-${level}`}>
              <div className={`dot ${greenDots >= level ? 'green-dot' : 'invisible-dot'}`}></div>
              <div className="dot grey-dot"></div>
              <div className={`dot ${redDots >= level ? 'red-dot' : 'invisible-dot'}`}></div>
            </div>
          ))}
          {[...Array(3)].map((_, index) => (
            <div className="dots-row" key={`row-empty-${index}`}>
              <div className="dot"></div>
              <div className="dot grey-dot"></div>
              <div className="dot"></div>
            </div>
          ))}
        </div>
      );
    } else {
      // Upper component behavior
      return (
        <div className="dots-container-upper">
          <div className="dots-row">
            <div className="dot"></div>
            <div className="dot grey-dot"></div>
            <div className="dot"></div>
          </div>
          <div className="dots-row">
            <div className="dot"></div>
            <div className="dot grey-dot"></div>
            <div className="dot"></div>
          </div>
          <div className="dots-row">
            <div className="dot"></div>
            <div className="dot grey-dot"></div>
            <div className="dot"></div>
          </div>
          <div className="dots-row">
            <div className="dot grey-dot"></div>
            <div className="dot grey-dot"></div>
            <div className="dot grey-dot"></div>
          </div>
          <div className="dots-row">
            <div className="dot grey-dot"></div>
            <div className="dot grey-dot"></div>
            <div className="dot grey-dot"></div>
          </div>
          <div className="dots-row">
            <div className="dot"></div>
            <div className="dot grey-dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      );
    }
  };


  const renderToggleButton = () => {
    return (
      <div className={`toggle-container ${showMap ? 'map-visible' : ''}`}>
        <span className={`toggle-label ${isRestaurantMode ? 'active' : ''}`}>Restaurants</span>
        <label className="switch">
          <input type="checkbox" checked={!isRestaurantMode} onChange={handleToggle} />
          <span className="slider round"></span>
        </label>
        <span className={`toggle-label ${!isRestaurantMode ? 'active' : ''}`}>Cafes</span>
      </div>
    );
  };

  const renderFirstPage = () => {
    return (
      <div className={`page-container first-page ${showMap ? 'map-visible' : ''}`}>
        {!showMap && (
          <h1 className={`spinning-text custom-heading ${isSpinning ? 'spinning' : ''}`}>W2E</h1>
        )}
        {renderToggleButton()}
        {showMap && currentLocation && (
          <div className="map-container">
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a place"
                className="search-input"
              />
              <button type="submit" className="search-button">Search</button>
            </form>
            {searchResult && <div className="search-result">{searchResult}</div>}
            <MapContainer 
              center={[currentLocation.lat, currentLocation.lng]} 
              zoom={13} 
              style={{ height: '300px', width: '100%', marginTop: '10px' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapEvents />
              {selectedLocation && <Marker position={selectedLocation} />}
            </MapContainer>
          </div>
        )}
        <div className="button-container">
          <button className="map-button" onClick={handleMapToggle}>
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>
          <button className="start-button" onClick={handleButtonClick}>
            Start
          </button>
        </div>
      </div>
    );
  };

  const renderPlacePage = () => {
    if (isLoading) {
      return <div className="loading">Loading {isRestaurantMode ? 'restaurants' : 'cafes'}...</div>;
    }

    if (error) {
      return <div className="error">{error}</div>;
    }

    if (!restReady || bestPlaces.length === 0) {
      return <div className="no-results">No {isRestaurantMode ? 'restaurants' : 'cafes'} found nearby.</div>;
    }

    const place = bestPlaces[currentIndex] || {};
    const travelTime = travelTimes[place.place_id] || 'Calculating...';
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet">
      <rect width="100%" height="100%" fill="white" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="orange" font-size="25">
        ${mostRepeatedNouns[currentIndex] || ''}
      </text>
    </svg>`;

    const priceLevel = place.price_level || 0;
    const estimatedWalkTime = travelTime !== 'Calculating...' ? Math.ceil(parseInt(travelTime.match(/\d+(?=\s*min)/)) / 5) : 0;

    return (
      <div className="centered-container" {...swipeHandlers}>
        {renderToggleButton()}
        <div className="dots-wrapper">
          <div className="dots-placeholder"></div>
          {renderDots(priceLevel, estimatedWalkTime, false)}
          <div className="place-info">
            <div className="fisheye-container">
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`} 
                 target="_blank" 
                 rel="noopener noreferrer">
                <FisheyeImage svgContent={svgContent} />
              </a>
            </div>
            {renderDots(priceLevel, estimatedWalkTime, true)}
          </div>
          <div className="dots-placeholder"></div>
        </div>
      </div>
    );
  };

  return showFirstPage ? renderFirstPage() : renderPlacePage();
}

export default NearbyRestaurants;