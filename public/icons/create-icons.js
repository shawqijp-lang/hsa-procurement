// Script to create PWA icons from HSA logo
const fs = require('fs');
const { createCanvas } = require('canvas');

// HSA GROUP logo colors
const primaryColor = '#f59e0b'; // Brand yellow
const backgroundColor = '#ffffff';
const textColor = '#1f2937';

function createIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);
  
  // Yellow circle background
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size*0.4, 0, 2 * Math.PI);
  ctx.fill();
  
  // HSA text
  ctx.fillStyle = textColor;
  ctx.font = `bold ${size*0.15}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HSA', size/2, size/2 - size*0.05);
  
  // Cleaning icon (simplified)
  ctx.strokeStyle = textColor;
  ctx.lineWidth = size*0.02;
  ctx.beginPath();
  ctx.arc(size/2, size/2 + size*0.15, size*0.08, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`public/icons/${filename}`, buffer);
  console.log(`Created ${filename} (${size}x${size})`);
}

// Create all required icon sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
sizes.forEach(size => {
  createIcon(size, `icon-${size}x${size}.png`);
});

console.log('All PWA icons created successfully!');