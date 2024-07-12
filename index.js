// ==UserScript==
// @name         Youtube 悬浮弹幕
// @namespace    67373tools
// @version      0.1.3
// @description  Youtube 悬浮弹幕，可拖动位置，可调节宽度
// @author       XiaoMIHongZHaJi
// @match        https://www.youtube.com/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @license MIT
// @downloadURL https://update.greasyfork.org/scripts/500209/Youtube%20%E6%82%AC%E6%B5%AE%E5%BC%B9%E5%B9%95.user.js
// @updateURL https://update.greasyfork.org/scripts/500209/Youtube%20%E6%82%AC%E6%B5%AE%E5%BC%B9%E5%B9%95.meta.js
// ==/UserScript==

// 广告：欢迎收看陈一发儿直播：https://67373.net
// 如果有 bug，在上面网站也可以找到反馈联系方式

// 本地配置数据读写
let danmuParams = JSON.parse(localStorage.getItem('danmuParams')) || {
  maxWidth: 588, maxHeight: 588, showMode: 0, specialNames: [], blackNames: [],
  topCalc: 0.068, leftCalc: 0.028, widthCalc: 0.38, fontSize: 18,
};

const modes = { "0": '全显示', "1": '短用户名', "2": '无用户名', "3": '全隐藏', "4": '仅关注' };

function eleShowCtrl(selector, display) {
  const eles = document.querySelectorAll(selector);
  eles.forEach(ele => ele.style.display = display);
}

function setLocal(params) {
  localStorage.setItem('danmuParams', JSON.stringify(Object.assign(danmuParams, params)));
}
setLocal();

let cssLink = $('<link href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css" rel="stylesheet" type="text/css">');
$('head').append(cssLink);

const danmuCtrlStyle = document.createElement('style');
danmuCtrlStyle.textContent = `
.danmuCtrl {
  background-color: rgba(0,0,0,0.5);
  border: solid white 0.1px;
  padding: 2.8px;
  visibility: hidden
}

#danmuEle img {
  width: var(--yt-live-chat-emoji-size);
  height: var(--yt-live-chat-emoji-size);
  margin: -1px 2px 1px;
  vertical-align: middle;
}

#danmuSpecialNames {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #f0f0f0;
  padding: 20px;
  border: 1px solid #ccc;
}`;
document.head.appendChild(danmuCtrlStyle);

// 获取播放器窗口大小
let widthBase = () => parent.$('#columns').width();

