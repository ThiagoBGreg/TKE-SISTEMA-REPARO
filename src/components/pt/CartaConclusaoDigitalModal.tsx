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

interface ServicoLinha {
  id: string;
  equipamento: string;
  servico: string;
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
  // Modo de origem: 'UPLOAD' (importar arquivo PDF) ou 'MODELO_PADRAO' (editar informações no modelo oficial TKE)
  const [modoPdf, setModoPdf] = useState<'UPLOAD' | 'MODELO_PADRAO'>('MODELO_PADRAO');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  // Informações Editáveis do Documento Modelo Oficial TKE
  const [tkeCnpj, setTkeCnpj] = useState('90.347.840/0064-00');
  const [tkeEndereco, setTkeEndereco] = useState('AV ADOLFO PINHEIRO, 1000');
  const [tkeCidadeUf, setTkeCidadeUf] = useState('SANTO AMARO, SP');
  const [filial, setFilial] = useState('5064');

  const [clienteNomeDoc, setClienteNomeDoc] = useState(
    permit.cartaConclusao?.clienteNome || 'AVENUES SAO PAULO EDUCACAO LTDA'
  );
  const [clienteEndereco, setClienteEndereco] = useState('RUA PEDRO AVANCINE 73 JARDIM PANORAMA');
  const [clienteCidadeUf, setClienteCidadeUf] = useState('SAO PAULO - SP');

  const [contratoNumero, setContratoNumero] = useState(permit.contratoOrcamento || '143488');
  const [equipamentosTexto, setEquipamentosTexto] = useState(permit.equipamento || '143546, 143553');
  const [orcamentoNumero, setOrcamentoNumero] = useState(
    (permit.dadosCompletos as any)?.ordemServico?.orcamento || '75289/25'
  );

  // Tabela Dinâmica de Serviços Executados
  const [servicosList, setServicosList] = useState<ServicoLinha[]>([
    {
      id: '1',
      equipamento: permit.equipamento.split(',')[0]?.trim() || '143546',
      servico: 'CABO DE TRAÇÃO 3/8, 1/2 e 5/8 1:1 - 5 LANCES-SUBSTITUIR',
    },
    {
      id: '2',
      equipamento: permit.equipamento.split(',')[0]?.trim() || '143546',
      servico: 'POLIA TRACAO-SUBSTITUIR',
    },
    {
      id: '3',
      equipamento: permit.equipamento.split(',')[0]?.trim() || '143546',
      servico: 'CABO TRACAO (*) ENCURTAR E EQUALIZAR',
    },
  ]);

  const handleAddServico = () => {
    const nextId = String(Date.now());
    setServicosList((prev) => [
      ...prev,
      {
        id: nextId,
        equipamento: permit.equipamento.split(',')[0]?.trim() || '',
        servico: '',
      },
    ]);
  };

  const handleRemoveServico = (id: string) => {
    if (servicosList.length <= 1) return;
    setServicosList((prev) => prev.filter((s) => s.id !== id));
  };

