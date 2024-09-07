import React, { useState, useEffect, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import './style.css';
import FisheyeImage from './FisheyeImage';
import axios from 'axios';

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

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(fetchNearbyPlaces);
    }
  }, [isRestaurantMode]);

  const fetchNearbyPlaces = useCallback(async (position) => {
    const { latitude, longitude } = position.coords;
    setCurrentLocation({ lat: latitude, lng: longitude });
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = isRestaurantMode ? 'nearby-restaurants' : 'nearby-cafes';
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/${endpoint}`,
        { latitude, longitude },
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
    setIsSpinning(prevState => !prevState);
    setTimeout(() => {
      setShowFirstPage(false);
    }, 0);
  }, []);

  const handleToggle = useCallback(() => {
    setIsRestaurantMode(prev => !prev);
    if (!showFirstPage) {
      setCurrentIndex(0);
      setRestReady(false);
      setBestPlaces([]);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(fetchNearbyPlaces);
      }
    }
  }, [showFirstPage, fetchNearbyPlaces]);

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
      <div className="toggle-container">
        <span className={`toggle-label ${isRestaurantMode ? 'active' : ''}`}>Restaurants</span>
        <label className="switch">
          <input type="checkbox" checked={!isRestaurantMode} onChange={handleToggle} />
          <span className="slider round">
            <span className="slider-text restaurant">🍽️</span>
            <span className="slider-text cafe">☕</span>
          </span>
        </label>
        <span className={`toggle-label ${!isRestaurantMode ? 'active' : ''}`}>Cafes</span>
      </div>
    );
  };

  const renderFirstPage = () => {
    return (
      <div className="page-container first-page">
        <h1 className={`spinning-text custom-heading ${isSpinning ? 'spinning' : ''}`}>W2E</h1>
        {renderToggleButton()}
        <button className="custom-body start-button" onClick={handleButtonClick}>
          Start
        </button>
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