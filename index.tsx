import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types & Interfaces ---

interface Position {
  x: number;
  y: number;
}

interface TextStyle {
  fontSize: number;
  color: string;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  fontWeight: string;
  opacity?: number;
  rotation?: number;
}

interface ImageStyle {
  width: number;
  rotation: number;
}

interface SunStyle {
  size: number;
  color: string;
  opacity: number;
  rotation: number;
}

interface ElementState<T> {
  id: string;
  content: string | null;
  pos: Position;
  zIndex: number;
  style: T;
}

// --- Constants ---

const POSTER_WIDTH = 720;
const POSTER_HEIGHT = 1280;
// Update key to force new default font for Yi Learning
const STORAGE_KEY = 'morning_poster_state_v6_bg_yi_update'; 

const FONTS = [
  { name: '思源黑体 (Sans)', value: '"Noto Sans SC", sans-serif' },
  { name: '思源宋体 (Serif)', value: '"Noto Serif SC", serif' },
  { name: '快乐体 (Happy)', value: '"ZCOOL KuaiLe", cursive' },
  { name: '马善政 (Calligraphy)', value: '"Ma Shan Zheng", cursive' },
  { name: '微软雅黑 (YaHei)', value: '"Microsoft YaHei", sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' },
];

const DEFAULT_BG = "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1470&auto=format&fit=crop";

// Enhanced Themes for variety
const BG_THEMES = [
  "lush green forest", 
  "clear blue sky with soft clouds", 
  "radiant sunrise over ocean", 
  "misty mountains golden light", 
  "fresh morning meadow dew",
  "calm lake reflection",
  "modern city skyline morning",
  "peaceful zen garden",
  "tropical beach morning",
  "snowy pine forest sunrise",
  "blooming flower field morning"
];

const VISUAL_STYLES = [
  "photorealistic",
  "cinematic lighting",
  "soft dreamy focus",
  "vibrant colors",
  "minimalist composition",
  "macro photography details"
];

const QUOTE_TOPICS = [
  "Perseverance and Grit",
  "Innovation and Future",
  "Inner Peace and Mindfulness",
  "Learning and Growth",
  "Kindness and Empathy",
  "Leadership and Vision",
  "Nature and Harmony"
];

// --- Helper Functions for Persistence ---

const loadSavedState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error("Failed to load state", e);
    return null;
  }
};

const savedData = loadSavedState();

// --- Helper Components (Defined OUTSIDE App) ---

const SunSVG = ({ color }: { color: string }) => (
  <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ overflow: 'visible' }}>
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#glow)" fill={color} stroke={color}>
      <circle cx="100" cy="100" r="40" stroke="none" />
      <g strokeWidth="8" strokeLinecap="round">
        <line x1="100" y1="20" x2="100" y2="50" />
        <line x1="100" y1="180" x2="100" y2="150" />
        <line x1="20" y1="100" x2="50" y2="100" />
        <line x1="180" y1="100" x2="150" y2="100" />
        <line x1="43.4" y1="43.4" x2="64.6" y2="64.6" />
        <line x1="156.6" y1="156.6" x2="135.4" y2="135.4" />
        <line x1="43.4" y1="156.6" x2="64.6" y2="135.4" />
        <line x1="156.6" y1="43.4" x2="135.4" y2="64.6" />
        <g strokeWidth="4" opacity="0.8">
           <line x1="100" y1="10" x2="100" y2="35" transform="rotate(22.5 100 100)" />
           <line x1="100" y1="10" x2="100" y2="35" transform="rotate(67.5 100 100)" />
           <line x1="100" y1="10" x2="100" y2="35" transform="rotate(112.5 100 100)" />
           <line x1="100" y1="10" x2="100" y2="35" transform="rotate(157.5 100 100)" />
           <line x1="100" y1="10" x2="100" y2="35" transform="rotate(202.5 100 100)" />
           <line x1="100" y1="10" x2="100" y2="35" transform="rotate(247.5 100 100)" />
           <line x1="100" y1="10" x2="100" y2="35" transform="rotate(292.5 100 100)" />
           <line x1="100" y1="10" x2="100" y2="35" transform="rotate(337.5 100 100)" />
        </g>
      </g>
    </g>
  </svg>
);

const ControlGroup = ({ title, children, className = '' }: any) => (
  <div className={`mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 ${className}`}>
    <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider flex justify-between items-center">
      {title}
    </h3>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const Slider = ({ label, value, min, max, step = 1, onChange, unit = '' }: any) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-gray-500 w-10 shrink-0">{label}</span>
    <input 
      type="range" min={min} max={max} step={step} value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
    <span className="text-gray-500 w-8 text-right shrink-0">{Math.round(value * 10) / 10}{unit}</span>
  </div>
);

