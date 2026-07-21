import { xToLon, yToLat, lonToX, latToY, mapOrder } from './geo.js';
import { subsolarPoint, sinAltitude } from './solar.js';
import { sublunarPoint, moonPhase } from './moon.js';
import { nightAlpha, dayPart, civilTwilightCircle } from './terminator.js';
import { drawMarkers } from './markers.js';
import { formatCityTime, localDateKey } from './clock.js';
import { scheduleDailyReload } from './kiosk.js';

const UPDATE_INTERVAL_MS = 60000;

// The committed assets are 4096x2048 — no point rendering beyond them.
const MAX_CANVAS_WIDTH = 4096;

// Draw sizes in CSS pixels, multiplied by canvasScale at draw time so
// they look identical at 1080p, 4K, and retina.
const SUN_RADIUS = 15;
const SUN_GLOW_RADIUS = 45;
const MOON_RADIUS = 15;
const MARKER_RADIUS = 8;

// Medium grey-blue: visible over the night imagery, not distracting.
const TWILIGHT_LINE_STYLE = 'rgba(125, 143, 174, 0.55)';

const mapStack = document.getElementById('map-stack');
const mapCanvas = document.getElementById('map');
const mapContext = mapCanvas.getContext('2d');
const markersCanvas = document.getElementById('markers');
const markersContext = markersCanvas.getContext('2d');

const nightCanvas = document.createElement('canvas');
const nightContext = nightCanvas.getContext('2d');

// Loaded in start() before the first render.
const images = { day: null, night: null, moonFull: null, moonNew: null };
let cities = [];

// Canvas pixels per CSS pixel for the current layout.
let canvasScale = 1;

// The night mask is computed at reduced resolution and scaled up with
// smoothing — cheap on a Pi 3, and the interpolation softens the
// terminator edge for free. Rebuilt whenever the canvas is resized.
let mask = null;

function buildMask(canvasWidth) {
  const width = Math.min(1024, Math.max(480, Math.round(canvasWidth / 8) * 2));
  const height = width / 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  const longitudes = new Float64Array(width);
  for (let x = 0; x < width; x += 1) longitudes[x] = xToLon(x, width);
  const latitudes = new Float64Array(height);
  for (let y = 0; y < height; y += 1) latitudes[y] = yToLat(y, height);

  mask = {
    canvas,
    context,
    pixels: context.createImageData(width, height),
    longitudes,
    latitudes,
    width,
    height,
  };
}

// Sizes the canvas backing stores to the on-screen size times
// devicePixelRatio (capped at the asset resolution), so a 4K TV gets a
// native-resolution render while the Pi's 1080p canvas stays small.
function layout() {
  const cssWidth = mapStack.getBoundingClientRect().width;
  if (cssWidth === 0) return false;
  const devicePixels = window.devicePixelRatio || 1;
  const width = Math.min(MAX_CANVAS_WIDTH, Math.round((cssWidth * devicePixels) / 2) * 2);
  if (width === mapCanvas.width) return false;

  for (const canvas of [mapCanvas, markersCanvas, nightCanvas]) {
    canvas.width = width;
    canvas.height = width / 2;
  }
  canvasScale = width / cssWidth;
  buildMask(width);
  return true;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`failed to load ${src}`));
    image.src = src;
  });
}

function renderMask(subsolar) {
  const data = mask.pixels.data;
  let offset = 0;
  for (let y = 0; y < mask.height; y += 1) {
    const latitude = mask.latitudes[y];
    for (let x = 0; x < mask.width; x += 1) {
      const sinAlt = sinAltitude(latitude, mask.longitudes[x], subsolar);
      data[offset + 3] = nightAlpha(sinAlt) * 255;
      offset += 4;
    }
  }
  mask.context.putImageData(mask.pixels, 0, 0);
}

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
  mapContext.lineWidth = 2.5 * canvasScale;
  mapContext.stroke();
}

