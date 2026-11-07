// Additional final-submission checks in the real WebView, using synthetic data.
const fs = require('node:fs'); const path = require('node:path'); const assert = require('node:assert/strict');
module.exports = context => {
  const { evaluate, cdp, until, modalShown, modalClosed, fillForm, savedMessage, restartLogin, enterPhone, testDirectory } = context;
  async function accessibility(label) {
    await evaluate('document.fonts.ready.then(()=>new Promise(resolve=>setTimeout(resolve,350)))');
    if (!await evaluate('Boolean(window.axe)')) await evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));
    const result = await evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}).then(result=>({violations:result.violations,incomplete:result.incomplete,passes:result.passes.map(rule=>rule.id)}))");
    fs.writeFileSync(path.join(testDirectory, 'accessibility-' + label + '.json'), JSON.stringify(result, null, 2));
    assert.deepEqual(result.violations.map(rule => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), [], 'Accessibility violations: ' + label);
  }
  async function capture(label) { const shot = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(testDirectory, label + '.png'), Buffer.from(shot.data, 'base64')); }
  return {
    async login() {
      assert.ok(await evaluate("document.querySelector('.auth-brand-logo-mark').getBoundingClientRect().width <= 145"));
      await evaluate("window.crmTheme.setMode('dark')"); await accessibility('login-dark'); await capture('login-dark');
      await evaluate("window.crmTheme.setMode('light')"); await accessibility('login-light'); await capture('login-light');
    },
    async finish(inline) {
      await evaluate(`window.crmDirectory.showProfile(${inline.id})`);
      await evaluate("document.getElementById('edit-contractor').click()"); await modalShown('add-contractor-modal');
      assert.equal(await evaluate("document.getElementById('contractor-basic-pane').classList.contains('active')"), true);
      await accessibility('contractor-form-light');
      await evaluate("window.crmTheme.setMode('dark')"); await accessibility('contractor-form-dark');
      await evaluate("window.crmTheme.setMode('light')");
      // WebView2 supplies a fake microphone; only transcription is simulated here.
      // The separate Rust test exercises the real bundled engine/model.
      const originalFirst = await evaluate("document.getElementById('contractor-first-name').value");
      await evaluate("window.voiceObservedApi=window.crmApi;window.crmApi={...window.crmApi,transcribeAudio:async audio=>{window.voiceCapture={length:audio.length,header:String.fromCharCode(...audio.slice(0,4))};return 'Simulated transcript';}};[...document.querySelectorAll('button')].find(button=>/^Dictate First name$/i.test(button.getAttribute('aria-label')||'')).click()");
      await until(() => evaluate("document.querySelector('.dictation-panel p').textContent.includes('1 / 120 seconds')"), 'fake microphone capture');
      await evaluate("[...document.querySelectorAll('.dictation-panel button')].find(button=>button.textContent==='Stop recording').click()");
      await until(() => evaluate("!document.getElementById('dictation-preview').hidden"), 'dictation review');
      assert.equal(await evaluate("document.getElementById('contractor-first-name').value"), originalFirst, 'transcription must not insert automatically');
      assert.equal(await evaluate('window.voiceCapture.header'), 'RIFF');
      assert.ok(await evaluate('window.voiceCapture.length>32044'), 'capture must contain real audio samples');
      await evaluate("document.getElementById('dictation-preview').value='Reviewed name';[...document.querySelectorAll('.dictation-panel button')].find(button=>button.textContent==='Insert reviewed text').click()");
      assert.equal(await evaluate("document.getElementById('contractor-first-name').value"), 'Reviewed name');
      await evaluate(`document.getElementById('contractor-first-name').value=${JSON.stringify(originalFirst)};window.crmApi=window.voiceObservedApi;delete window.voiceObservedApi`);
      console.log('PASS: fake-device audio capture creates WAV; simulated transcription requires explicit review/insert and does not save automatically. Physical microphone remains a manual check.');
      await evaluate("document.getElementById('contractor-contact-tab').click()");
      await until(() => evaluate("document.getElementById('contractor-contact-pane').classList.contains('show')"), 'contact pane');
      await evaluate("document.getElementById('contractor-country').value='United Kingdom';document.getElementById('contractor-country').dispatchEvent(new Event('input',{bubbles:true}))");
      assert.equal(await enterPhone('contractor-phone', '02079460958'), '+44 20 7946 0958');
      const photoSource = await evaluate("window.crmApi.listContractors().then(records=>records.find(record=>record.email==='contractor002@example.com').id).then(id=>window.crmApi.loadRecordImage({kind:'contractor',id}))");
      const photoFile = path.join(testDirectory, 'synthetic-upload.png'); fs.writeFileSync(photoFile, Buffer.from(photoSource.split(',')[1], 'base64'));
      const doc = await cdp('DOM.getDocument'); const input = await cdp('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#contractor-headshot' });
      await cdp('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [photoFile] });
      await fillForm('add-contractor-form', { 'contractor-street1': '42 Example Lane', 'contractor-city': 'London' });
      await savedMessage('Contractor saved.'); await modalClosed('add-contractor-modal');
      await until(() => evaluate("!document.querySelector('.contractor-profile-image img').hidden"), 'saved profile image');
      await accessibility('profile-light'); await capture('profile-light');
      await evaluate("window.crmTheme.setMode('dark')"); await accessibility('profile-dark'); await capture('profile-dark');
      await evaluate("window.crmTheme.setMode('light')");
      await evaluate(`window.dispatchEvent(new CustomEvent('crm:open-record-tools',{detail:{kind:'contractor',id:${inline.id}}}))`); await modalShown('record-tools-modal');
      await evaluate("document.getElementById('record-tools-tags').value='Planning, Global';document.getElementById('record-tools-skills').value='Logistics';document.getElementById('record-tools-taxonomy').click()");
      await until(() => evaluate(`window.crmApi.workspaceSnapshot().then(data=>data.meta.find(item=>item.kind==='contractor'&&item.id===${inline.id})?.tags.includes('Planning'))`), 'classification saved');
      await until(() => evaluate("!document.querySelector('#record-tools-modal fieldset').disabled"), 'record tools ready');
      await accessibility('record-tools-light'); await capture('record-tools-light');
      await evaluate("window.crmTheme.setMode('dark')"); await accessibility('record-tools-dark');
      await evaluate("window.crmTheme.setMode('light')");
      await evaluate("document.querySelector('#record-tools-modal .btn-close').click()"); await modalClosed('record-tools-modal');
      await evaluate("document.getElementById('settings-button').click()"); await modalShown('settings-modal');
      await accessibility('settings-light');
      await evaluate("document.getElementById('theme-mode').value='dark';document.getElementById('theme-mode').dispatchEvent(new Event('change'))");
      await accessibility('settings-dark'); await capture('settings-dark');
      await evaluate("document.querySelector('#settings-modal .btn-close').click()"); await modalClosed('settings-modal');
      await restartLogin();
      const saved = await evaluate(`window.crmApi.listContractors().then(records=>records.find(record=>record.id===${inline.id}))`);
      assert.equal(saved.city, 'London'); assert.equal(saved.phone, '+44 20 7946 0958');
      assert.ok(await evaluate(`window.crmApi.loadRecordImage({kind:'contractor',id:${inline.id}})`));
      console.log('PASS: country-derived phone prefix, address/PNG restart, taxonomy UI persistence, bounded logo and automated light/dark WCAG-tag scans (manual checks remain).');
    },
  };
};
