// Gear button + settings dialog. All persistence goes through
// js/settings.js; this module only moves values between the form and
// storage and tells main.js when something changed.
import {
  validateLocation, loadSettings, saveSettings, mapMode, MAX_ADDITIONAL_LOCATIONS,
} from './settings.js';
import { lookupPlace } from './geocode.js';

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

// Hand-edited storage can hold anything; blank whatever isn't a clean
// string or finite number so garbage never shows as "NaN" or gets
// accidentally re-saved.
function fillLocation(form, prefix, location) {
  const text = (value) => (typeof value === 'string' ? value : '');
  const number = (value) => (
    typeof value === 'number' && Number.isFinite(value) ? value : ''
  );
  form.elements[`${prefix}-label`].value = text(location?.label);
  form.elements[`${prefix}-lat`].value = number(location?.lat);
  form.elements[`${prefix}-lon`].value = number(location?.lon);
  form.elements[`${prefix}-tz`].value = text(location?.tz);
}

function fillForm(form, settings) {
  fillLocation(form, 'home', settings?.home);
  for (let row = 0; row < MAX_ADDITIONAL_LOCATIONS; row += 1) {
    fillLocation(form, `loc-${row}`, settings?.locations?.[row]);
  }
  form.elements['map-mode'].value = mapMode(settings);
}

// Bumped whenever the results areas are wiped (dialog open/close), so
// a lookup that resolves after the user abandoned it can't inject
// stale candidates into a freshly reset form.
let lookupEpoch = 0;

// A Find button searches the row's Label text and offers the matches;
// picking one fills the row. Requests happen only here, on demand —
// the display itself never talks to the geocoder.
function initLookup(form) {
  for (const find of form.querySelectorAll('.location-find')) {
    const prefix = find.dataset.prefix;
    const results = form.querySelector(`.lookup-results[data-prefix="${prefix}"]`);

    find.addEventListener('click', async () => {
      const query = form.elements[`${prefix}-label`].value.trim();
      if (query === '') {
        results.textContent = 'Type a place name in Label first.';
        form.elements[`${prefix}-label`].focus();
        return;
      }
      const epoch = lookupEpoch;
      find.disabled = true;
      results.textContent = 'Searching…';
      try {
        const candidates = await lookupPlace(query);
        if (epoch !== lookupEpoch) return;
        results.replaceChildren();
        if (candidates.length === 0) {
          results.textContent = 'No places found.';
          return;
        }
        for (const candidate of candidates) {
          const pick = document.createElement('button');
          pick.type = 'button';
          pick.className = 'lookup-candidate';
          pick.textContent = candidate.description
            ? `${candidate.label} — ${candidate.description}`
            : candidate.label;
          pick.addEventListener('click', () => {
            fillLocation(form, prefix, candidate);
            results.replaceChildren();
            // The picked button just vanished — hand focus back to the
            // row's Find button so keyboard flow stays in place.
            find.focus();
          });
          results.append(pick);
        }
      } catch {
        if (epoch !== lookupEpoch) return;
        results.textContent = 'Lookup failed — try again, or enter coordinates manually.';
      } finally {
        find.disabled = false;
      }
    });
  }
}

function clearLookupResults(form) {
  lookupEpoch += 1;
  for (const results of form.querySelectorAll('.lookup-results')) {
    results.replaceChildren();
  }
}

export function initSettingsUi({ storage, onChange }) {
  const button = document.getElementById('settings-button');
  const dialog = document.getElementById('settings-dialog');
  const form = document.getElementById('settings-form');
  const error = document.getElementById('settings-error');

  populateTimeZoneOptions(document.getElementById('tz-options'));

  button.addEventListener('click', () => {
    fillForm(form, loadSettings(storage));
    clearLookupResults(form);
    error.hidden = true;
    dialog.showModal();
  });

  // Esc (native cancel) also abandons any in-flight lookups.
  dialog.addEventListener('close', () => clearLookupResults(form));

  initLookup(form);

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