// Sun icon at the subsolar point: a soft glow with a bright core.
function drawSunIcon(x, y) {
  const coreRadius = SUN_RADIUS * canvasScale;
  const glowRadius = SUN_GLOW_RADIUS * canvasScale;
  const glow = mapContext.createRadialGradient(x, y, 0, x, y, glowRadius);
  glow.addColorStop(0, 'rgba(255, 236, 160, 0.9)');
  glow.addColorStop(0.4, 'rgba(255, 215, 94, 0.35)');
  glow.addColorStop(1, 'rgba(255, 215, 94, 0)');
  mapContext.fillStyle = glow;
  mapContext.beginPath();
  mapContext.arc(x, y, glowRadius, 0, Math.PI * 2);
  mapContext.fill();

  mapContext.beginPath();
  mapContext.arc(x, y, coreRadius, 0, Math.PI * 2);
  mapContext.fillStyle = '#fff3c4';
  mapContext.fill();
  mapContext.lineWidth = 2 * canvasScale;
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
function drawMoonIcon(x, y, phase) {
  const radius = MOON_RADIUS * canvasScale;
  const size = radius * 2;

  mapContext.drawImage(images.moonNew, x - radius, y - radius, size, size);

  mapContext.save();
  tracePhasePath(x, y, radius, phase);
  mapContext.clip();
  mapContext.drawImage(images.moonFull, x - radius, y - radius, size, size);
  mapContext.restore();

  mapContext.beginPath();
  mapContext.arc(x, y, radius, 0, Math.PI * 2);
  mapContext.lineWidth = 1.5 * canvasScale;
  mapContext.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  mapContext.stroke();
}

function render() {
  const now = new Date();
  // Breadcrumb for remote debugging on the kiosk (chrome://inspect).
  console.log(`chronomap redraw ${now.toISOString()}`);
  const subsolar = subsolarPoint(now);
  renderMask(subsolar);

  // Night imagery, masked down to where the sun is below the horizon.
  nightContext.globalCompositeOperation = 'source-over';
  nightContext.drawImage(images.night, 0, 0, nightCanvas.width, nightCanvas.height);
  nightContext.globalCompositeOperation = 'destination-in';
  nightContext.imageSmoothingEnabled = true;
  nightContext.drawImage(mask.canvas, 0, 0, nightCanvas.width, nightCanvas.height);

  mapContext.drawImage(images.day, 0, 0, mapCanvas.width, mapCanvas.height);
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
  );
}

function renderMarkers() {
  drawMarkers(
    markersContext, cities, markersCanvas.width, markersCanvas.height,
    MARKER_RADIUS * canvasScale,
  );
}

function scheduleUpdates() {
  render();
  // Recompute from the wall clock each tick so long sessions never drift.
  const delay = UPDATE_INTERVAL_MS - (Date.now() % UPDATE_INTERVAL_MS);
  setTimeout(scheduleUpdates, delay);
}

const DAY_PART_GLYPHS = { day: '☀', twilight: '◐', night: '☽' };

function buildScoreboard() {
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

let resizeTimer = null;

function handleResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (layout()) {
      renderMarkers();
      render();
    }
  }, 150);
}

async function start() {
  const [day, night, moonFull, moonNew, citiesResponse] = await Promise.all([
    loadImage('assets/earth-day.jpg'),
    loadImage('assets/earth-night.jpg'),
    loadImage('assets/moon-full.png'),
    loadImage('assets/moon-new.png'),
    fetch('config/cities.json'),
  ]);
  Object.assign(images, { day, night, moonFull, moonNew });
  cities = await citiesResponse.json();

  layout();
  renderMarkers();
  scheduleUpdates();
  scheduleDailyReload();
  buildScoreboard();
  window.addEventListener('resize', handleResize);
}

start().catch((error) => {
  // A transient failure (network blip during the 3 AM reload) must never
  // strand a black screen on the TV — try again shortly.
  console.error('chronomap start failed, retrying in 60s', error);
  setTimeout(() => window.location.reload(), 60000);
});
