'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { DigitalSignature } from '@/lib/validations/ptReparoSchema';

interface SignaturePadProps {
  label: string;
  signatarioNome: string;
  signatarioCargo?: string;
  value?: DigitalSignature | null;
  onChange: (signature: DigitalSignature | null) => void;
  required?: boolean;
}

export function SignaturePad({
  label,
  signatarioNome,
  signatarioCargo,
  value,
  onChange,
  required = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(!!value?.assinaturaBase64);
  const [isLocating, setIsLocating] = useState(false);

  // Inicializa o canvas com suporte a Retina / High-DPI
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isConfirmed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Slate 900
    ctx.lineWidth = 2.5;
  }, [isConfirmed]);

  // Auxiliares de coordenadas para Mouse e Touch
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setIsConfirmed(false);
    onChange(null);
  };

  const handleConfirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    setIsLocating(true);

    let coords: { latitude: number; longitude: number; accuracy?: number } | null = null;

    // Tenta capturar geolocalização do dispositivo
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          });
        });

        coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      } catch (err) {
        console.warn('[SignaturePad] Geolocalização não obtida ou negada pelo usuário:', err);
      }
    }

    setIsLocating(false);

    const base64 = canvas.toDataURL('image/png');

    const signatureData: DigitalSignature = {
      nome: signatarioNome || 'Signatário Não Identificado',
      cargo: signatarioCargo,
      assinaturaBase64: base64,
      timestamp: new Date().toISOString(),
      geolocalizacao: coords,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    };

    setIsConfirmed(true);
    onChange(signatureData);
  };

  const handleRedo = () => {
    setIsConfirmed(false);
    setHasDrawn(false);
    onChange(null);
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            {label}
            {required && <span className="text-red-500 font-bold">*</span>}
          </h4>
          <p className="text-xs text-slate-500">
            {signatarioNome} {signatarioCargo ? `• ${signatarioCargo}` : ''}
          </p>
        </div>

        {isConfirmed && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✓ Assinado
          </span>
        )}
      </div>

      {/* Área do Canvas ou Pré-visualização */}
      {isConfirmed && value?.assinaturaBase64 ? (
        <div className="space-y-2">
          <div className="w-full h-32 bg-slate-50 border border-emerald-200 rounded-lg flex items-center justify-center p-2 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.assinaturaBase64}
              alt={`Assinatura de ${value.nome}`}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Metadados de Auditoria */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              📅 <strong>Data/Hora:</strong>{' '}
              {new Date(value.timestamp).toLocaleString('pt-BR')}
            </span>
            {value.geolocalizacao && (
              <span>
                📍 <strong>Geo:</strong> {value.geolocalizacao.latitude.toFixed(5)},{' '}
                {value.geolocalizacao.longitude.toFixed(5)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleRedo}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium underline flex items-center gap-1"
          >
            Refazer assinatura
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative w-full h-36 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg overflow-hidden touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full cursor-crosshair"
              style={{ touchAction: 'none' }}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs">
                <span>✍️ Assine com o dedo ou mouse nesta área</span>
              </div>
            )}
          </div>

          {/* Controles de Ação */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasDrawn || isLocating}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 transition px-2.5 py-1.5 rounded-md hover:bg-slate-100"
            >
              Limpar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!hasDrawn || isLocating}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              {isLocating ? (
                <>
                  <span className="animate-spin text-sm">⏳</span> Coletando Geo...
                </>
              ) : (
                'Confirmar Assinatura'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
