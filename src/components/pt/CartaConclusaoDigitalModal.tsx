'use client';

import React, { useState, useRef, useEffect } from 'react';
import { salvarCartaConclusaoDigitalAction } from '@/actions/ptReparoActions';

interface WorkPermitBasic {
  id: string;
  codigo: string;
  contratoOrcamento: string;
  equipamento: string;
  status: string;
  tipoMaoDeObra?: string;
  dadosCompletos?: any;
  cartaConclusao?: {
    id?: string;
    fileName: string;
    driveViewUrl: string;
    driveDownloadUrl?: string | null;
    enviadoEm?: string;
    rawBase64?: string;
    clienteNome?: string;
    clienteCpf?: string;
    clienteFuncao?: string;
    clienteData?: string;
    clienteTelefone?: string;
    clienteAssinatura?: string;
    tecnicoNome?: string;
    observacoes?: string;
  } | null;
}

interface CartaConclusaoDigitalModalProps {
  permit: WorkPermitBasic;
  onClose: () => void;
  onSuccess: (novaCarta: any) => void;
}

export function CartaConclusaoDigitalModal({
  permit,
  onClose,
  onSuccess,
}: CartaConclusaoDigitalModalProps) {
  // Modo de origem do PDF: 'UPLOAD' (importar arquivo do usuário) ou 'MODELO_PADRAO' (usar template oficial TKE)
  const [modoPdf, setModoPdf] = useState<'UPLOAD' | 'MODELO_PADRAO'>('MODELO_PADRAO');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  // Campos do TERMO DE CIÊNCIA E RECEBIMENTO
  const [nomeCliente, setNomeCliente] = useState(permit.cartaConclusao?.clienteNome || '');
  const [cpfCliente, setCpfCliente] = useState(permit.cartaConclusao?.clienteCpf || '');
  const [funcaoCliente, setFuncaoCliente] = useState(permit.cartaConclusao?.clienteFuncao || '');
  const [dataRecebimento, setDataRecebimento] = useState(
    permit.cartaConclusao?.clienteData || new Date().toLocaleDateString('pt-BR')
  );
  const [telefoneCliente, setTelefoneCliente] = useState(permit.cartaConclusao?.clienteTelefone || '');
  const [tecnicoNome, setTecnicoNome] = useState(
    permit.cartaConclusao?.tecnicoNome ||
      permit.dadosCompletos?.terminoServico?.emitenteAssinatura?.nome ||
      ''
  );
  const [observacoes, setObservacoes] = useState(
    permit.cartaConclusao?.observacoes || ''
  );

  // Assinatura Digital do Cliente
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(permit.cartaConclusao?.clienteAssinatura));
  const [assinaturaBase64, setAssinaturaBase64] = useState<string>(
    permit.cartaConclusao?.clienteAssinatura || ''
  );

  // Estados de controle e mensagens
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [sucessoCarta, setSucessoCarta] = useState<any | null>(null);

  // Formatação de CPF
  const handleCpfChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 9) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
    } else if (raw.length > 6) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    } else if (raw.length > 3) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`;
    }
    setCpfCliente(formatted);
  };

  // Formatação de Telefone
  const handleTelefoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 10) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    } else if (raw.length > 6) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    } else if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    setTelefoneCliente(formatted);
  };

  // Inicializa o Canvas com suporte High-DPI
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Preto/Slate escuro
    ctx.lineWidth = 2.5;

    // Se já tinha assinatura prévia, desenha no canvas
    if (assinaturaBase64 && !hasDrawn) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = assinaturaBase64;
    }
  }, [assinaturaBase64]);

  // Auxiliares de coordenadas para Touch e Mouse
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
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
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setAssinaturaBase64(canvas.toDataURL('image/png'));
    }
  };

  const limparAssinatura = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
    setAssinaturaBase64('');
  };

  // Envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg(null);

    if (!nomeCliente.trim()) {
      setErroMsg('Por favor, informe o Nome Completo do cliente ou responsável.');
      return;
    }

    if (!hasDrawn || !assinaturaBase64) {
      setErroMsg('Por favor, colete a Assinatura Digital do cliente no quadro abaixo.');
      return;
    }

    if (modoPdf === 'UPLOAD' && !pdfFile) {
      setErroMsg('Você selecionou "Importar PDF", mas nenhum arquivo foi escolhido.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('workPermitId', permit.id);
      formData.append('nomeCliente', nomeCliente.trim());
      formData.append('cpfCliente', cpfCliente.trim());
      formData.append('funcaoCliente', funcaoCliente.trim());
      formData.append('dataRecebimento', dataRecebimento.trim());
      formData.append('telefoneCliente', telefoneCliente.trim());
      formData.append('assinaturaClienteBase64', assinaturaBase64);
      formData.append('tecnicoNome', tecnicoNome.trim());
      formData.append('observacoes', observacoes.trim());

      if (modoPdf === 'UPLOAD' && pdfFile) {
        formData.append('pdfFile', pdfFile);
      }

      const res = await salvarCartaConclusaoDigitalAction(formData);

      if (res.success && res.carta) {
        setSucessoCarta(res.carta);
        onSuccess(res.carta);
      } else {
        setErroMsg(res.error || 'Erro ao processar e assinar a Carta de Conclusão Digital.');
      }
    } catch (err: any) {
      console.error('[CartaConclusaoDigitalModal] Erro ao submeter:', err);
      setErroMsg(err?.message || 'Falha na comunicação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[94vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                TKE • Carta Digital
              </span>
              <span className="text-xs font-bold text-slate-500">
                PT: <span className="text-slate-800 font-extrabold">{permit.codigo}</span>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Carta de Conclusão Digital • Assinatura com Cliente
            </h3>
            <p className="text-xs text-slate-500">
              Contrato: <span className="font-semibold text-slate-700">{permit.contratoOrcamento}</span> • Equipamento:{' '}
              <span className="font-semibold text-slate-700">{permit.equipamento}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 rounded-lg"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* TELA DE SUCESSO */}
        {sucessoCarta ? (
          <div className="space-y-4 py-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-inner">
              ✓
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-900">
                Carta de Conclusão Assinada com Sucesso!
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                O documento oficial da TKE foi carimbado com o Termo de Ciência e Recebimento e a assinatura digital do cliente.
              </p>
            </div>

            {/* Ações Imediatas */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
              {/* Baixar */}
              <a
                href={sucessoCarta.driveDownloadUrl || sucessoCarta.driveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
              >
                <span>📥</span>
                <span>Baixar PDF Oficial</span>
              </a>

              {/* Visualizar */}
              <a
                href={sucessoCarta.driveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
              >
                <span>👁️</span>
                <span>Visualizar Documento</span>
              </a>

              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Olá! Segue a Carta de Conclusão Digital do serviço realizado no equipamento ${permit.equipamento} (Contrato: ${permit.contratoOrcamento}) com o Termo de Recebimento assinado:\n${window.location.origin}${sucessoCarta.driveViewUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
              >
                <span>🟢</span>
                <span>Enviar no WhatsApp</span>
              </a>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Concluir e Voltar para a Tabela
              </button>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO DE PREENCHIMENTO E ASSINATURA */
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {erroMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-xs">
                <span>⚠️</span>
                <span>{erroMsg}</span>
              </div>
            )}

            {/* SEÇÃO 1: ESCOLHA DA CARTA BASE (PDF) */}
            <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-800 text-xs">
                1. Selecione o Documento Base da Carta:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Opção A: Usar Modelo Padrão Digital TKE */}
                <button
                  type="button"
                  onClick={() => setModoPdf('MODELO_PADRAO')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    modoPdf === 'MODELO_PADRAO'
                      ? 'border-orange-500 bg-orange-50/70 text-orange-950 ring-2 ring-orange-400'
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-xl">🏢</span>
                  <div>
                    <span className="font-bold text-xs block">Usar Modelo Digital TKE</span>
                    <span className="text-[11px] text-slate-500 block">
                      Modelo oficial TKE padrão com dados da PT pré-configurados
                    </span>
                  </div>
                </button>

                {/* Opção B: Importar Arquivo PDF Customizado */}
                <button
                  type="button"
                  onClick={() => {
                    setModoPdf('UPLOAD');
                    pdfInputRef.current?.click();
                  }}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    modoPdf === 'UPLOAD'
                      ? 'border-orange-500 bg-orange-50/70 text-orange-950 ring-2 ring-orange-400'
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-xl">📥</span>
                  <div>
                    <span className="font-bold text-xs block">Importar Arquivo PDF</span>
                    <span className="text-[11px] text-slate-500 block">
                      Subir o PDF da carta (ex: MODELO CARTA DE CONCLUSÃO DIGITAL.pdf)
                    </span>
                  </div>
                </button>
              </div>

              {/* Input invisível para PDF */}
              <input
                type="file"
                accept="application/pdf"
                ref={pdfInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPdfFile(file);
                    setModoPdf('UPLOAD');
                  }
                  e.target.value = '';
                }}
              />

              {/* Detalhe do Arquivo PDF Importado */}
              {modoPdf === 'UPLOAD' && (
                <div className="pt-1">
                  {pdfFile ? (
                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-300 rounded-lg text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate max-w-sm">
                        <span>📄</span>
                        <span className="truncate">{pdfFile.name}</span>
                        <span className="text-slate-400 font-normal">
                          ({(pdfFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        className="text-orange-600 hover:underline font-bold text-[11px]"
                      >
                        Trocar PDF
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-orange-300 bg-orange-50/40 p-3 rounded-lg text-center">
                      <p className="text-xs text-orange-800 font-medium">
                        Nenhum PDF selecionado ainda.
                      </p>
                      <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-orange-700 bg-white border border-orange-300 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-orange-50"
                      >
                        <span>📁</span>
                        <span>Escolher Arquivo PDF</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: TERMO DE CIÊNCIA E RECEBIMENTO (FIEL À IMAGEM 2) */}
            <div className="border-2 border-slate-800 rounded-xl p-4 sm:p-5 bg-white space-y-3.5 shadow-xs">
              <div className="border-b-2 border-slate-800 pb-2 flex items-center justify-between">
                <h4 className="font-black text-slate-900 text-sm tracking-wide uppercase">
                  TERMO DE CIENCIA E RECEBIMENTO:
                </h4>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Preenchimento com o Cliente
                </span>
              </div>

              {/* Grid de Campos do Termo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nome Completo */}
                <div className="sm:col-span-2">
                  <label className="block font-black text-slate-900 mb-1">
                    NOME COMPLETO: <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Nome completo do responsável / recebedor"
                    className="w-full text-xs sm:text-sm font-semibold border-b-2 border-slate-400 focus:border-slate-900 py-1.5 px-2 bg-slate-50/70 focus:bg-white focus:outline-hidden transition"
                    required
                  />
                </div>

                {/* CPF */}
                <div>
                  <label className="block font-black text-slate-900 mb-1">
                    CPF:
                  </label>
                  <input
                    type="text"
                    value={cpfCliente}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full text-xs sm:text-sm font-semibold border-b-2 border-slate-400 focus:border-slate-900 py-1.5 px-2 bg-slate-50/70 focus:bg-white focus:outline-hidden transition"
                  />
                </div>

                {/* Função */}
                <div>
                  <label className="block font-black text-slate-900 mb-1">
                    FUNÇÃO:
                  </label>
                  <input
                    type="text"
                    value={funcaoCliente}
                    onChange={(e) => setFuncaoCliente(e.target.value)}
                    placeholder="Ex: Síndico, Zelador, Fiscal, Gerente"
                    className="w-full text-xs sm:text-sm font-semibold border-b-2 border-slate-400 focus:border-slate-900 py-1.5 px-2 bg-slate-50/70 focus:bg-white focus:outline-hidden transition"
                  />
                </div>

                {/* Data */}
                <div>
                  <label className="block font-black text-slate-900 mb-1">
                    DATA:
                  </label>
                  <input
                    type="text"
                    value={dataRecebimento}
                    onChange={(e) => setDataRecebimento(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full text-xs sm:text-sm font-semibold border-b-2 border-slate-400 focus:border-slate-900 py-1.5 px-2 bg-slate-50/70 focus:bg-white focus:outline-hidden transition"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block font-black text-slate-900 mb-1">
                    TELEFONE:
                  </label>
                  <input
                    type="text"
                    value={telefoneCliente}
                    onChange={(e) => handleTelefoneChange(e.target.value)}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full text-xs sm:text-sm font-semibold border-b-2 border-slate-400 focus:border-slate-900 py-1.5 px-2 bg-slate-50/70 focus:bg-white focus:outline-hidden transition"
                  />
                </div>
              </div>

              {/* ASSINATURA DIGITAL DO CLIENTE */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-black text-slate-900">
                    ASSINATURA DO CLIENTE: <span className="text-red-600">*</span>
                  </label>
                  {hasDrawn && (
                    <button
                      type="button"
                      onClick={limparAssinatura}
                      className="text-red-600 hover:text-red-800 font-bold text-[11px] underline"
                    >
                      Limpar Assinatura
                    </button>
                  )}
                </div>

                {/* Canvas de Assinatura */}
                <div className="relative border-2 border-dashed border-slate-400 rounded-xl bg-slate-50/80 overflow-hidden touch-none h-32 sm:h-36 flex flex-col justify-end">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full cursor-crosshair block"
                  />

                  {/* Linha Guia Inferior */}
                  <div className="absolute inset-x-6 bottom-4 pointer-events-none border-b border-slate-300 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                      Assine com o dedo ou mouse sobre a linha
                    </span>
                    {hasDrawn && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        ✓ Assinatura capturada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Nota Legal Oficial do Rodapé */}
              <div className="pt-2 border-t border-slate-200">
                <p className="text-[10px] sm:text-[11px] text-slate-600 italic leading-snug">
                  *Na hipótese de ausência de assinatura do presente termo, sem qualquer manifestação em contrário, no prazo de 15 (quinze) dias, a contar da data da entrega deste, implica em aceitação da conclusão dos serviços.
                </p>
              </div>
            </div>

            {/* SEÇÃO 3: DADOS DO TÉCNICO E OBSERVAÇÕES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Técnico / Prestador Responsável
                </label>
                <input
                  type="text"
                  value={tecnicoNome}
                  onChange={(e) => setTecnicoNome(e.target.value)}
                  placeholder="Nome do técnico que realizou a entrega"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observações de Encerramento (Opcional)
                </label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais do término do reparo"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold rounded-xl shadow-md text-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Gerando e Assinando Documento...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>Assinar Digitalmente e Salvar Carta</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
