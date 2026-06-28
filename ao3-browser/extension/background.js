/**
 * Background service worker for AO3 Translator extension
 * 处理 GM_xmlhttpRequest 的跨域请求、下载、通知
 */

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'gm_xhr_request') {
    handleXhrRequest(msg.id, msg.details, sender);
    return false; // 异步响应通过 onMessage 推送
  }

  if (msg.type === 'gm_download') {
    handleDownload(msg.url, msg.filename);
    return false;
  }

  if (msg.type === 'gm_notification') {
    handleNotification(msg.title, msg.text, msg.imageUrl);
    return false;
  }

  if (msg.type === 'gm_register_menu') {
    // 动态菜单项存储,供扩展弹窗使用
    chrome.storage.local.get('gm_menu_commands', (data) => {
      const cmds = data.gm_menu_commands || {};
      cmds[msg.id] = msg.name;
      chrome.storage.local.set({ gm_menu_commands: cmds });
    });
    return false;
  }

  if (msg.type === 'gm_unregister_menu') {
    chrome.storage.local.get('gm_menu_commands', (data) => {
      const cmds = data.gm_menu_commands || {};
      delete cmds[msg.id];
      chrome.storage.local.set({ gm_menu_commands: cmds });
    });
    return false;
  }

  return false;
});

// GM_xmlhttpRequest: 在 background 中用 fetch 发起跨域请求
async function handleXhrRequest(messageId, details, sender) {
  const tabId = sender.tab ? sender.tab.id : null;
  try {
    const fetchOpts = {
      method: details.method || 'GET',
      headers: details.headers || {},
    };
    if (details.data && fetchOpts.method !== 'GET') {
      fetchOpts.body = details.data;
    }

    const controller = new AbortController();
    if (details.timeout) {
      setTimeout(() => controller.abort(), details.timeout);
    }
    fetchOpts.signal = controller.signal;

    const response = await fetch(details.url, fetchOpts);
    const responseHeaders = {};
    response.headers.forEach((v, k) => { responseHeaders[k] = v; });

    let responseText = '';
    if (details.responseType === 'arraybuffer' || details.responseType === 'blob') {
      const buf = await response.arrayBuffer();
      responseText = btoa(String.fromCharCode(...new Uint8Array(buf)));
    } else {
      responseText = await response.text();
    }

    // 推送 readyState 4 完成
    if (tabId !== null) {
      chrome.tabs.sendMessage(tabId, {
        type: 'gm_xhr_response',
        id: messageId,
        readyState: 4,
        status: response.status,
        statusText: response.statusText,
        responseText: responseText,
        response: responseText,
        responseHeaders: Object.entries(responseHeaders)
          .map(([k, v]) => k + ': ' + v).join('\r\n'),
        finalUrl: response.url || details.url,
      }).catch(() => {});
    }
  } catch (err) {
    if (tabId !== null) {
      chrome.tabs.sendMessage(tabId, {
        type: 'gm_xhr_response',
        id: messageId,
        readyState: 4,
        status: 0,
        statusText: err.name === 'AbortError' ? 'timeout' : 'error',
        responseText: '',
        response: '',
        responseHeaders: '',
        finalUrl: details.url,
      }).catch(() => {});
    }
  }
}

// GM_download: 用 chrome.downloads API
function handleDownload(url, filename) {
  chrome.downloads.download({ url: url, filename: filename, saveAs: false });
}

// GM_notification: 用 chrome.notifications API
function handleNotification(title, text, imageUrl) {
  const opts = {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icon.png'),
    title: title || 'AO3 Translator',
    message: text || '',
  };
  if (imageUrl) {
    // basic 通知不支持图片,忽略
  }
  chrome.notifications.create(opts);
}
