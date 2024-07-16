// ==UserScript==
// @name         Youtube 悬浮弹幕
// @namespace    67373tools
// @version      0.1.17
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

// ✴️ 通用
localStorage.removeItem('danmuParams'); // 清除旧版数据;

const videoDoc = parent.document.querySelector('video').ownerDocument;
const modes = { "0": 'all show', "1": 'short name', "2": 'no name', "3": 'all hide' };
let configs;
const defaultPosition =
  { top: 88, left: 58, maxHeight: 528, width: 528, fontSize: 15, gap: 3, transparent: 0.58 };
const defaultConfigs = {
  ...defaultPosition, showMode: 0, singleLine: false, wrap: false, speed: 0.8, language: 'English',
  focusNames: ['每行一个用户名。', '写成这样的格式可以部分匹配：{part}xxxxxxxx'],
  highlightNames: ['One username each line.', 'Part match syntax：{part}xxxxxxxx'], blockNames: [],
  isFocusNames: false, isHighlightNames: false, isBlockNames: false,
};
function deepCopy(a) {
  try {
    return structuredClone(a);
  } catch {
    return JSON.parse(JSON.stringify(a));
  }
}
getLocal();
function getLocal() {
  configs = deepCopy(defaultConfigs);
  const configsStr = localStorage.getItem('danmuConfigs') || '{}';
  configs = Object.assign({}, configs, JSON.parse(configsStr));
};
for (let key in configs) {
  if (!(key in defaultConfigs)) delete configs[key];
};
setLocal();

function setLocal(params) {
  localStorage.setItem('danmuConfigs', JSON.stringify(Object.assign(configs, params)));
};

// css 的 transition 方案：弃用，自动设置时间，但多个元素一起变会卡
// height 和 tramsform 方案：
//   弃用，多个 div 位于一行时，高度设置没用，还是会挤住下面的元素，可能是 div 内部元素的问题。但懒得解决
// margin 的方案：弃用，多个元素还是会卡，看来多个元素一起变化的话无论如何都会卡？
function linesInfo(danmuEle, ifFirstLine, ifSecondLine) {
  let children = danmuEle.querySelectorAll('.danmu-item');
  if (children.length == 0) return;
  let lastChild = children[children.length - 1];
  let lastChildRect = lastChild.getBoundingClientRect();
  let firstChildRect = children[0].getBoundingClientRect();
  let margin = parseFloat(getComputedStyle(children[0]).margin);
  let baseHeight = margin + firstChildRect.height;
  let diff = lastChildRect.bottom - danmuEle.getBoundingClientRect().bottom;
  let danmuCtrlRect = danmuEle.querySelector('#danmu-ctrl').getBoundingClientRect();
  let distance = firstChildRect.bottom - danmuCtrlRect.bottom;
  let isOverlap1 = firstChildRect.top < danmuCtrlRect.bottom;
  let firstLine, secondLine;
  if (ifFirstLine) {
    firstLine = [children[0]];
    for (let i = 1; i < children.length; i++) {
      if (children[i].getBoundingClientRect().top <= children[0].getBoundingClientRect().top + 3) {
        firstLine[i] = children[i];
      } else {
        if (ifSecondLine) {
          secondLine = [children[i]];
          for (let j = i + 1; j < children.length; j++) {
            if (children[j].getBoundingClientRect().top <= children[i].getBoundingClientRect().top + 3) {
              secondLine[j - i] = children[j];
            } else break;
          };
        }
        break;
      };
    }
  }
  return { notEmpty: true, children, distance, isOverlap1, diff, margin, baseHeight, firstLine, secondLine };
};

function removeCoverdTops(danmuEle, force) {
  let l = linesInfo(danmuEle, true, false);
  try {
    while (l?.distance < 0 || (force && l?.firstLine)) {
      force = false;
      for (let i = 0; i < l.firstLine.length; i++) {
        l.firstLine[i].parentNode.removeChild(l.firstLine[i]);
      };
      let contentEl = danmuEle.querySelector('#danmu-content');
      contentEl.style.marginTop = Math.min(0, parseFloat(getComputedStyle(contentEl).marginTop) + l.baseHeight) + 'px';
      l = linesInfo(danmuEle, true, false);
    };
  } catch (e) { console.log(e) };
  return l;
};

