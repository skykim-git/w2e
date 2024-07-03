import React, { Component, createRef, useRef, useEffect, useState  } from 'react';
import { Map, GoogleApiWrapper } from 'google-maps-react';
import './style.css';
import './mag.css';
import nlp from 'compromise'; 
import FisheyeImage from './FisheyeImage';  // Import the new component

class NearbyRestaurants extends Component {
  state = {
    bestRestaurants: [], // Initialize list of best restaurants
    nextPageToken: null, // Initialize nextPageToken state
    showMapModal: false, // State to control visibility of the map modal
    currentLocation: null, // Store current location
    currentIndex: 0, // Index for iterating list of bes restaurnats
    showFirstPage: true, // State to control visibility of the start page
    isSpinning : false, // State to control start page text spinning
    restReady : false, //
  };
  

  // Lifecycle method called when the component is first added to the DOM
  componentDidMount() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this.searchNearbyRestaurants);
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
  }
  
  // Main function for best restaurant search
  searchNearbyRestaurants = (position) => {
    const { google } = this.props;
    const { latitude, longitude } = position.coords;

    // Create a PlacesService instance
    const placesService = new google.maps.places.PlacesService(document.createElement('div'));

    // Define search parameters
    const request = {
      location: new google.maps.LatLng(latitude, longitude),
      radius: 50000, // Search radius in meters (adjust as needed)
      type: 'restaurant',
      rankBy: google.maps.places.RankBy.PROMINENCE, // Sort by prominence
      types: ['restaurant']
    };

    // ***NOT WORKING PROPERLY // Since API can only retreive 5 reviews per restaurnant at the moment, it trys to get more.
    function fetchMoreReviews(nextPageToken) {
      return new Promise((resolve, reject) => {
        // Make request to fetch additional reviews using nextPageToken
        const additionalRequest = {
          nextPageToken: nextPageToken
        };
        placesService.getDetails(additionalRequest, (placeDetails, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            const additionalReviews = placeDetails.reviews || [];
            const additionalReviewTexts = additionalReviews.map(review => review.text);
            resolve(additionalReviewTexts);
          } else {
            console.error('Error fetching additional reviews:', status);
            reject();
          }
        });
      });
    }

    // Performs nearby search
    placesService.nearbySearch(request, (results, status, pagination) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {

        // Filter restaurants with 4+ stars and 50+ reviews
        const filteredRestaurants = results.filter(restaurant => {
          return restaurant.rating >= 4.0 && restaurant.user_ratings_total >= 30 &&
           !restaurant.name.toLowerCase().includes('hotel');
        });

        // Fetch category for each restaurant
        const promises = filteredRestaurants.map(restaurant => {
          return new Promise((resolve, reject) => {
            // Get details for each restaurant
            const detailsRequest = {
              placeId: restaurant.place_id,
              fields: ['name', 'types', 'reviews'] // Add 'reviews' field to retrieve reviews
            };
            placesService.getDetails(detailsRequest, (placeDetails, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK) {
                // const category = placeDetails.types && placeDetails.types.length > 0 ? placeDetails.types[0] : 'Uncategorized';
                const topReview = placeDetails.reviews && placeDetails.reviews.length > 0 ? placeDetails.reviews[0] : 'null'; // Get the top review
                resolve({ ...restaurant, topReview });
              } else {
                console.error('Error fetching restaurant details:', status);
                reject(status);
              }
            });
          });
        });
        
        // To find the representative menu, fetch reviews for each restaurant and extract text
        const reviewPromises = filteredRestaurants.map(restaurant => {
          return new Promise((resolve, reject) => {
            const detailsRequest = {
              placeId: restaurant.place_id,
              fields: ['reviews']
            };
            placesService.getDetails(detailsRequest, (placeDetails, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK) {
                // console.log(placeDetails.reviews); 
                const reviews = placeDetails.reviews || [];
                const reviewTexts = reviews.map(review => review.text);
                // Check if there is a next page token and fetch more reviews if available
                console.log('wtf');
                console.log(placeDetails.next_page_token,'nextpagetoken');
                if (placeDetails.next_page_token) {
                  // Make another request to fetch more reviews
                  fetchMoreReviews(placeDetails.next_page_token)
                    .then(additionalReviews => {
                      resolve([...reviewTexts, ...additionalReviews]);
                    })
                    .catch(error => {
                      console.error('Error fetching additional reviews:', error);
                      resolve(reviewTexts); // Resolve with existing reviews if fetch fails
                    });
                } else {
                  console.log('nomoreview')
                  resolve(reviewTexts); // Resolve with current reviews if no next page token
                }
                // console.log(reviews, status);
                // console.log(reviewTexts, status);
                // console.log(reviewTexts[0], status);

                resolve(reviewTexts); //not empty
              } else {
                console.error('Error fetching reviews for restaurant:', status);
                reject();
              }
            });
          });
        });

        // Resolve all promises
        // mapping problem here?
        Promise.all([...promises, ...reviewPromises])
          .then(results => {
            // Separate the restaurant and review results based on the original promise arrays
            const restaurantsWithReviews = results.slice(0, promises.length);
            const reviewTextsArray = results.slice(promises.length);
            // Update state with the filtered restaurants, category, and nextPageToken
            this.setState({ bestRestaurants: restaurantsWithReviews });
            this.setState({ restReady: true})
            const mostRepeatedNouns = [];
            // Process each set of reviews
            reviewTextsArray.forEach((reviewTexts) => {
              // Initialize variables to store most repeated noun for this set of reviews
              let mostRepeatedNoun;
              let maxCount = 0;
              // console.log(reviewTexts, 'nok_2');
              // Flatten reviewTextsArray into a single array of review texts
              const allReviewsText = [].concat.apply([], reviewTexts);
              // console.log(allReviewsText, 'allReviewsText');
              const giantString = allReviewsText.join(' '); // Use a space as a separator
              // const nlp = require('compromise');
              // console.log(giantString, 'giantString');
              // Tokenization (split text into words)
              const allWords = allReviewsText.flatMap(text => text.toLowerCase().split(/[\s\W]+/));
              // console.log(allWords, 'allWords');
              // Perform POS tagging
              const doc = nlp(giantString);
              const nouns = doc.nouns().out('array');

              // Define a list of common pronouns to filter out
              const pronounsList = ["i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs"];
              const articlesList = ["a", "an", "the"];
              const customList = ["food", "place", "staff", "won", "bad", "great"];
              const whyNotInList = ["and"]

              // Combine both lists into a single exclusion list
              const exclusionList = [...pronounsList, ...articlesList, ...customList, ...whyNotInList];
              
              // Convert the noun phrases to individual words and filter out pronouns and articles
              const individualNouns = nouns.flatMap(phrase => phrase.toLowerCase().split(/\W+/))
                                                  .filter(word => word && !exclusionList.includes(word));
              
              // console.log(individualNouns,'individualNouns');
      
              // Count occurrences of each noun
              const nounCounts = {};
              individualNouns.forEach(noun => {
                nounCounts[noun] = (nounCounts[noun] || 0) + 1;
              });

              // console.log('here');

              // Find most repeated noun in this set of reviews
              Object.entries(nounCounts).forEach(([noun, count]) => {
                if (count > maxCount) {
                  mostRepeatedNoun = noun;
                  maxCount = count;
                }
              });

              // console.log('here2');
              // Store the most repeated noun for this restaurant if found
              if (mostRepeatedNoun !== undefined) {
                mostRepeatedNouns.push(mostRepeatedNoun); // Store just the noun, not the restaurant ID
              } else {
                console.warn('No most repeated noun found for restaurant:');
              }
            });

          // Set the most repeated nouns in the state
          this.setState({ mostRepeatedNouns });
          })
          .catch(error => {
            console.error('Error fetching restaurant details:', error);
          });
      } else {
        console.error('Error fetching nearby restaurants:', status);
      }
    });
  }

  // Function to handle button click to move to the next restaurant
  moveToNextRestaurant = () => {
    this.setState(prevState => ({
      currentIndex: prevState.currentIndex + 1
    }));
  };

  // Function to handle button click to move to the previous restaurant
  handlePrevious = () => {
    this.setState(prevState => ({
      currentIndex: prevState.currentIndex > 0 ? prevState.currentIndex - 1 : 0
    }));
  }

  // Function to handel button click to spin the w2e text and show restaruant pages
  handleButtonClick = () => {
    this.setState(prevState => ({
      isSpinning: !prevState.isSpinning
    }));
    setTimeout(() => {
      this.setState({ showFirstPage: false })
    }, 3000);
  };

  // Renders the first page
  renderFirstPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <h1 className={`${this.state.isSpinning ? 'spinning-text' : ''} custom-heading`} style={{ marginTop: '50px', fontSize: '200px' }}>W2E</h1>
        <button className="custom-body" onClick={this.handleButtonClick} style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ff5722', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Start</button>
      </div>
    );
  };

  // Renders the restaurant page
  renderRestaurantPage() {

    const { bestRestaurants, currentIndex } = this.state;
    const restaurant = bestRestaurants[currentIndex] || {};

    // Create SVG content
    const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
      <rect width="100%" height="100%" fill="white" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="black" font-size="24">
        ${this.state.mostRepeatedNouns[currentIndex] || ''}
      </text>
    </svg>` ;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {bestRestaurants.length - 1 >= currentIndex ? (
          // Display restaurant details
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0px', marginBottom: '0px' }}>
            <h1 className="custom-heading" style={{ marginTop: '50px', fontSize: '100px', marginBottom: '0px'}}>{restaurant.name}</h1>
            {/* <div className="convex-glass"> */}
              {/* <svg viewBox="0 0 500 200" className="svg-container"> */}
                {/* <defs> */}
                  {/* Define a filter with feDistortion component for lens effect */}
                  {/* <filter id="convexLens"> */}
                    {/* <feGaussianBlur in="SourceGraphic" stdDeviation="5" /> */}
                    {/* <feComponentTransfer> */}
                      {/* <feFuncR type="table" tableValues="0 0.7 1" /> */}
                      {/* <feFuncG type="table" tableValues="0 0.7 1" /> */}
                      {/* <feFuncB type="table" tableValues="0 0.7 1" /> */}
                    {/* </feComponentTransfer> */}
                    {/* <feDisplacementMap in="SourceGraphic" scale="20" /> */}
                  {/* </filter> */}
                {/* </defs> */}
                {/* <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-content"> */}
                {/* {this.state.mostRepeatedNouns[currentIndex]} */}
                {/* </text> */}
              {/* </svg> */}
            {/* </div> */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0px', marginBottom: '0px' }}>
              {/* <h1 className="custom-heading" style={{ marginTop: '50px', fontSize: '100px', marginBottom: '0px'}}>{restaurant.name}</h1> */}
              {/* Replace the existing SVG with FisheyeSVG */}
              <FisheyeImage svgContent={svgContent} />
            </div>
            {/* <div style={{ textAlign: 'center', marginTop: '0px' }}> */}
              {/* Some text curving example */}
              {/* <svg className="curved-text" viewBox="0 0 425 300">
                <path id="curve" d="M6,150C49.63,93,105.79,36.65,156.2,47.55,207.89,58.74,213,131.91,264,150c40.67,14.43,108.57-6.91,229-145" />
                <text x="25">
                  <textPath href="#curve">
                    Dangerous Curves Ahead
                  </textPath>
                </text>
              </svg> */}
              {/* DISPLAYS RESTAURANT PHOTO */}
              {/* <div>
                {restaurant.photos && restaurant.photos.length > 0 && (
                  <>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${restaurant.name}&query_place_id=${restaurant.place_id}`} target="_blank" rel="noopener noreferrer">
                      <img src={restaurant.photos[0].getUrl()} alt={restaurant.name} style={{ width: '200px', height: '150px', marginBottom: '5px' }} />
                    </a>
                  </>
                )}
              </div> */}
              {/* <p className="lens-effect" style={{ marginBottom: '90px', fontSize: '100px', color:'#FF9800'  }}>{this.state.mostRepeatedNouns[currentIndex]}</p>
            </div> */}
          </div>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0px', marginBottom: '0px' }}>
              <h1 className="custom-heading" style={{ marginTop: '50px', fontSize: '100px' }}>Hmm...</h1>
              <p className="custom-body" style={{ height: '190px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}>Why don't you use Google Maps now?</p>
            </div>
          // Display a paragraph if no restaurants are available
        )}
        {/* Button to move to the next restaurant */}
        <button className="custom-body" onClick={this.moveToNextRestaurant} style={{ marginTop: '0px', padding: '10px', backgroundColor: '#ff5722', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Next Restaurant
        </button>
        <button className="custom-body" onClick={this.handlePrevious} disabled={currentIndex === 0} style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ff5722', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Previous
        </button>
      </div>
    );
  }  


  render() {
    const { showFirstPage } = this.state;
    if (showFirstPage) {
      return this.renderFirstPage();
    } else {
      // if (this.restReady) {
        return this.renderRestaurantPage();
      // }
    }
  }
}


export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_API_KEY
})(NearbyRestaurants);