const FontSelector = ({ value, onChange }: any) => (
   <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-1.5 border rounded text-xs bg-gray-50 text-gray-700"
    >
      {FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
    </select>
);

const AlignSelector = ({ value, onChange }: any) => (
  <div className="flex border rounded overflow-hidden">
    {['left', 'center', 'right'].map((align) => (
      <button 
        key={align}
        type="button"
        onClick={() => onChange(align)}
        className={`flex-1 py-1 flex justify-center ${value === align ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
      >
        {align === 'left' && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 19h16v2H4zm0-4h10v2H4zm0-4h16v2H4zm0-4h10v2H4zm0-4h16v2H4z"/></svg>}
        {align === 'center' && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 19h16v2H4zm6-4h4v2h-4zm-6-4h16v2H4zm6-4h4v2h-4zm-6-4h16v2H4z"/></svg>}
        {align === 'right' && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 19h16v2H4zm6-4h10v2h-10zm-6-4h16v2H4zm6-4h10v2h-10zm-6-4h16v2H4z"/></svg>}
      </button>
    ))}
  </div>
);

const ResizeHandle = ({ id, type, value, onResizeStart }: { id: string, type: 'width' | 'fontSize', value: number, onResizeStart: any }) => (
    <div 
      onMouseDown={(e) => onResizeStart(e, id, type, value)}
      data-html2canvas-ignore="true"
      className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-blue-500 rounded-full cursor-nwse-resize flex items-center justify-center text-white shadow-md z-50 transition-transform hover:scale-110 opacity-0 group-hover:opacity-100"
      title="拖动调整大小"
    >
         <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15l-6 6M21 8l-13 13"/></svg>
    </div>
);

// --- Main Application ---

const App = () => {
  // --- State ---
  const apiKey = process.env.API_KEY || '';
  const [loadingBg, setLoadingBg] = useState(false);
  const [loadingText, setLoadingText] = useState(false);
  const [bgImage, setBgImage] = useState<string>(savedData?.bgImage || DEFAULT_BG);
  
  // Elements with Persistence Support - Fixed Layout Defaults
  
  const [mainTextCN, setMainTextCN] = useState<ElementState<TextStyle>>(savedData?.mainTextCN || {
    id: 'mainTextCN',
    content: '早安',
    pos: { x: 80, y: 180 }, // Adjusted based on image: Top Left
    zIndex: 20,
    style: {
      fontSize: 160,
      color: '#ffffff',
      fontFamily: '"Noto Sans SC", sans-serif',
      textAlign: 'left',
      lineHeight: 1.1,
      fontWeight: '900',
      opacity: 1,
      rotation: 0
    }
  });

  const [mainTextEN, setMainTextEN] = useState<ElementState<TextStyle>>(savedData?.mainTextEN || {
    id: 'mainTextEN',
    content: 'Good Morning',
    pos: { x: 60, y: 380 }, // Adjusted: Below "早安"
    zIndex: 21,
    style: {
      fontSize: 60,
      color: '#ffffff',
      fontFamily: '"ZCOOL KuaiLe", cursive',
      textAlign: 'left',
      lineHeight: 1.1,
      fontWeight: '400',
      opacity: 1,
      rotation: 0
    }
  });

  const [yiLearning, setYiLearning] = useState<ElementState<TextStyle>>(savedData?.yiLearning || {
    id: 'yiLearning',
    content: '易 学习',
    pos: { x: 480, y: 395 }, // Adjusted: Right of "Good Morning"
    zIndex: 22,
    style: {
      fontSize: 40,
      color: '#ffffff',
      fontFamily: '"Microsoft YaHei", sans-serif', // Updated to YaHei as requested
      textAlign: 'center',
      lineHeight: 1,
      fontWeight: '400',
      opacity: 0.9,
      rotation: 0
    }
  });

  const [proverb, setProverb] = useState<ElementState<TextStyle>>(savedData?.proverb || {
    id: 'proverb',
    content: 'Life is bright and everything is lovely.\n生活明朗，万物可爱。\n—— 佚名',
    pos: { x: 40, y: 1050 }, // Adjusted: Bottom Left
    zIndex: 20,
    style: {
      fontSize: 32,
      color: '#ffffff',
      fontFamily: '"Microsoft YaHei", sans-serif', 
      textAlign: 'left',
      lineHeight: 1.5,
      fontWeight: '700', 
      opacity: 1,
      rotation: 0
    }
  });

  const [logo, setLogo] = useState<ElementState<ImageStyle>>(savedData?.logo || {
    id: 'logo',
    content: null,
    pos: { x: 400, y: 40 }, // Adjusted: Top Right
    zIndex: 30,
    style: {
      width: 280,
      rotation: 0
    }
  });

  // Year/Month element
  const [dateMonthYear, setDateMonthYear] = useState<ElementState<TextStyle>>(savedData?.dateMonthYear || {
    id: 'dateMonthYear',
    content: '',
    pos: { x: 500, y: 460 }, // Adjusted: Below Yi Learning
    zIndex: 15,
    style: {
      fontSize: 50,
      color: '#ffffff',
      fontFamily: '"Noto Sans SC", sans-serif',
      textAlign: 'right',
      lineHeight: 1,
      fontWeight: '700',
      opacity: 1,
      rotation: 0
    }
  });

  // Day element (Big Number)
  const [dateDay, setDateDay] = useState<ElementState<TextStyle>>(savedData?.dateDay || {
    id: 'dateDay',
    content: '',
    pos: { x: 580, y: 540 }, // Adjusted: Below Month/Year
    zIndex: 16,
    style: {
      fontSize: 200,
      color: '#ffffff',
      fontFamily: '"Noto Sans SC", sans-serif',
      textAlign: 'center',
      lineHeight: 1,
      fontWeight: '900',
      opacity: 1,
      rotation: 0
    }
  });

  const [sunElement, setSunElement] = useState<ElementState<SunStyle>>(savedData?.sunElement || {
    id: 'sun',
    content: 'sun',
    pos: { x: 520, y: 1020 }, // Adjusted: Bottom Right
    zIndex: 10,
    style: {
      size: 180,
      color: '#dfff00', // Yellowish lime
      opacity: 0.9,
      rotation: 0
    }
  });

  // Scaling State
  const [scale, setScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Dragging & Resizing State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  // Resizing state
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeType, setResizeType] = useState<'width' | 'fontSize' | null>(null);

  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });
  
  const initialResizeValue = useRef(0); // stores initial width OR initial fontSize
  
  const posterRef = useRef<HTMLDivElement>(null);

  // --- Effects ---

  // Persistence Effect: Save state whenever it changes
  useEffect(() => {
    const stateToSave = {
      bgImage,
      mainTextCN,
      mainTextEN,
      yiLearning,
      proverb,
      logo,
      dateMonthYear,
      dateDay,
      sunElement
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [bgImage, mainTextCN, mainTextEN, yiLearning, proverb, logo, dateMonthYear, dateDay, sunElement]);

  useEffect(() => {
    // 1. Set Date (Split format) - Only if content is empty (initially)
    if (!savedData) {
        const now = new Date();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        setDateDay(prev => ({ ...prev, content: String(now.getDate()) }));
        setDateMonthYear(prev => ({ ...prev, content: `${monthNames[now.getMonth()]}. ${now.getFullYear()}` }));
    }

    // 2. Auto generate if API key exists AND no saved data
    if (apiKey && !savedData) {
       generateBg();
       generateProverb();
    }

    // 3. Responsive Scaling Logic
    const updateScale = () => {
      if (previewContainerRef.current) {
        const { clientWidth, clientHeight } = previewContainerRef.current;
        const padding = 20; 
        const availW = clientWidth - padding;
        const availH = clientHeight - padding;
        const scaleW = availW / POSTER_WIDTH;
        const scaleH = availH / POSTER_HEIGHT;
        setScale(Math.max(0.1, Math.min(scaleW, scaleH))); 
      }
    };

    const resizeObserver = new ResizeObserver(updateScale);
    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }
    updateScale();

    return () => resizeObserver.disconnect();
  }, []);

  // --- AI Functions ---

  const removeZhipuWatermark = async (src: string): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const w = img.naturalWidth || POSTER_WIDTH;
          const h = img.naturalHeight || POSTER_HEIGHT;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(src); return; }
          ctx.drawImage(img, 0, 0, w, h);

          const marginX = Math.round(w * 0.02);
          const marginY = Math.round(h * 0.02);
          const wmW = Math.round(w * 0.26);
          const wmH = Math.round(h * 0.12);
          const destX = Math.max(0, w - wmW - marginX);
          const destY = Math.max(0, h - wmH - marginY);

          let srcX = destX;
          let srcY = Math.max(0, destY - Math.round(wmH * 1.2));
          if (srcX + wmW > w) srcX = Math.max(0, w - wmW);
          if (srcY + wmH > h) srcY = Math.max(0, h - wmH);

          ctx.filter = 'blur(18px)';
          ctx.drawImage(img, srcX, srcY, wmW, wmH, destX, destY, wmW, wmH);
          ctx.filter = 'none';

          try {
            const sampleH = Math.max(1, Math.round(wmH * 0.6));
            const sample = ctx.getImageData(srcX, Math.max(0, srcY + Math.round(sampleH * 0.2)), wmW, sampleH);
            let r = 0, g = 0, b = 0, a = 0;
            const step = 4;
            for (let i = 0; i < sample.data.length; i += step) {
              r += sample.data[i];
              g += sample.data[i+1];
              b += sample.data[i+2];
              a += sample.data[i+3];
            }
            const count = sample.data.length / step;
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            const grad = ctx.createLinearGradient(destX, destY, destX, destY + wmH);
            grad.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
            grad.addColorStop(1, `rgba(${Math.min(255, r+3)},${Math.min(255, g+3)},${Math.min(255, b+3)},0.85)`);
            ctx.filter = 'blur(10px)';
            ctx.fillStyle = grad;
            ctx.fillRect(destX, destY, wmW, wmH);
            ctx.filter = 'none';
          } catch {}

          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(src);
        img.src = src;
      } catch {
        resolve(src);
      }
    });
  };

  const generateBg = async () => {
    setLoadingBg(true);
    try {
      const randomTheme = BG_THEMES[Math.floor(Math.random() * BG_THEMES.length)];
      const randomStyle = VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)];
      const seed = Math.floor(Math.random() * 1000000);
      const prompt = `垂直9:16海报背景，主题：${randomTheme}，风格：${randomStyle}。宁静清晨氛围，审美高级，极简，大量留白用于排版，不含任何文字。随机种子：${seed}`;
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size: '720x1280', model: 'cogview-3-flash', watermark_enabled: false })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      const data = await res.json();
      const url = data?.dataUrl;
      if (!url) throw new Error('No image data');
      const cleaned = await removeZhipuWatermark(url);
      setBgImage(cleaned || url);
    } catch (e: any) {
      alert(`背景生成失败: ${e?.message || e}`);
    } finally {
      setLoadingBg(false);
    }
  };

  const generateProverb = async () => {
    setLoadingText(true);
    try {
      const randomTopic = QUOTE_TOPICS[Math.floor(Math.random() * QUOTE_TOPICS.length)];
      const seed = Math.floor(Math.random() * 1000000);
      const prompt = `主题: ${randomTopic}。种子: ${seed}。请生成一条独特且鼓舞人心的英中双语金句，并只返回 JSON：{"english":"...","chinese":"...","source":"..."}`;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'glm-4.6',
          messages: [
            { role: 'system', content: '你是一个有用的AI助手。' },
            { role: 'user', content: prompt }
          ],
          temperature: 1.0,
          stream: false
        })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      const data = await res.json();
      let text = '';
      const msg = data?.choices?.[0]?.message;
      if (typeof msg?.content === 'string') {
        text = msg.content;
      } else if (Array.isArray(msg?.content)) {
        text = msg.content.map((p: any) => (typeof p === 'string' ? p : (p?.text || ''))).join('');
      } else {
        text = data?.choices?.[0]?.delta?.content || '';
      }
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        const lines = (text || '').split('\n').filter(Boolean);
        parsed = { english: lines[0] || '', chinese: lines[1] || '', source: '' };
      }
      let sourceContent = parsed.source || '';
      if (typeof sourceContent === 'string' && (sourceContent.toLowerCase().includes('proverb') || sourceContent.toLowerCase().includes('chinese'))) {
        sourceContent = '';
      }
      const fullContent = sourceContent ? `${parsed.english}\n${parsed.chinese}\n—— ${sourceContent}` : `${parsed.english}\n${parsed.chinese}`;
      setProverb(prev => ({ ...prev, content: fullContent }));
    } catch (e: any) {
      alert(`金句生成失败: ${e?.message || e}`);
    } finally {
      setLoadingText(false);
    }
  };

  // --- Event Handlers ---

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const res = evt.target?.result as string;
        setLogo(prev => ({ ...prev, content: res }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    if (!posterRef.current) return;
    try {
      const canvas = await (window as any).html2canvas(posterRef.current, {
        scale: 1,
        useCORS: true,
        backgroundColor: null,
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        windowWidth: POSTER_WIDTH,
        windowHeight: POSTER_HEIGHT,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
            const clonedPoster = clonedDoc.querySelector('[data-poster-root]') as HTMLElement;
            if (clonedPoster) {
                clonedPoster.style.transform = 'none';
                clonedPoster.style.left = '0';
                clonedPoster.style.top = '0';
            }
        }
      });
      
      const link = document.createElement('a');
      link.download = `morning-poster-${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
      alert("下载失败，请重试");
    }
  };

  // --- Dragging & Resizing Logic ---

  const handleMouseDown = (e: React.MouseEvent, id: string, currentPos: Position) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(id);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    elementStartPos.current = { ...currentPos };
  };

  const handleResizeStart = (e: React.MouseEvent, id: string, type: 'width' | 'fontSize', currentValue: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingId(id);
    setResizeType(type);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialResizeValue.current = currentValue;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Calculate delta taking scale into account
    const dx = (e.clientX - dragStartPos.current.x) / scale;
    const dy = (e.clientY - dragStartPos.current.y) / scale;

    // --- RESIZING LOGIC ---
    if (resizingId) {
        const newValue = Math.max(10, initialResizeValue.current + dx);
        
        if (resizingId === 'logo') {
             setLogo(prev => ({...prev, style: {...prev.style, width: newValue}}));
        } else if (resizingId === 'mainTextCN') {
             setMainTextCN(prev => ({...prev, style: {...prev.style, fontSize: newValue}}));
        } else if (resizingId === 'mainTextEN') {
             setMainTextEN(prev => ({...prev, style: {...prev.style, fontSize: newValue}}));
        } else if (resizingId === 'proverb') {
             setProverb(prev => ({...prev, style: {...prev.style, fontSize: newValue}}));
        } else if (resizingId === 'dateMonthYear') {
             setDateMonthYear(prev => ({...prev, style: {...prev.style, fontSize: newValue}}));
        } else if (resizingId === 'dateDay') {
             setDateDay(prev => ({...prev, style: {...prev.style, fontSize: newValue}}));
        } else if (resizingId === 'yiLearning') {
             setYiLearning(prev => ({...prev, style: {...prev.style, fontSize: newValue}}));
        } else if (resizingId === 'sun') {
             setSunElement(prev => ({...prev, style: {...prev.style, size: newValue}}));
        }
        return; 
    }

    // --- DRAGGING LOGIC ---
    if (!draggingId) return;

    const newX = elementStartPos.current.x + dx;
    const newY = elementStartPos.current.y + dy;

    if (draggingId === 'mainTextCN') setMainTextCN(prev => ({ ...prev, pos: { x: newX, y: newY } }));
    else if (draggingId === 'mainTextEN') setMainTextEN(prev => ({ ...prev, pos: { x: newX, y: newY } }));
    else if (draggingId === 'proverb') setProverb(prev => ({ ...prev, pos: { x: newX, y: newY } }));
    else if (draggingId === 'logo') setLogo(prev => ({ ...prev, pos: { x: newX, y: newY } }));
    else if (draggingId === 'dateMonthYear') setDateMonthYear(prev => ({ ...prev, pos: { x: newX, y: newY } }));
    else if (draggingId === 'dateDay') setDateDay(prev => ({ ...prev, pos: { x: newX, y: newY } }));
    else if (draggingId === 'yiLearning') setYiLearning(prev => ({ ...prev, pos: { x: newX, y: newY } }));
    else if (draggingId === 'sun') setSunElement(prev => ({ ...prev, pos: { x: newX, y: newY } }));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
    setResizingId(null);
    setResizeType(null);
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 overflow-hidden font-sans" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      
      {/* --- Left Panel: Controls --- */}
      {/* stopPropagation prevents clicks in sidebar from interfering with drag state or triggering poster events */}
      <div 
        onMouseDown={(e) => e.stopPropagation()} 
        className="w-80 lg:w-96 flex-shrink-0 flex flex-col h-full bg-white border-r border-gray-200 shadow-xl z-20"
      >
        <div className="p-4 border-b border-gray-100 bg-white">
          <h1 className="text-lg font-black text-gray-800 flex items-center gap-2">
            🌅 早安海报生成器
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            生成尺寸: {POSTER_WIDTH} x {POSTER_HEIGHT}px
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          
          {/* AI Generator Controls */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button 
              type="button"
              onClick={generateBg}
              disabled={loadingBg}
              className={`py-2 px-3 rounded-md text-xs font-bold text-white transition-all shadow-sm flex flex-col items-center justify-center gap-1 ${
                loadingBg ? 'bg-gray-400 cursor-wait' : 'bg-indigo-500 hover:bg-indigo-600 active:scale-95'
              }`}
            >
              {loadingBg ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <span>🖼️ 换背景</span>}
            </button>
            <button 
              type="button"
              onClick={generateProverb}
              disabled={loadingText}
              className={`py-2 px-3 rounded-md text-xs font-bold text-white transition-all shadow-sm flex flex-col items-center justify-center gap-1 ${
                loadingText ? 'bg-gray-400 cursor-wait' : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95'
              }`}
            >
              {loadingText ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <span>💬 换金句</span>}
            </button>
          </div>

          {/* 1. Main Text CN Controls */}
          <ControlGroup title="主标题 (中文)">
            <input 
              value={mainTextCN.content || ''}
              onChange={(e) => setMainTextCN(prev => ({ ...prev, content: e.target.value }))}
              className="w-full p-2 border border-gray-200 rounded text-sm focus:border-blue-500 outline-none bg-gray-50 mb-2"
              placeholder="输入中文标题..."
            />
            <FontSelector value={mainTextCN.style.fontFamily} onChange={(v: string) => setMainTextCN(prev => ({...prev, style: {...prev.style, fontFamily: v}}))} />
            <div className="grid grid-cols-[1fr_auto] gap-2">
               <AlignSelector value={mainTextCN.style.textAlign} onChange={(v: any) => setMainTextCN(prev => ({...prev, style: {...prev.style, textAlign: v}}))} />
               <input 
                  type="color" 
                  value={mainTextCN.style.color}
                  onChange={(e) => setMainTextCN(prev => ({...prev, style: {...prev.style, color: e.target.value}}))}
                  className="w-8 h-8 rounded border border-gray-200 p-0.5 cursor-pointer"
                />
            </div>
          </ControlGroup>

          {/* 2. Main Text EN Controls */}
          <ControlGroup title="主标题 (英文)">
             <input 
              value={mainTextEN.content || ''}
              onChange={(e) => setMainTextEN(prev => ({ ...prev, content: e.target.value }))}
              className="w-full p-2 border border-gray-200 rounded text-sm focus:border-blue-500 outline-none bg-gray-50 mb-2"
              placeholder="Enter English Title..."
            />
             <FontSelector value={mainTextEN.style.fontFamily} onChange={(v: string) => setMainTextEN(prev => ({...prev, style: {...prev.style, fontFamily: v}}))} />
             <div className="grid grid-cols-[1fr_auto] gap-2">
                <AlignSelector value={mainTextEN.style.textAlign} onChange={(v: any) => setMainTextEN(prev => ({...prev, style: {...prev.style, textAlign: v}}))} />
                <input 
                  type="color" 
                  value={mainTextEN.style.color}
                  onChange={(e) => setMainTextEN(prev => ({...prev, style: {...prev.style, color: e.target.value}}))}
                  className="w-8 h-8 rounded border border-gray-200 p-0.5 cursor-pointer"
                />
             </div>
           </ControlGroup>

          {/* 3. Yi Learning Controls */}
          <ControlGroup title="易 学习">
            <input 
              value={yiLearning.content || ''}
              onChange={(e) => setYiLearning(prev => ({ ...prev, content: e.target.value }))}
              className="w-full p-2 border border-gray-200 rounded text-sm focus:border-blue-500 outline-none bg-gray-50 mb-2"
              placeholder="输入内容..."
            />
            <FontSelector value={yiLearning.style.fontFamily} onChange={(v: string) => setYiLearning(prev => ({...prev, style: {...prev.style, fontFamily: v}}))} />
             <div className="grid grid-cols-[1fr_auto] gap-2">
               <AlignSelector value={yiLearning.style.textAlign} onChange={(v: any) => setYiLearning(prev => ({...prev, style: {...prev.style, textAlign: v}}))} />
               <input 
                  type="color" 
                  value={yiLearning.style.color}
                  onChange={(e) => setYiLearning(prev => ({...prev, style: {...prev.style, color: e.target.value}}))}
                  className="w-8 h-8 rounded border border-gray-200 p-0.5 cursor-pointer"
                />
            </div>
          </ControlGroup>

          {/* 4. Date Controls (Month/Year) */}
          <ControlGroup title="日期 (年月)">
             <div className="flex items-center gap-2 mb-2">
               <input 
                 type="text" 
                 value={dateMonthYear.content || ''}
                 onChange={(e) => setDateMonthYear(prev => ({...prev, content: e.target.value}))}
                 className="flex-1 p-1.5 border rounded text-xs"
               />
               <input 
                  type="color" 
                  value={dateMonthYear.style.color}
                  onChange={(e) => setDateMonthYear(prev => ({...prev, style: {...prev.style, color: e.target.value}}))}
                  className="w-8 h-8 rounded border border-gray-200 p-0.5 cursor-pointer"
                />
             </div>
          </ControlGroup>

          {/* 5. Date Controls (Day) */}
          <ControlGroup title="日期 (日)">
             <div className="flex items-center gap-2 mb-2">
               <input 
                 type="text" 
                 value={dateDay.content || ''}
                 onChange={(e) => setDateDay(prev => ({...prev, content: e.target.value}))}
                 className="flex-1 p-1.5 border rounded text-xs"
               />
               <input 
                  type="color" 
                  value={dateDay.style.color}
                  onChange={(e) => setDateDay(prev => ({...prev, style: {...prev.style, color: e.target.value}}))}
                  className="w-8 h-8 rounded border border-gray-200 p-0.5 cursor-pointer"
                />
             </div>
             <div className="space-y-2 mt-2">
               <Slider label="透明" value={dateDay.style.opacity || 1} min={0} max={1} step={0.1} onChange={(v: number) => setDateDay(prev => ({...prev, style: {...prev.style, opacity: v}}))} />
               <Slider label="旋转" value={dateDay.style.rotation || 0} min={0} max={360} onChange={(v: number) => setDateDay(prev => ({...prev, style: {...prev.style, rotation: v}}))} unit="°"/>
             </div>
          </ControlGroup>

          {/* 6. Logo Controls */}
          <ControlGroup title="Logo">
            <div className="flex items-center gap-3">
              {logo.content ? (
                <div className="relative w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                  <img src={logo.content} alt="Logo" className="max-w-full max-h-full object-contain" />
                  <button type="button" onClick={() => setLogo(prev => ({...prev, content: null}))} className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs">×</button>
                </div>
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                  无图
                </div>
              )}
              <div className="flex-1">
                <label className="block text-xs font-bold text-blue-600 cursor-pointer hover:underline mb-2">
                  上传图片/Logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                <div className="text-[10px] text-gray-400">支持 PNG, JPG (透明底最佳)</div>
              </div>
            </div>
            
            {logo.content && (
              <div className="mt-4 space-y-2">
                <div className="text-[10px] text-gray-500 mb-2 p-2 bg-blue-50 rounded border border-blue-100">
                    💡 提示：在右侧海报中可直接拖拽 Logo，使用右下角手柄调整大小。
                </div>
                <Slider label="旋转" value={logo.style.rotation} min={0} max={360} onChange={(v: number) => setLogo(prev => ({...prev, style: {...prev.style, rotation: v}}))} unit="°"/>
              </div>
            )}
          </ControlGroup>

          {/* 7. Sun Controls */}
          <ControlGroup title="装饰：太阳">
             <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 flex gap-2 items-center">
                  <span className="text-xs text-gray-500">颜色</span>
                  <input 
                    type="color" 
                    value={sunElement.style.color}
                    onChange={(e) => setSunElement(prev => ({...prev, style: {...prev.style, color: e.target.value}}))}
                    className="w-8 h-8 rounded border border-gray-200 p-0.5 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                   <Slider label="透明" value={sunElement.style.opacity} min={0} max={1} step={0.1} onChange={(v: number) => setSunElement(prev => ({...prev, style: {...prev.style, opacity: v}}))} />
                </div>
             </div>
             <Slider label="旋转" value={sunElement.style.rotation} min={0} max={360} onChange={(v: number) => setSunElement(prev => ({...prev, style: {...prev.style, rotation: v}}))} unit="°"/>
          </ControlGroup>

          {/* 8. Proverb Controls */}
           <ControlGroup title="金句 (英/中)">
             <textarea 
              value={proverb.content || ''}
              onChange={(e) => setProverb(prev => ({ ...prev, content: e.target.value }))}
              className="w-full p-2 border border-gray-200 rounded text-sm focus:border-blue-500 outline-none resize-none bg-gray-50"
              rows={4}
              placeholder="输入金句..."
            />
             <FontSelector value={proverb.style.fontFamily} onChange={(v: string) => setProverb(prev => ({...prev, style: {...prev.style, fontFamily: v}}))} />
             <div className="flex gap-2 items-center">
                <div className="flex-1"><AlignSelector value={proverb.style.textAlign} onChange={(v: any) => setProverb(prev => ({...prev, style: {...prev.style, textAlign: v}}))} /></div>
                <input 
                  type="color" 
                  value={proverb.style.color}
                  onChange={(e) => setProverb(prev => ({...prev, style: {...prev.style, color: e.target.value}}))}
                  className="w-8 h-8 rounded border border-gray-200 p-0.5 cursor-pointer"
                />
             </div>
             {/* Bold Toggle */}
             <div className="mt-2">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={proverb.style.fontWeight === '700'}
                    onChange={(e) => setProverb(prev => ({...prev, style: {...prev.style, fontWeight: e.target.checked ? '700' : '400'}}))}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  加粗字体
                </label>
             </div>
           </ControlGroup>

          <div className="h-8"></div> {/* Spacer */}
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button 
            type="button"
            onClick={handleDownload}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg active:transform active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            下载海报 (720x1280)
          </button>
        </div>
      </div>

      {/* --- Right Panel: Preview Area --- */}
      <div className="flex-1 bg-gray-200 relative overflow-hidden flex flex-col items-center justify-center p-4">
        
        {/* Helper info */}
        <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-50">
           按住元素可拖动 • 拖拽蓝点调整大小
        </div>

        {/* Scaling Container */}
        <div 
          ref={previewContainerRef}
          className="relative flex items-center justify-center w-full h-full"
        >
          {/* The Poster DOM */}
          <div 
            ref={posterRef}
            data-poster-root="true"
            className="bg-white shadow-2xl relative overflow-hidden select-none"
            style={{
              width: POSTER_WIDTH,
              height: POSTER_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              flexShrink: 0,
            }}
          >
            {/* Background Image */}
            <div className="absolute inset-0 pointer-events-none">
              <img 
                src={bgImage} 
                alt="Background" 
                className="w-full h-full object-cover" 
                crossOrigin="anonymous"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40"></div>
              
            </div>

            {/* Draggable & Resizable: Logo */}
            {logo.content && (
              <div
                onMouseDown={(e) => handleMouseDown(e, logo.id, logo.pos)}
                className={`absolute group cursor-move ${draggingId === logo.id ? 'ring-2 ring-blue-400 ring-dashed' : ''} hover:ring-1 hover:ring-white/50`}
                style={{
                  left: logo.pos.x,
                  top: logo.pos.y,
                  width: logo.style.width,
                  transform: `rotate(${logo.style.rotation}deg)`,
                  zIndex: logo.zIndex,
                }}
              >
                <img 
                  src={logo.content} 
                  alt="User Logo" 
                  className="w-full h-full object-contain pointer-events-none" 
                  crossOrigin="anonymous"
                />
                <ResizeHandle id={logo.id} type="width" value={logo.style.width} onResizeStart={handleResizeStart} />
              </div>
            )}

            {/* Draggable: Sun Decoration */}
            <div
                onMouseDown={(e) => handleMouseDown(e, sunElement.id, sunElement.pos)}
                className={`absolute group cursor-move ${draggingId === sunElement.id ? 'ring-2 ring-blue-400 ring-dashed' : ''} hover:ring-1 hover:ring-white/50`}
                style={{
                  left: sunElement.pos.x,
                  top: sunElement.pos.y,
                  width: sunElement.style.size,
                  height: sunElement.style.size,
                  transform: `rotate(${sunElement.style.rotation}deg)`,
                  zIndex: sunElement.zIndex,
                  opacity: sunElement.style.opacity
                }}
            >
               <SunSVG color={sunElement.style.color} />
               <ResizeHandle id={sunElement.id} type="width" value={sunElement.style.size} onResizeStart={handleResizeStart} />
            </div>

            {/* Draggable: Yi Learning */}
            <div
              onMouseDown={(e) => handleMouseDown(e, yiLearning.id, yiLearning.pos)}
              className={`absolute whitespace-pre-wrap group cursor-move ${draggingId === yiLearning.id ? 'ring-2 ring-blue-400 ring-dashed' : ''} hover:ring-1 hover:ring-white/50`}
              style={{
                left: yiLearning.pos.x,
                top: yiLearning.pos.y,
                fontSize: yiLearning.style.fontSize,
                color: yiLearning.style.color,
                fontFamily: yiLearning.style.fontFamily,
                textAlign: yiLearning.style.textAlign,
                lineHeight: yiLearning.style.lineHeight,
                fontWeight: yiLearning.style.fontWeight,
                zIndex: yiLearning.zIndex,
                minWidth: '50px',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              {yiLearning.content}
              <ResizeHandle id={yiLearning.id} type="fontSize" value={yiLearning.style.fontSize} onResizeStart={handleResizeStart} />
            </div>

            {/* Draggable: Main Text CN */}
            <div
              onMouseDown={(e) => handleMouseDown(e, mainTextCN.id, mainTextCN.pos)}
              className={`absolute whitespace-pre-wrap group cursor-move ${draggingId === mainTextCN.id ? 'ring-2 ring-blue-400 ring-dashed' : ''} hover:ring-1 hover:ring-white/50`}
              style={{
                left: mainTextCN.pos.x,
                top: mainTextCN.pos.y,
                fontSize: mainTextCN.style.fontSize,
                color: mainTextCN.style.color,
                fontFamily: mainTextCN.style.fontFamily,
                textAlign: mainTextCN.style.textAlign,
                lineHeight: mainTextCN.style.lineHeight,
                fontWeight: mainTextCN.style.fontWeight,
                zIndex: mainTextCN.zIndex,
                minWidth: '50px',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              {mainTextCN.content}
              <ResizeHandle id={mainTextCN.id} type="fontSize" value={mainTextCN.style.fontSize} onResizeStart={handleResizeStart} />
            </div>

            {/* Draggable: Main Text EN */}
             <div
              onMouseDown={(e) => handleMouseDown(e, mainTextEN.id, mainTextEN.pos)}
              className={`absolute whitespace-pre-wrap group cursor-move ${draggingId === mainTextEN.id ? 'ring-2 ring-blue-400 ring-dashed' : ''} hover:ring-1 hover:ring-white/50`}
              style={{
                left: mainTextEN.pos.x,
                top: mainTextEN.pos.y,
                fontSize: mainTextEN.style.fontSize,
                color: mainTextEN.style.color,
                fontFamily: mainTextEN.style.fontFamily,
                textAlign: mainTextEN.style.textAlign,
                lineHeight: mainTextEN.style.lineHeight,
                fontWeight: mainTextEN.style.fontWeight,
                zIndex: mainTextEN.zIndex,
                minWidth: '50px',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              {mainTextEN.content}
              <ResizeHandle id={mainTextEN.id} type="fontSize" value={mainTextEN.style.fontSize} onResizeStart={handleResizeStart} />
            </div>

            {/* Draggable: Proverb */}
            <div
               onMouseDown={(e) => handleMouseDown(e, proverb.id, proverb.pos)}
               className={`absolute whitespace-pre-wrap group cursor-move ${draggingId === proverb.id ? 'ring-2 ring-blue-400 ring-dashed' : ''} hover:ring-1 hover:ring-white/50`}
               style={{
                 left: proverb.pos.x,
                 top: proverb.pos.y,
                 fontSize: proverb.style.fontSize,
                 color: proverb.style.color,
                 fontFamily: proverb.style.fontFamily,
                 textAlign: proverb.style.textAlign,
                 lineHeight: proverb.style.lineHeight,
                 fontWeight: proverb.style.fontWeight,
                 zIndex: proverb.zIndex,
                 maxWidth: '600px',
                 textShadow: '0 2px 4px rgba(0,0,0,0.3)'
               }}
            >
              {proverb.content}
              <ResizeHandle id={proverb.id} type="fontSize" value={proverb.style.fontSize} onResizeStart={handleResizeStart} />
            </div>

             {/* Draggable: Date (Month/Year) */}
             <div
               onMouseDown={(e) => handleMouseDown(e, dateMonthYear.id, dateMonthYear.pos)}
               className={`absolute whitespace-pre-wrap group cursor-move ${draggingId === dateMonthYear.id ? 'ring-2 ring-blue-400 ring-dashed' : ''} hover:ring-1 hover:ring-white/50`}
               style={{
                 left: dateMonthYear.pos.x,
                 top: dateMonthYear.pos.y,
                 fontSize: dateMonthYear.style.fontSize,
                 color: dateMonthYear.style.color,
                 fontFamily: dateMonthYear.style.fontFamily,
                 textAlign: dateMonthYear.style.textAlign,
                 lineHeight: dateMonthYear.style.lineHeight,
                 fontWeight: dateMonthYear.style.fontWeight,
                 zIndex: dateMonthYear.zIndex,
                 textShadow: '0 2px 4px rgba(0,0,0,0.3)'
               }}
            >
              {dateMonthYear.content}
              <ResizeHandle id={dateMonthYear.id} type="fontSize" value={dateMonthYear.style.fontSize} onResizeStart={handleResizeStart} />
            </div>

             {/* Draggable: Date (Day) */}
             <div
               onMouseDown={(e) => handleMouseDown(e, dateDay.id, dateDay.pos)}
               className={`absolute whitespace-pre-wrap group cursor-move ${draggingId === dateDay.id ? 'ring-2 ring-blue-400 ring-dashed' : ''} hover:ring-1 hover:ring-white/50`}
               style={{
                 left: dateDay.pos.x,
                 top: dateDay.pos.y,
                 fontSize: dateDay.style.fontSize,
                 color: dateDay.style.color,
                 fontFamily: dateDay.style.fontFamily,
                 textAlign: dateDay.style.textAlign,
                 lineHeight: dateDay.style.lineHeight,
                 fontWeight: dateDay.style.fontWeight,
                 zIndex: dateDay.zIndex,
                 opacity: dateDay.style.opacity,
                 transform: `rotate(${dateDay.style.rotation || 0}deg)`,
                 textShadow: '0 2px 4px rgba(0,0,0,0.3)'
               }}
            >
              {dateDay.content}
              <ResizeHandle id={dateDay.id} type="fontSize" value={dateDay.style.fontSize} onResizeStart={handleResizeStart} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
