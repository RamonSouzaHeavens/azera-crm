import { useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      streamRef.current = stream

      // Check supported MIME types (prefer webm with opus)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(audioBlob)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingDuration(0)

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error starting recording:', error)
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Permissão de microfone negada')
      } else if (error instanceof DOMException && error.name === 'NotFoundError') {
        toast.error('Nenhum microfone encontrado')
      } else {
        toast.error('Erro ao iniciar gravação')
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      // Clear timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [isRecording])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setAudioBlob(null)
      audioChunksRef.current = []
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      // Clear timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      
      setRecordingDuration(0)
    }
  }, [isRecording])

  const clearAudio = useCallback(() => {
    setAudioBlob(null)
    setRecordingDuration(0)
  }, [])

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  return {
    isRecording,
    audioBlob,
    recordingDuration,
    isPaused,
    startRecording,
    stopRecording,
    cancelRecording,
    clearAudio,
    formatDuration
  }
}
