import { lonToX, latToY } from './geo.js';

const DOT_RADIUS = 8;

// Draws an unlabeled dot for each city that has coordinates (entries
// like UTC are scoreboard-only). Outlined so it reads over both bright
// daylight and dark ocean.
export function drawMarkers(context, cities, mapWidth, mapHeight) {
  context.clearRect(0, 0, mapWidth, mapHeight);

  for (const city of cities) {
    if (typeof city.lat !== 'number' || typeof city.lon !== 'number') continue;
    const x = lonToX(city.lon, mapWidth);
    const y = latToY(city.lat, mapHeight);

    context.beginPath();
    context.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
    context.fillStyle = '#ffb347';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    context.stroke();
  }
}
