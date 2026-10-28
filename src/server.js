import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createBridge } from './bridge.js';

const api = createBridge();
const server = new McpServer({ name: 'dsh-sticker-mcp', version: '0.1.0' });
const session = {
  key: z.string().regex(/^(private|group):[1-9]\d*$/).describe('当前授权会话 key，由桥接唤醒提示提供'),
  token: z.string().min(1).max(4096).describe('当前会话令牌，由桥接提供；不是 OneBot 管理令牌')
};
const reference = z.string().min(1).max(4096).describe('列表返回的表情 id、md5 或 url；不能任意读取文件');
const reply = z.union([z.string().regex(/^-?[1-9]\d*$/), z.number().int().safe().refine(n => n !== 0)]).optional();
const text = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
const safe = fn => async args => {
  try { return await fn(args); }
  catch { return { content: [{ type: 'text', text: '操作未完成。请检查桥接连接、会话权限、令牌有效性及表情引用。' }], isError: true }; }
};
server.registerTool('qq_list_stickers', {
  description: '检索当前会话可用的表情库。按标签、备注、情绪和用法查找；标签不能代替视觉确认。',
  inputSchema: { ...session, query: z.string().max(200).optional(), count: z.number().int().min(1).max(100).optional(), refresh: z.boolean().optional() }
}, safe(async args => text(await api('/api/socialV2/sticker-list', args))));
server.registerTool('qq_get_sticker_image', {
  description: '将表情图片返回给视觉模型。GIF 由兼容桥接抽帧预览；读取成功才能判断图片内容。',
  inputSchema: { ...session, stickerId: reference }
}, safe(async args => {
  const result = await api('/api/socialV2/sticker-image', args, 'GET');
  if (!result.image?.data || !['image/jpeg','image/png','image/webp','image/gif'].includes(result.image.mimeType)) throw new Error('No image');
  return { content: [{ type: 'text', text: result.note || '表情图片；动图预览不等于完整动画。' }, { type: 'image', mimeType: result.image.mimeType, data: result.image.data }] };
}));
server.registerTool('qq_send_sticker', {
  description: '发送一张表情。可只发图，或传 caption 将文字与图片放在同一条消息；不要另发重复文字。caption 需要支持该功能的桥接版本。',
  inputSchema: { ...session, stickerId: reference, caption: z.string().max(500).optional(), replyToMessageId: reply, atUserId: z.string().regex(/^[1-9]\d*$/).optional() }
}, safe(async args => {
  if (args.key.startsWith('private:') && args.atUserId) throw new Error('Private mention is not valid');
  return text(await api('/api/socialV2/send-sticker', args));
}));
await server.connect(new StdioServerTransport());
