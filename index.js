// ==UserScript==
// @name         Youtube 悬浮弹幕
// @namespace    67373tools
// @version      0.1.4
// @description  Youtube 悬浮弹幕，可拖动位置，可调节宽度
// @author       XiaoMIHongZHaJi
// @match        https://www.youtube.com/*
// @grant        GM_registerMenuCommand
// @license MIT
// @downloadURL https://update.greasyfork.org/scripts/500209/Youtube%20%E6%82%AC%E6%B5%AE%E5%BC%B9%E5%B9%95.user.js
// @updateURL https://update.greasyfork.org/scripts/500209/Youtube%20%E6%82%AC%E6%B5%AE%E5%BC%B9%E5%B9%95.meta.js
// ==/UserScript==

// ❤️ 广告：欢迎收看陈一发儿直播：https://67373.net
// 如果有 bug，在上面网站也可以找到反馈联系方式

// 代码 https://github.dev/67373net/youtube-float-danmu/blob/main/index.js
// 测试地址：https://www.youtube.com/watch?v=jfKfPfyJRdk

// ✴️ 通用
localStorage.removeItem('danmuParams'); // 清除旧版数据;

const videoDoc = parent.document.querySelector('video').ownerDocument;
const modes = { "0": '全显示', "1": '短用户名', "2": '无用户名', "3": '全隐藏' };
let configs;
getLocal();
function getLocal() {
  const defaultConfigs = {
    showMode: 0, fontSize: 15, top: 88, left: 58, maxHeight: 528, width: 528, gap: 3, transparent: 0.58,
    focusNames: [], highlightNames: [], blockNames: [],
    isFocusNames: false, isHighlightNames: false, isBlockNames: false,
  };
  const storedConfigs = JSON.parse(localStorage.getItem('danmuConfigs') || '{}');
  configs = Object.assign({}, defaultConfigs, storedConfigs);
  for (let key in configs) {
    if (!(key in defaultConfigs)) {
      delete configs[key];
    }
  };
  setLocal();
};

function setLocal(params) {
  localStorage.setItem('danmuConfigs', JSON.stringify(Object.assign(configs, params)));
};

GM_registerMenuCommand("重置位置", () => setLocal({ top: 88, left: 58, maxHeight: 528, width: 528 }));

function checkHeight(danmuEle) {
  function childBottom() {
    let children = danmuEle.querySelectorAll('.danmu-item');
    if (children.length == 0) return 0;
    let child = children[children.length - 1];
    return child.getBoundingClientRect().bottom;
  }
  const fatherBottom = () => danmuEle.getBoundingClientRect().bottom;
  // console. log(childBottom() , fatherBottom());
  while (childBottom() > fatherBottom() /* || childBottom() > videoDoc.defaultView.innerHeight */) {
    let firstChatItem = danmuEle.querySelector('.danmu-item:first-child');
    if (firstChatItem) {
      firstChatItem.parentNode.removeChild(firstChatItem);
    } else {
      break;
    }
  }
}

