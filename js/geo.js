// Equirectangular projection recentered on the Leeds, AL meridian.
// The committed map assets are pre-rolled so this longitude sits at
// the horizontal center of the image (see scripts/fetch-assets.sh).
export const CENTER_LONGITUDE = -86.5497;

// Degrees of longitude east of the map's left edge, wrapped to [0, 360).
function lonFromLeftEdge(longitude) {
  return (((longitude - CENTER_LONGITUDE + 180) % 360) + 360) % 360;
}

export function lonToX(longitude, mapWidth) {
  return (lonFromLeftEdge(longitude) / 360) * mapWidth;
}

// Sort key for laying scoreboard cards out west→east in the same order
// their markers appear on the recentered map.
export function mapOrder(longitude) {
  return lonFromLeftEdge(longitude);
}

export function latToY(latitude, mapHeight) {
  return ((90 - latitude) / 180) * mapHeight;
}

// Inverse projection, used to shade the terminator mask pixel by pixel.
// Samples the center of pixel column/row x/y.
export function xToLon(x, mapWidth) {
  const longitude = CENTER_LONGITUDE - 180 + ((x + 0.5) / mapWidth) * 360;
  return ((longitude + 540) % 360) - 180;
}

export function yToLat(y, mapHeight) {
  return 90 - ((y + 0.5) / mapHeight) * 180;
}
