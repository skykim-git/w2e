import React, { useEffect, useRef } from 'react';

const FisheyeImage = ({ svgContent }) => {
  const canvasRef = useRef(null);
  const size = 400; // Size of the canvas

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Create an image from the SVG content
    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = function() {
      // Draw the original image
      ctx.drawImage(img, 0, 0, size, size);

      // Get image data
      const imageData = ctx.getImageData(0, 0, size, size);
      const pixels = imageData.data;
      const pixelsCopy = [];

      // Copy pixels
      for (let i = 0; i < pixels.length; i += 4) {
        pixelsCopy.push([pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]]);
      }

      // Apply fisheye effect
      const result = fisheye(pixelsCopy, size, size);

      // Update image data
      for (let i = 0; i < result.length; i++) {
        const index = i * 4;
        if (result[i] !== undefined) {
          pixels[index] = result[i][0];
          pixels[index + 1] = result[i][1];
          pixels[index + 2] = result[i][2];
          pixels[index + 3] = result[i][3];
        }
      }

      // Put the modified image data back to the canvas
      ctx.putImageData(imageData, 0, 0);
    };

    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [svgContent]);

  function fisheye(srcpixels, w, h) {
    const dstpixels = srcpixels.slice();
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) / 2;
    const strength = 2; // Adjust this for more/less distortion

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < radius) {
          const percent = Math.pow(distance / radius, 0.5);
          const newX = dx * percent + centerX;
          const newY = dy * percent + centerY;
          
          const srcIndex = Math.floor(newY) * w + Math.floor(newX);
          const dstIndex = y * w + x;
          
          if (srcIndex >= 0 && srcIndex < w * h) {
            dstpixels[dstIndex] = srcpixels[srcIndex];
          }
        }
      }
    }
    return dstpixels;
  }

  return <canvas ref={canvasRef} width={size} height={size} />;
};

export default FisheyeImage;