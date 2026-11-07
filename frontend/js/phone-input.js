// Offline international as-you-type formatting. Country comes from +calling-code.
(() => {
  const { AsYouType, getCountries, getCountryCallingCode } = window.libphonenumber;
  const significant = value => value.replace(/[^+0-9]/g, '');
  const inputs = [...document.querySelectorAll('input[type="tel"]')];
  let before = new WeakMap();
  let composing = new WeakSet();
  const countryNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
  const normalize = value => value.trim().toLocaleLowerCase('en').normalize('NFKD').replace(/\p{Diacritic}/gu, '');
  const countries = new Map();
  const suggestions = document.createElement('datalist');
  suggestions.id = 'phone-country-suggestions';
  getCountries().forEach(code => {
    const name = countryNames?.of(code) || code;
    countries.set(normalize(code), code);
    countries.set(normalize(name), code);
    const option = new Option(name, name);
    option.label = `${name} (+${getCountryCallingCode(code)})`;
    suggestions.appendChild(option);
  });
  [['usa', 'US'], ['united states of america', 'US'], ['uk', 'GB'], ['great britain', 'GB']].forEach(([name, code]) => countries.set(name, code));
  document.body.appendChild(suggestions);
  function countryInput(input) { return document.getElementById(input.id.startsWith('contractor-') ? 'contractor-country' : 'organization-country'); }
  function countryFor(input) { return countries.get(normalize(countryInput(input)?.value || '')); }

  function positionAfter(value, count) {
    if (count === 0) return 0;
    for (let i = 0, seen = 0; i < value.length; i++) {
      if (/[+0-9]/.test(value[i]) && ++seen === count) return i + 1;
    }
    return value.length;
  }

  function format(input, event) {
    const previous = before.get(input);
    before.delete(input);
    if (event.isComposing || composing.has(input)) return;
    let value = input.value;
    // A recognized country enables national formatting; + input always supplies
    // its own calling code. Invalid text remains visible for validation.
    const country = countryFor(input);
    const international = value.startsWith('+');
    if (!/^\+?[0-9 ()-]*$/.test(value) || (!international && !country) || !value) return;
    let start = input.selectionStart ?? value.length;
    let end = input.selectionEnd ?? start;
    const backwards = event.inputType === 'deleteContentBackward';
    const forwards = event.inputType === 'deleteContentForward';
    // Backspace/Delete over a formatting separator removes the adjacent digit,
    // rather than immediately putting the separator back and trapping the caret.
    if (previous && previous.start === previous.end && (backwards || forwards)
      && significant(previous.value) === significant(value) && previous.value.length > value.length) {
      let index = backwards ? start - 1 : start;
      while (index >= 0 && index < value.length && !/[0-9]/.test(value[index])) index += backwards ? -1 : 1;
      if (index >= 0 && index < value.length) {
        value = value.slice(0, index) + value.slice(index + 1);
        if (index < start) start--;
        end = start;
      }
    }
    const formatter = new AsYouType(international ? undefined : country);
    let formatted = formatter.input(value);
    const number = !international && formatter.getNumber();
    // Wait until a national number is complete enough for metadata-backed
    // normalization, including national trunk prefixes (e.g. GB's leading 0).
    if (number && number.isPossible()) {
      formatted = new AsYouType().input(number.number);
      input.value = formatted;
      input.setSelectionRange(formatted.length, formatted.length);
      return;
    }
    // Formatting must never change/drop digits, calling code or the + sign.
    if (significant(formatted) !== significant(value)) return;
    const nextStart = start === value.length ? formatted.length : positionAfter(formatted, significant(value.slice(0, start)).length);
    const nextEnd = end === value.length ? formatted.length : positionAfter(formatted, significant(value.slice(0, end)).length);
    input.value = formatted;
    input.setSelectionRange(nextStart, nextEnd);
  }

  inputs.forEach(input => {
    const help = document.createElement('div');
    help.id = `${input.id}-format-help`;
    help.className = 'form-text';
    function updateCountryHint() {
      const country = countryFor(input);
      help.textContent = country
        ? `${countryNames?.of(country) || country}: +${getCountryCallingCode(country)}. Complete local numbers receive this code; + numbers keep their own.`
        : 'Start with + and the country code, or choose a country for local number formatting.';
      if (country) input.placeholder = `+${getCountryCallingCode(country)} …`;
      else input.placeholder = '+44 20 7946 0958';
    }
    const location = countryInput(input);
    if (location) {
      location.setAttribute('list', suggestions.id);
      location.addEventListener('input', updateCountryHint);
      location.addEventListener('change', updateCountryHint);
    }
    input.addEventListener('focus', updateCountryHint);
    updateCountryHint();
    input.after(help);
    input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), help.id].filter(Boolean).join(' '));
    if (!input.placeholder) input.placeholder = '+44 20 7946 0958';
    input.addEventListener('beforeinput', () => before.set(input, {
      value: input.value, start: input.selectionStart, end: input.selectionEnd,
    }));
    input.addEventListener('input', event => format(input, event));
    input.addEventListener('compositionstart', () => composing.add(input));
    input.addEventListener('compositionend', event => { composing.delete(input); format(input, event); });
  });
  function resetState() { before = new WeakMap(); composing = new WeakSet(); }
  document.querySelectorAll('form').forEach(form => form.addEventListener('reset', resetState));
  window.addEventListener('crm:locked', resetState);
})();
