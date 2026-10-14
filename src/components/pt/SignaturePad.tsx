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

  // Controle do Pop-up de solicitação e alerta de geolocalização
  const [showGeoModal, setShowGeoModal] = useState(false);
  const [geoErrorDetail, setGeoErrorDetail] = useState<string | null>(null);

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

  /**
   * Tenta capturar a localização GPS com alta precisão.
   * Se o técnico não tiver permitido ou o navegador bloquear, lança erro para acionar o pop-up.
   */
  const requestCurrentCoordinates = (): Promise<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        reject(new Error('Seu navegador móvel ou dispositivo não suporta geolocalização.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (
            !pos ||
            !pos.coords ||
            typeof pos.coords.latitude !== 'number' ||
            typeof pos.coords.longitude !== 'number' ||
            (pos.coords.latitude === 0 && pos.coords.longitude === 0)
          ) {
            reject(new Error('Coordenadas de GPS inválidas ou não detectadas.'));
            return;
          }
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          let msg = 'Autorização de geolocalização negada no navegador móvel.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'O acesso à localização foi negado no navegador do celular.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Sinal de GPS indisponível no dispositivo móvel no momento.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Tempo limite esgotado ao buscar sinal de GPS do celular.';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  /**
   * Confirmação da Assinatura com Trava Estrita:
   * SÓ LIBERA se a geolocalização estiver permitida e capturada com sucesso.
   * Caso contrário, abre pop-up com solicitação e alerta explícito.
   */
  const handleConfirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    setIsLocating(true);
    setGeoErrorDetail(null);

    try {
      const coords = await requestCurrentCoordinates();

      // Geolocalização obtida com sucesso -> Conclui a assinatura
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
      setShowGeoModal(false);
      onChange(signatureData);
    } catch (err: any) {
      // FALHA DE GEOLOCALIZAÇÃO: Não libera a assinatura e abre pop-up
      console.warn('[SignaturePad] Assinatura bloqueada: geolocalização não autorizada:', err);
      setIsConfirmed(false);
      onChange(null);
      setGeoErrorDetail(err?.message || 'Permissão de localização negada pelo navegador móvel.');
      setShowGeoModal(true);
    } finally {
      setIsLocating(false);
    }
  };

  const handleRedo = () => {
    setIsConfirmed(false);
    setHasDrawn(false);
    setShowGeoModal(false);
    onChange(null);
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 relative">
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
            ✓ Assinado com GPS
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

          {/* Metadados de Auditoria com GPS */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              📅 <strong>Data/Hora:</strong>{' '}
              {new Date(value.timestamp).toLocaleString('pt-BR')}
            </span>
            {value.geolocalizacao && (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                📍 <strong>GPS Validado:</strong> {value.geolocalizacao.latitude.toFixed(5)},{' '}
                {value.geolocalizacao.longitude.toFixed(5)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleRedo}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium underline flex items-center gap-1 cursor-pointer"
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
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs text-center px-4">
                <span>✍️ Assine com o dedo ou mouse nesta área</span>
                <span className="text-[10px] text-slate-400 mt-1">
                  (O GPS será registrado automaticamente para auditoria)
                </span>
              </div>
            )}
          </div>

          {/* Aviso Informativo de GPS */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <span className="text-orange-500 text-xs">📍</span>
            <span>
              <strong>Obrigatório:</strong> A assinatura digital só é liberada com geolocalização permitida no navegador.
            </span>
          </div>

          {/* Controles de Ação */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasDrawn || isLocating}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 transition px-2.5 py-1.5 rounded-md hover:bg-slate-100 cursor-pointer"
            >
              Limpar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!hasDrawn || isLocating}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              {isLocating ? (
                <>
                  <span className="animate-spin text-sm">⏳</span> Coletando GPS...
                </>
              ) : (
                'Confirmar Assinatura'
              )}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          POP-UP / MODAL: SOLICITAÇÃO & ALERTA DE GEOLOCALIZAÇÃO OBRIGATÓRIA
          ===================================================================== */}
      {showGeoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border-2 border-orange-500 shadow-2xl max-w-md w-full p-6 space-y-4 my-8 text-left">
            {/* Ícone e Título */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-300 text-orange-600 flex items-center justify-center text-2xl shrink-0">
                📍
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  Autorização de Geolocalização Obrigatória
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Assinatura de: <strong>{signatarioNome}</strong>
                </p>
              </div>
            </div>

            {/* Alerta de Destaque Obrigatório Solicitado pelo Usuário */}
            <div className="p-3.5 rounded-xl bg-amber-500/15 border-2 border-amber-600 text-amber-950 text-xs space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 font-black text-sm text-amber-900">
                <span className="text-lg">⚠️</span>
                <span>ATENÇÃO: Assinatura Bloqueada!</span>
              </div>
              <p className="font-semibold text-xs leading-relaxed text-amber-900">
                A assinatura só estará liberada com a geolocalização permitida no navegador móvel do técnico.
              </p>
              {geoErrorDetail && (
                <p className="text-[11px] font-mono text-red-700 bg-red-100/70 p-1.5 rounded border border-red-200">
                  Motivo: {geoErrorDetail}
                </p>
              )}
            </div>

            {/* Instruções de Desbloqueio no Celular */}
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>📱</span> Como liberar no seu navegador:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed">
                <li>
                  Ligue a <strong>Localização / GPS</strong> do seu aparelho celular.
                </li>
                <li>
                  No topo da tela, toque no ícone de <strong>Cadeado (🔒)</strong> ou <strong>Configurações do Site</strong> ao lado do endereço.
                </li>
                <li>
                  Localize <strong>Permissões → Localização</strong> e selecione <strong>Permitir</strong>.
                </li>
                <li>
                  Clique no botão abaixo para tentar novamente.
                </li>
              </ol>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowGeoModal(false)}
                className="w-full sm:w-1/3 py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition text-center cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLocating}
                className="w-full sm:w-2/3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-black shadow-md shadow-orange-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLocating ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span> Solicitando GPS...
                  </>
                ) : (
                  <>
                    <span>📍</span>
                    <span>Autorizar e Confirmar Assinatura</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
