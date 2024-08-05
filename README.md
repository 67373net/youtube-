如果有空的话做的功能：
- 弹幕重载问题，可能是 mod 删除弹幕导致，但是不能稳定重现
- 判断是否禁止显示聊天回放：document.querySelector('#chat-container iframe').src=='about:blank'
  https://www.youtube.com/watch?v=6p_s5ClXAG0
- 可以加多个 Twitch 直播间
- 可以在 Twitch 融合 YouTube 的弹幕
  - 需要每次都填写直播间
  - 能否自动获取直播间 ID
