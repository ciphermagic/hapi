import { createContext, useCallback, useContext, useState, useRef, type ReactNode } from 'react'
import { SpeechRecognitionService, type RecognitionStatus } from './speech-recognition'

// 简化的状态类型，与原有的 ConversationStatus 兼容
type VoiceStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface VoiceContextValue {
    status: VoiceStatus
    errorMessage: string | null
    currentSessionId: string | null
    startVoice: (
        sessionId: string,
        onTranscript: (text: string, isFinal: boolean) => void
    ) => Promise<void>
    stopVoice: () => void
    isActive: boolean
}

const VoiceContext = createContext<VoiceContextValue | null>(null)

export function VoiceProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<VoiceStatus>('disconnected')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const recognitionRef = useRef<SpeechRecognitionService | null>(null)

    const handleStatusChange = useCallback((newStatus: RecognitionStatus, error?: string) => {
        setStatus(newStatus)
        if (newStatus === 'error') {
            setErrorMessage(error ?? '语音识别出错')
            // 3秒后自动清除错误消息
            setTimeout(() => setErrorMessage(null), 3000)
        } else if (newStatus === 'connected') {
            setErrorMessage(null)
        }
    }, [])

    const startVoice = useCallback(
        async (sessionId: string, onTranscript: (text: string, isFinal: boolean) => void) => {
            try {
                // 检查浏览器支持
                if (!SpeechRecognitionService.isSupported()) {
                    setStatus('error')
                    setErrorMessage('当前浏览器不支持语音识别，请使用 Chrome、Safari 或 Edge')
                    return
                }

                setCurrentSessionId(sessionId)

                // 读取语言偏好
                const voiceLang = localStorage.getItem('hapi-voice-lang') || 'zh-CN'

                // 创建语音识别服务
                const recognition = new SpeechRecognitionService(
                    onTranscript,
                    handleStatusChange,
                    {
                        continuous: true,
                        interimResults: true,
                    }
                )

                recognitionRef.current = recognition

                // 启动识别
                await recognition.start(voiceLang)
            } catch (error) {
                console.error('Failed to start voice recognition:', error)
                setStatus('error')
                setErrorMessage('无法启动语音识别')
            }
        },
        [handleStatusChange]
    )

    const stopVoice = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
            recognitionRef.current = null
        }
        setCurrentSessionId(null)
        setStatus('disconnected')
        setErrorMessage(null)
    }, [])

    const isActive = status === 'connected' || status === 'connecting'

    return (
        <VoiceContext.Provider
            value={{
                status,
                errorMessage,
                currentSessionId,
                startVoice,
                stopVoice,
                isActive,
            }}
        >
            {children}
        </VoiceContext.Provider>
    )
}

export function useVoice(): VoiceContextValue {
    const context = useContext(VoiceContext)
    if (!context) {
        throw new Error('useVoice must be used within a VoiceProvider')
    }
    return context
}

export function useVoiceOptional(): VoiceContextValue | null {
    return useContext(VoiceContext)
}