function setStyle(danmuEle) {
  let floatDanmuStyle = videoDoc.querySelector('#float-danmu-style');
  if (!floatDanmuStyle) {
    floatDanmuStyle = videoDoc.createElement('style');
    floatDanmuStyle.id = 'float-danmu-style';
    document.head.appendChild(floatDanmuStyle);
  }
  let baseStyle = `
  .danmu-highlight {
    border: solid 1.8px rgba(255, 191, 0, 1.8);
    box-shadow: inset 0 0 ${configs.gap + configs.fontSize / 2}px rgba(255, 191, 0, 0.8); /* 内发光效果 */
  }
  #danmu-ele {
    position: absolute;
    color: white;
    height: auto;
    z-index: 67373;
    top: ${configs.top}px;
    left: ${configs.left}px;
    width: ${configs.width}px;
  }
  #danmu-ctrl {
    background-color: rgba(0,0,0,0.5);
    border: solid white 0.1px;
    padding: 2.8px;
    font-size: 12.8px;
  }
  #danmu-pop-board {
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #f0f0f0;
    padding: 18px;
    border: 1px solid #ccc;
    color: black;
    font-size: 1.8em;
  }
  #danmu-content {
    font-size: ${configs.fontSize}px;
    max-height: ${configs.maxHeight}px;
    height: auto;
  }
  .danmu-username-long, .danmu-username-short {
    color: rgb(200,200,200);
  }
  .danmu-item {
    background-color: rgba(0, 0, 0, ${configs.transparent});
    border-radius: ${configs.gap / 2.8 + 0.8}px;
    padding: ${configs.gap}px ${configs.gap * 1.5}px;
    display: inline-block;
    margin: ${configs.gap / 5 + 0.5}px;
  }
  .danmu-item img {
    border-radius: 888px;
    width: ${configs.fontSize * 1.18}px;
    height: ${configs.fontSize * 1.18}px;
    margin-right: ${configs.fontSize / 3}px;
    display: inline;
    vertical-align: middle;
  }
  .danmu-text {
    color: white;
  }`;
  const showMode = modes[configs.showMode];
  if (danmuEle) {
    if (showMode == '全隐藏') {
      danmuEle.querySelector('#danmu-content').style.display = 'none';
    } else {
      danmuEle.querySelector('#danmu-content').style.display = 'block';
      checkHeight(danmuEle);
    };
  }
  let showModeStyle = '';
  switch (showMode) {
    case '全显示':
      showModeStyle = `
        .danmu-username-long { display: inline !important; }
        .danmu-username-short { display: none !important; }`;
      break;
    case '短用户名':
      showModeStyle = `
        .danmu-username-long { display: none !important; }
        .danmu-username-short { display: inline !important; }`;
      break;
    case '无用户名':
      showModeStyle = `
        .danmu-username-long { display: none !important; }
        .danmu-username-short { display: none !important; }`;
      break;
  };
  floatDanmuStyle.textContent = baseStyle + showModeStyle;
}

// ✴️ 主页面
if (location.href.startsWith('https://www.youtube.com/watch?v=') || location.href.startsWith('https://www.youtube.com/live/')) {
  setStyle(); // 加 css 到 header
  danmuEleInit();
  function danmuEleInit() {
    let timer = setInterval(() => {
      if (document.querySelector('#danmu-ele')) {
        clearInterval(timer);
        return;
      }
      if (document.querySelector('#chat-container iframe')) { // 检测到iframe
        try {
          let danmuEle = getDanmuEle();
          danmuEle.danmuurl = videoDoc.URL;
          document.querySelector('body').appendChild(danmuEle)
        } catch { };
      }
    }, 888);
    setTimeout(() => {
      clearInterval(timer);
    }, 28888) // 半分钟没检测到iframe，放弃
  }
  // 监听页面跳转事件
  (function (history) {
    const pushState = history.pushState;
    const replaceState = history.replaceState;
    function onStateChange(event) {
      let danmuEle = document.getElementById('danmu-ele');
      if (!danmuEle) {
        danmuEleInit();
      } else if (danmuEle.danmuurl != document.URL) danmuEle.parentNode.removeChild(danmuEle);
    };
    window.addEventListener('popstate', onStateChange);
    window.addEventListener('hashchange', onStateChange);
    history.pushState = function (state) {
      const result = pushState.apply(history, arguments);
      onStateChange({ state });
      return result;
    };
    history.replaceState = function (state) {
      const result = replaceState.apply(history, arguments);
      onStateChange({ state });
      return result;
    };
    const observer = new MutationObserver(() => {
      if (document.location.href !== observer.lastHref) {
        observer.lastHref = document.location.href;
        onStateChange({});
      }
    });
    observer.observe(document, { subtree: true, childList: true });
    observer.lastHref = document.location.href;
  })(window.history);
};

// ✴️ 弹幕 iframe 页面
if (location.href.startsWith('https://www.youtube.com/live_chat')) {
  if (document.readyState == "complete" || document.readyState == "loaded" || document.readyState == "interactive") {
    main();
  } else {
    document.addEventListener("DOMContentLoaded", main);
  };
  function main() {
    let danmuEle = parent.document.querySelector("#danmu-ele");
    let labelText = document.querySelector('#label-text').innerText;
    let config = { childList: true, subtree: true };
    let observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (!danmuEle) danmuEle = parent.document.querySelector("#danmu-ele");
          if (!danmuEle) return;
          if (node.nodeType !== 1) return;
          if (!node.tagName.toLowerCase().match(/yt-live-chat-(text|paid)-message-renderer/)) return;
          let el = digestYtChatDom(node);
          if (!el) return
          // console. log(danmuEle.querySelector('#danmu-content'));
          danmuEle.querySelector('#danmu-content').appendChild(el);
          checkHeight(danmuEle);
        });
      });
    });
    observeDanmu();
    function observeDanmu() {
      let timer = setInterval(() => {
        let ytbChatEle = document.querySelector('#item-offset');
        if (!ytbChatEle) return;
        clearInterval(timer);
        observer.observe(ytbChatEle, config);
      }, 888);
    }
    setInterval(() => {
      if (labelText != document.querySelector('#label-text').innerText) {
        labelText = document.querySelector('#label-text').innerText;
        observeDanmu();
      }
    }, 888);
  };
};

// 获取聊天内容 小米（改
// let lastUserName;
function digestYtChatDom(dom) {
  const userPhotoElement = dom.querySelector("#author-photo #img");
  const userphoto = userPhotoElement ? userPhotoElement.outerHTML : '';
  const contentElement = dom.querySelector("#message");
  const content = contentElement ? contentElement.innerHTML : '';
  let usernameElement = dom.querySelector("#author-name");
  let username = usernameElement ? usernameElement.innerHTML : '';
  if (!username) return;
  if (configs.isFocusNames && !configs.focusNames.includes(username)) return;
  if (configs.isBlockNames && configs.blockNames.includes(username)) return;
  if (username && username.indexOf("<") > -1) {
    username = username.substring(0, username.indexOf("<")).trim();
  }
  // if (lastUserName == username) return;
  // lastUserName = username;
  let el = videoDoc.createElement('div');
  el.className = 'danmu-item';
  if (configs.isHighlightNames && configs.highlightNames.includes(username)) el.className += ' danmu-highlight';
  let color = '';
  if (dom.querySelector("#card") && dom.querySelector("#purchase-amount")) {
    username = "(SC) " + username;
    color = getComputedStyle(dom).getPropertyValue("--yt-live-chat-paid-message-primary-color");
    color = `style="color: ${color}"`;
  }
  el.innerHTML += `${userphoto}`;
  let separator = content ? '：' : '';
  el.innerHTML += `<span class="danmu-username-long" ${color}>${username}<span class="danmu-badge">`
    + `</span>${separator}</span>`;
  el.innerHTML +=
    `<span class="danmu-username-short" ${color}>${username.substring(0, 1)}<span class="danmu-badge">`
    + `</span>${separator}</span>`;
  el.innerHTML += `<span class="danmu-text" ${color}>${content}</span>`;
  setTimeout(() => {
    if (el.querySelector('img').src.startsWith('data')) {
      el.querySelector('img').src = dom.querySelector("#author-photo #img").src;
    }
    try {
      let badge = dom.querySelector("yt-icon div");
      let path = badge.querySelector('path');
      if (path.getAttribute('d').startsWith('M9.64589146,7.05569719')) {
        badge.style.width = '1em';
        badge.style.display = 'inline-block';
        badge.style.color = 'lightyellow';
        el.querySelector('.danmu-badge').appendChild(badge);
      }
    } catch (e) { console.log(e) }
  }, 88)
  return el;
};

// ✴️ 初始化
function eleRefresh(danmuEle, ifTextRefresh) {
  danmuEle = danmuEle || videoDoc.querySelector('#danmu-ele');
  if (!danmuEle) return;
  danmuEle.querySelector('#danmu-setting-status').innerText = `${configs.isFocusNames ? '✅' : '❌'}`
    + `${configs.isHighlightNames ? '✅' : '❌'}${configs.isBlockNames ? '✅' : '❌'}`;
  danmuEle.querySelector('#show-mode').innerText = modes[configs.showMode];
  danmuEle.querySelector('#danmu-fontsize').innerText = `字号${configs.fontSize}`;
  danmuEle.querySelector('#danmu-gap').innerText = `间距${configs.gap}`;
  danmuEle.querySelector('#danmu-height').innerText = `高度${configs.maxHeight}`;
  danmuEle.querySelector('#danmu-is-focus-names').checked = configs.isFocusNames;
  danmuEle.querySelector('#danmu-is-highlight-names').checked = configs.isHighlightNames;
  danmuEle.querySelector('#danmu-is-block-names').checked = configs.isBlockNames;
  setStyle(danmuEle);
  if (ifTextRefresh) textRefresh(danmuEle);
};

function textRefresh(danmuEle) {
  danmuEle.querySelector('#danmu-focus-names').value = configs.focusNames.join('\n');
  danmuEle.querySelector('#danmu-highlight-names').value = configs.highlightNames.join('\n');
  danmuEle.querySelector('#danmu-block-names').value = configs.blockNames.join('\n');
}

// 建立基本元素
function getDanmuEle() {
  let danmuEle = document.createElement('div')
  danmuEle.id = 'danmu-ele';
  danmuEle.innerHTML = `
      <div id="danmu-ctrl" >
        <button id="danmu-settings">设置</button>&nbsp;
        <button id="show-mode"></button>&nbsp;
        <span id="danmu-setting-status"></span>
      </div>
      <div id="danmu-content"></div>
      <div id="danmu-pop-board">
        <span style="white-space: nowrap;">
          <span id="danmu-fontsize"></span>
          <button id="danmu-fontsize-add">+</button>
          <button id="danmu-fontsize-minus">-</button>
        </span>&nbsp;&nbsp;
        <span style="white-space: nowrap;">
          <span id="danmu-gap"></span>
          <button id="danmu-gap-add">+</button>
          <button id="danmu-gap-minus">-</button>
        </span>&nbsp;&nbsp;
        <span style="white-space: nowrap;">
          <span id="danmu-height"></span>
          <button id="danmu-height-add">+</button>
          <button id="danmu-height-minus">-</button>
        </span>&nbsp;&nbsp;
        <div style="margin:0.28em 0">
          <input type="checkbox" id="danmu-is-focus-names">
          关注模式：只显示这些用户名的弹幕。每行一个。
        </div>
        <textarea id="danmu-focus-names" style="width: 100%; height: 128px"></textarea>
        <div style="margin:0.28em 0">
          <input type="checkbox" id="danmu-is-highlight-names">
          高亮模式：这些用户名会高亮。
        </div>
        <textarea id="danmu-highlight-names" style="width: 100%; height: 128px"></textarea>
        <div style="margin:0.28em 0">
          <input type="checkbox" id="danmu-is-block-names">
          屏蔽模式：这些用户名会被屏蔽。
        </div>
        <textarea id="danmu-block-names" style="width: 100%; height: 128px"></textarea>
        <div style="height:0.5em"></div>
        <button id="danmu-pop-board-cancel">取消</button>
        <button id="danmu-pop-board-submit">确定</button>
      </div>`;
  eleRefresh(danmuEle);
  let danmuContentEl = danmuEle.querySelector('#danmu-content');

  // 移入移出显示
  let isMouseIn;
  danmuEle.addEventListener('mouseenter', () => {
    isMouseIn = true;
    danmuEle.querySelector('#danmu-ctrl').style.visibility = 'visible';
    // danmuContentEl.style.border = 'white solid 1px';
    // danmuContentEl.style.borderRight = '8.8px dashed white';
    // danmuContentEl.style.borderBottom = '8.8px dashed white';
    function addStripedBorder(element) {
      element.style.borderRight = '8px solid black';
      element.style.borderBottom = '8px solid black';
      element.style.borderLeft = '8px solid white';
      element.style.borderImage = 'repeating-linear-gradient(45deg, black, black 5px, white 5px, white 10px) 1';
    }
    addStripedBorder(danmuContentEl);
    danmuContentEl.style.height = `${configs.maxHeight - 1}px`;
  });
  danmuEle.addEventListener('mouseleave', () => {
    isMouseIn = false;
    setTimeout(() => {
      if (!isMouseIn) {
        danmuEle.querySelector('#danmu-ctrl').style.visibility = 'hidden';
        danmuContentEl.style.borderLeft = '';
        danmuContentEl.style.borderRight = '';
        danmuContentEl.style.borderBottom = '';
        danmuContentEl.style.borderImage = '';
        danmuContentEl.style.height = 'auto';
      }
    }, 288)
  });

  // 阻断点击事件穿透 屏蔽
  danmuEle.querySelector('#danmu-ctrl').addEventListener('click', event => event.stopPropagation());
  danmuEle.querySelector('#danmu-ctrl').addEventListener('dblclick', event => event.stopPropagation());

  // 控制功能 - 字号大小
  function fontSizeChange(change) {
    setLocal({ fontSize: Math.max(0, configs.fontSize + change) });
    eleRefresh(danmuEle);
  };
  danmuEle.querySelector('#danmu-fontsize-add').addEventListener('click', e => fontSizeChange(1));
  danmuEle.querySelector('#danmu-fontsize-minus').addEventListener('click', e => fontSizeChange(-1));

  // 控制功能 - 间距大小
  function gapChange(change) {
    setLocal({ gap: configs.gap + change });
    eleRefresh(danmuEle);
  };
  danmuEle.querySelector('#danmu-gap-add').addEventListener('click', e => gapChange(1));
  danmuEle.querySelector('#danmu-gap-minus').addEventListener('click', e => gapChange(-1));

  // 控制功能 - 高度
  function setHeight(num) {
    setLocal({ maxHeight: Math.max(0, configs.maxHeight + num) });
    danmuContentEl.style.height = `${configs.maxHeight - 1}px`;
    danmuContentEl.style.maxHeight = `${configs.maxHeight}px`;
    eleRefresh(danmuEle);
    checkHeight(danmuEle);
  }
  danmuEle.querySelector('#danmu-height-add').addEventListener('click', e => setHeight(18));
  danmuEle.querySelector('#danmu-height-minus').addEventListener('click', e => setHeight(-18));

  // 显示模式切换
  danmuEle.querySelector('#show-mode').addEventListener('click', () => {
    setLocal({ showMode: (configs.showMode + 1) % Object.keys(modes).length });
    danmuEle.querySelector('#show-mode').innerText = modes[configs.showMode];
    eleRefresh(danmuEle);
  });

  // 用户筛选相关功能
  let namesChanged = false;
  function settingSubmit() {
    setLocal({
      focusNames: danmuEle.querySelector('#danmu-focus-names').value.split('\n').filter(item => item.trim()),
      highlightNames: danmuEle.querySelector('#danmu-highlight-names').value.split('\n').filter(item => item.trim()),
      blockNames: danmuEle.querySelector('#danmu-block-names').value.split('\n').filter(item => item.trim()),
    });
    danmuEle.querySelector('#danmu-pop-board').style.display = 'none';
    namesChanged = false;
  }
  danmuEle.querySelector('#danmu-settings').addEventListener('click', () => {
    if (danmuEle.querySelector('#danmu-pop-board').style.display == 'block') {
      settingSubmit();
    } else {
      eleRefresh(danmuEle, true);
      danmuEle.querySelector('#danmu-pop-board').style.display = 'block';
    };
  });
  danmuEle.querySelector('#danmu-pop-board-cancel').addEventListener('click', () => {
    if (namesChanged) {
      if (confirm('名字列表有修改，是否丢弃这些修改？')) {
        danmuEle.querySelector('#danmu-pop-board').style.display = 'none';
        eleRefresh(danmuEle);
        namesChanged = false;
      } else return;
    } else {
      danmuEle.querySelector('#danmu-pop-board').style.display = 'none';
      eleRefresh(danmuEle);
    }
  });

  danmuEle.querySelector('#danmu-pop-board-submit').addEventListener('click', e => settingSubmit());
  danmuEle.querySelector('#danmu-is-focus-names').addEventListener('change', event => {
    setLocal({ isFocusNames: event.target.checked });
    eleRefresh(danmuEle);
  });
  danmuEle.querySelector('#danmu-is-highlight-names').addEventListener('change', event => {
    setLocal({ isHighlightNames: event.target.checked });
    eleRefresh(danmuEle);
  });
  danmuEle.querySelector('#danmu-is-block-names').addEventListener('change', event => {
    setLocal({ isBlockNames: event.target.checked });
    eleRefresh(danmuEle);
  });
  danmuEle.querySelector('#danmu-focus-names').addEventListener('change', () => { namesChanged = true });
  danmuEle.querySelector('#danmu-highlight-names').addEventListener('change', () => { namesChanged = true });
  danmuEle.querySelector('#danmu-block-names').addEventListener('change', () => { namesChanged = true });

  // 鼠标边缘箭头
  let mouseStatus = { width: 0, height: 0, left: 0 };
  danmuContentEl.addEventListener('mousemove', function (event) {
    const rect = danmuContentEl.getBoundingClientRect();
    const offset = 10;
    if (event.clientX <= rect.right && event.clientX >= rect.right - offset &&
      event.clientY <= rect.bottom && event.clientY >= rect.bottom - offset) {
      danmuContentEl.style.cursor = 'nwse-resize'; // 右下
      mouseStatus = { width: 1, height: 1, left: 0 };
    } else if (event.clientX >= rect.left && event.clientX <= rect.left + offset &&
      event.clientY <= rect.bottom && event.clientY >= rect.bottom - offset) {
      danmuContentEl.style.cursor = 'nesw-resize'; // 左下
      mouseStatus = { width: -1, height: 1, left: 1 };
    } else if (event.clientX >= rect.left && event.clientX <= rect.left + offset) {
      danmuContentEl.style.cursor = 'ew-resize'; // 左
      mouseStatus = { width: -1, height: 0, left: 1 };
    } else if (event.clientX <= rect.right && event.clientX >= rect.right - offset) {
      danmuContentEl.style.cursor = 'ew-resize'; // 右
      mouseStatus = { width: 1, height: 0, left: 0 };
    } else if (event.clientY <= rect.bottom && event.clientY >= rect.bottom - offset) {
      danmuContentEl.style.cursor = 'ns-resize'; // 下
      mouseStatus = { width: 0, height: 1, left: 0 };
    } else {
      danmuContentEl.style.cursor = 'default'; // 默认箭头
      mouseStatus = { width: 0, height: 0, left: 0 };
    }
  });

  // 边缘拖拽
  danmuContentEl.addEventListener('mousedown', function (event) {
    event.stopPropagation();
    let doc = event.target.ownerDocument;
    let x = event.clientX;
    let y = event.clientY;
    let width = danmuEle.offsetWidth;
    let height = danmuContentEl.offsetHeight;
    let left = danmuEle.offsetLeft;
    let mouse = JSON.parse(JSON.stringify(mouseStatus));

    function doDrag(e) {
      e.stopPropagation();
      danmuEle.style.width = width + mouse.width * (e.clientX - x) + 'px';
      danmuContentEl.style.height = height + mouse.height * (e.clientY - y) + 'px';
      danmuContentEl.style.maxHeight = height + mouse.height * (e.clientY - y) + 'px';
      danmuEle.style.left = left + mouse.left * (e.clientX - x) + 'px';
    };

    function stopDrag(e) {
      mouseStatus = { width: 0, height: 0, left: 0 };
      e.stopPropagation();
      videoDoc.body.style.userSelect = '';
      videoDoc.body.style.webkitUserSelect = '';
      videoDoc.body.style.msUserSelect = '';
      videoDoc.body.style.mozUserSelect = '';
      setLocal({ width: danmuContentEl.offsetWidth, maxHeight: danmuContentEl.offsetHeight, left: danmuEle.offsetLeft });
      eleRefresh(danmuEle);
      doc.removeEventListener('mousemove', doDrag);
      doc.removeEventListener('mouseup', stopDrag);
    };

    if (mouseStatus.width || mouseStatus.height) {
      videoDoc.body.style.userSelect = 'none';
      videoDoc.body.style.webkitUserSelect = 'none';
      videoDoc.body.style.msUserSelect = 'none';
      videoDoc.body.style.mozUserSelect = 'none';
      doc.addEventListener('mousemove', doDrag);
      doc.addEventListener('mouseup', stopDrag);
    };
  });

  // 整体拖拽
  danmuEle.querySelector('#danmu-ctrl').style.cursor = 'grab';
  danmuEle.querySelector('#danmu-ctrl').addEventListener('mousedown', drag);
  function drag(e) {
    let doc = e.target.ownerDocument;
    e.stopPropagation();
    e.preventDefault();
    let shiftX = e.clientX - danmuEle.getBoundingClientRect().left;
    let shiftY = e.clientY - danmuEle.getBoundingClientRect().top;
    function moveAt(pageX, pageY) {
      danmuEle.querySelector('#danmu-ctrl').style.visibility = 'visible';
      configs.top = pageY - shiftY;
      configs.left = pageX - shiftX;
      danmuEle.style.top = configs.top + 'px';
      danmuEle.style.left = configs.left + 'px';
    }
    function onMouseMove(event) {
      moveAt(event.pageX, event.pageY);
    }
    doc.addEventListener('mousemove', onMouseMove);
    doc.addEventListener('mouseup', function () {
      setLocal();
      doc.removeEventListener('mousemove', onMouseMove);
      doc.onmouseup = null;
    }, { once: true });
  }
  return danmuEle;
};

// console. log('YouTube 悬浮弹幕');
// 边缘测试：
//   iframe重新加载时，会不会清空
//   从直播跳到视频时，会不会清空