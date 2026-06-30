import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

interface Props {
  data: string;
  size?: number;
}

export function QRCode({ data, size = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 2,
      color: { dark: '#1f2937', light: '#ffffff' },
    });
  }, [data, size]);

  const handleShare = async () => {
    try {
      if (!canvasRef.current) return;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current!.toBlob(resolve, 'image/png'),
      );
      if (!blob) return;
      const file = new File([blob], 'reporte-pdv.png', { type: 'image/png' });
      if (navigator.share) {
        await navigator.share({ files: [file], title: 'Reporte Puente de Vida' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporte-pdv.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // user cancelled share
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} />
      <button
        onClick={handleShare}
        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
      >
        Compartir QR
      </button>
    </div>
  );
}
