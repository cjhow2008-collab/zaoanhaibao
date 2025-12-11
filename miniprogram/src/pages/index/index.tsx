import React, { useState } from 'react'
import { View, Text, Image, Button, Textarea, Slider, Picker, MovableArea, MovableView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.css'

// --- Constants ---
const POSTER_WIDTH = 720
const POSTER_HEIGHT = 1280
const API_BASE_URL = 'http://localhost:3002' // 请根据真机调试情况修改为局域网IP

// --- Types ---
interface Position { x: number; y: number }
interface TextStyle {
  fontSize: number
  color: string
  textAlign: 'left' | 'center' | 'right'
  fontWeight: string
  opacity?: number
  rotation?: number
}
interface ElementState<T> {
  id: string
  content: string | null
  pos: Position
  zIndex: number
  style: T
}

export default function Index() {
  // --- State ---
  const [loadingBg, setLoadingBg] = useState(false)
  const [loadingText, setLoadingText] = useState(false)
  
  // Background
  const [bgImage, setBgImage] = useState<string>("https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1470&auto=format&fit=crop")

  // Elements
  const [mainTextCN, setMainTextCN] = useState<ElementState<TextStyle>>({
    id: 'mainTextCN',
    content: '早安',
    pos: { x: 40, y: 90 }, 
    zIndex: 20,
    style: { fontSize: 80, color: '#ffffff', textAlign: 'left', fontWeight: '900', rotation: 0 }
  })

  const [mainTextEN, setMainTextEN] = useState<ElementState<TextStyle>>({
    id: 'mainTextEN',
    content: 'Good Morning',
    pos: { x: 30, y: 190 },
    zIndex: 21,
    style: { fontSize: 30, color: '#ffffff', textAlign: 'left', fontWeight: '400', rotation: 0 }
  })

  const [proverb, setProverb] = useState<ElementState<TextStyle>>({
    id: 'proverb',
    content: '生活明朗，万物可爱。\nLife is bright and everything is lovely.',
    pos: { x: 20, y: 500 },
    zIndex: 20,
    style: { fontSize: 16, color: '#ffffff', textAlign: 'left', fontWeight: '700', rotation: 0 }
  })

  // --- API Functions ---
  const generateProverb = async () => {
    setLoadingText(true)
    try {
      const res = await Taro.request({
        url: `${API_BASE_URL}/api/chat`,
        method: 'POST',
        data: {
          messages: [
            { role: "system", content: "You are a poetic assistant. Output ONLY the JSON." },
            { role: "user", content: "Generate a morning quote (Chinese & English)." }
          ]
        }
      })
      // Stream handling is complex in Taro, assuming simple JSON response for now or need adapter
      // For this demo, we assume the server returns JSON or we need to handle SSE.
      // Since existing backend uses SSE, Taro.request doesn't support SSE easily.
      // We might need a basic non-streaming endpoint or basic parsing.
      // Fallback to static for demo if SSE fails
      Taro.showToast({ title: '需适配SSE', icon: 'none' })
    } catch (error) {
      console.error(error)
      Taro.showToast({ title: '生成失败', icon: 'none' })
    } finally {
      setLoadingText(false)
    }
  }

  const generateBg = async () => {
    setLoadingBg(true)
    try {
      const res = await Taro.request({
        url: `${API_BASE_URL}/api/image`,
        method: 'POST',
        data: {
          prompt: "Morning sunlight, nature, peaceful",
          model: 'cogview-3-flash',
          watermark_enabled: false
        }
      })
      if (res.data && res.data.data && res.data.data[0]) {
        setBgImage(res.data.data[0].url)
      }
    } catch (error) {
      console.error(error)
      Taro.showToast({ title: '生成失败', icon: 'none' })
    } finally {
      setLoadingBg(false)
    }
  }

  // --- Render ---
  // Scale factor for preview (720px width -> Screen Width)
  const systemInfo = Taro.getSystemInfoSync()
  const scale = systemInfo.screenWidth / 720
  const previewHeight = 1280 * scale

  return (
    <View className='container'>
      {/* Poster Preview Area */}
      <View className='poster-area' style={{ width: '100%', height: `${previewHeight}px`, position: 'relative', overflow: 'hidden' }}>
        <Image src={bgImage} mode='aspectFill' style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
        
        {/* Movable Area Overlay */}
        <MovableArea style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
          
          {/* Main Text CN */}
          <MovableView 
            direction="all" 
            x={mainTextCN.pos.x * scale} 
            y={mainTextCN.pos.y * scale}
            style={{ zIndex: mainTextCN.zIndex, width: 'auto', height: 'auto' }}
          >
            <Text style={{ 
              fontSize: `${mainTextCN.style.fontSize * scale}px`, 
              color: mainTextCN.style.color, 
              fontWeight: mainTextCN.style.fontWeight === '900' ? 'bold' : 'normal' 
            }}>
              {mainTextCN.content}
            </Text>
          </MovableView>

          {/* Main Text EN */}
          <MovableView 
            direction="all" 
            x={mainTextEN.pos.x * scale} 
            y={mainTextEN.pos.y * scale}
            style={{ zIndex: mainTextEN.zIndex }}
          >
             <Text style={{ 
              fontSize: `${mainTextEN.style.fontSize * scale}px`, 
              color: mainTextEN.style.color
            }}>
              {mainTextEN.content}
            </Text>
          </MovableView>

           {/* Proverb */}
           <MovableView 
            direction="all" 
            x={proverb.pos.x * scale} 
            y={proverb.pos.y * scale}
            style={{ zIndex: proverb.zIndex, maxWidth: '80%' }}
          >
             <Text style={{ 
              fontSize: `${proverb.style.fontSize * scale}px`, 
              color: proverb.style.color,
              textAlign: proverb.style.textAlign
            }}>
              {proverb.content}
            </Text>
          </MovableView>

        </MovableArea>
      </View>

      {/* Controls */}
      <View className='controls' style={{ padding: '20px' }}>
        <Button onClick={generateBg} disabled={loadingBg} style={{ marginBottom: '10px' }}>
          {loadingBg ? '生成中...' : 'AI 换背景'}
        </Button>
        <Button onClick={generateProverb} disabled={loadingText}>
          {loadingText ? '生成中...' : 'AI 换金句'}
        </Button>
        
        <View style={{ marginTop: '20px' }}>
           <Text>金句内容:</Text>
           <Textarea 
            value={proverb.content || ''} 
            onInput={(e) => setProverb({...proverb, content: e.detail.value})}
            style={{ border: '1px solid #ccc', width: '100%', height: '80px', marginTop: '5px' }}
           />
        </View>
      </View>
    </View>
  )
}
