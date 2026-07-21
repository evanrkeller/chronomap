import { xToLon, yToLat } from './geo.js';
import { subsolarPoint, sinAltitude } from './solar.js';
import { nightAlpha } from './terminator.js';
import { drawMarkers } from './markers.js';

const UPDATE_INTERVAL_MS = 60000;

// The night mask is computed at reduced resolution and scaled up with
// smoothing — cheap on a Pi 3, and the interpolation softens the
// terminator edge for free.
const MASK_WIDTH = 512;
const MASK_HEIGHT = 256;

const mapCanvas = document.getElementById('map');
const mapContext = mapCanvas.getContext('2d');

const maskCanvas = document.createElement('canvas');
maskCanvas.width = MASK_WIDTH;
maskCanvas.height = MASK_HEIGHT;
const maskContext = maskCanvas.getContext('2d');
const maskPixels = maskContext.createImageData(MASK_WIDTH, MASK_HEIGHT);

const nightCanvas = document.createElement('canvas');
const nightContext = nightCanvas.getContext('2d');

// Longitude/latitude of every mask column/row, precomputed once.
const maskLongitudes = new Float64Array(MASK_WIDTH);
for (let x = 0; x < MASK_WIDTH; x += 1) maskLongitudes[x] = xToLon(x, MASK_WIDTH);
const maskLatitudes = new Float64Array(MASK_HEIGHT);
for (let y = 0; y < MASK_HEIGHT; y += 1) maskLatitudes[y] = yToLat(y, MASK_HEIGHT);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`failed to load ${src}`));
    image.src = src;
  });
}

function renderMask(date) {
  const subsolar = subsolarPoint(date);
  const data = maskPixels.data;
  let offset = 0;
  for (let y = 0; y < MASK_HEIGHT; y += 1) {
    const latitude = maskLatitudes[y];
    for (let x = 0; x < MASK_WIDTH; x += 1) {
      const sinAlt = sinAltitude(latitude, maskLongitudes[x], subsolar);
      data[offset + 3] = nightAlpha(sinAlt) * 255;
      offset += 4;
    }
  }
  maskContext.putImageData(maskPixels, 0, 0);
}

function render(dayImage, nightImage) {
  renderMask(new Date());

  // Night imagery, masked down to where the sun is below the horizon.
  nightContext.globalCompositeOperation = 'source-over';
  nightContext.drawImage(nightImage, 0, 0, nightCanvas.width, nightCanvas.height);
  nightContext.globalCompositeOperation = 'destination-in';
  nightContext.imageSmoothingEnabled = true;
  nightContext.drawImage(maskCanvas, 0, 0, nightCanvas.width, nightCanvas.height);

  mapContext.drawImage(dayImage, 0, 0, mapCanvas.width, mapCanvas.height);
  mapContext.drawImage(nightCanvas, 0, 0);
}

function scheduleUpdates(dayImage, nightImage) {
  render(dayImage, nightImage);
  // Recompute from the wall clock each tick so long sessions never drift.
  const delay = UPDATE_INTERVAL_MS - (Date.now() % UPDATE_INTERVAL_MS);
  setTimeout(() => scheduleUpdates(dayImage, nightImage), delay);
}

async function start() {
  const [dayImage, nightImage, citiesResponse] = await Promise.all([
    loadImage('assets/earth-day.jpg'),
    loadImage('assets/earth-night.jpg'),
    fetch('config/cities.json'),
  ]);
  const cities = await citiesResponse.json();

  nightCanvas.width = mapCanvas.width;
  nightCanvas.height = mapCanvas.height;
  scheduleUpdates(dayImage, nightImage);

  const markersCanvas = document.getElementById('markers');
  drawMarkers(markersCanvas.getContext('2d'), cities, markersCanvas.width, markersCanvas.height);
}

start();