// 检查高度设计
// 检查间隔 1/25 秒 timesVar
// 检查是否有完全覆盖的弹幕并删除
// 如果有 overlap 或 底部超框，说明需要调整

// 移动基础1：下边超出距离 diff
// 移动基础2：第一行元素剩余距离 distance
// 本次移动最终目标：diff 和 distance 的最大值 move
// 本次移动阶段性目标：move * timesVar
// 移动基础3：最小值：基础高度 * timesVar，但不能超过 move
// 移动基础3：上限：0.8高度，但不能超过 move

// 移动完后进入下一次检查

videoDoc.danmuObj = { isCheckingHeight: undefined };
const timesVar = 1 / 28;
function checkHeight(danmuEle) {
  if (videoDoc.danmuObj.isCheckingHeight) return;
  videoDoc.danmuObj.isCheckingHeight = true;
  // 检查是否有完全覆盖的弹幕并删除
  let l = removeCoverdTops(danmuEle);
  // 如果有 overlap 或 底部超框，说明需要调整
  if (!l) { videoDoc.danmuObj.isCheckingHeight = false; return; };
  if (!l.isOverlap1 && l.diff <= 0) { videoDoc.danmuObj.isCheckingHeight = false; return; };
  // 移动基础
  let move = Math.max(l.diff, l.distance);
  let currentMove = move * timesVar;
  currentMove = Math.max(l.baseHeight * timesVar, currentMove);
  currentMove = Math.min(l.baseHeight * 0.8, currentMove);
  currentMove = Math.min(move, currentMove);
  let opacity = l.distance / l.baseHeight;
  l.firstLine.forEach(node => {
    try { node.style.opacity = opacity } catch { };
  });
  let contentEl = danmuEle.querySelector('#danmu-content');
  let currentTop = parseFloat(getComputedStyle(contentEl).marginTop);
  contentEl.style.marginTop = `${currentTop - currentMove}px`;
  setTimeout(() => {
    videoDoc.danmuObj.isCheckingHeight = false;
    checkHeight(danmuEle);
  }, timesVar * configs.speed * 1000);
};

function styleCalc() {
  let danmuItemPaddingTop = configs.gap;
  let danmuItemMargin = configs.gap / 5 + 0.5;
  return {
    danmuItemPaddingTop, danmuItemMargin,
    danmuItemHeight: configs.fontSize + danmuItemPaddingTop + danmuItemMargin
  };
};

