// Gear button + settings dialog. All persistence goes through
// js/settings.js; this module only moves values between the form and
// storage and tells main.js when something changed.
import {
  validateLocation, loadSettings, saveSettings, mapMode, MAX_ADDITIONAL_LOCATIONS,
} from './settings.js';

function populateTimeZoneOptions(datalist) {
  if (typeof Intl.supportedValuesOf !== 'function') return;
  for (const zone of Intl.supportedValuesOf('timeZone')) {
    const option = document.createElement('option');
    option.value = zone;
    datalist.append(option);
  }
}

function readLocation(form, prefix) {
  const value = (name) => form.elements[`${prefix}-${name}`].value.trim();
  return {
    label: value('label'),
    lat: value('lat') === '' ? NaN : Number(value('lat')),
    lon: value('lon') === '' ? NaN : Number(value('lon')),
    tz: value('tz'),
  };
}

function isBlank(location) {
  return location.label === '' && Number.isNaN(location.lat)
    && Number.isNaN(location.lon) && location.tz === '';
}

function fillLocation(form, prefix, location) {
  form.elements[`${prefix}-label`].value = location?.label ?? '';
  form.elements[`${prefix}-lat`].value = location?.lat ?? '';
  form.elements[`${prefix}-lon`].value = location?.lon ?? '';
  form.elements[`${prefix}-tz`].value = location?.tz ?? '';
}

function fillForm(form, settings) {
  fillLocation(form, 'home', settings?.home);
  for (let row = 0; row < MAX_ADDITIONAL_LOCATIONS; row += 1) {
    fillLocation(form, `loc-${row}`, settings?.locations?.[row]);
  }
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

  for (const clear of form.querySelectorAll('.location-clear')) {
    clear.addEventListener('click', () => {
      fillLocation(form, `loc-${clear.dataset.row}`, null);
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const settings = loadSettings(storage) ?? {};
    const problems = [];

    const home = readLocation(form, 'home');
    if (isBlank(home)) {
      delete settings.home;
    } else {
      problems.push(...validateLocation(home).map((p) => `Home: ${p}`));
      settings.home = home;
    }

    const locations = [];
    for (let row = 0; row < MAX_ADDITIONAL_LOCATIONS; row += 1) {
      const location = readLocation(form, `loc-${row}`);
      if (isBlank(location)) continue;
      problems.push(...validateLocation(location).map((p) => `Location ${row + 1}: ${p}`));
      locations.push(location);
    }
    // No rows filled in means the default city set — including when a
    // previously curated list is cleared, so the defaults are always
    // recoverable from the dialog itself.
    if (locations.length > 0) {
      settings.locations = locations;
    } else {
      delete settings.locations;
    }

    if (problems.length > 0) {
      error.textContent = problems.join(' ');
      error.hidden = false;
      return;
    }

    settings.mode = form.elements['map-mode'].value;
    try {
      saveSettings(storage, settings);
    } catch {
      error.textContent = 'Settings could not be saved — browser storage is unavailable.';
      error.hidden = false;
      return;
    }
    dialog.close();
    onChange();
  });
}
