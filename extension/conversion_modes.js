(() => {
  const label = 'asdfjkl';

  const compositionHandler = (skk) => {
    const entry = skk.entries.entries[skk.entries.index];
    if (!entry) {
      skk.clearComposition();
      return;
    }

    const preedit = '\u25bc' + entry.word + skk.okuriText;
    skk.setComposition(preedit, 1, {
      selectionStart: 1,
      selectionEnd: [...preedit].length,
      // spread preedit because (an emoji).length can be greater than 1
    });
  };

  const initHandler = (skk) =>
    skk.lookup(skk.preedit + skk.okuriPrefix, (found) => {
      const entries = skk.hint ? skk.narrowDown(found, skk.hint) : found;
      if (entries?.length) {
        skk.entries = { index: 0, entries, label };
        compositionHandler(skk);
        return;
      }
      skk.createInnerSKK();
    });

  const keyHandler = (skk, keyevent) => {
    const key = keyevent.key;

    switch ((keyevent.ctrlKey ? 'Ctrl+' : '') + key) {
      case ' ':
        skk.entries.index += skk.entries.index > 2 ? 7 : 1;
        if (skk.entries.index >= skk.entries.entries.length) {
          skk.createInnerSKK();
        }
        return true;

      case 'x':
        skk.entries.index -= skk.entries.index > 9 ? 7 : 1;
        if (skk.entries.index < 0) {
          skk.entries = null;
          skk.preedit += skk.hint ? ';' + skk.hint : skk.okuriText;
          skk.okuriText = '';
          skk.okuriPrefix = '';
          skk.switchMode('preedit');
        }
        return true;

      case 'Esc':
      case 'Ctrl+g':
      case ';':
        skk.entries = null;
        skk.preedit += skk.hint || key == ';' ? ';' + skk.hint : skk.okuriText;
        skk.okuriText = '';
        skk.okuriPrefix = '';
        skk.switchMode('preedit');
        return true;

      case 'Shift':
        return true; // do nothing

      case 'X':
        const entry = skk.entries.entries[skk.entries.index];
        skk.dictionary.removeUserEntry(
          skk.preedit.replace(/[0-9]+/g, '#') + skk.okuriPrefix,
          entry.rawWord,
        );
        skk.entries = null;
        skk.preedit += skk.hint ? ';' + skk.hint : skk.okuriText;
        skk.okuriText = '';
        skk.okuriPrefix = '';
        skk.switchMode('preedit');
        return true;
    }

    const index = label.indexOf(key);
    const is_selected =
      index >= 0 &&
      skk.entries.index > 2 &&
      !keyevent.ctrlKey &&
      !keyevent.shiftKey &&
      !keyevent.altKey;
    const entry =
      skk.entries.entries[skk.entries.index + (is_selected ? index : 0)];
    const hiragana = entry.word + skk.okuriText;
    const text =
      skk.previousKana == 'hiragana'
        ? hiragana
        : skk.previousKana == 'katakana'
          ? kanaTurnOver(hiragana)
          : kanaHalfWidth(kanaTurnOver(hiragana));
    skk.commitText(text);
    skk.recordNewResult({
      ...entry,
      word: entry.rawWord,
      rawWord: undefined,
    });

    skk.clearComposition();
    skk.entries = null;
    skk.okuriText = '';
    skk.okuriPrefix = '';

    if (key == '>') {
      skk.preedit = '>';
      skk.switchMode('preedit');
      return true;
    }
    skk.preedit = '';
    skk.hint = '';
    skk.switchMode(skk.previousKana);

    return (
      is_selected ||
      key == 'Enter' ||
      (key == 'j' && keyevent.ctrlKey) ||
      skk.handleKeyEvent(keyevent)
    );
  };

  SKK.registerImplicitMode('conversion', {
    keyHandler,
    initHandler,
    compositionHandler,
  });
})();
