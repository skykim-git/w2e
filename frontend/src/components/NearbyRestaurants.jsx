import React, { useState, useEffect, useCallback } from 'react';
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
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);

  

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/user`, {
        withCredentials: true,
        // headers: {
        //   'Content-Type': 'application/json',
        //   'Accept': 'application/json',
        //   'Access-Control-Allow-Origin': 'http://localhost:3000/'
        // }
      });
  
      const userData = response.data;
      console.log('ning');
      setUser(userData);
      console.log('userdata',userData);
      
      if (userData && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(fetchNearbyRestaurants);
      }
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
        console.error('Error headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
      }
      console.error('Error config:', error.config);
    }
  };

  const fetchNearbyRestaurants = useCallback(async (position) => {
    const { latitude, longitude } = position.coords;
    setCurrentLocation({ lat: latitude, lng: longitude });

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/nearby-restaurants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude, longitude }),
        credentials: 'include',
      });
      const data = await response.json();
      
      if (response.ok) {
        setBestRestaurants(data.restaurants);
        setTravelTimes(data.travelTimes);
        setMostRepeatedNouns(data.mostRepeatedNouns);
        setRestReady(true);
      } else {
        setUser(null);
        alert(data.error);
      }
    } catch (error) {
      console.error('Error fetching nearby restaurants:', error);
    }
  }, []);

  const moveToNextRestaurant = useCallback(() => {
    setCurrentIndex(prevIndex => prevIndex + 1);
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prevIndex => prevIndex > 0 ? prevIndex - 1 : 0);
  }, []);

  const handleButtonClick = useCallback(() => {
    setIsSpinning(prevState => !prevState);
    setTimeout(() => {
      setShowFirstPage(false);
    }, 3000);
  }, []);

  const handleLogin = () => {
    window.location.href = `${process.env.REACT_APP_BACKEND_URL}/auth/google`;
  };

  const renderFirstPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <h1 className={`${isSpinning ? 'spinning-text' : ''} custom-heading`} style={{ marginTop: '50px', fontSize: '200px' }}>W2E</h1>
        <button className="custom-body" onClick={handleButtonClick} style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ff5722', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Start</button>
      </div>
    );
  };

  const renderRestaurantPage = () => {
    const restaurant = bestRestaurants[currentIndex] || {};
    const travelTime = travelTimes[restaurant.place_id] || 'Calculating...';
    const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="50">
      <rect width="100%" height="100%" fill="white" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="orange" font-size="40">
      ${mostRepeatedNouns[currentIndex] || ''}
      </text>
    </svg>`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {bestRestaurants.length - 1 >= currentIndex ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0px', marginBottom: '0px' }}>
            <h1 className="custom-heading" style={{ marginTop: '50px', fontSize: '100px', marginBottom: '00px'}}>{restaurant.name}</h1>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0px', marginBottom: '0px' }}>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.place_id}`} 
                 target="_blank" 
                 rel="noopener noreferrer">
                <FisheyeImage svgContent={svgContent} />
              </a>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0px', marginBottom: '0px' }}>
            <h1 className="custom-heading" style={{ marginTop: '50px', fontSize: '100px' }}>Hmm...</h1>
            <p className="custom-body" style={{ height: '190px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}>Why don't you use Google Maps now?</p>
          </div>
        )}
        <h1 className="custom-heading" style={{ marginTop: '0px', fontSize: '15px', marginBottom: '20px'}}>{"Price Point: "}{restaurant.price_level !== undefined ? '$'.repeat(restaurant.price_level) : 'Not available'}</h1>
        <h1 className="custom-heading" style={{ marginTop: '0px', fontSize: '15px', marginBottom: '20px'}}>
          {"Estimated Walk: "}{travelTime}
        </h1>
        <button className="buttons" onClick={moveToNextRestaurant} style={{ marginTop: '0px', padding: '10px', backgroundColor: '#ff5722', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Next Restaurant
        </button>
        <button className="buttons" onClick={handlePrevious} disabled={currentIndex === 0} style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ff5722', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Previous
        </button>
      </div>
    );
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <h1 className="custom-heading" style={{ marginBottom: '20px' }}>Welcome to Nearby Restaurants</h1>
        <button onClick={handleLogin} style={{ padding: '10px', backgroundColor: '#4285F4', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Login with Google</button>
      </div>
    );
  }

  if (!restReady) return <div>Loading...</div>;

  return showFirstPage ? renderFirstPage() : renderRestaurantPage();
}

export default NearbyRestaurants