const fs = require('fs');
const path = require('path');

// SVG content for favicon
const faviconSvg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1D4ED8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="16" cy="16" r="15" fill="url(#bgGradient)" stroke="#1E40AF" stroke-width="1"/>
  <g transform="translate(16, 19)">
    <path d="M-5 -3 L-5 3 L5 3 L5 2 L-4 2 L-4 0.5 L4 0.5 L4 -0.5 L-4 -0.5 L-4 -2 L5 -2 L5 -3 Z" fill="#FFFFFF"/>
    <path d="M6 -3 L6 3 L11 3 L13 2 L13 0 L11 -1 L6 -1 Z M7 -2 L10 -2 L12 -1 L12 1 L10 2 L7 2 Z" fill="#FFFFFF"/>
  </g>
</svg>`;

// SVG content for logo
const logoSvg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1D4ED8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#bgGradient)" stroke="#1E40AF" stroke-width="2"/>
  <g transform="translate(32, 38)">
    <path d="M-10 -6 L-10 6 L10 6 L10 4 L-8 4 L-8 1 L8 1 L8 -1 L-8 -1 L-8 -4 L10 -4 L10 -6 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="0.5"/>
    <path d="M12 -6 L12 6 L22 6 L26 4 L26 0 L22 -2 L12 -2 Z M14 -4 L20 -4 L24 -2 L24 2 L20 4 L14 4 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="0.5"/>
  </g>
  <circle cx="18" cy="18" r="2" fill="#FFFFFF" opacity="0.2"/>
  <circle cx="46" cy="14" r="1.5" fill="#FFFFFF" opacity="0.3"/>
</svg>`;

// Make sure the public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write SVG files
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);
fs.writeFileSync(path.join(publicDir, 'logo.svg'), logoSvg);

console.log('✅ EnvPilot SVG logo and favicon created successfully!');
console.log('📁 File created:');
console.log('  - public/favicon.svg (32x32)');
console.log('  - public/logo.svg (64x64)');
console.log('');
console.log('🎨 Design:');
console.log('  - Background: Blue gradient (#3B82F6 → #1D4ED8)');
console.log('  - Text: “EP” in white');
console.log('  - Style: Modern and minimalist');
console.log('');
console.log('💡 Notes: SVG favicon is already configured in index.html and manifest.json');