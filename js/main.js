const mapCanvas = document.getElementById('map');
const mapContext = mapCanvas.getContext('2d');

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`failed to load ${src}`));
    image.src = src;
  });
}

async function start() {
  const dayImage = await loadImage('assets/earth-day.jpg');
  mapContext.drawImage(dayImage, 0, 0, mapCanvas.width, mapCanvas.height);
}

start();