function setStyle() {
  let floatDanmuStyle = videoDoc.querySelector('#float-danmu-style');
  if (!floatDanmuStyle) {
    floatDanmuStyle = videoDoc.createElement('style');
    floatDanmuStyle.id = 'float-danmu-style';
    document.head.appendChild(floatDanmuStyle);
  }
  let danmuItemDisplay = configs.singleLine ? 'block' : (configs.wrap ? 'inline' : 'inline-block');
  let danmuItemLineHeight = (!configs.singleLine && configs.wrap)
    ? `line-height: ${1.28 * configs.fontSize + 2.18 * configs.gap}px` : '';
  let baseStyle = `
  .danmu-highlight {
    border: solid 1.8px rgba(255, 191, 0, 1.8);
    box-shadow: inset 0 0 ${configs.gap + configs.fontSize / 2}px rgba(255, 191, 0, 0.8); /* 内发光效果 */
  }
  #danmu-ele {
    position: absolute;
    color: white;
    height: auto;
    z-index: 911;
    top: ${configs.top}px;
    left: ${configs.left}px;
    width: ${configs.width}px;
  }
  #danmu-ctrl {
    z-index: 1013;
    position: relative;
    background-color: rgba(0,0,0,0.5);
    border: solid white 0.1px;
    padding: 2.8px;
    font-size: 12.8px;
  }
  #danmu-pop-board {
    z-index: 418094;
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #f0f0f0;
    padding: 18px;
    border: 1px solid #ccc;
    color: black;
    font-size: 1.18em;
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
    width: fit-content;
    background-color: rgba(0, 0, 0, ${configs.transparent});
    border-radius: ${configs.gap / 2.8 + 0.8}px;
    padding: ${styleCalc().danmuItemPaddingTop}px ${configs.gap * 1.5}px;
    margin: ${styleCalc().danmuItemMargin}px;
    display: ${danmuItemDisplay};
    ${danmuItemLineHeight};
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
  let showModeStyle = '';
  switch (modes[configs.showMode]) {
    case 'all show':
      showModeStyle = `
        .danmu-username-long { display: inline !important; }
        .danmu-username-short { display: none !important; }`;
      break;
    case 'short name':
      showModeStyle = `
        .danmu-username-long { display: none !important; }
        .danmu-username-short { display: inline !important; }`;
      break;
    case 'no name':
      showModeStyle = `
        .danmu-username-long { display: none !important; }
        .danmu-username-short { display: none !important; }`;
      break;
  };
  floatDanmuStyle.textContent = baseStyle + showModeStyle;
}

// ✴️ 主页面
if (location.href.startsWith('https://www.youtube.com/watch?v=')
  || location.href.startsWith('https://www.youtube.com/live/')) {
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

  GM_registerMenuCommand("重置位置 reset position", () => {
    setLocal(defaultPosition);
    const danmuEle = videoDoc.querySelector('#danmu-ele');
    eleRefresh(danmuEle);
    danmuEle.querySelector('#danmu-ctrl').style.visibility = 'visible';
    danmuEle.querySelector('#danmu-content').style.height = defaultPosition.maxHeight + 'px';
    danmuEle.querySelector('#danmu-content').style.maxHeight = defaultPosition.maxHeight + 'px';
  });

  GM_registerMenuCommand("重置除了用户名外的所有设置 reset except name lists", () => {
    let oldConfigs = deepCopy(configs);
    localStorage.removeItem('danmuConfigs');
    getLocal();
    setLocal({
      focusNames: oldConfigs.focusNames,
      highlightNames: oldConfigs.highlightNames,
      blockNames: oldConfigs.blockNames
    });
    const danmuEle = videoDoc.querySelector('#danmu-ele');
    eleRefresh(danmuEle);
    danmuEle.querySelector('#danmu-ctrl').style.visibility = 'visible';
    danmuEle.querySelector('#danmu-content').style.height = defaultPosition.maxHeight + 'px';
    danmuEle.querySelector('#danmu-content').style.maxHeight = defaultPosition.maxHeight + 'px';
  });

  GM_registerMenuCommand("重置所有设置 reset all", () => {
    if (confirm('所有设置都会重置，名字列表会被清空，是否继续'
      + '\nAll sets will be restored, name lists will be cleared. Continue?')) {
      setLocal(defaultConfigs);
      getLocal();
      setLocal();
      const danmuEle = videoDoc.querySelector('#danmu-ele');
      eleRefresh(danmuEle);
      danmuEle.querySelector('#danmu-ctrl').style.visibility = 'visible';
      danmuEle.querySelector('#danmu-content').style.height = defaultPosition.maxHeight + 'px';
      danmuEle.querySelector('#danmu-content').style.maxHeight = defaultPosition.maxHeight + 'px';
    } else return;
  });

};

// ✴️ 弹幕 iframe 页面
if (location.href.startsWith('https://www.youtube.com/live_chat')) {
  let danmuEle = parent.document.querySelector("#danmu-ele");
  if (document.readyState == "complete" || document.readyState == "loaded"
    || document.readyState == "interactive") {
    main();
  } else {
    document.addEventListener("DOMContentLoaded", main);
  };
  setInterval(getLocal, 1888); // 父页面操作的时候，很容易数据不同步。
  function main() {
    let config = { childList: true, subtree: true };
    let observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (!danmuEle) danmuEle = parent.document.querySelector("#danmu-ele");
          if (!danmuEle) return;
          if (node.nodeType !== 1) return;
          if (!node.tagName.toLowerCase().match(/yt-live-chat-(text|paid)-message-renderer/)) return;
          let el = digestYtChatDom(node);
          if (!el) return;
          danmuEle.querySelector('#danmu-content').appendChild(el);
          try { checkHeight(danmuEle) } catch { videoDoc.danmuObj.isCheckingHeight = false };
        });
      });
    });
    let timer = setInterval(() => {
      let ytbChatEle = document.querySelector('#contents.style-scope.yt-live-chat-app');
      if (!ytbChatEle) return;
      clearInterval(timer);
      observer.observe(ytbChatEle, config);
    }, 888);
  };

  // ⬜️ 获取聊天内容 小米（改
  const hasName = (name, arr) => {
    name = name.toLowerCase();
    let lowArr = arr.map(a => a.toLowerCase());
    return lowArr.find(a => {
      if (a.startsWith('{part}')) {
        let str = a.replace('{part}', '');
        return name.includes(str);
      } else return name == a;
    });
  };
  function digestYtChatDom(dom) {
    const userPhotoElement = dom.querySelector("#author-photo #img");
    const userphoto = userPhotoElement ? userPhotoElement.outerHTML : '';
    const contentElement = dom.querySelector("#message");
    const content = contentElement ? contentElement.innerHTML : '';
    let usernameElement = dom.querySelector("#author-name");
    let username = usernameElement ? usernameElement.innerHTML : ''; // 这里参照原有代码，就不改了
    if (!username) return;
    username = username.match(/(.*?)</)[1];
    if (configs.isFocusNames && !hasName(username, configs.focusNames)) return;
    if (configs.isBlockNames && hasName(username, configs.blockNames)) return;
    let el = videoDoc.createElement('div');
    el.className = 'danmu-item';
    if (configs.isHighlightNames && hasName(username, configs.highlightNames)) el.className += ' danmu-highlight';
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
      if (el.querySelector('img')?.src?.startsWith('data')) {
        el.querySelector('img').src = dom.querySelector("#author-photo #img").src;
      }
      try {
        let badge = dom.querySelector("yt-icon div").cloneNode(true);
        let path = badge.querySelector('path');
        if (path.getAttribute('d').startsWith('M9.64589146,7.05569719')) {
          switch (0) {
            case 0:
              badge.style.width = '1em';
              badge.style.display = 'inline-block';
              badge.style.color = 'lightyellow';
              el.querySelector('.danmu-badge').appendChild(badge);
              break;
            case 1:
              el.querySelector('.danmu-badge').innerText = '🔧';
              break;
          }
        }
      } catch (e) { }
    }, 588)
    return el;
  };
};

// ✴️ ⬜️ 初始化
function eleRefresh(danmuEle, ifTextRefresh) {
  danmuEle = danmuEle || videoDoc.querySelector('#danmu-ele');
  if (!danmuEle) return;
  danmuEle.querySelector('#danmu-setting-status').innerText = `${configs.isFocusNames ? '✅' : '❌'}`
    + `${configs.isHighlightNames ? '✅' : '❌'}${configs.isBlockNames ? '✅' : '❌'}`;
  danmuEle.querySelector('#show-mode').innerText = modes[configs.showMode];
  danmuEle.querySelector('#danmu-fontsize').innerText = `font size ${configs.fontSize}`;
  danmuEle.querySelector('#danmu-speed').innerText = `speed 1/${configs.speed}`;
  danmuEle.querySelector('#danmu-gap').innerText = `gap ${configs.gap}`;
  danmuEle.querySelector('#danmu-transparent').innerText = `transparency ${configs.transparent}`;
  danmuEle.querySelector('#danmu-height').innerText = `height ${configs.maxHeight}`;
  danmuEle.querySelector('#danmu-single-line').checked = configs.singleLine;
  danmuEle.querySelector('#danmu-wrap').checked = configs.wrap;
  danmuEle.querySelector('#danmu-is-focus-names').checked = configs.isFocusNames;
  danmuEle.querySelector('#danmu-is-highlight-names').checked = configs.isHighlightNames;
  danmuEle.querySelector('#danmu-is-block-names').checked = configs.isBlockNames;
  if (modes[configs.showMode] == 'all hide') {
    danmuEle.querySelector('#danmu-content').style.display = 'none';
  } else {
    danmuEle.querySelector('#danmu-content').style.display = 'block';
    try { checkHeight(danmuEle) } catch { videoDoc.danmuObj.isCheckingHeight = false };
  };
  setStyle();
  if (ifTextRefresh) textRefresh(danmuEle);
};

function textRefresh(danmuEle) {
  danmuEle.querySelector('#danmu-focus-names').value = configs.focusNames.join('\n');
  danmuEle.querySelector('#danmu-highlight-names').value = configs.highlightNames.join('\n');
  danmuEle.querySelector('#danmu-block-names').value = configs.blockNames.join('\n');
}

// ⬜️ 建立基本元素
function getDanmuEle() {
  let danmuEle = document.createElement('div')
  danmuEle.id = 'danmu-ele';
  danmuEle.innerHTML = `
    <div id="danmu-ctrl" >
      <button id="danmu-settings">settings</button>&nbsp;
      <button id="show-mode"></button>&nbsp;
      <span id="danmu-setting-status"></span>
    </div>
    <div id="danmu-content"></div>
    <div id="danmu-pop-board">
      <span style="white-space: nowrap;">
        <input type="checkbox" id="danmu-single-line">
        single line&nbsp;&nbsp;
      </span>
      <span style="white-space: nowrap; display: none">
        <input type="checkbox" id="danmu-wrap">
        full line&nbsp;&nbsp;
      </span>
      <span style="white-space: nowrap;">
        <span id="danmu-fontsize"></span>
        <button id="danmu-fontsize-add">+</button>
        <button id="danmu-fontsize-minus">-</button>
      </span>&nbsp;&nbsp;
      <span style="white-space: nowrap;">
        <span id="danmu-speed"></span>
        <button id="danmu-speed-add">+</button>
        <button id="danmu-speed-minus">-</button>
      </span>&nbsp;&nbsp;
      <span style="white-space: nowrap;">
        <span id="danmu-gap"></span>
        <button id="danmu-gap-add">+</button>
        <button id="danmu-gap-minus">-</button>
      </span>&nbsp;&nbsp;
      <span style="white-space: nowrap;">
        <span id="danmu-transparent"></span>
        <button id="danmu-transparent-add">+</button>
        <button id="danmu-transparent-minus">-</button>
      </span>&nbsp;&nbsp;
      <span style="white-space: nowrap;">
        <span id="danmu-height"></span>
        <button id="danmu-height-add">+</button>
        <button id="danmu-height-minus">-</button>
      </span>&nbsp;&nbsp;
      <div style="margin:0.28em 0">
        <input type="checkbox" id="danmu-is-focus-names">
        关注模式：只显示这些用户名的弹幕。每行一个。部分匹配的格式：{part}xxxx
        <br/>Focus mode: only shows these names. One name each line. Part match mode: {part}xxxxx
      </div>
      <textarea id="danmu-focus-names" style="width: 100%; height: 88px"></textarea>
      <div style="margin:0.28em 0">
        <input type="checkbox" id="danmu-is-highlight-names">
        高亮模式：这些用户名会高亮。
        <br/>Hightlight mode: these names will be highlighted.
      </div>
      <textarea id="danmu-highlight-names" style="width: 100%; height: 88px"></textarea>
      <div style="margin:0.28em 0">
        <input type="checkbox" id="danmu-is-block-names">
        屏蔽模式：这些用户名会被屏蔽。
        <br/>Block mode: these names will be blocked.
      </div>
      <textarea id="danmu-block-names" style="width: 100%; height: 88px"></textarea>
      <div style="height:0.5em"></div>
      <button id="danmu-pop-board-cancel">no</button>
      <button id="danmu-pop-board-submit">yes</button>
    </div>`;
  eleRefresh(danmuEle);
  let danmuContentEl = danmuEle.querySelector('#danmu-content');

  // ⬜️ 移入移出显示
  let isMouseIn;
  danmuEle.addEventListener('mouseenter', () => {
    isMouseIn = true;
    danmuEle.querySelector('#danmu-ctrl').style.visibility = 'visible';
    danmuContentEl.style.borderBottom = 'Coral solid 0.1px';
    danmuContentEl.style.borderLeft = '8.8px dashed Coral';
    danmuContentEl.style.borderRight = '8.8px dashed Coral';
    danmuContentEl.style.height = `${configs.maxHeight - 1}px`;
  });
  danmuEle.addEventListener('mouseleave', () => {
    isMouseIn = false;
    setTimeout(() => {
      if (!isMouseIn) {
        danmuEle.querySelector('#danmu-ctrl').style.visibility = 'hidden';
        danmuContentEl.style.borderBottom = '';
        danmuContentEl.style.borderLeft = '';
        danmuContentEl.style.borderLeft = '';
        danmuContentEl.style.border = '';
        danmuContentEl.style.height = 'auto';
      }
    }, 158)
  });

  // ⬜️ 阻断点击事件穿透 屏蔽
  danmuEle.querySelector('#danmu-ctrl').addEventListener('click', event => event.stopPropagation());
  danmuEle.querySelector('#danmu-ctrl').addEventListener('dblclick', event => event.stopPropagation());

  // ⬜️ 行显示模式
  danmuEle.querySelector('#danmu-single-line').addEventListener('change', event => {
    setLocal({ singleLine: event.target.checked });
    setStyle();
  });
  danmuEle.querySelector('#danmu-wrap').addEventListener('change', event => {
    setLocal({ wrap: event.target.checked });
    setStyle();
  });

  // ⬜️ 控制功能 - 字号大小
  function fontSizeChange(change) {
    setLocal({ fontSize: Math.max(0, configs.fontSize + change) });
    eleRefresh(danmuEle);
  };
  danmuEle.querySelector('#danmu-fontsize-add').addEventListener('click', e => fontSizeChange(1));
  danmuEle.querySelector('#danmu-fontsize-minus').addEventListener('click', e => fontSizeChange(-1));

  // ⬜️ 控制功能 - 速度
  function speedChange(change) {
    setLocal({ speed: Math.max(0, Number((configs.speed + change).toFixed(2))) });
    eleRefresh(danmuEle);
  };
  danmuEle.querySelector('#danmu-speed-add').addEventListener('click', e => speedChange(-0.05));
  danmuEle.querySelector('#danmu-speed-minus').addEventListener('click', e => speedChange(0.05));

  // ⬜️ 控制功能 - 间距大小
  function gapChange(change) {
    setLocal({ gap: configs.gap + change });
    eleRefresh(danmuEle);
  };
  danmuEle.querySelector('#danmu-gap-add').addEventListener('click', e => gapChange(1));
  danmuEle.querySelector('#danmu-gap-minus').addEventListener('click', e => gapChange(-1));

  // ⬜️ 控制功能 - 透明度
  let transparentTimerI;
  function transparentChange(change) {
    change = Number((configs.transparent + change).toFixed(2));
    setLocal({ transparent: change });
    eleRefresh(danmuEle);
  };
  function transparentMouseDown(change) {
    transparentChange(change);
    transparentTimerI = setInterval(() => {
      transparentChange(change * 8);
    }, 888)
    videoDoc.addEventListener('mouseup', transparentMouseStop);
  };
  function transparentMouseStop() {
    clearInterval(transparentTimerI);
    videoDoc.removeEventListener('mouseup', transparentMouseStop);
  }
  danmuEle.querySelector('#danmu-transparent-add')
    .addEventListener('mousedown', e => transparentMouseDown(0.01));
  danmuEle.querySelector('#danmu-transparent-minus')
    .addEventListener('mousedown', e => transparentMouseDown(-0.01));

  // ⬜️ 控制功能 - 高度
  function setHeight(num) {
    setLocal({ maxHeight: Math.max(0, configs.maxHeight + num) });
    danmuContentEl.style.height = `${configs.maxHeight - 1}px`;
    danmuContentEl.style.maxHeight = `${configs.maxHeight}px`;
    eleRefresh(danmuEle);
  }
  danmuEle.querySelector('#danmu-height-add').addEventListener('click', e => setHeight(18));
  danmuEle.querySelector('#danmu-height-minus').addEventListener('click', e => setHeight(-18));

  // ⬜️ 显示模式切换
  danmuEle.querySelector('#show-mode').addEventListener('click', () => {
    setLocal({ showMode: (configs.showMode + 1) % Object.keys(modes).length });
    danmuEle.querySelector('#show-mode').innerText = modes[configs.showMode];
    eleRefresh(danmuEle);
  });

  // ⬜️ 用户筛选相关功能
  function settingSubmit() {
    setLocal({
      focusNames: danmuEle.querySelector('#danmu-focus-names')
        .value.split('\n').filter(item => item.trim()),
      highlightNames: danmuEle.querySelector('#danmu-highlight-names')
        .value.split('\n').filter(item => item.trim()),
      blockNames: danmuEle.querySelector('#danmu-block-names')
        .value.split('\n').filter(item => item.trim()),
    });
    danmuEle.querySelector('#danmu-pop-board').style.display = 'none';
    videoDoc.querySelector('#masthead-container').style.display = 'block';
  };
  function settingCancel() {
    function different(a, b) {
      a = danmuEle.querySelector(a).value.split('\n').filter(item => item.trim())
      a = JSON.stringify(a);
      if (a != JSON.stringify(b)) return true;
    }
    let namesChanged = different('#danmu-focus-names', configs.focusNames)
      || different('#danmu-highlight-names', configs.highlightNames)
      || different('#danmu-block-names', configs.blockNames);
    if (namesChanged) {
      if (confirm('名字列表有修改，是否丢弃这些修改？\nNames changed, discard?')) {
        danmuEle.querySelector('#danmu-pop-board').style.display = 'none';
        videoDoc.querySelector('#masthead-container').style.display = 'block';
        eleRefresh(danmuEle);
      } else return;
    } else {
      danmuEle.querySelector('#danmu-pop-board').style.display = 'none';
      videoDoc.querySelector('#masthead-container').style.display = 'block';
    }
  };

  // ⬜️ pop 板弹出
  danmuEle.querySelector('#danmu-settings').addEventListener('click', () => {
    if (danmuEle.querySelector('#danmu-pop-board').style.display == 'block') {
      settingCancel();
    } else {
      eleRefresh(danmuEle, true);
      danmuEle.querySelector('#danmu-pop-board').style.display = 'block';
      videoDoc.querySelector('#masthead-container').style.display = 'none';
    };
  });
  danmuEle.querySelector('#danmu-pop-board-cancel').addEventListener('click', () => {
    settingCancel()
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

  // ⬜️ 鼠标边缘箭头
  let mouseStatus = { width: 0, height: 0, left: 0 };
  danmuContentEl.addEventListener('mousemove', function (event) {
    const rect = danmuContentEl.getBoundingClientRect();
    const offset = 10;
    if (event.clientX <= rect.right && event.clientX >= rect.right - offset &&
      event.clientY <= rect.bottom && event.clientY >= rect.bottom - offset) {
      // danmuContentEl.style.cursor = 'nwse-resize'; // 右下
      // mouseStatus = { width: 1, height: 1, left: 0 };
    } else if (event.clientX >= rect.left && event.clientX <= rect.left + offset &&
      event.clientY <= rect.bottom && event.clientY >= rect.bottom - offset) {
      // danmuContentEl.style.cursor = 'nesw-resize'; // 左下
      // mouseStatus = { width: -1, height: 1, left: 1 };
    } else if (event.clientX >= rect.left && event.clientX <= rect.left + offset) {
      // danmuContentEl.style.cursor = 'ew-resize'; // 左
      // mouseStatus = { width: -1, height: 0, left: 1 };
      danmuContentEl.style.cursor = 'all-scroll';
      mouseStatus = { width: -1, height: 1, left: 1 };
    } else if (event.clientX <= rect.right && event.clientX >= rect.right - offset) {
      // danmuContentEl.style.cursor = 'ew-resize'; // 右
      // mouseStatus = { width: 1, height: 0, left: 0 };
      danmuContentEl.style.cursor = 'all-scroll';
      mouseStatus = { width: 1, height: 1, left: 0 };
    } else if (event.clientY <= rect.bottom && event.clientY >= rect.bottom - offset) {
      // danmuContentEl.style.cursor = 'ns-resize'; // 下
      // mouseStatus = { width: 0, height: 1, left: 0 };
    } else {
      danmuContentEl.style.cursor = 'default'; // 默认箭头
      mouseStatus = { width: 0, height: 0, left: 0 };
    }
  });

  // ⬜️ 边缘拖拽
  danmuContentEl.addEventListener('mousedown', function (event) {
    event.stopPropagation();
    let doc = event.target.ownerDocument;
    let x = event.clientX;
    let y = event.clientY;
    let width = danmuEle.offsetWidth;
    let height = danmuContentEl.offsetHeight;
    let left = danmuEle.offsetLeft;
    let mouse = deepCopy(mouseStatus); // 以免在移动中变化

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
      setLocal({
        width: danmuContentEl.offsetWidth,
        maxHeight: danmuContentEl.offsetHeight,
        left: danmuEle.offsetLeft
      });
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

  // ⬜️ 整体拖拽
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
// 代码 https://github.dev/67373net/youtube-float-danmu/blob/main/index.js
// 测试地址
// 慢：https://www.youtube.com/live/5FUWAwWJrkQ?t=3341s
// 快：https://www.youtube.com/live/5FUWAwWJrkQ?t=18195s