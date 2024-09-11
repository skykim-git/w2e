import React from 'react';
import { useSpring, animated } from 'react-spring';
import { useDrag } from '@use-gesture/react';

const RestaurantDetails = ({ isOpen, setIsOpen, restaurant }) => {
  const [{ y }, api] = useSpring(() => ({ y: 0 }));

  const bind = useDrag(
    ({ movement: [, my], last, velocity: [, vy] }) => {
      if (last) {
        const shouldOpen = my < -50 || (vy < -0.5 && my < 0);
        api.start({ y: shouldOpen ? window.innerHeight - 60 : 0, immediate: false });
        setIsOpen(shouldOpen);
      } else {
        api.start({ y: Math.max(0, Math.min(window.innerHeight - 60, -my)), immediate: true });
      }
    },
    { from: () => [0, -y.get()], filterTaps: true, bounds: { top: -(window.innerHeight - 60), bottom: 0 }, rubberband: true }
  );

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= rating ? 'gold' : 'gray' }}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <animated.div
      {...bind()}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: y.to(y => `${y + 60}px`),
        background: 'white',
        boxShadow: '0px -2px 10px rgba(0,0,0,0.1)',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        zIndex: 1000,
        touchAction: 'none',
      }}
    >
      <div 
        style={{ 
          width: '50px', 
          height: '5px', 
          background: '#ccc', 
          borderRadius: '3px', 
          margin: '10px auto',
          cursor: 'grab'
        }} 
      />
      <animated.div
        style={{
          padding: '20px',
          height: y.to(y => `${y}px`),
          overflow: 'auto',
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>{restaurant?.name || 'Restaurant Name'}</h2>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          {renderStars(restaurant?.rating || 0)}
          <span style={{ marginLeft: '10px' }}>
            ({restaurant?.user_ratings_total || 0} reviews)
          </span>
        </div>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'space-around',
          marginTop: '20px'
        }}>
          {restaurant?.photoUrls?.slice(0, 4).map((photoUrl, index) => (
            <img 
              key={index} 
              src={photoUrl}
              alt={`Restaurant photo ${index + 1}`} 
              style={{
                width: 'calc(50% - 10px)',
                height: 'calc(50vw - 30px)',
                objectFit: 'cover',
                marginBottom: '20px',
                borderRadius: '10px'
              }}
            />
          ))}
        </div>
      </animated.div>
    </animated.div>
  );
};

export default RestaurantDetails;