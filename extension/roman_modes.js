(() => {
  const compositionHandler = (skk) => {
    if (skk.roman.length > 0) {
      skk.setComposition(skk.roman, skk.roman.length);
    } else {
      skk.clearComposition();
    }
  };

  const createRomanInput = (table) => (skk, keyevent) => {
    const key = keyevent.key;

    switch ((keyevent.ctrlKey ? 'Ctrl+' : '') + key) {
      case 'Enter':
        if (skk.roman == 'n') {
          skk.commitText(skk.currentMode.table['nn']);
        } else if (skk.roman.length > 0) {
          skk.commitText('');
        }
        skk.roman = '';
        return false;

      case 'Backspace':
        if (skk.roman.length == 0) return false;
        skk.roman = skk.roman.slice(0, skk.roman.length - 1);
        return true;

      case 'Esc':
      case 'Ctrl+g':
        if (skk.roman.length == 0) return false;
        skk.roman = '';
        return true;

      case 'Ctrl+j':
        if (skk.currentMode != 'hiragana') {
          skk.switchMode('hiragana');
        }
        return true;

      case 'Ctrl+q':
        skk.switchMode(skk.currentMode == 'hankana' ? 'hiragana' : 'hankata');
        return true;
    }

    if (key.length != 1 || keyevent.ctrlKey || keyevent.altKey) return false;

    if (!keyevent.shiftKey) {
      if (skk.processRoman(key, table, skk.commitText.bind(skk))) return true;

      switch (key) {
        case 'q':
          skk.switchMode(
            skk.currentMode == 'hiragana' ? 'katakana' : 'hiragana',
          );
          return true;

        case 'l':
          skk.switchMode('ascii');
          return true;

        case '/':
          skk.switchMode('ascii-preedit');
          return true;

        default:
          if (key >= '0' && key <= '9') {
            skk.commitText(key);
            return true;
          }
      }
    } else
      switch (key) {
        case 'Q':
          skk.processRoman(key, table, skk.commitText.bind(skk));
          skk.switchMode('preedit');
          return true;

        case 'L':
          skk.processRoman(key, table, skk.commitText.bind(skk));
          skk.switchMode('full-ascii');
          return true;

        case '!':
        case '?':
          skk.processRoman(key, table, skk.commitText.bind(skk));
          return true;

        default:
          if (key >= 'A' && key <= 'Z') {
            skk.switchMode('preedit');
            skk.processRoman(key.toLowerCase(), romanTable, (text) => {
              skk.preedit =
                [...skk.preedit].slice(0, skk.caret).join('') +
                text +
                [...skk.preedit].slice(skk.caret).join('');
              skk.caret += [...text].length;
            });
            skk.userComplete();
          } else {
            //if (key == '#')
            skk.commitText(key);
          }
          return true;
      }

    return false;
  };

  SKK.registerMode('hiragana', {
    displayName: '\u3072\u3089\u304c\u306a',
    keyHandler: createRomanInput(romanTable),
    table: romanTable,
    compositionHandler,
  });

  SKK.registerMode('katakana', {
    displayName: '\u30ab\u30bf\u30ab\u30ca',
    keyHandler: createRomanInput(katakanaTable),
    table: katakanaTable,
    compositionHandler,
  });

  SKK.registerMode('hankata', {
    displayName: '\u534a\u89d2\uff76\uff80\uff76\uff85',
    keyHandler: createRomanInput(hankataTable),
    table: hankataTable,
    compositionHandler,
  });
})();
