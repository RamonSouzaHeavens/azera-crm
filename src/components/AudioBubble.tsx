import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
    src: string;          // URL do áudio
    isOutbound: boolean;  // true = verde (enviado), false = cinza (recebido)
    duration?: number;    // segundos (opcional)
};

export default function AudioBubble({ src, isOutbound, duration }: Props) {
    const { t } = useTranslation();

    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const el = audioRef.current;
        if (!el) return;

        const onTime = () => setCurrent(el.currentTime);
        const onEnd = () => {
            setPlaying(false);
            setCurrent(0);
        };

        el.addEventListener('timeupdate', onTime);
        el.addEventListener('ended', onEnd);

        return () => {
            el.removeEventListener('timeupdate', onTime);
            el.removeEventListener('ended', onEnd);
        };
    }, []);

    const toggle = () => {
        const el = audioRef.current;
        if (!el) return;
        playing ? el.pause() : el.play();
        setPlaying(!playing);
    };

    const progress = audioRef.current?.duration
        ? (current / audioRef.current.duration) * 100
        : 0;

    // Formatação da duração (ex: 1:23)
    const format = (s = 0) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className={`flex items-center gap-3 px-3 py-2 rounded-lg
        ${isOutbound ? 'bg-[#d9fdd3] dark:bg-[#005c4b]' : 'bg-white dark:bg-slate-700'}`}
            aria-label={t('audioBubble.ariaLabel', { context: isOutbound ? 'sent' : 'received' })}
        >
            {/* Botão Play / Pause */}
            <button
                onClick={toggle}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                   text-white bg-green-500 hover:bg-green-600 transition-colors"
                aria-label={playing ? t('audioBubble.pause') : t('audioBubble.play')}
            >
                {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>

            {/* Barra de progresso */}
            <div className="relative w-40 h-1 bg-black/10 dark:bg-white/20 rounded-full overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full bg-green-500 transition-all"
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>

            {/* Duração do áudio */}
            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium tabular-nums">
                {format(duration || audioRef.current?.duration || 0)}
            </span>

            {/* Elemento de áudio (invisível) */}
            <audio ref={audioRef} src={src} preload="metadata" />
        </div>
    );
}