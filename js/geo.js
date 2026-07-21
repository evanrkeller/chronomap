// Equirectangular projection with a caller-supplied center meridian.
// The committed map assets are pre-rolled so the Leeds, AL longitude
// sits at the horizontal center of the image (see
// scripts/fetch-assets.sh); imageRollOffset converts any other desired
// center into the pixel shift needed when drawing those assets.
export const ASSET_CENTER_LONGITUDE = -86.5497;

// Degrees of longitude east of the map's left edge, wrapped to [0, 360).
function lonFromLeftEdge(longitude, centerLongitude) {
  return (((longitude - centerLongitude + 180) % 360) + 360) % 360;
}

export function lonToX(longitude, mapWidth, centerLongitude) {
  return (lonFromLeftEdge(longitude, centerLongitude) / 360) * mapWidth;
}

// Sort key for laying scoreboard cards out west→east in the same order
// their markers appear on the currently-centered map.
export function mapOrder(longitude, centerLongitude) {
  return lonFromLeftEdge(longitude, centerLongitude);
}

export function latToY(latitude, mapHeight) {
  return ((90 - latitude) / 180) * mapHeight;
}

// Inverse projection, used to shade the terminator mask pixel by pixel.
// Samples the center of pixel column/row x/y.
export function xToLon(x, mapWidth, centerLongitude) {
  const longitude = centerLongitude - 180 + ((x + 0.5) / mapWidth) * 360;
  return ((longitude + 540) % 360) - 180;
}

export function yToLat(y, mapHeight) {
  return 90 - ((y + 0.5) / mapHeight) * 180;
}

// Pixels to shift the pre-rolled asset image left so centerLongitude
// lands mid-map; the caller draws a second copy one map-width to the
// right to fill the wrap. Always in [0, mapWidth).
export function imageRollOffset(centerLongitude, mapWidth) {
  const degreesEast = (((centerLongitude - ASSET_CENTER_LONGITUDE) % 360) + 360) % 360;
  return (degreesEast / 360) * mapWidth;
}
