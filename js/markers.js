import { lonToX, latToY } from './geo.js';

// Draws an unlabeled dot for each city that has coordinates (entries
// like UTC are scoreboard-only). Outlined so it reads over both bright
// daylight and dark ocean. dotRadius arrives pre-scaled to canvas
// pixels so dots look the same size at every resolution.
export function drawMarkers(context, cities, mapWidth, mapHeight, centerLongitude, dotRadius = 8) {
  context.clearRect(0, 0, mapWidth, mapHeight);

  for (const city of cities) {
    if (typeof city.lat !== 'number' || typeof city.lon !== 'number') continue;
    const x = lonToX(city.lon, mapWidth, centerLongitude);
    const y = latToY(city.lat, mapHeight);

    context.beginPath();
    context.arc(x, y, dotRadius, 0, Math.PI * 2);
    context.fillStyle = '#ffb347';
    context.fill();
    context.lineWidth = dotRadius * 0.375;
    context.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    context.stroke();
  }
}
