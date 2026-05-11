const skk_dictionary = new Dictionary();
let skk = null;

(() => {
  chrome.input.ime.onActivate.addListener((engineID) => {
    skk = new SKK(engineID, skk_dictionary);
    const items = structuredClone(skk.menuHeader);
    for (const modeName of skk.primaryModes) {
      items.push({
        id: 'skk-' + modeName,
        label: skk.modes[modeName].displayName,
        style: 'radio',
        checked: modeName == skk.currentMode,
      });
    }
    chrome.input.ime.setMenuItems({ engineID, items });
  });

  const updateContext = (needsStatus, context) => {
    const setContext = (outer, context) => {
      if (!outer) return true;
      outer.context = context.contextID;
      outer.private = !context.shouldDoLearning;

      const isInnermost = setContext(outer.inner_skk, context);
      if (isInnermost && needsStatus) {
        outer.showStatus();
      }
      return false;
    };
    setContext(skk, context);
  };

  chrome.input.ime.onFocus.addListener(updateContext.bind(null, true));
  chrome.input.ime.onInputContextUpdate.addListener(
    updateContext.bind(null, false),
  );

  const reset = () => {
    skk.inner_skk = null;
    skk.roman = '';
    skk.entries = null;
    skk.preedit = '';
    skk.okuriText = '';
    skk.okuriPrefix = '';
    if (!skk.primaryModes.includes(skk.currentMode)) {
      skk.switchMode(skk.previousKana);
    }
  };
  chrome.input.ime.onBlur.addListener(reset);
  chrome.input.ime.onReset.addListener(reset);

  chrome.input.ime.onKeyEvent.addListener((engineID, keyData) => {
    if (keyData.type != 'keydown') return false;
    return skk.handleKeyEvent(keyData);
  });

  chrome.input.ime.onMenuItemActivated.addListener((engineID, name) => {
    if (name == 'skk-options') {
      chrome.runtime.openOptionsPage();
      return;
    }

    skk.switchMode(name.slice('skk-'.length));
  });
})();
