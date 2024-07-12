// ==UserScript==
// @name         Youtube 悬浮弹幕
// @namespace    67373tools
// @version      0.1.3
// @description  Youtube 悬浮弹幕，可拖动位置，可调节宽度
// @author       XiaoMIHongZHaJi
// @match        https://www.youtube.com/*
// @grant        none
// @license MIT
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
    showMode: 0, fontSize: 18, top: 88, left: 58, maxHeight: 528, width: 528, gap: 5,
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

function setStyle(ele) {
  let floatDanmuStyle = videoDoc.querySelector('#float-danmu-style');
  if (!floatDanmuStyle) {
    floatDanmuStyle = videoDoc.createElement('style');
    floatDanmuStyle.id = 'float-danmu-style';
    document.head.appendChild(floatDanmuStyle);
  }
  let baseStyle = `
  .danmu-highlight {
    border: solid 0.8px OrangeRed;
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
  }
  #danmu-pop-board {
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #f0f0f0;
    padding: 20px;
    border: 1px solid #ccc;
    color: black;
    font-size: 1.8em;
  }
  #danmu-content {
    font-size: ${configs.fontSize}px;
  }
  .danmu-username-long, .danmu-username-short {
    color: rgb(200,200,200);
  }
  .danmu-item {
    background-color: rgba(0, 0, 0, 0.4);
    border-radius: ${configs.gap/2.8+0.8}px;
    padding: ${configs.gap}px;
    display: inline-block;
    margin: ${configs.gap/5+0.5}px;
  }
  .danmu-item img {
    border-radius: 888px;
    width: ${configs.fontSize*1.18}px;
    height: ${configs.fontSize*1.18}px;
    margin-right: ${configs.fontSize/3}px;
    display: inline;
    vertical-align: middle;
  }
  .danmu-text{
    color: white;
  }
  `;
  const showMode = modes[configs.showMode];
  if (ele) {
    if (showMode == '全隐藏') {
      ele.querySelector('#danmu-content').style.display = 'none';
    } else {
      ele.querySelector('#danmu-content').style.display = 'block';
      while (ele.clientHeight > configs.maxHeight) {
        let firstChatItem = ele.querySelector('.danmu-item:first-child');
        if (firstChatItem) firstChatItem.parentNode.removeChild(firstChatItem);
      };
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
if (location.href.startsWith('https://www.youtube.com/watch?v=')) {
  setStyle();
  // 监听页面跳转事件
  (function (history) {
    const pushState = history.pushState;
    const replaceState = history.replaceState;
    function onStateChange(event) {
      try {
        const danmuEle = document.getElementById('danmu-ele');
        if (danmuEle.danmuurl != document.URL) danmuEle.parentNode.removeChild(danmuEle);
      } catch { };
      console.log(`--------------\nURL changed to:${document.location.href}\n--------------`,);
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
    parent.document.querySelectorAll("#danmu-ele").forEach(el => el.remove());
    let timer = setInterval(() => {
      let ytbChatEle = document.querySelector('#item-offset');
      if (!ytbChatEle) return;
      clearInterval(timer);
      const danmuEle = getDanmuEle();
      danmuEle.danmuurl = videoDoc.URL;
      videoDoc.querySelector('body').appendChild(danmuEle);
      let observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType !== 1 || node.tagName.toLowerCase() !== 'yt-live-chat-text-message-renderer') return;
            let el = digestYtChatDom(node);
            if (!content) return;
            danmuEle.querySelector('#danmu-content').appendChild(el);
            function isTooLong(el) {
              const rect = el.getBoundingClientRect();
              const viewportHeight = parent.window.innerHeight || window.innerHeight
                || videoDoc.documentElement.clientHeight;
              return rect.bottom > viewportHeight;
            }
            while (danmuEle.offsetHeight > configs.maxHeight || isTooLong(danmuEle)) {
              danmuEle.querySelector('.danmu-item').remove();
            }
          });
        });
      });
      let config = { childList: true, subtree: true };
      observer.observe(ytbChatEle, config);
    }, 888);
  };

  // ✴️ 初始化
  function eleRefresh(ele, ifTextRefresh) {
    ele = ele || videoDoc.querySelector('#danmu-ele');
    if (!ele) return;
    ele.querySelector('#danmu-settings').innerText =
      `${modes[configs.showMode]}｜限高${configs.maxHeight}｜`
      + `${configs.isFocusNames ? '√' : '×'}${configs.isHighlightNames ? '√' : '×'}${configs.isBlockNames ? '√' : '×'}`;
    ele.querySelector('#show-mode').innerText = modes[configs.showMode];
    ele.querySelector('#danmu-fontsize').innerText = `字号${configs.fontSize}`;
    ele.querySelector('#danmu-gap').innerText = `间隔${configs.gap}`;
    ele.querySelector('#danmu-height').innerText = `限高${configs.maxHeight}`;
    ele.querySelector('#danmu-is-focus-names').checked = configs.isFocusNames;
    ele.querySelector('#danmu-is-highlight-names').checked = configs.isHighlightNames;
    ele.querySelector('#danmu-is-block-names').checked = configs.isBlockNames;
    setStyle(ele);
    if (ifTextRefresh) textRefresh(ele);
  };
  function textRefresh(ele) {
    ele.querySelector('#danmu-focus-names').value = configs.focusNames.join('\n');
    ele.querySelector('#danmu-highlight-names').value = configs.highlightNames.join('\n');
    ele.querySelector('#danmu-block-names').value = configs.blockNames.join('\n');
  }

  // ✴️ 建立基本元素
  function getDanmuEle() {
    let danmuEle = document.createElement('div')
    danmuEle.id = 'danmu-ele';
    danmuEle.innerHTML = `
      <div id="danmu-ctrl" >
        <button id="danmu-settings"></button>
      </div>
      <div id="danmu-content"></div>
      <div id="danmu-pop-board">
        <button id="show-mode"></button>&nbsp;&nbsp;
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
          如果打勾，则会【只显示】这些用户名的弹幕。每行一个用户名。
        </div>
        <textarea id="danmu-focus-names" style="width: 100%; height: 128px"></textarea>
        <div style="margin:0.28em 0">
          <input type="checkbox" id="danmu-is-highlight-names">
          如果打勾，这些用户名弹幕会高亮。
        </div>
        <textarea id="danmu-highlight-names" style="width: 100%; height: 128px"></textarea>
        <div style="margin:0.28em 0">
          <input type="checkbox" id="danmu-is-block-names">
          如果打勾，这些用户名弹幕会被屏蔽。
        </div>
        <textarea id="danmu-block-names" style="width: 100%; height: 128px"></textarea>
        <div style="height:0.5em"></div>
        <button id="danmu-pop-board-cancel">取消</button>
        <button id="danmu-pop-board-submit">确定</button>
      </div>`;
    eleRefresh(danmuEle);

    // 移入移出显示
    danmuEle.addEventListener('mouseenter', () => {
      danmuEle.querySelector('#danmu-ctrl').style.visibility = 'visible';
      danmuEle.querySelector('#danmu-content').style.border = 'white solid 0.1px';
      danmuEle.querySelector('#danmu-content').style.borderRight = '8.8px dashed white';
    });
    danmuEle.addEventListener('mouseleave', () => {
      danmuEle.querySelector('#danmu-ctrl').style.visibility = 'hidden';
      danmuEle.querySelector('#danmu-content').style.border = '';
      danmuEle.querySelector('#danmu-content').style.borderRight = '';
    });

    // 阻断点击事件穿透
    danmuEle.querySelector('#danmu-ctrl').addEventListener('click', event => event.stopPropagation());
    danmuEle.querySelector('#danmu-ctrl').addEventListener('dblclick', event => event.stopPropagation());

    // 控制功能 - 字号大小
    function fontSizeChange(change) {
      setLocal({ fontSize: Math.max(0, configs.fontSize + change) });
      eleRefresh(danmuEle);
    };
    danmuEle.querySelector('#danmu-fontsize-add').addEventListener('click', () => fontSizeChange(1));
    danmuEle.querySelector('#danmu-fontsize-minus').addEventListener('click', () => fontSizeChange(-1));

    // 控制功能 - 间隔大小
    function gapChange(change) {
      setLocal({ gap: configs.gap + change });
      eleRefresh(danmuEle);
    };
    danmuEle.querySelector('#danmu-gap-add').addEventListener('click', () => gapChange(1));
    danmuEle.querySelector('#danmu-gap-minus').addEventListener('click', () => gapChange(-1));

    // 控制功能 - 高度
    danmuEle.querySelector('#danmu-height-add').addEventListener('click', () => {
      setLocal({ maxHeight: configs.maxHeight + 18 });
      eleRefresh(danmuEle);
    });
    danmuEle.querySelector('#danmu-height-minus').addEventListener('click', () => {
      setLocal({ maxHeight: Math.max(0, configs.maxHeight - 18) });
      eleRefresh(danmuEle);
      while (danmuEle.clientHeight > configs.maxHeight) {
        let firstChatItem = danmuEle.querySelector('.danmu-item:first-child');
        if (firstChatItem) firstChatItem.parentNode.removeChild(firstChatItem);
      };
    });

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

    // 鼠标右边缘箭头
    danmuEle.addEventListener('mousemove', function (event) {
      const rect = danmuEle.getBoundingClientRect();
      const offset = 10; // 边缘区域的宽度
      if (event.clientX <= rect.right && event.clientX >= rect.right - offset) {
        danmuEle.style.cursor = 'ew-resize';
      } else {
        danmuEle.style.cursor = 'default';
      }
    });

    // 鼠标拖宽度
    danmuEle.addEventListener('mousedown', function (event) {
      let doc = event.target.ownerDocument;
      if (danmuEle.style.cursor === 'ew-resize') {
        const startX = event.clientX;
        const startWidth = danmuEle.offsetWidth;
        function doDrag(e) {
          danmuEle.style.width = startWidth + e.clientX - startX + 'px';
          setLocal({ width: startWidth + e.clientX - startX });
        }
        function stopDrag() {
          doc.removeEventListener('mousemove', doDrag);
          doc.removeEventListener('mouseup', stopDrag);
        }
        doc.addEventListener('mousemove', doDrag);
        doc.addEventListener('mouseup', stopDrag);
      }
    });

    // 鼠标拖拽箭头
    danmuEle.querySelector('#danmu-ctrl').style.cursor = 'grab';
    // 拖拽动作
    danmuEle.querySelector('#danmu-ctrl').addEventListener('mousedown', drag);
    function drag(e) {
      let doc = e.target.ownerDocument;
      e.stopPropagation();
      e.preventDefault();
      let shiftX = e.clientX - danmuEle.getBoundingClientRect().left // + videoRect().left;
      let shiftY = e.clientY - danmuEle.getBoundingClientRect().top // + videoRect().top;
      function moveAt(pageX, pageY) {
        danmuEle.querySelector('#danmu-ctrl').style.visibility = 'visible';
        danmuEle.style.top = pageY - shiftY + 'px';
        danmuEle.style.left = pageX - shiftX + 'px';
        configs.top = pageY - shiftY;
        configs.left = pageX - shiftX;
        setLocal();
      }
      function onMouseMove(event) {
        moveAt(event.pageX, event.pageY);
      }
      doc.addEventListener('mousemove', onMouseMove);

      doc.addEventListener('mouseup', function () {
        doc.removeEventListener('mousemove', onMouseMove);
        doc.onmouseup = null;
      }, { once: true });
    }
    return danmuEle;
  };

  // 获取聊天内容 小米（改
  let lastUserName;
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
    if (lastUserName == username) return;
    lastUserName = username;
    const svgElements = dom.querySelectorAll("#author-name svg, #chat-badges svg");
    svgElements.forEach((e) => username += e.outerHTML);
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
    let separator = content ? ' ' : '';
    el.innerHTML += `<span class="danmu-username-long" ${color}>${username + separator}</span>`;
    el.innerHTML += `<span class="danmu-username-short" ${color}>${username.substring(0, 1) + separator}</span>`;
    el.innerHTML += `<span class="danmu-text" ${color}>${content}</span>`;
    console.log(el.outerHTML);
    return el;
  };
};

// console.log('YouTube 悬浮弹幕');