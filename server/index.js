import express from 'express';
import cors from 'cors';

const PORT = process.env.PORT || 8787;
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>智谱AI代理测试</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;padding:24px;background:#f7f7f8}h1{font-size:20px;margin:0 0 12px}section{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px}button{padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#0ea5e9;color:#fff;cursor:pointer}input,textarea,select{width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px}pre{white-space:pre-wrap;word-wrap:break-word;background:#0b1021;color:#e5e7eb;padding:12px;border-radius:8px;max-height:320px;overflow:auto}</style></head><body><h1>智谱AI代理测试</h1><section><div>健康检查: <a href="/api/health" target="_blank">/api/health</a></div></section><section><div style="display:grid;gap:8px"><label>用户输入</label><textarea id="prompt" rows="3">你好，请介绍一下自己。</textarea><label>是否流式</label><select id="stream"><option value="false">否</option><option value="true">是</option></select><button id="send">发送到 /api/chat</button></div></section><section><div>响应输出</div><pre id="out"></pre></section><script>const btn=document.getElementById('send');const promptEl=document.getElementById('prompt');const streamEl=document.getElementById('stream');const out=document.getElementById('out');btn.onclick=async()=>{out.textContent='正在请求...';const stream=streamEl.value==='true';const body={model:'glm-4.6',messages:[{role:'system',content:'你是一个有用的AI助手。'},{role:'user',content:promptEl.value}],temperature:1.0,stream};try{const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok){const txt=await res.text();out.textContent='HTTP '+res.status+'\n'+txt;return}if(!stream){const json=await res.json();out.textContent=JSON.stringify(json,null,2);return}const reader=res.body.getReader();const decoder=new TextDecoder('utf-8');let buf='';out.textContent='';while(true){const {value,done}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop()||'';for(const line of lines){if(line.startsWith('data: ')){const payload=line.slice(6);if(payload==='[DONE]'){break}try{const obj=JSON.parse(payload);const delta=obj?.choices?.[0]?.delta?.content||'';out.textContent+=delta}catch(e){}}}}}catch(e){out.textContent='请求失败: '+e.message}}</script></body></html>`);
});
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'zhipu-proxy', port: PORT });
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!ZHIPU_API_KEY) {
      res.status(500).json({ error: 'Missing ZHIPU_API_KEY environment variable' });
      return;
    }

    const {
      model = 'glm-4.6',
      messages = [],
      temperature = 1.0,
      stream = false,
      tools,
      tool_choice,
      max_tokens,
      top_p,
    } = req.body || {};

    const payload = {
      model,
      messages,
      temperature,
      stream,
    };
    if (tools) payload.tools = tools;
    if (tool_choice) payload.tool_choice = tool_choice;
    if (typeof max_tokens === 'number') payload.max_tokens = max_tokens;
    if (typeof top_p === 'number') payload.top_p = top_p;

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).send(text);
      return;
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) res.write(value);
        }
      } catch (err) {}
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', message: err?.message });
  }
});

app.post('/api/image', async (req, res) => {
  try {
    if (!ZHIPU_API_KEY) {
      res.status(500).json({ error: 'Missing ZHIPU_API_KEY environment variable' });
      return;
    }
    const { prompt, size = '720x1280', model = 'cogview-3-flash', quality, watermark_enabled = false } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }
    const payload = { model, prompt, size, watermark_enabled };
    if (quality) payload.quality = quality;

    const genRes = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    if (!genRes.ok) {
      const t = await genRes.text();
      res.status(genRes.status).send(t);
      return;
    }
    const genJson = await genRes.json();
    const url = genJson?.data?.[0]?.url;
    if (!url) {
      res.status(502).json({ error: 'No image url returned' });
      return;
    }
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      const t = await imgRes.text();
      res.status(imgRes.status).send(t);
      return;
    }
    const mime = imgRes.headers.get('content-type') || 'image/png';
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
    res.json({ dataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Image proxy error', message: err?.message });
  }
});

app.listen(PORT, () => {
  console.log(`[zhipu-proxy] listening on http://localhost:${PORT}`);
});