// 建立基本元素
function getDanmuEle() {
  let danmuEle = Object.assign(document.createElement('div'), {
    id: 'danmuEle', style: 'position: absolute; color: white; height: auto; z-index: 67373',
  });

  danmuEle.innerHTML = `
  <div id="danmu-ctrl" class="danmuCtrl">
    <button id="showMode">${modes[danmuParams.showMode]}</button>&nbsp;&nbsp;
    <span style="white-space: nowrap;">
      <span id="danmu-fontsize">字号${danmuParams.fontSize}</span>
      <button id="danmu-fontsize-add">+</button>
      <button id="danmu-fontsize-minus">-</button>
    </span>&nbsp;&nbsp;
    <span style="white-space: nowrap;">
      <span id="danmu-height">高度${danmuParams.maxHeight}</span>
      <button id="danmu-height-add">+</button>
      <button id="danmu-height-minus">-</button>
    </span>&nbsp;&nbsp;
  </div>
  <div id="danmu-content" style="font-size:${danmuParams.fontSize}px;"></div>
  <div id="danmuSpecialNames">
    <div>
      <div style="color: black; font-size: 1.8em">如果在这里输入用户名，则只会显示这些用户的弹幕。<br/>每行写一个，一定要写准确！</div>
      <div style="height:0.5em"></div>
      <textarea id="danmuSpecialNamesText" style="width: 100%; height: 128px"></textarea>
      <div style="height:0.5em"></div>
      <textarea id="danmuBlackNamesText" style="width: 100%; height: 128px"></textarea>
      <div style="height:0.5em"></div>
      <button id="danmuSpecialNamesCancel">取消</button>
      <button id="danmuSpecialNamesSubmit">确定</button>
    </div>
  </div>`;

  // 移入移出显示
  danmuEle.addEventListener('mouseenter', () => {
    danmuEle.querySelector('#danmu-ctrl').style.visibility = 'visible';
    danmuEle.querySelector('#danmu-content').style.border = 'white solid 0.1px';
    danmuEle.querySelector('#danmu-content').style.borderRight = '8.8px solid white';
  });
  danmuEle.addEventListener('mouseleave', () => {
    danmuEle.querySelector('#danmu-ctrl').style.visibility = 'hidden';
    danmuEle.querySelector('#danmu-content').style.border = '';
    danmuEle.querySelector('#danmu-content').style.borderRight = '';
  });

  // 屏蔽点击事件
  danmuEle.querySelector('#danmu-ctrl').addEventListener('click', event => event.stopPropagation());
  danmuEle.querySelector('#danmu-ctrl').addEventListener('dblclick', event => event.stopPropagation());

  // 控制功能 - 字号大小
  danmuEle.querySelector('#danmu-fontsize-add').addEventListener('click', () => {
    setLocal({ fontSize: danmuParams.fontSize + 1 });
    danmuEle.querySelector('#danmu-content').style.fontSize = danmuParams.fontSize + 'px';
    danmuEle.querySelector('#danmu-fontsize').innerText = `字号${danmuParams.fontSize}`;
  });
  danmuEle.querySelector('#danmu-fontsize-minus').addEventListener('click', () => {
    setLocal({ fontSize: danmuParams.fontSize - 1 });
    danmuEle.querySelector('#danmu-content').style.fontSize = danmuParams.fontSize + 'px';
    danmuEle.querySelector('#danmu-fontsize').innerText = `字号${danmuParams.fontSize}`;
  });

  // 控制功能 - 高度
  danmuEle.querySelector('#danmu-height-add').addEventListener('click', () => {
    setLocal({ maxHeight: danmuParams.maxHeight + 18 });
    danmuEle.querySelector('#danmu-height').innerText = `高度${danmuParams.maxHeight}`;
  });
  danmuEle.querySelector('#danmu-height-minus').addEventListener('click', () => {
    setLocal({ maxHeight: danmuParams.maxHeight - 18 });
    danmuEle.querySelector('#danmu-height').innerText = `高度${danmuParams.maxHeight}`;
    while (danmuEle.clientHeight > danmuParams.maxHeight) {
      // 移除最旧的消息
      let firstChatItem = danmuEle.querySelector('.chat-item:first-child');
      if (firstChatItem) firstChatItem.parentNode.removeChild(firstChatItem);
    }
  });

  // 显示模式轮换
  let danmuUsernameStyle = danmuEle.ownerDocument.createElement('style');
  parent.$('#columns').get(0).ownerDocument.head.appendChild(danmuUsernameStyle);
  showModeRefresh();
  function showModeRefresh() {
    if (danmuParams.showMode == 3) {
      danmuEle.querySelector('#danmu-content').style.display = 'none';
    } else {
      danmuEle.querySelector('#danmu-content').style.display = 'block';
    };
    switch (danmuParams.showMode) {
      case 0:
        danmuUsernameStyle.innerHTML = `
          .danmuUsernameLong { display: inline !important; }
          .danmuUsernameShort { display: none !important; }`;
        break;
      case 1:
        danmuUsernameStyle.innerHTML = `
          .danmuUsernameLong { display: none !important; }
          .danmuUsernameShort { display: inline !important; }`;
        break;
      case 2:
      case 3:
        danmuUsernameStyle.innerHTML = `
        .danmuUsernameLong { display: none !important; }
        .danmuUsernameShort { display: none !important; }`;
        break;
      case 4:
        danmuUsernameStyle.innerHTML = `
          .danmuUsernameLong { display: inline !important; }
          .danmuUsernameShort { display: none !important; }`;
        break;
    }
  };
  danmuEle.querySelector('#showMode').addEventListener('click', () => {
    setLocal({ showMode: (danmuParams.showMode + 1) % Object.keys(modes).length });
    danmuEle.querySelector('#showMode').innerText = modes[danmuParams.showMode];
    showModeRefresh();
  });

  // 仅关注用户
  danmuEle.querySelector('#danmuSpecialNames').addEventListener('click', event => {
    let doc = event.target.ownerDocument;



  });

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
        setLocal({ widthCalc: (startWidth + e.clientX - startX) / widthBase() });
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
      danmuParams.topCalc = (pageY - shiftY) / widthBase();
      danmuParams.leftCalc = (pageX - shiftX) / widthBase();
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
}

