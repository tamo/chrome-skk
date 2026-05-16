(() => {
  const updateComposition = (skk) => {
    const preedit =
      '\u25bd' +
      [...skk.preedit].slice(0, skk.caret).join('') +
      skk.roman +
      [...skk.preedit].slice(skk.caret).join('');
    const caret = skk.caret + skk.roman.length + 1;
    skk.setComposition(preedit, caret);
  };

  const initPreedit = (skk) => {
    skk.caret = [...skk.preedit].length;
  };

  const preeditKeybind = (skk, keyevent) => {
    const key = keyevent.key;
    const nn = skk.roman == 'n' ? romanTable['nn'] : '';
    let isDelete = false;

    switch ((keyevent.ctrlKey ? 'Ctrl+' : '') + key) {
      case 'Enter':
      case 'Ctrl+j':
        skk.commitText(skk.preedit + nn);
        skk.preedit = '';
        skk.roman = '';
        skk.switchMode(skk.previousKana);
        return true;

      case 'Esc':
      case 'Escape':
      case 'Ctrl+g':
        if (skk.tabbing) {
          skk.preedit = skk.oldPreedit;
          skk.roman = skk.oldRoman;
          skk.caret = [...skk.preedit].length;
          skk.userComplete();
          return true;
        }
        skk.preedit = '';
        skk.roman = '';
        skk.switchMode(skk.previousKana);
        return true;

      case 'Tab':
      case 'Ctrl+t':
        if (!skk.tabbing) {
          skk.tabbing = 'user';
          skk.oldPreedit = skk.preedit;
          skk.oldRoman = skk.roman;
          if (keyevent.shiftKey && skk.entries) {
            skk.entries.index = skk.entries.entries.length - 1;
          }
        } else if (skk.entries) {
          if (!keyevent.shiftKey) {
            skk.entries.index++;
          } else {
            skk.entries.index--;
            if (skk.entries.index < 3) {
              skk.entries.index = skk.entries.entries.length - 1;
            }
          }
        }
        if (!skk.entries || skk.entries.index >= skk.entries.entries.length) {
          skk.preedit = skk.oldPreedit;
          skk.roman = skk.oldRoman;
          skk.caret = [...skk.preedit].length;
          skk.systemComplete();
          if (!skk.entries) {
            skk.userComplete();
            return true;
          } else if (keyevent.shiftKey) {
            skk.entries.index = skk.entries.entries.length - 1;
          }
        }
        skk.preedit = skk.entries.entries[skk.entries.index].word;
        skk.roman = '';
        skk.caret = [...skk.preedit].length;
        return true;

      case 'Left':
      case 'ArrowLeft':
      case 'Ctrl+b':
        if (skk.caret > 0) {
          skk.caret--;
        }
        skk.tabbing = null;
        return true;

      case 'Delete':
      case 'Ctrl+d':
        isDelete = true;
      // fall through
      case 'Right':
      case 'ArrowRight':
      case 'Ctrl+f':
        if (skk.caret < [...skk.preedit].length) {
          skk.caret++;
        } else if (isDelete) return true;
        skk.tabbing = null;
        if (!isDelete) return true;

      case 'Backspace':
      case 'Ctrl+h':
        if (skk.roman.length > 0) {
          skk.roman = skk.roman.slice(0, skk.roman.length - 1);
          skk.userComplete();
        } else if ([...skk.preedit].length > 0 && skk.caret > 0) {
          skk.preedit =
            [...skk.preedit].slice(0, skk.caret - 1).join('') +
            [...skk.preedit].slice(skk.caret).join('');
          skk.caret--;
          skk.userComplete();
        } else {
          if (skk.preedit.length > 0) {
            skk.commitText(skk.preedit);
          }
          skk.preedit = '';
          skk.switchMode(skk.previousKana);
        }
        return true;

      case 'q':
        if (skk.currentMode == 'ascii-preedit') return false;
        const kana = kanaTurnOver(skk.preedit + nn);
        skk.commitText((keyevent.ctrlKey ? kanaHalfWidth : (c) => c)(kana));
        skk.preedit = '';
        skk.roman = '';
        skk.switchMode(skk.previousKana);
        return true;

      case 'l':
        if (skk.currentMode == 'ascii-preedit') return false;
        skk.commitText(skk.preedit + nn);
        skk.preedit = '';
        skk.roman = '';
        skk.switchMode('ascii');
        return true;

      case 'L':
        if (skk.currentMode == 'ascii-preedit') return false;
        skk.commitText(skk.preedit + nn);
        skk.preedit = '';
        skk.roman = '';
        skk.switchMode('full-ascii');
        return true;
    }

    return false;
  };

  const preeditInput = (skk, keyevent) => {
    const key = keyevent.key;

    switch (true) {
      case key == ' ':
        if (skk.roman == 'n') {
          skk.preedit += romanTable['nn'];
        }
        const semicolon = skk.preedit.indexOf(';');
        if (semicolon > 0) {
          skk.hint = skk.preedit.slice(semicolon + 1);
          skk.preedit = skk.preedit.slice(0, semicolon);
        } else {
          skk.hint = '';
        }
        skk.roman = '';
        skk.switchMode('conversion');
        return true;

      case preeditKeybind(skk, keyevent):
        return true;

      case key.length != 1:
        // special keys -- ignore for now
        return false;

      case skk.preedit.length > 0 &&
        keyevent.shiftKey &&
        'A' <= key &&
        key <= 'Z':
        const low = key.toLowerCase();
        const okuriPrefix = skk.roman.length > 0 ? skk.roman[0] : low;
        skk.processRoman(low, romanTable, (text) => {
          if (skk.roman.length > 0) {
            skk.preedit += text;
            skk.caret += [...text].length;
          } else {
            skk.hint = '';
            skk.okuriPrefix = okuriPrefix;
            skk.okuriText = text;
            skk.switchMode('conversion');
          }
        });
        if (skk.currentMode == 'preedit') {
          // We should re-calculate the okuriPrefix since the 'roman' can be
          // changed during processRoman -- such like 'KanJi' pattern.
          skk.okuriPrefix = skk.roman.length > 0 ? skk.roman[0] : low;
          skk.switchMode('okuri-preedit');
        }
        return true;
    }

    const processed = skk.processRoman(
      key.toLowerCase(),
      romanTable,
      (text) => {
        skk.preedit =
          [...skk.preedit].slice(0, skk.caret).join('') +
          text +
          [...skk.preedit].slice(skk.caret).join('');
        skk.caret += [...text].length;
      },
    );

    if (skk.preedit.length > 0 && key == '>') {
      skk.roman = '';
      skk.preedit += '>';
      skk.hint = '';
      skk.switchMode('conversion');
    } else {
      if (!processed) {
        skk.preedit =
          [...skk.preedit].slice(0, skk.caret).join('') +
          key +
          [...skk.preedit].slice(skk.caret).join('');
        skk.caret += key.length;
      }
      skk.userComplete();
    }
    return true;
  };

  const updateOkuriComposition = (skk) => {
    const preedit =
      '\u25bd' +
      [...skk.preedit].slice(0, skk.caret).join('') +
      '*' +
      skk.okuriText +
      skk.roman +
      [...skk.preedit].slice(skk.caret).join('');
    const caret = skk.caret + skk.roman.length + 2;
    skk.setComposition(preedit, caret);
  };

  const okuriPreeditInput = (skk, keyevent) => {
    const key = keyevent.key;
    switch ((keyevent.ctrlKey ? 'Ctrl+' : '') + key) {
      case 'Enter':
      case 'Ctrl+j':
        skk.commitText(skk.preedit);
        skk.preedit = '';
        if (skk.roman == 'n') {
          skk.commitText(romanTable['nn']);
        }
        skk.roman = '';
        skk.switchMode(skk.previousKana);
        return true;

      case 'Esc':
      case 'Escape':
      case 'Ctrl+g':
        skk.preedit = '';
        skk.roman = '';
        skk.okuriPrefix = '';
        skk.okuriText = '';
        skk.switchMode(skk.previousKana);
        return true;

      case 'Tab':
      case 'Ctrl+t':
        return true;

      case 'Backspace':
      case 'Ctrl+h':
        skk.roman = skk.roman.slice(0, skk.roman.length - 1);
        if (skk.roman.length == 0) {
          skk.okuriPrefix = '';
          skk.roman = '';
          skk.switchMode('preedit');
          return true;
        }
    }

    skk.processRoman(key.toLowerCase(), romanTable, (text) => {
      skk.okuriText += text;
      if (skk.roman.length == 0) {
        skk.hint = '';
        skk.switchMode('conversion');
      }
    });
    return true;
  };

  const asciiPreeditInput = (skk, keyevent) => {
    const key = keyevent.key;

    switch (true) {
      case key == ' ':
        skk.hint = '';
        skk.switchMode('conversion');
        break;

      case preeditKeybind(skk, keyevent):
      case key.length != 1:
        break;

      default:
        skk.preedit += key;
        skk.caret++;
    }

    return true;
  };

  SKK.registerImplicitMode('preedit', {
    keyHandler: preeditInput,
    compositionHandler: updateComposition,
    initHandler: initPreedit,
  });

  SKK.registerImplicitMode('okuri-preedit', {
    keyHandler: okuriPreeditInput,
    compositionHandler: updateOkuriComposition,
  });

  SKK.registerImplicitMode('ascii-preedit', {
    keyHandler: asciiPreeditInput,
    compositionHandler: updateComposition,
    initHandler: initPreedit,
  });
})();

const kanaTurnOver = (str) =>
  Array.from(str, (ch) => {
    const c = ch.charCodeAt(0);
    if (0x3040 < c && c < 0x3097) return String.fromCharCode(c + 0x60);
    if (0x30a0 < c && c < 0x30f7) return String.fromCharCode(c - 0x60);
    return ch;
  }).join('');
