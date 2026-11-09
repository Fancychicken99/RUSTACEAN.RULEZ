// Offline, review-before-insert dictation for selected free-text profile fields.
(() => {
  let target = null, active = false, recording = false, generation = 0;
  let stream, context, source, processor, gain, chunks = [], samples = 0, timer;
  const panel = document.createElement('section'); panel.className = 'card border p-3 my-3 dictation-panel'; panel.hidden = true;
  const heading = document.createElement('h3'); heading.className = 'h6';
  const status = document.createElement('p'); status.className = 'small text-secondary'; status.setAttribute('role', 'status');
  const previewLabel = document.createElement('label'); previewLabel.className = 'form-label'; previewLabel.htmlFor = 'dictation-preview'; previewLabel.textContent = 'Review and correct transcript';
  const preview = document.createElement('textarea'); preview.id = 'dictation-preview'; preview.className = 'form-control mb-3'; preview.rows = 4; preview.maxLength = 10000;
  const actions = document.createElement('div'); actions.className = 'd-flex gap-2 flex-wrap';
  const button = (text, handler) => { const node = document.createElement('button'); node.type = 'button'; node.className = 'btn btn-sm btn-outline-primary'; node.textContent = text; node.addEventListener('click', handler); actions.appendChild(node); return node; };
  const stop = button('Stop recording', () => finish());
  const insert = button('Insert reviewed text', () => {
    if (!target?.isConnected || !window.crmSession?.authenticated) return cancel();
    const text = preview.value.trim(); if (!text) { status.textContent = 'There is no text to insert.'; return; }
    const editable = target.isContentEditable;
    const existing = editable ? target.innerText : target.value;
    const append = editable || target.tagName === 'TEXTAREA';
    const value = append && existing.trim() ? existing + '\n' + text : text;
    if (target.maxLength > 0 && value.length > target.maxLength) { status.textContent = `Shorten the transcript; this field allows ${target.maxLength} characters.`; return; }
    if (editable) target.textContent = value; else target.value = value;
    target.dispatchEvent(new Event('input', { bubbles: true })); target.dispatchEvent(new Event('change', { bubbles: true }));
    const field = target; cancel(); field.focus();
  });
  button('Discard / cancel', cancel);
  panel.append(heading, status, previewLabel, preview, actions);
  async function releaseAudio() {
    clearInterval(timer);
    const oldContext = context, oldProcessor = processor, oldSource = source, oldGain = gain, oldStream = stream;
    processor = source = gain = stream = context = null;
    if (oldProcessor) { oldProcessor.onaudioprocess = null; oldProcessor.disconnect(); }
    oldSource?.disconnect(); oldGain?.disconnect(); oldStream?.getTracks().forEach(track => track.stop());
    if (oldContext && oldContext.state !== 'closed') await oldContext.close();
  }
  function cancel() {
    ++generation; active = recording = false;
    releaseAudio().catch(() => {}); chunks = []; samples = 0;
    preview.value = ''; panel.hidden = true; target = null;
    window.crmApi.cancelDictation().catch(() => {});
  }
  async function start(field, label) {
    if (!window.crmSession?.authenticated) return;
    cancel(); const token = generation;
    target = field; active = true; panel.hidden = false;
    if (field.closest('label')) field.closest('label').after(panel); else field.parentElement.appendChild(panel);
    heading.textContent = `Speech to text · ${label}`; status.textContent = 'Allow microphone access. Audio is processed locally.';
    preview.hidden = previewLabel.hidden = true; insert.disabled = true; stop.disabled = true;
    chunks = []; samples = 0;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is unavailable in this environment.');
      context = new AudioContext();
      const captured = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true }, video: false });
      if (token !== generation) { captured.getTracks().forEach(track => track.stop()); return; }
      stream = captured; await context.resume();
      source = context.createMediaStreamSource(stream); processor = context.createScriptProcessor(4096, 1, 1); gain = context.createGain(); gain.gain.value = 0;
      source.connect(processor); processor.connect(gain); gain.connect(context.destination);
      const rate = context.sampleRate; recording = true; stop.disabled = false;
      processor.onaudioprocess = event => {
        if (!recording || token !== generation) return;
        const available = Math.max(0, rate * 120 - samples);
        const data = event.inputBuffer.getChannelData(0).slice(0, available);
        chunks.push(data); samples += data.length;
        if (samples >= rate * 120) finish();
      };
      timer = setInterval(() => { status.textContent = `Recording locally · ${Math.floor(samples / rate)} / 120 seconds. Stop when finished.`; }, 500);
      status.textContent = 'Recording locally. Stop when finished.';
    } catch (error) { if (token === generation) { await releaseAudio(); status.textContent = error.message; active = false; stop.disabled = true; } }
  }
  function wave(rate) {
    const audio = new Float32Array(samples); let offset = 0; for (const chunk of chunks) { audio.set(chunk, offset); offset += chunk.length; }
    const length = Math.floor(samples * 16000 / rate); const bytes = new Uint8Array(44 + length * 2); const view = new DataView(bytes.buffer);
    const text = (at, value) => { for (let i = 0; i < value.length; i++) bytes[at + i] = value.charCodeAt(i); };
    text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVEfmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, length * 2, true);
    for (let i = 0; i < length; i++) {
      const position = i * rate / 16000, base = Math.floor(position), mix = position - base;
      const value = Math.max(-1, Math.min(1, (audio[base] || 0) * (1 - mix) + (audio[base + 1] || 0) * mix));
      view.setInt16(44 + i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
    }
    return Array.from(bytes);
  }
  async function finish() {
    if (!recording) return;
    recording = false; stop.disabled = true;
    const token = generation, rate = context.sampleRate;
    const audio = wave(rate); await releaseAudio(); chunks = []; samples = 0;
    if (token !== generation) return;
    status.textContent = 'Transcribing offline… You can cancel at any time.';
    try {
      const text = await window.crmApi.transcribeAudio(audio);
      if (token !== generation || !window.crmSession.authenticated) return;
      preview.value = text; preview.hidden = previewLabel.hidden = false; insert.disabled = !text.trim();
      status.textContent = text.trim() ? 'Review the transcript. Insert applies it to the draft; it does not save the record.' : 'No speech was recognized. Discard and try again, or type your text.';
      preview.focus();
    } catch (error) { if (token === generation) { status.textContent = error.message; active = false; } }
  }
  function decorate(root = document) {
    const candidates = root.querySelectorAll?.('#add-contractor-form input[type="text"], #organization-form input[type="text"], #organization-notes, [data-custom-field-value], #contact-note-editor') || [];
    for (const field of candidates) {
      if (field.dataset.dictationReady || field.matches('select, [readonly]') || /country|region|tags|skills/i.test(field.id)) continue;
      field.dataset.dictationReady = 'true';
      const label = (field.labels?.[0]?.textContent || field.getAttribute('aria-label') || field.closest('label')?.textContent || 'Text field').trim();
      const control = document.createElement('button'); control.type = 'button'; control.className = 'btn btn-sm speech-to-text-button mt-2'; control.setAttribute('aria-label', `Start speech-to-text for ${label}`); control.title = `Speech to text for ${label}`;
      const icon = document.createElement('i'); icon.className = 'bi bi-mic-fill'; icon.setAttribute('aria-hidden', 'true'); control.appendChild(icon);
      control.addEventListener('click', () => { if (!field.disabled) start(field, label); });
      if (field.closest('label')) field.closest('label').after(control); else field.after(control);
    }
  }
  document.addEventListener('submit', event => {
    if (active && target?.closest('form') === event.target) { event.preventDefault(); event.stopImmediatePropagation(); status.textContent = 'Insert or discard the dictation before saving this record.'; }
  }, true);
  decorate(); new MutationObserver(() => decorate()).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('crm:locked', cancel);
  document.addEventListener('hidden.bs.modal', event => { if (target && event.target.contains(target)) cancel(); });
})();
