import React, { useState, useEffect, useCallback } from 'react';
import { useJsApiLoader, GoogleMap } from '@react-google-maps/api';
import './style.css';
// import './mag.css';
import nlp from 'compromise';
import FisheyeImage from './FisheyeImage';

function NearbyRestaurants() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_API_KEY,
    libraries: ['places']
  });

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
    if (isLoaded && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(searchNearbyRestaurants);
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
  }, [isLoaded]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };
  
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };
  
  const estimateWalkingTime = (distanceKm) => {
    const walkingSpeedKmPerHour = 5; // Average walking speed
    const timeHours = distanceKm / walkingSpeedKmPerHour;
    const timeMinutes = Math.round(timeHours * 60);
    return timeMinutes;
  };
  
  const calculateTravelTimes = useCallback((restaurants, origin) => {
    const newTravelTimes = {};
    
    restaurants.forEach((restaurant) => {
      const startLat = origin.lat;
      const startLng = origin.lng;
      const endLat = restaurant.geometry.location.lat();
      const endLng = restaurant.geometry.location.lng();
      
      const distanceKm = calculateDistance(startLat, startLng, endLat, endLng);
      const walkingTimeMinutes = estimateWalkingTime(distanceKm);
      
      newTravelTimes[restaurant.place_id] = `~${walkingTimeMinutes*1.5} min (${distanceKm.toFixed(2)} km)`;
      // Tried walking. Raw walking time *1.5 seems to be working fine.
    });
    
    setTravelTimes(newTravelTimes);
  }, []);

  const fetchMoreReviews = useCallback((nextPageToken) => {
    return new Promise((resolve, reject) => {
      const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
      const additionalRequest = { nextPageToken: nextPageToken };
      placesService.getDetails(additionalRequest, (placeDetails, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          const additionalReviews = placeDetails.reviews || [];
          const additionalReviewTexts = additionalReviews.map(review => review.text);
          resolve(additionalReviewTexts);
        } else {
          console.error('Error fetching additional reviews:', status);
          reject();
        }
      });
    });
  }, []);

  const searchNearbyRestaurants = useCallback((position) => {
    const { latitude, longitude } = position.coords;
    setCurrentLocation({ lat: latitude, lng: longitude });

    const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));

    const request = {
      location: new window.google.maps.LatLng(latitude, longitude),
      radius: 1000,
      type: 'restaurant',
      rankBy: window.google.maps.places.RankBy.PROMINENCE,
      types: ['restaurant']
    };

    placesService.nearbySearch(request, (results, status, pagination) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        const filteredRestaurants = results.filter(restaurant => {
          return restaurant.rating >= 4.0 && restaurant.user_ratings_total >= 30 &&
           !restaurant.name.toLowerCase().includes('hotel');
        });

        const promises = filteredRestaurants.map(restaurant => {
          return new Promise((resolve, reject) => {
            const detailsRequest = {
              placeId: restaurant.place_id,
              fields: ['name', 'types', 'reviews', 'price_level', 'formatted_address'],
            };
            placesService.getDetails(detailsRequest, (placeDetails, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                const topReview = placeDetails.reviews && placeDetails.reviews.length > 0 ? placeDetails.reviews[0] : 'null';
                resolve({ ...restaurant, topReview });
              } else {
                console.error('Error fetching restaurant details:', status);
                reject(status);
              }
            });
          });
        });

        const reviewPromises = filteredRestaurants.map(restaurant => {
          return new Promise((resolve, reject) => {
            const detailsRequest = {
              placeId: restaurant.place_id,
              fields: ['reviews']
            };
            placesService.getDetails(detailsRequest, (placeDetails, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                const reviews = placeDetails.reviews || [];
                const reviewTexts = reviews.map(review => review.text);
                if (placeDetails.next_page_token) {
                  fetchMoreReviews(placeDetails.next_page_token)
                    .then(additionalReviews => {
                      resolve([...reviewTexts, ...additionalReviews]);
                    })
                    .catch(error => {
                      console.error('Error fetching additional reviews:', error);
                      resolve(reviewTexts);
                    });
                } else {
                  resolve(reviewTexts);
                }
              } else {
                console.error('Error fetching reviews for restaurant:', status);
                reject();
              }
            });
          });
        });

        Promise.all([...promises, ...reviewPromises])
          .then(results => {
            const restaurantsWithReviews = results.slice(0, promises.length);
            const reviewTextsArray = results.slice(promises.length);
            setBestRestaurants(restaurantsWithReviews);
            calculateTravelTimes(restaurantsWithReviews, { lat: latitude, lng: longitude });
            setRestReady(true);

            const newMostRepeatedNouns = reviewTextsArray.map((reviewTexts) => {
              const allReviewsText = [].concat.apply([], reviewTexts);
              const giantString = allReviewsText.join(' ');
              const doc = nlp(giantString);
              const nouns = doc.nouns().out('array');

              const exclusionList = ["i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs", "a", "an", "the"];
              const customExclusionList = [ "food", "place", "staff", "won", "bad", "great", "and", "this", "that"];
              
              const individualNouns = nouns.flatMap(phrase => phrase.toLowerCase().split(/\W+/))
                                            .filter(word => word && !exclusionList.includes(word) && !customExclusionList.includes(word));
              
              const nounCounts = {};
              individualNouns.forEach(noun => {
                nounCounts[noun] = (nounCounts[noun] || 0) + 1;
              });

              let mostRepeatedNoun;
              let maxCount = 0;
              Object.entries(nounCounts).forEach(([noun, count]) => {
                if (count > maxCount) {
                  mostRepeatedNoun = noun;
                  maxCount = count;
                }
              });

              return mostRepeatedNoun || '';
            });

            setMostRepeatedNouns(newMostRepeatedNouns);
          })
          .catch(error => {
            console.error('Error fetching restaurant details:', error);
          });
      } else {
        console.error('Error fetching nearby restaurants:', status);
      }
    });
  }, [fetchMoreReviews]);

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

  if (!isLoaded) return <div>Loading...</div>;

  return showFirstPage ? renderFirstPage() : renderRestaurantPage();
}

export default NearbyRestaurants;