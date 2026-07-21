// Gear button + settings dialog. All persistence goes through
// js/settings.js; this module only moves values between the form and
// storage and tells main.js when something changed.
import { validateLocation, loadSettings, saveSettings, mapMode } from './settings.js';

function populateTimeZoneOptions(datalist) {
  if (typeof Intl.supportedValuesOf !== 'function') return;
  for (const zone of Intl.supportedValuesOf('timeZone')) {
    const option = document.createElement('option');
    option.value = zone;
    datalist.append(option);
  }
}

function readHomeFromForm(form) {
  const value = (name) => form.elements[name].value.trim();
  return {
    label: value('home-label'),
    lat: value('home-lat') === '' ? NaN : Number(value('home-lat')),
    lon: value('home-lon') === '' ? NaN : Number(value('home-lon')),
    tz: value('home-tz'),
  };
}

function fillForm(form, settings) {
  const home = settings?.home ?? {};
  form.elements['home-label'].value = home.label ?? '';
  form.elements['home-lat'].value = home.lat ?? '';
  form.elements['home-lon'].value = home.lon ?? '';
  form.elements['home-tz'].value = home.tz ?? '';
  form.elements['map-mode'].value = mapMode(settings);
}

export function initSettingsUi({ storage, onChange }) {
  const button = document.getElementById('settings-button');
  const dialog = document.getElementById('settings-dialog');
  const form = document.getElementById('settings-form');
  const error = document.getElementById('settings-error');

  populateTimeZoneOptions(document.getElementById('tz-options'));

  button.addEventListener('click', () => {
    fillForm(form, loadSettings(storage));
    error.hidden = true;
    dialog.showModal();
  });

  document.getElementById('settings-cancel').addEventListener('click', () => {
    dialog.close();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const home = readHomeFromForm(form);
    const cleared = home.label === '' && Number.isNaN(home.lat)
      && Number.isNaN(home.lon) && home.tz === '';

    const settings = loadSettings(storage) ?? {};
    if (cleared) {
      delete settings.home;
    } else {
      const problems = validateLocation(home);
      if (problems.length > 0) {
        error.textContent = problems.join(' ');
        error.hidden = false;
        return;
      }
      settings.home = home;
    }
    settings.mode = form.elements['map-mode'].value;
    saveSettings(storage, settings);
    dialog.close();
    onChange();
  });
}
