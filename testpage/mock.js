var chrome = {};
(function () {
  function setComposition({
    text,
    selectionStart,
    selectionEnd,
    cursor,
    segments = [],
  }) {
    const composition = document.getElementById('ime-composition');
    composition.innerHTML = '';
    if (text.length == 0) return;
    if (!selectionStart || !selectionEnd || selectionEnd < selectionStart) {
      selectionStart = -1;
      selectionEnd = -1;
    }

    document.getElementById('result').style.borderRight =
      cursor && cursor >= 0 && cursor <= text.length ? 'none' : 'solid 1px';

    for (const c of text) {
      const span = document.createElement('span');
      span.appendChild(document.createTextNode(c));
      composition.appendChild(span);
    }
    {
      const span = document.createElement('span');
      // empty span for cursor
      composition.appendChild(span);
    }
    const spans = [...composition.children];
    spans[cursor].style.borderLeft = 'solid 1px';

    spans.slice(selectionStart, selectionEnd).forEach((span) => {
      span.style.backgroundColor = 'skyblue';
    });

    const styles = {
      underline: 'underline',
      doubleUnderline: 'double underline',
      noUnderline: 'none',
    };
    for (const segment of segments) {
      spans.slice(segment.start, segment.end).forEach((span) => {
        span.style.textDecoration = styles[segment.style];
      });
    }
  }

  function clearComposition() {
    document.getElementById('ime-composition').innerHTML = '';
    document.getElementById('result').style.borderRight = 'solid 1px';
  }

  function commitText({ text }) {
    const result = document.getElementById('result');
    [...text].forEach((c) => {
      result.appendChild(
        c == '\n'
          ? document.createElement('br')
          : document.createTextNode(c == ' ' ? '\u00A0' : c),
      );
    });
  }

  function deleteSurroundingText({ offset, length }) {
    const result = document.getElementById('result');
    const cursor = result.textContent.length;
    result.textContent =
      result.textContent.slice(0, cursor + offset) +
      result.textContent.slice(cursor + offset + length);
  }

  const kDefaultCandidateWindowPageSize = 10;
  const candidateWindowProperty = {
    cursorVisible: false,
    vertical: false,
    pageSize: kDefaultCandidateWindowPageSize,
  };

  async function setCandidateWindowProperties({ properties }) {
    document.getElementById('candidate-window').style.display =
      properties.visible ? 'block' : 'none';
    candidateWindowProperty.cursorVisible = properties.cursorVisible;
    candidateWindowProperty.vertical = properties.vertical;
    candidateWindowProperty.pageSize =
      properties.pageSize || kDefaultCandidateWindowPageSize;
    const children = [...document.getElementById('candidates').children];
    for (const [i, candidate] of children.entries()) {
      candidate.style.display =
        i < candidateWindowProperty.pageSize ? '' : 'none';
    }
    if (
      properties.auxiliaryTextVisible &&
      properties.auxiliaryText.length > 0
    ) {
      const aux_text = document.getElementById('aux-text');
      aux_text.style.display = 'block';
      aux_text.innerHTML = '';
      aux_text.appendChild(document.createTextNode(properties.auxiliaryText));
    } else {
      document.getElementById('aux-text').style.display = 'none';
    }
    return true;
  }

  async function setCandidates({ candidates }) {
    const parent = document.getElementById('candidates');
    parent.innerHTML = '';
    for (const [i, candidate] of candidates.entries()) {
      const tr = document.createElement('tr');
      tr.id = 'candidate-' + candidate.id;
      const c1 = document.createElement('td');
      if (candidate.label) {
        c1.appendChild(document.createTextNode(candidate.label));
      }
      tr.appendChild(c1);
      const c2 = document.createElement('td');
      c2.appendChild(document.createTextNode(candidate.candidate));
      tr.appendChild(c2);
      const c3 = document.createElement('td');
      if (candidate.annotation) {
        c3.appendChild(document.createTextNode(candidate.annotation));
      }
      tr.appendChild(c3);

      tr.onclick = (ev) => {
        const id = Number(tr.id.slice('candidate-'.length));
        chrome.input.ime.onCandidateClicked.emit(mockEngineId, id, 'left');
      };
      tr.style.display = i < candidateWindowProperty.pageSize ? '' : 'none';
      parent.appendChild(tr);
    }
    return true;
  }

  async function setCursorPosition({ contextID, candidateID }) {
    const children = [...document.getElementById('candidates').children];
    for (const [i, candidate] of children.entries()) {
      const id = Number(candidate.id.slice('candidate-'.length));
      candidate.style.backgroundColor = id == candidateID ? 'skyblue' : '';
    }
    return true;
  }

  function createMenuItem(menuItem, group_name, targetDiv) {
    if (menuItem.style == 'radio') {
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = group_name;
      input.value = menuItem.id;
      input.id = 'menu-item-input-' + menuItem.id;
      if (menuItem.checked) {
        input.checked = 'checked';
      }
      if ('enabled' in menuItem && !menuItem.enabled) {
        input.disabled = 'disabled';
      }
      targetDiv.appendChild(input);
      input.onchange = (e) =>
        chrome.input.ime.onMenuItemActivated.emit(mockEngineId, e.target.value);

      const label = document.createElement('label');
      label.htmlFor = input.id;
      label.textContent = menuItem.label;
      targetDiv.appendChild(label);
    } else {
      targetDiv.textContent = menuItem.label;
      targetDiv.id = 'menu-item-content-' + menuItem.id;
      targetDiv.onclick = () =>
        chrome.input.ime.onMenuItemActivated.emit(
          mockEngineId,
          e.target.id.slice('menu-item-content-'.length),
        );
    }
  }

  function setMenuItems({ items }) {
    const itemsDiv = document.getElementById('menu-items');
    itemsDiv.innerHTML = '';

    let radio_group_id = 0;
    for (const item of items) {
      if (item.style == 'none') continue;
      if (item.style == 'separator') {
        itemsDiv.appendChild(document.createElement('hr'));
        radio_group_id++;
        continue;
      }
      const div = document.createElement('div');
      createMenuItem(item, 'menu-item-group-' + radio_group_id, div);
      div.id = 'menu-item-' + item.id;
      itemsDiv.appendChild(div);
    }
  }

  function updateMenuItems({ items }) {
    for (const item of items) {
      const div = document.getElementById('menu-item-' + item.id);
      div.style.visibility = item.visible == false ? 'hidden' : 'visible';
      const inputs = div.getElementsByTagName('input');
      const group_name = inputs.length > 0 ? inputs[0].name : '';
      div.innerHTML = '';
      createMenuItem(item, group_name, div);
    }
  }

  async function NotImplemented(obj, callback) {
    console.log('NotImplemented');
    if (callback) {
      callback(false);
    }
  }

  function Callbacker(func) {
    return function (obj, callback) {
      func(obj);
      if (callback) {
        callback(true);
      }
    };
  }

  function EventListener() {
    this.listeners_ = [];
  }

  EventListener.prototype.addListener = function (f) {
    this.listeners_.push(f);
  };

  EventListener.prototype.emit = function (...args) {
    for (const listener of this.listeners_) {
      listener.call(this, ...args);
    }
  };

  chrome['input'] = {
    ime: {
      setComposition: Callbacker(setComposition),
      clearComposition: Callbacker(clearComposition),
      commitText: Callbacker(commitText),
      deleteSurroundingText: Callbacker(deleteSurroundingText),
      setCandidateWindowProperties: setCandidateWindowProperties,
      setCandidates: setCandidates,
      setCursorPosition: setCursorPosition,
      setMenuItems: Callbacker(setMenuItems),
      updateMenuItems: Callbacker(updateMenuItems),
      sendKeyEvent: NotImplemented,
      onActivate: new EventListener(),
      onDeactivated: new EventListener(),
      onFocus: new EventListener(),
      onBlur: new EventListener(),
      onReset: new EventListener(),
      onInputContextUpdate: new EventListener(),
      onKeyEvent: new EventListener(),
      onCandidateClicked: new EventListener(),
      onMenuItemActivated: new EventListener(),
    },
  };

  const localStore = {};
  const store = {
    options: {
      system_dictionary: {
        url: 'https://tamo.github.io/dict/SKK-JISYO.L.gz',
        compression: 'gz',
        encoding: 'utf-8',
      },
    },
  };
  chrome['storage'] = {
    local: {
      set: (obj) => Object.assign(localStore, obj),
      get: (key, callback) => callback({ [key]: localStore[key] }),
    },
    onChanged: {
      addListener: (callback) => {
        store['_listener'] = callback;
      },
    },
    sync: {
      set: (obj) => {
        Object.assign(store, obj);
        if (store['_listener']) {
          const changes = {};
          for (const [key, newValue] of Object.entries(obj)) {
            changes[key] = { newValue };
            store['_listener'](changes);
          }
        }
      },
      get: (key, callback) => callback({ [key]: store[key] }),
    },
  };

  chrome['runtime'] = {
    sendMessage: ({ method, body }, _callback) => console.log(method, body),
    onMessage: {
      // just for clipboard
      addListener: async (callback) => {
        const text = await navigator.clipboard.readText();
        const response = {
          method: 'read_clipboard_response',
          body: { content: text },
        };
        callback(response);
      },
      removeListener: async (callback) => true,
    },
  };

  const mockEngineId = 'sample';
  const mockContext = {
    textID: 0,
    type: 'Text',
    shouldDoLearning: true,
  };

  window.addEventListener('load', function () {
    document.getElementById('result').style.borderRight = 'solid 1px';
    chrome.input.ime.onActivate.emit(mockEngineId);
    chrome.input.ime.onFocus.emit(mockEngineId, mockContext);
    chrome.input.ime.onInputContextUpdate.emit(mockContext);
  });

  const emitKeyEvent = (ev) => {
    chrome.input.ime.onKeyEvent.emit(mockEngineId, ev);
    return false;
  };

  window.addEventListener('load', function () {
    const div = document.createElement('div');
    div.style.outline = '0';
    div.contentEditable = true;
    div.style.position = 'absolute';
    div.style.top = '-9999px';
    div.style.left = '-9999px';
    document.body.appendChild(div);
    div.focus();
    div.onkeydown = (ev) => emitKeyEvent(ev);
    div.onkeyup = (ev) => emitKeyEvent(ev);
    div.onblur = (ev) => div.focus();
  });
})();
