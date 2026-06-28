/**
 * GM API polyfill for Chrome Extension (MV3)
 * Maps Tampermonkey GM_* APIs to chrome.* extension APIs,
 * so the original ao3-chinese.user.js can run unmodified.
 *
 * 存储策略: GM_getValue/GM_setValue -> chrome.storage.local
 * 网络策略: GM_xmlhttpRequest -> chrome.runtime.sendMessage + background fetch
 *           (绕过页面 CSP 和跨域限制)
 */

(function () {
  'use strict';

  // GM_info
  const GM_info = {
    scriptHandler: 'AO3 Browser Extension',
    version: '1.0.0',
    script: {
      name: 'AO3 Translator',
      version: '1.9.0',
      namespace: 'https://github.com/V-Lipset/ao3-chinese',
    },
  };
  window.GM_info = GM_info;

  // ---------- 存储相关 ----------
  // chrome.storage.local 是异步的,用同步缓存 + 异步回填模拟同步行为
  const memoryCache = {};
  let cacheReady = false;
  const pendingGets = [];

  function initCache() {
    if (cacheReady) return Promise.resolve();
    return chrome.storage.local.get(null).then((data) => {
      Object.assign(memoryCache, data || {});
      cacheReady = true;
    });
  }

  // 预加载缓存
  initCache();

  function GM_getValue(key, defaultValue) {
    if (key in memoryCache) {
      return memoryCache[key];
    }
    return defaultValue;
  }

  function GM_setValue(key, value) {
    memoryCache[key] = value;
    const obj = {};
    obj[key] = value;
    chrome.storage.local.set(obj);
    // 通知其他标签页
    chrome.runtime.sendMessage({ type: 'GM_valueChanged', key, value }).catch(() => {});
  }

  function GM_deleteValue(key) {
    delete memoryCache[key];
    chrome.storage.local.remove(key);
  }

  function GM_addValueChangeListener(callback) {
    const listener = (changes, area) => {
      if (area !== 'local') return;
      for (const key in changes) {
        callback(key, changes[key].oldValue, changes[key].newValue, false);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return listener; // 返回监听器引用以便注销
  }

  function GM_unregisterValueChangeListener(listenerId) {
    chrome.storage.onChanged.removeListener(listenerId);
  }

  // ---------- 网络请求 ----------
  function GM_xmlhttpRequest(details) {
    const messageId = 'gm_xhr_' + Math.random().toString(36).slice(2);

    const onMessage = (msg) => {
      if (!msg || msg.type !== 'gm_xhr_response' || msg.id !== messageId) return;
      const state = {
        responseText: msg.responseText || '',
        response: msg.response || '',
        readyState: msg.readyState,
        responseHeaders: msg.responseHeaders || '',
        status: msg.status || 0,
        statusText: msg.statusText || '',
        finalUrl: msg.finalUrl || details.url,
      };
      if (msg.readyState === 4) {
        chrome.runtime.onMessage.removeListener(onMessage);
        if (msg.status >= 200 && msg.status < 400) {
          if (details.onload) details.onload(state);
        } else {
          if (details.onerror) details.onerror(state);
        }
        if (details.onreadystatechange) details.onreadystatechange(state);
      } else {
        if (details.onreadystatechange) details.onreadystatechange(state);
      }
    };
    chrome.runtime.onMessage.addListener(onMessage);

    chrome.runtime.sendMessage({
      type: 'gm_xhr_request',
      id: messageId,
      details: {
        method: details.method || 'GET',
        url: details.url,
        headers: details.headers || {},
        data: details.data,
        timeout: details.timeout,
        responseType: details.responseType,
        overrideMimeType: details.overrideMimeType,
      },
    }).catch(() => {
      if (details.onerror) {
        details.onerror({ status: 0, readyState: 4, responseText: '' });
      }
    });
  }

  // ---------- 样式注入 ----------
  function GM_addStyle(css) {
    const style = document.createElement('style');
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
    return style;
  }

  // ---------- 通知 ----------
  function GM_notification(details, ondone) {
    const opts = typeof details === 'string' ? { text: details } : details;
    chrome.runtime.sendMessage({
      type: 'gm_notification',
      title: opts.title || 'AO3 Translator',
      text: opts.text || '',
      imageUrl: opts.image,
    }).then(() => {
      if (ondone) ondone();
    }).catch(() => {
      if (ondone) ondone();
    });
  }

  // ---------- 资源 URL ----------
  // @resource 的图片打包进扩展,通过 chrome.runtime.getURL 获取
  const resourceMap = {
    vIcon: chrome.runtime.getURL('assets/icon.png'),
    santaHat: chrome.runtime.getURL('assets/santa hat.png'),
  };

  function GM_getResourceURL(name) {
    return resourceMap[name] || '';
  }

  // ---------- 下载 ----------
  function GM_download(details) {
    const url = typeof details === 'string' ? details : details.url;
    const filename = (typeof details === 'object' && details.name) || 'download';
    chrome.runtime.sendMessage({
      type: 'gm_download',
      url: url,
      filename: filename,
    });
  }

  // ---------- 菜单命令 ----------
  const menuCommands = {};
  function GM_registerMenuCommand(name, fn, accessKey) {
    const id = 'cmd_' + Object.keys(menuCommands).length;
    menuCommands[id] = { name, fn };
    chrome.runtime.sendMessage({
      type: 'gm_register_menu',
      id: id,
      name: name,
    }).catch(() => {});
    return id;
  }

  function GM_unregisterMenuCommand(id) {
    delete menuCommands[id];
    chrome.runtime.sendMessage({ type: 'gm_unregister_menu', id: id }).catch(() => {});
  }

  // 监听菜单点击
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'gm_menu_click' && menuCommands[msg.id]) {
      menuCommands[msg.id].fn();
    }
  });

  // ---------- 导出到 window ----------
  window.GM_getValue = GM_getValue;
  window.GM_setValue = GM_setValue;
  window.GM_deleteValue = GM_deleteValue;
  window.GM_addValueChangeListener = GM_addValueChangeListener;
  window.GM_unregisterValueChangeListener = GM_unregisterValueChangeListener;
  window.GM_xmlhttpRequest = GM_xmlhttpRequest;
  window.GM_addStyle = GM_addStyle;
  window.GM_notification = GM_notification;
  window.GM_getResourceURL = GM_getResourceURL;
  window.GM_download = GM_download;
  window.GM_registerMenuCommand = GM_registerMenuCommand;
  window.GM_unregisterMenuCommand = GM_unregisterMenuCommand;
  window.GM_info = GM_info;
})();
