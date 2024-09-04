import React, { useState, useEffect, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable'; // Import the swipeable hook
import './style.css';
import FisheyeImage from './FisheyeImage';
import axios from 'axios';

function NearbyRestaurants() {
  const [bestRestaurants, setBestRestaurants] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFirstPage, setShowFirstPage] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [restReady, setRestReady] = useState(false);
  const [mostRepeatedNouns, setMostRepeatedNouns] = useState([]);
  const [travelTimes, setTravelTimes] = useState({});

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(fetchNearbyRestaurants);
    }
  }, []);

  const fetchNearbyRestaurants = useCallback(async (position) => {
    const { latitude, longitude } = position.coords;
    setCurrentLocation({ lat: latitude, lng: longitude });

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/nearby-restaurants`,
        { latitude, longitude },
        { withCredentials: true }
      );
      
      const data = response.data;
      setBestRestaurants(data.restaurants);
      setTravelTimes(data.travelTimes);
      setMostRepeatedNouns(data.mostRepeatedNouns);
      setRestReady(true);
    } catch (error) {
      console.error('Error fetching nearby restaurants:', error);
    }
  }, []);

  const moveToNextRestaurant = useCallback(() => {
    setCurrentIndex(prevIndex => {
      if (prevIndex === bestRestaurants.length - 1) {
        alert('You have reached the last restaurant.');
        return prevIndex;
      }
      return prevIndex + 1;
    });
  }, [bestRestaurants.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prevIndex => {
      if (prevIndex === 0) {
        alert('You have reached the first restaurant.');
        return prevIndex;
      }
      return prevIndex - 1;
    });
  }, []);

  const handleButtonClick = useCallback(() => {
    setIsSpinning(prevState => !prevState);
    setTimeout(() => {
      setShowFirstPage(false);
    }, 3000);
  }, []);

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: moveToNextRestaurant,   // Swipe left to go to next restaurant
    onSwipedRight: handlePrevious,        // Swipe right to go to previous restaurant
    preventDefaultTouchmoveEvent: true,
    trackMouse: true // Allows swiping with mouse as well
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
  
  
  
  


  const renderFirstPage = () => {
    return (
      <div className="page-container first-page">
        <h1 className={`spinning-text custom-heading ${isSpinning ? 'spinning' : ''}`}>W2E</h1>
        <button className="custom-body start-button" onClick={handleButtonClick}>Start</button>
      </div>
    );
  };

  const renderRestaurantPage = () => {
    const restaurant = bestRestaurants[currentIndex] || {};
    const travelTime = travelTimes[restaurant.place_id] || 'Calculating...';
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet">
      <rect width="100%" height="100%" fill="white" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="orange" font-size="25">
        ${mostRepeatedNouns[currentIndex] || ''}
      </text>
    </svg>`;

    const priceLevel = restaurant.price_level || 0;
    const estimatedWalkTime = travelTime !== 'Calculating...' ? Math.ceil(parseInt(travelTime.match(/\d+(?=\s*min)/)) / 5) : 0;


    return (
      <div className="centered-container" {...swipeHandlers}>
        <div className="dots-wrapper">
          <div className="dots-placeholder"></div>
          {renderDots(priceLevel, estimatedWalkTime, false)}
          <div className="restaurant-info">
            <div className="fisheye-container">
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.place_id}`} 
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

  if (!restReady) return <div className="loading">Loading...</div>;

  return showFirstPage ? renderFirstPage() : renderRestaurantPage();
}

export default NearbyRestaurants;