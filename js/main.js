import { xToLon, yToLat, mapOrder } from './geo.js';
import { subsolarPoint, sinAltitude } from './solar.js';
import { nightAlpha } from './terminator.js';
import { drawMarkers } from './markers.js';
import { formatCityTime, localDateKey } from './clock.js';
import { scheduleDailyReload } from './kiosk.js';

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

function renderMask(subsolar) {
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
  const now = new Date();
  // Breadcrumb for remote debugging on the kiosk (chrome://inspect).
  console.log(`chronomap redraw ${now.toISOString()}`);
  const subsolar = subsolarPoint(now);
  renderMask(subsolar);

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

function buildScoreboard(cities) {
  const scoreboard = document.getElementById('scoreboard');
  const home = cities.find((city) => city.home) ?? cities[0];

  // Cards run west→east in the same order the markers appear on the
  // map; UTC (no coordinates) slots in at the Greenwich meridian.
  const ordered = [...cities].sort(
    (a, b) => mapOrder(a.lon ?? 0) - mapOrder(b.lon ?? 0),
  );

  const tiles = ordered.map((city) => {
    const tile = document.createElement('div');
    tile.className = city === home ? 'city-tile home' : 'city-tile';

    const name = document.createElement('div');
    name.className = 'city-name';
    name.textContent = city.name;

    const time = document.createElement('div');
    time.className = 'city-time';

    const weekday = document.createElement('div');
    weekday.className = 'city-weekday';

    tile.append(name, time, weekday);
    scoreboard.append(tile);
    return { city, tile, time, weekday };
  });

  function updateClocks() {
    const now = new Date();
    const homeDate = localDateKey(now, home.tz);
    for (const { city, tile, time, weekday } of tiles) {
      const formatted = formatCityTime(now, city.tz);
      time.textContent = formatted.time;
      weekday.textContent = formatted.weekday;
      tile.classList.toggle('other-day', localDateKey(now, city.tz) !== homeDate);
    }
    // Re-align to just past the next minute boundary.
    setTimeout(updateClocks, 60000 - (Date.now() % 60000) + 250);
  }

  updateClocks();
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
  scheduleDailyReload();

  const markersCanvas = document.getElementById('markers');
  drawMarkers(markersCanvas.getContext('2d'), cities, markersCanvas.width, markersCanvas.height);
  buildScoreboard(cities);
}

start().catch((error) => {
  // A transient failure (network blip during the 3 AM reload) must never
  // strand a black screen on the TV — try again shortly.
  console.error('chronomap start failed, retrying in 60s', error);
  setTimeout(() => window.location.reload(), 60000);
});