// 自动适应宽度等
function adjustDanmuEle(danmuEle) {
  // danmuEle.style.visibility = videoRect().width > 400 ? 'visible' : 'hidden'; // 小窗时屏蔽弹幕显示
  danmuEle.style.width = widthBase() * danmuParams.widthCalc + 'px';
  danmuEle.style.top = widthBase() * danmuParams.topCalc + 'px';
  danmuEle.style.left = widthBase() * danmuParams.leftCalc + 'px';
};


// 监听页面跳转事件
(function (history) {
  const pushState = history.pushState;
  const replaceState = history.replaceState;

  function onStateChange(event) {
    main();
    console.log('--------------');
    console.log('URL changed to:', document.location.href);
    console.log('--------------');
  }
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

// 获取聊天内容 小米
let lastUserName;
function digestYtChatDom(dom) {
  const newChat = $(dom);
  const userphoto = newChat.find("#author-photo #img").css({
    "border-radius": "15px",
    "margin-right": "4px",
    "display": "inline"
  })[0].outerHTML;
  const content = newChat.find("#message").html();
  let username = newChat.find("#author-name").html();
  if (username && username.indexOf("<") > -1) {
    username = username.substring(0, username.indexOf("<")).trim();
  }
  if (lastUserName == username) {
    return null;
  }
  lastUserName = username;
  if (newChat.find("#author-name svg, #chat-badges svg")[0]) {
    //svg
    newChat.find("#author-name svg, #chat-badges svg").each((i, e) => {
      $(e).css({
        "width": "24px",
        "height": "24px",
        "display": "inline",
        "margin-bottom": "-6px"
      })
      username += $("<div></div>").append($(e)).html().replace(/ {2,}/g, "");
    })
  }
  let color;
  if (newChat.find("#card")[0] && newChat.find("#purchase-amount")[0]) {
    //sc
    username = "(SC) " + username;
    color = newChat.css("--yt-live-chat-paid-message-primary-color");
  };
  let ret = {
    userphoto,
    username,
    content,
    color
  };
  return ret;
}

// 将聊天内容显示在框内 小米
function addNewYtDanmaku(data) {
  if (!data || !data.username) return;
  if (modes[danmuParams.showMode] == '仅关注'
    && danmuParams.specialNames.length > 0
    && !danmuParams.specialNames.includes(data.username)) return;
  if (danmuParams.blackNames.includes(data.username)) return;
  let content = '';
  if (data.userphoto) {
    content += data.userphoto;
  }
  if (data.color) {
    content += '<span style="color: ' + data.color + ';'
  } else {
    content += '<span style="color: white;'
  }
  content += '"><span style="color: rgb(200,200,200)">';
  try {
    let col = data.content ? ' ' : '';
    content += `<span class="danmuUsernameLong">${data.username + col}</span>`;
    content += `<span class="danmuUsernameShort">${data.username.substring(0, 1) + col}</span>`;
  } catch { };
  content += '</span>';
  content += data.content;
  content += '</span>';
  return content;
}

// 主函数
// window.onload = main;

$(document).ready(main);
function main() {
  try {
    parent.$("#danmuEle").each(function () {
      $(this).remove();
    });
  } catch { };
  if ($("#chatframe")[0]) return; // 内部 iframe 聊天框

  let timer = setInterval(() => {
    let _$ytChatDiv = $("#item-list");
    if (_$ytChatDiv && _$ytChatDiv[0]) {
      let chatframe = $(_$ytChatDiv[0]);
      clearInterval(timer);

      let danmuEle = getDanmuEle()
      let draggable = $(danmuEle);
      adjustDanmuEle(danmuEle);
      parent.$('#columns').append(draggable);
      chatframe.unbind('DOMNodeInserted').bind('DOMNodeInserted', (event) => {
        const newChatDOM = event.target;
        const className = newChatDOM.className;
        if (!className?.indexOf || className.indexOf("yt-live-chat-item-list-renderer") == -1) {
          return;
        }
        setTimeout(() => {
          const chatEntry = digestYtChatDom(newChatDOM);
          if (!chatEntry) return;
          let content = addNewYtDanmaku(chatEntry);
          if (content) {
            let p = $('<div class="chat-item" style="line-height: 25px">' + content + '</div>');
            p.css({
              "background-color": "rgba(0, 0, 0, 0.4)",
              "border-radius": "4px",
              "padding": "1.8px",
              "display": "inline-block",
              "margin": "1px",
              "font-size": "1em"
            });
            p.find('img').css({
              // "width": danmuParams.fontSize + "px",
              // "height": danmuParams.fontSize + "px",
              "width": '1em',
              "height": '1em',
            });
            draggable.find('#danmu-content').append(p);
            function isTooLong(el) {
              const rect = el.getBoundingClientRect();
              const viewportHeight = parent.window.innerHeight || window.innerHeight || document.documentElement.clientHeight;
              return rect.bottom > viewportHeight;
            }
            while (draggable.height() > danmuParams.maxHeight || isTooLong(danmuEle)) {
              // 移除最旧的消息
              // console.log(draggable.height(), "移除最旧的消息")
              draggable.find(".chat-item:eq(0)").remove();
            }
          }
        }, 0);
      });
    } else {
      setTimeout(() => { }, 0);
    }
  }, 500);
};

/*
// ！！！@grant 按钮会有 bug！！！跟 jquery 冲突
// 油猴按钮，控制整个是否显示
try { disableCheck(danmuParams.ifDisable) } catch { };
let ifDisableMenuId;
function disableCheck(ifDisable) {
danmuEle.style.display = ifDisable ? 'none' : 'block';
setLocal({ ifDisable });
GM_unregisterMenuCommand(ifDisableMenuId);
ifDisableMenuId = GM_registerMenuCommand((ifDisable ? '显示' : '隐藏') + '弹幕框', () => {
  danmuParams.ifDisable = !ifDisable;
  disableCheck(danmuParams.ifDisable);
});
}

// 是否显示用户名
try { showUsername(danmuParams.showUsername) } catch { };
let showUsernameMenuId;
function showUsername(showUsername) {
// 【】
setLocal({ showUsername });
GM_unregisterMenuCommand(showUsernameMenuId);
showUsernameMenuId = GM_registerMenuCommand((showUsername ? '隐藏' : '显示') + '用户名', () => {
  danmuParams.showUsername = !showUsername;
  showUsername(danmuParams.showUsername);
});
};

// 元素按钮，控制下方弹幕是否显示
danmuEle.querySelector('#danmu-hide').addEventListener('click', toggleDanmuShow);
function toggleDanmuShow() {
danmuEle.querySelector('#danmu-hide').innerText = danmuParams.ifShow ? '显示' : '隐藏';
danmuParams.ifShow = !danmuParams.ifShow;
danmuEle.querySelector('#danmu-content').style.display = danmuParams.ifShow ? 'block' : 'none';
}

danmuEle.querySelector('#danmu-ctrl').style.removeProperty('visibility');
<span id="danmu-drag" style="white-space: nowrap; text-align: right;">🤚 拖拽 ☩</div>
<div id="danmu-drag" class="danmuCtrl" style="white-space: nowrap; text-align: right; font-size:1.8em">拖拽 ☩</div>
danmuEle.querySelector('#danmu-drag').style.visibility = 'visible';
danmuEle.querySelector('#danmu-drag').style.visibility = 'visible';
danmuEle.querySelector('#danmu-drag').style.visibility = 'hidden';
danmuEle.querySelector('#danmu-drag').addEventListener('click', event => event.stopPropagation());
danmuEle.querySelector('#danmu-drag').addEventListener('dblclick', event => event.stopPropagation());
let videoElement = () => document.querySelectorAll('video')[0];
if (!videoElement()) return; // 外部播放器探测
let videoRect = () => videoElement().getBoundingClientRect(); // videoRect()
let widthBase = () => document.documentElement.clientWidth; // videoRect().width
window.addEventListener('resize', () => adjustDanmuEle(danmuEle));
window.addEventListener('scroll', () => adjustDanmuEle(danmuEle));
<span>&nbsp;&nbsp;&nbsp;&nbsp;拖拽｜拉宽&nbsp;</span>
*/

// 测试地址：https://www.youtube.com/watch?v=jfKfPfyJRdk
