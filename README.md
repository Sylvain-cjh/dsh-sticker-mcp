# DSH Sticker MCP

让 DSH 通过 MCP 检索表情包、读取图片内容，并向当前授权 QQ 会话发送表情。支持纯图片，以及文字配一张表情。

## 依赖与范围

- Node.js 22 或更新版本。
- **必须已有正在运行的 qq-bridge，以及已登录的 OneBot/LLBot。** 本项目是独立的 MCP 适配器，不包含 QQ 登录器、表情素材或完整桥接后端。
- 桥接应启用 reserved2 的表情工具及会话白名单，并提供 `/api/socialV2/sticker-list`、`sticker-image`、`send-sticker` 接口。
- `caption` 图文合并、动图抽帧预览、本地素材检索取决于后端实现。上游旧版可能不支持；本项目不会绕过限制或自动拆成两条发送。
- 模型要能接收 MCP image 内容才能直接看图。文字模型只能利用备注和标签，不能据此声称看过图片。

## 安装

```sh
git clone https://github.com/Sylvain-cjh/dsh-sticker-mcp.git
cd dsh-sticker-mcp
npm ci
npm start
```

这是 stdio 服务，应由 MCP 客户端启动，不是网页服务。stdout 只输出 MCP 协议消息。默认连接 `http://127.0.0.1:3100`；通过环境变量 `QQ_BRIDGE_URL` 可修改端口，但仅允许 HTTP 回环地址。

## 在 DSH 中接入

在 DSH 的 MCP 管理界面添加 **stdio** 服务，命令选本机 `node` 的绝对路径，参数填写 `本仓库绝对路径/src/server.js`。环境变量填写 `QQ_BRIDGE_URL=http://127.0.0.1:3100`。不同 DSH 版本配置文件结构不同，以当前版本管理界面为准。

支持通用 MCP JSON 配置的客户端可使用下面的示例；它不是 DSH Cordis YAML：

```json
{
  "mcpServers": {
    "stickers": {
      "command": "node",
      "args": ["/absolute/path/dsh-sticker-mcp/src/server.js"],
      "env": { "QQ_BRIDGE_URL": "http://127.0.0.1:3100" }
    }
  }
}
```

保留桥接唤醒提示提供的 `key` 与 `token`，每次工具调用都必须携带当前会话的值。令牌轮换后使用新值，不能用 QQ 号代替权限校验。不要公开真实令牌，或把它写进示例配置。

如果原桥接已注册同名工具，应先关闭旧的这三个工具或使用另一 MCP 服务名称，避免工具重复。

## 工具

| 工具 | 作用 |
| --- | --- |
| `qq_list_stickers` | 按标签、备注和情绪检索表情，最多100项 |
| `qq_get_sticker_image` | 将图片或后端生成的动图预览返回给视觉模型 |
| `qq_send_sticker` | 发图，或使用可选 `caption` 合并简短文字 |

建议工作顺序：先检索 → 必要时看图 → 选择符合语境的一张 → 一次发送。发送只有后端返回成功才算完成，不盲目重试可能已成功的发送。

`replyToMessageId` 可引用指定消息；`atUserId` 仅群聊可用。会话白名单、图片下载安全检查、文件访问范围、频率限制与发送授权由后端再次强制校验；本项目不授予新权限。

## 主动发表情的提示词示例

> 轻松聊天可以主动用贴切表情包回应，不必等人索要。可以只发图片，也可以在一次 qq_send_sticker 调用中通过 caption 配上简短文字。避免重复图片和刷屏；认真提问时先把事情说清楚。没有看图成功就不要编造图片内容。

这只是提示词，不是定时器。主动消息频率需在现有 QQ 桥接调度器中设置，本项目不会自行向任何会话广播。

## 隐私与发布边界

仓库不包含任何用户的图片、聊天记录、QQ 账号、登录数据或 API 密钥。请只使用你有权使用的素材。令牌不进入 URL，HTTP 不跟随重定向，只允许连接本机；本项目不提供远程公网部署开关。

本适配器基于 qq-bridge 已有的表情接口独立编写。相关后端：[Derpyu520/qq-bridge](https://github.com/Derpyu520/qq-bridge)。不会自动安装或修改后端。

## 验证范围

发布前应完成依赖安装及语法检查。本仓库不附带真实账号的 QQ 发送测试，也不保证所有上游桥接版本均兼容。图文合并和 GIF 能力需结合后端版本确认。