  const handleServicoChange = (id: string, field: 'equipamento' | 'servico', val: string) => {
    setServicosList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  // Campos do TERMO DE CIÊNCIA E RECEBIMENTO
  const [nomeCliente, setNomeCliente] = useState(
    permit.cartaConclusao?.clienteNome || ''
  );
  const [cpfCliente, setCpfCliente] = useState(permit.cartaConclusao?.clienteCpf || '');
  const [funcaoCliente, setFuncaoCliente] = useState(permit.cartaConclusao?.clienteFuncao || 'SINDICO');
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
  const [visualizandoPreviewModal, setVisualizandoPreviewModal] = useState(false);

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
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;

    if (assinaturaBase64 && !hasDrawn) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = assinaturaBase64;
    }
  }, [assinaturaBase64]);

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
      setErroMsg('Por favor, informe o Nome Completo do cliente ou responsável no Termo.');
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
      } else {
        // Envia todos os campos editáveis do Modelo Digital TKE
        formData.append('tkeCnpj', tkeCnpj.trim());
        formData.append('tkeEndereco', tkeEndereco.trim());
        formData.append('tkeCidadeUf', tkeCidadeUf.trim());
        formData.append('clienteNome', clienteNomeDoc.trim() || nomeCliente.trim());
        formData.append('clienteEndereco', clienteEndereco.trim());
        formData.append('clienteCidadeUf', clienteCidadeUf.trim());
        formData.append('filial', filial.trim());
        formData.append('contrato', contratoNumero.trim());
        formData.append('equipamentos', equipamentosTexto.trim());
        formData.append('orcamento', orcamentoNumero.trim());
        formData.append(
          'servicosJson',
          JSON.stringify(
            servicosList.map((s) => ({
              equipamento: s.equipamento.trim(),
              servico: s.servico.trim(),
            }))
          )
        );
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
      <div className="bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[95vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                TKE • Carta de Conclusão Digital
              </span>
              <span className="text-xs font-bold text-slate-500">
                PT: <span className="text-slate-800 font-extrabold">{permit.codigo}</span>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Emissão & Assinatura Digital com o Cliente
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

        {/* =========================================================================
            TELA DE SUCESSO COM BOTÕES DE VISUALIZAR E BAIXAR
            ========================================================================= */}
        {sucessoCarta ? (
          <div className="space-y-5 py-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-inner">
              ✓
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-900">
                Carta de Conclusão Digital Emitida com Sucesso!
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                O documento oficial no padrão TKE foi gerado com o Termo de Ciência e Recebimento e a assinatura digital do cliente.
              </p>
            </div>

            {/* BOTÕES DE VISUALIZAR E BAIXAR (CONFORME SOLICITADO PELO USUÁRIO) */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {/* 1. BOTÃO VISUALIZAR */}
              <button
                type="button"
                onClick={() => setVisualizandoPreviewModal(!visualizandoPreviewModal)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition hover:scale-102"
              >
                <span>👁️</span>
                <span>{visualizandoPreviewModal ? 'Ocultar Visualização' : 'Visualizar Carta Digital'}</span>
              </button>

              {/* 2. BOTÃO BAIXAR */}
              <a
                href={sucessoCarta.driveDownloadUrl || sucessoCarta.driveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition hover:scale-102"
              >
                <span>📥</span>
                <span>Baixar Carta Digital (PDF)</span>
              </a>

              {/* 3. BOTÃO WHATSAPP */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Olá! Segue a Carta de Conclusão Digital do serviço realizado no equipamento ${permit.equipamento} (Contrato: ${permit.contratoOrcamento}) com o Termo de Recebimento assinado:\n${window.location.origin}${sucessoCarta.driveViewUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition hover:scale-102"
              >
                <span>🟢</span>
                <span>Enviar no WhatsApp</span>
              </a>
            </div>

            {/* Visualizador Iframe Integrado se o usuário clicar em Visualizar */}
            {visualizandoPreviewModal && (
              <div className="mt-4 border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-slate-100">
                <div className="p-2 bg-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Pré-visualização do PDF Oficial</span>
                  <a
                    href={sucessoCarta.driveViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-[11px]"
                  >
                    Abrir em nova aba ↗
                  </a>
                </div>
                <iframe
                  src={sucessoCarta.driveViewUrl}
                  className="w-full h-96 sm:h-[480px] border-0 bg-white"
                  title="Visualização da Carta de Conclusão Digital"
                />
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Concluir e Voltar para a Tabela
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
              FORMULÁRIO DE EDIÇÃO E ASSINATURA
              ========================================================================= */
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {erroMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-xs">
                <span>⚠️</span>
                <span>{erroMsg}</span>
              </div>
            )}

            {/* SELEÇÃO DO MODO: MODELO DIGITAL TKE OU IMPORTAR PDF */}
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-800 text-xs">
                Selecione o Modo da Carta:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Usar Modelo Digital TKE (Permite editar todas as informações no mesmo layout) */}
                <button
                  type="button"
                  onClick={() => setModoPdf('MODELO_PADRAO')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                    modoPdf === 'MODELO_PADRAO'
                      ? 'border-orange-500 bg-orange-50/80 text-orange-950 ring-2 ring-orange-400 shadow-xs'
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-2xl">🏢</span>
                  <div>
                    <span className="font-extrabold text-xs block">Usar Modelo Digital TKE</span>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                      Edite todas as informações de texto mantendo exatamente o mesmo modelo oficial.
                    </span>
                  </div>
                </button>

                {/* 2. Importar Arquivo PDF (Mantém a folha original e só carimba o termo) */}
                <button
                  type="button"
                  onClick={() => {
                    setModoPdf('UPLOAD');
                    pdfInputRef.current?.click();
                  }}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                    modoPdf === 'UPLOAD'
                      ? 'border-orange-500 bg-orange-50/80 text-orange-950 ring-2 ring-orange-400 shadow-xs'
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-2xl">📥</span>
                  <div>
                    <span className="font-extrabold text-xs block">Importar Arquivo PDF</span>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                      O preenchimento permanecerá na folha original sem criar outra página.
                    </span>
                  </div>
                </button>
              </div>

              {/* Input oculto para upload de PDF */}
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

              {/* Detalhes do Arquivo PDF Importado */}
              {modoPdf === 'UPLOAD' && (
                <div className="pt-2">
                  {pdfFile ? (
                    <div className="flex items-center justify-between p-3 bg-white border border-emerald-300 rounded-xl text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-2 truncate max-w-md">
                        <span className="text-emerald-600 font-black">✓</span>
                        <span>📄</span>
                        <span className="truncate">{pdfFile.name}</span>
                        <span className="text-slate-400 font-normal">
                          ({(pdfFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        className="text-orange-600 hover:underline font-bold text-xs"
                      >
                        Trocar Arquivo
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-orange-300 bg-orange-50/50 p-4 rounded-xl text-center space-y-2">
                      <p className="text-xs text-orange-900 font-bold">
                        Nenhum PDF selecionado ainda.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        O preenchimento do cliente e a assinatura serão aplicados diretamente sobre o quadro da folha original.
                      </p>
                      <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-white border border-orange-300 px-4 py-2 rounded-xl shadow-xs hover:bg-orange-50"
                      >
                        <span>📁</span>
                        <span>Selecionar Arquivo PDF</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* =====================================================================
                PAINEL DE EDIÇÃO COMPLETA DO MODELO DIGITAL TKE
                (MANTENDO EXATAMENTE O MESMO MODELO VISUAL DA IMAGEM 1)
                ===================================================================== */}
            {modoPdf === 'MODELO_PADRAO' && (
              <div className="space-y-4 border border-orange-200 bg-amber-50/30 p-4 rounded-xl">
                <div className="flex items-center justify-between border-b border-orange-200 pb-2">
                  <h4 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
                    <span>✏️</span>
                    <span>Editar Informações do Modelo Oficial TKE</span>
                  </h4>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                    Layout Idêntico ao Modelo Oficial
                  </span>
                </div>

                {/* 1. DADOS DA FILIAL TKE & DESTINATÁRIO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Bloco TKE */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-[11px] text-slate-800 uppercase block border-b border-slate-100 pb-1">
                      Dados da Unidade TKE (Topo Direito)
                    </span>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">CNPJ TKE:</label>
                      <input
                        type="text"
                        value={tkeCnpj}
                        onChange={(e) => setTkeCnpj(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Endereço da Unidade:</label>
                      <input
                        type="text"
                        value={tkeEndereco}
                        onChange={(e) => setTkeEndereco(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block">Cidade / UF:</label>
                        <input
                          type="text"
                          value={tkeCidadeUf}
                          onChange={(e) => setTkeCidadeUf(e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block">Filial Nº:</label>
                        <input
                          type="text"
                          value={filial}
                          onChange={(e) => setFilial(e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloco Cliente / Destinatário */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-[11px] text-slate-800 uppercase block border-b border-slate-100 pb-1">
                      Destinatário AO(a) (Topo Esquerdo)
                    </span>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Nome do Cliente / Edifício:</label>
                      <input
                        type="text"
                        value={clienteNomeDoc}
                        onChange={(e) => setClienteNomeDoc(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1 font-semibold"
                        placeholder="Ex: AVENUES SAO PAULO EDUCACAO LTDA"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Endereço do Local:</label>
                      <input
                        type="text"
                        value={clienteEndereco}
                        onChange={(e) => setClienteEndereco(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                        placeholder="Ex: RUA PEDRO AVANCINE 73 JARDIM PANORAMA"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Cidade - UF:</label>
                      <input
                        type="text"
                        value={clienteCidadeUf}
                        onChange={(e) => setClienteCidadeUf(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. DADOS DO CONTRATO E REPARO */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                  <span className="font-bold text-[11px] text-slate-800 uppercase block border-b border-slate-100 pb-1">
                    Informações do Reparo Concluído
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Contrato TKE sob o Nº:</label>
                      <input
                        type="text"
                        value={contratoNumero}
                        onChange={(e) => setContratoNumero(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Equipamento(s):</label>
                      <input
                        type="text"
                        value={equipamentosTexto}
                        onChange={(e) => setEquipamentosTexto(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Orçamento de Reparo Nº:</label>
                      <input
                        type="text"
                        value={orcamentoNumero}
                        onChange={(e) => setOrcamentoNumero(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. TABELA DE SERVIÇOS EXECUTADOS (COM ADIÇÃO/REMOÇÃO DE LINHAS) */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-[11px] text-slate-800 uppercase">
                      Tabela de Serviços Executados
                    </span>
                    <button
                      type="button"
                      onClick={handleAddServico}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition"
                    >
                      <span>+</span>
                      <span>Adicionar Linha de Serviço</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {servicosList.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="w-1/4">
                          <input
                            type="text"
                            value={item.equipamento}
                            onChange={(e) => handleServicoChange(item.id, 'equipamento', e.target.value)}
                            placeholder="Equipamento"
                            className="w-full text-xs border border-slate-300 rounded px-2 py-1 font-semibold"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.servico}
                            onChange={(e) => handleServicoChange(item.id, 'servico', e.target.value)}
                            placeholder="Descrição do serviço executado"
                            className="w-full text-xs border border-slate-300 rounded px-2 py-1 font-semibold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveServico(item.id)}
                          disabled={servicosList.length <= 1}
                          className="text-red-500 hover:text-red-700 p-1 font-bold disabled:opacity-30"
                          title="Remover linha"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                QUADRO: TERMO DE CIÊNCIA E RECEBIMENTO
                (IDÊNTICO À SEGUNDA IMAGEM E AO RODAPÉ DO MODELO OFICIAL)
                ===================================================================== */}
            <div className="border-2 border-slate-800 rounded-xl p-4 sm:p-5 bg-white space-y-3.5 shadow-xs">
              <div className="border-b-2 border-slate-800 pb-2 flex items-center justify-between">
                <h4 className="font-black text-slate-900 text-sm tracking-wide uppercase">
                  TERMO DE CIENCIA E RECEBIMENTO:
                </h4>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Assinatura do Cliente / Responsável
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
                    placeholder="Nome completo do responsável que assina"
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
                    ASSINATURA: <span className="text-red-600">*</span>
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

              {/* Texto de Rodapé Oficial dos 15 Dias */}
              <div className="pt-2 border-t border-slate-200">
                <p className="text-[10px] sm:text-[11px] text-slate-600 italic leading-snug">
                  *Na hipótese de ausência de assinatura do presente termo, sem qualquer manifestação em contrário, no prazo de 15 (quinze) dias, a contar da data da entrega deste, implica em aceitação da conclusão dos serviços.
                </p>
              </div>
            </div>

            {/* DADOS DO TÉCNICO E OBSERVAÇÕES */}
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
                    <span>Assinar Digitalmente e Concluir Carta</span>
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
