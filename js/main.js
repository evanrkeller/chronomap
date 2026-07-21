import { xToLon, yToLat, lonToX, latToY, mapOrder } from './geo.js';
import { subsolarPoint, sinAltitude } from './solar.js';
import { sublunarPoint, moonPhase } from './moon.js';
import { nightAlpha, dayPart, civilTwilightCircle } from './terminator.js';
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

// Loaded in start() before the first render.
const moonImages = { full: null, new: null };

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

// Medium grey-blue: visible over the night imagery, not distracting.
const TWILIGHT_LINE_STYLE = 'rgba(125, 143, 174, 0.55)';

function drawTwilightLine(subsolar) {
  const width = mapCanvas.width;
  const height = mapCanvas.height;
  const points = civilTwilightCircle(subsolar);

  mapContext.beginPath();
  let previousX = null;
  for (const point of points) {
    const x = lonToX(point.longitude, width);
    const y = latToY(point.latitude, height);
    if (previousX === null || Math.abs(x - previousX) > width / 2) {
      mapContext.moveTo(x, y); // new segment at the map-edge wrap
    } else {
      mapContext.lineTo(x, y);
    }
    previousX = x;
  }
  mapContext.strokeStyle = TWILIGHT_LINE_STYLE;
  mapContext.lineWidth = 2.5;
  mapContext.stroke();
}

const SUN_CORE_RADIUS = 11;
const SUN_GLOW_RADIUS = 34;
const MOON_RADIUS = 12;

// Sun icon at the subsolar point: a soft glow with a bright core.
function drawSunIcon(x, y) {
  const glow = mapContext.createRadialGradient(x, y, 0, x, y, SUN_GLOW_RADIUS);
  glow.addColorStop(0, 'rgba(255, 236, 160, 0.9)');
  glow.addColorStop(0.4, 'rgba(255, 215, 94, 0.35)');
  glow.addColorStop(1, 'rgba(255, 215, 94, 0)');
  mapContext.fillStyle = glow;
  mapContext.beginPath();
  mapContext.arc(x, y, SUN_GLOW_RADIUS, 0, Math.PI * 2);
  mapContext.fill();

  mapContext.beginPath();
  mapContext.arc(x, y, SUN_CORE_RADIUS, 0, Math.PI * 2);
  mapContext.fillStyle = '#fff3c4';
  mapContext.fill();
  mapContext.lineWidth = 2;
  mapContext.strokeStyle = 'rgba(214, 158, 32, 0.9)';
  mapContext.stroke();
}

// The lit region of the moon's disc: a semicircle on the lit side plus
// the elliptical terminator. Traced in place so the photo underneath is
// never mirrored — only the mask flips between waxing (lit right) and
// waning (lit left).
function tracePhasePath(x, y, radius, phase) {
  const litRight = phase.waxing;
  const terminatorRadius = radius * (2 * phase.illuminatedFraction - 1);
  mapContext.beginPath();
  mapContext.arc(x, y, radius, -Math.PI / 2, Math.PI / 2, !litRight);
  mapContext.ellipse(
    x, y, Math.abs(terminatorRadius), radius, 0,
    Math.PI / 2, -Math.PI / 2,
    litRight ? terminatorRadius > 0 : terminatorRadius < 0,
  );
  mapContext.closePath();
}

// Moon icon at the sublunar point: a darkened new-moon photo as the
// base with the full-moon photo revealed across the lit region — the
// same composite the earth itself gets.
function drawMoonIcon(x, y, phase, moonFullImage, moonNewImage) {
  const radius = MOON_RADIUS;
  const size = radius * 2;

  mapContext.drawImage(moonNewImage, x - radius, y - radius, size, size);

  mapContext.save();
  tracePhasePath(x, y, radius, phase);
  mapContext.clip();
  mapContext.drawImage(moonFullImage, x - radius, y - radius, size, size);
  mapContext.restore();

  mapContext.beginPath();
  mapContext.arc(x, y, radius, 0, Math.PI * 2);
  mapContext.lineWidth = 1.5;
  mapContext.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  mapContext.stroke();
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
  drawTwilightLine(subsolar);

  drawSunIcon(
    lonToX(subsolar.longitude, mapCanvas.width),
    latToY(subsolar.latitude, mapCanvas.height),
  );
  const moon = sublunarPoint(now);
  drawMoonIcon(
    lonToX(moon.longitude, mapCanvas.width),
    latToY(moon.latitude, mapCanvas.height),
    moonPhase(now),
    moonImages.full,
    moonImages.new,
  );
}

function scheduleUpdates(dayImage, nightImage) {
  render(dayImage, nightImage);
  // Recompute from the wall clock each tick so long sessions never drift.
  const delay = UPDATE_INTERVAL_MS - (Date.now() % UPDATE_INTERVAL_MS);
  setTimeout(() => scheduleUpdates(dayImage, nightImage), delay);
}

const DAY_PART_GLYPHS = { day: '☀', twilight: '◐', night: '☽' };

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
    const daypart = document.createElement('span');
    daypart.className = 'city-daypart';
    const weekdayText = document.createElement('span');
    weekday.append(daypart, weekdayText);

    tile.append(name, time, weekday);
    scoreboard.append(tile);
    return { city, tile, time, daypart, weekdayText };
  });

  function updateClocks() {
    const now = new Date();
    const homeDate = localDateKey(now, home.tz);
    const subsolar = subsolarPoint(now);
    for (const { city, tile, time, daypart, weekdayText } of tiles) {
      const formatted = formatCityTime(now, city.tz);
      time.textContent = formatted.time;
      weekdayText.textContent = formatted.weekday;
      tile.classList.toggle('other-day', localDateKey(now, city.tz) !== homeDate);

      if (typeof city.lat === 'number' && typeof city.lon === 'number') {
        const part = dayPart(sinAltitude(city.lat, city.lon, subsolar));
        daypart.textContent = DAY_PART_GLYPHS[part];
        daypart.className = `city-daypart daypart-${part}`;
        daypart.title = part;
      }
    }
    // Re-align to just past the next minute boundary.
    setTimeout(updateClocks, 60000 - (Date.now() % 60000) + 250);
  }

  updateClocks();
}

async function start() {
  const [dayImage, nightImage, moonFullImage, moonNewImage, citiesResponse] = await Promise.all([
    loadImage('assets/earth-day.jpg'),
    loadImage('assets/earth-night.jpg'),
    loadImage('assets/moon-full.png'),
    loadImage('assets/moon-new.png'),
    fetch('config/cities.json'),
  ]);
  const cities = await citiesResponse.json();
  moonImages.full = moonFullImage;
  moonImages.new = moonNewImage;

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
