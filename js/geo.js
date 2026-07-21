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

export function latToY(latitude, mapHeight) {
  return ((90 - latitude) / 180) * mapHeight;
}
