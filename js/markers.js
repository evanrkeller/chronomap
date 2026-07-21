import { lonToX, latToY } from './geo.js';

const DOT_RADIUS = 7;
const LABEL_FONT = '600 26px system-ui, sans-serif';
const LABEL_GAP = 14;

// Draws city dots and labels once onto the overlay canvas. Labels sit to
// the right of the dot unless that would run off the map edge.
export function drawMarkers(context, cities, mapWidth, mapHeight) {
  context.clearRect(0, 0, mapWidth, mapHeight);
  context.font = LABEL_FONT;
  context.textBaseline = 'middle';

  for (const city of cities) {
    const x = lonToX(city.lon, mapWidth);
    const y = latToY(city.lat, mapHeight);

    context.beginPath();
    context.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
    context.fillStyle = '#ffb347';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    context.stroke();

    const labelWidth = context.measureText(city.name).width;
    const fitsRight = x + LABEL_GAP + labelWidth < mapWidth - 8;
    const labelX = fitsRight ? x + LABEL_GAP : x - LABEL_GAP - labelWidth;

    // Readable over both bright daylight and dark ocean.
    context.lineWidth = 5;
    context.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    context.strokeText(city.name, labelX, y);
    context.fillStyle = '#ffffff';
    context.fillText(city.name, labelX, y);
  }
}
