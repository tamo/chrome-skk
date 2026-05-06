(function() {

function updateComposition(skk) {
  var entry = skk.entries.entries[skk.entries.index];
  if (!entry) {
    skk.clearComposition();
  }

  var preedit = '\u25bc' + entry.word;
  if (skk.okuriText.length > 0) {
    preedit += skk.okuriText;
  }
  skk.setComposition(preedit, 1, {selectionStart:1,
                                  selectionEnd:preedit.length});
}

function initConversion(skk) {
  let hint = '';
  const semicolon = skk.preedit.indexOf(';');
  if (semicolon > 0) {
    hint = skk.preedit.slice(semicolon + 1);
    skk.preedit = skk.preedit.slice(0, semicolon);
  }
  skk.lookup(skk.preedit + skk.okuriPrefix, function(found) {
    const entries = hint ? skk.narrowDown(found, hint) : found;
    if (entries?.length) {
      skk.entries = {
        index:0,
        entries,
        label:'asdfjkl'
      };
      updateComposition(skk);
    } else {
      skk.createInnerSKK();
    }
  });
}

function conversionMode(skk, keyevent) {
  if (keyevent.key == ' ') {
    if (skk.entries.index > 2) {
      skk.entries.index += 7;
    } else {
      skk.entries.index++;
    }

    if (skk.entries.index >= skk.entries.entries.length) {
      skk.createInnerSKK();
    }
  } else if (keyevent.key == 'x') {
    if (skk.entries.index > 9) {
      skk.entries.index -= 7;
    } else {
      skk.entries.index--;
    }
    if (skk.entries.index < 0) {
      skk.entries = null;
      skk.preedit += skk.okuriText;
      skk.okuriText = '';
      skk.okuriPrefix = '';
      skk.switchMode('preedit');
    }
  } else if (keyevent.key == 'Esc' ||
             (keyevent.key == 'g' && keyevent.ctrlKey)) {
    skk.entries = null;
    skk.preedit += skk.okuriText;
    skk.okuriText = '';
    skk.okuriPrefix = '';
    skk.switchMode('preedit');
  } else if (keyevent.key == 'Shift') {
    // do nothing
  } else if (keyevent.key == 'X') {
    var entry = skk.entries.entries[skk.entries.index];
    skk.dictionary.removeUserEntry(
      skk.preedit.replace(/[0-9]+/g, '#') + skk.okuriPrefix,
      entry.rawWord
    );
    skk.entries = null;
    skk.preedit += skk.okuriText;
    skk.okuriText = '';
    skk.okuriPrefix = '';
    skk.switchMode('preedit');
  } else {
    var is_commit_key = (
      keyevent.key == 'Enter' || (keyevent.key == 'j' && keyevent.ctrlKey));
    if (skk.entries.index > 2 &&
        (!keyevent.ctrlKey && !keyevent.shiftKey && !keyevent.altKey &&
         'asdfjkl'.indexOf(keyevent.key) >= 0)) {
      skk.entries.index += 'asdfjkl'.indexOf(keyevent.key);
      is_commit_key = true;
    }
    const entry = skk.entries.entries[skk.entries.index];
    const hiragana = entry.word + skk.okuriText;
    const text = skk.previousKana == 'hiragana' ? hiragana :
      skk.previousKana == 'katakana' ? kanaTurnOver(hiragana) :
      kanaHalfWidth(kanaTurnOver(hiragana));
    skk.commitText(text);
    skk.recordNewResult({...entry, word:entry.rawWord, rawWord:undefined});
    skk.clearComposition();
    skk.entries = null;
    skk.okuriText = '';
    skk.okuriPrefix = '';
    if (keyevent.key == '>') {
      skk.preedit = '>';
      skk.switchMode('preedit');
    } else {
      skk.preedit = '';
      skk.switchMode(skk.previousKana);
      if (!is_commit_key) {
        return skk.handleKeyEvent(keyevent);
      }
    }
  }

  return true;
}

SKK.registerImplicitMode('conversion', {
    keyHandler: conversionMode,
    initHandler: initConversion,
    compositionHandler: updateComposition
});
})();
