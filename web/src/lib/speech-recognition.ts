/**
 * Web Speech API 语音识别服务
 * 提供简单的语音转文字功能，支持实时识别和最终结果
 */

export type RecognitionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface SpeechRecognitionConfig {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
}

export class SpeechRecognitionService {
  private recognition: any
  private isListening = false

  constructor(
    private onResult: (text: string, isFinal: boolean) => void,
    private onStatusChange: (status: RecognitionStatus, message?: string) => void,
    private config: SpeechRecognitionConfig = {}
  ) {
    // 检查浏览器支持
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      throw new Error('当前浏览器不支持语音识别，请使用 Chrome、Safari 或 Edge')
    }

    this.recognition = new SpeechRecognition()
    this.setupRecognition()
  }

  private setupRecognition() {
    // 配置识别参数
    this.recognition.continuous = this.config.continuous ?? true // 持续识别
    this.recognition.interimResults = this.config.interimResults ?? true // 返回临时结果
    this.recognition.maxAlternatives = this.config.maxAlternatives ?? 1

    // 识别结果
    this.recognition.onresult = (event: any) => {
      const results = event.results
      const lastResult = results[results.length - 1]
      const transcript = lastResult[0].transcript
      const isFinal = lastResult.isFinal

      this.onResult(transcript, isFinal)
    }

    // 开始识别
    this.recognition.onstart = () => {
      this.isListening = true
      this.onStatusChange('connected')
    }

    // 识别结束
    this.recognition.onend = () => {
      this.isListening = false
      this.onStatusChange('disconnected')
    }

    // 错误处理
    this.recognition.onerror = (event: any) => {
      let message = '语音识别出错'

      switch (event.error) {
        case 'no-speech':
          message = '未检测到语音，请重试'
          break
        case 'audio-capture':
          message = '无法访问麦克风，请检查设备'
          break
        case 'not-allowed':
          message = '麦克风权限被拒绝，请在浏览器设置中允许'
          break
        case 'network':
          message = '网络错误，请检查网络连接'
          break
        case 'aborted':
          // 用户主动停止，不显示错误
          return
      }

      this.onStatusChange('error', message)
    }
  }

  async start(language?: string) {
    try {
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // 立即关闭流，仅用于权限检查
      stream.getTracks().forEach((track) => track.stop())

      // 设置语言
      this.recognition.lang = language || this.config.language || 'zh-CN'

      this.onStatusChange('connecting')
      this.recognition.start()
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'NotAllowedError'
          ? '麦克风权限被拒绝'
          : '无法启动语音识别'
      this.onStatusChange('error', message)
      throw error
    }
  }

  stop() {
    if (this.isListening) {
      this.recognition.stop()
    }
  }

  isActive() {
    return this.isListening
  }

  // 检查浏览器是否支持语音识别
  static isSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    )
  }
}

// 支持的语言列表
export const SUPPORTED_LANGUAGES = {
  'zh-CN': '中文（简体）',
  'zh-TW': '中文（繁体）',
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
  'es-ES': 'Español',
  'fr-FR': 'Français',
  'de-DE': 'Deutsch',
  'it-IT': 'Italiano',
  'pt-BR': 'Português (Brasil)',
  'ru-RU': 'Русский',
} as const

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES
