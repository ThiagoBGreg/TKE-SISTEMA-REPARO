'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { PtReparoWizard } from '@/components/pt/PtReparoWizard';
import { SignaturePad } from '@/components/pt/SignaturePad';
import {
  deletePtReparoAction,
  updatePtReparoAction,
  concluirTerminoPtReparoAction,
  anexarCartaConclusaoDirectAction,
} from '@/actions/ptReparoActions';
import { uploadAttachmentsAction } from '@/actions/attachmentActions';
import type { DigitalSignature, PtReparoFormData } from '@/lib/validations/ptReparoSchema';

export interface WorkPermitItem {
  id: string;
  codigo: string;
  status: string;
  contratoOrcamento: string;
  equipamento: string;
  tipoMaoDeObra: string;
  tipoEquipamento: string;
  classificacaoReparo: string;
  trabalhoEmAltura: boolean;
  serviceOrderId: string | null;
  criadoPorId: string | null;
  dadosCompletos: PtReparoFormData;
  createdAt: Date;
  cartaConclusao?: {
    id: string;
    fileName: string;
    driveViewUrl: string;
    driveDownloadUrl: string | null;
  } | null;
  totalFotos?: number;
}

interface PtManagementViewProps {
  initialPermits: WorkPermitItem[];
  isAdmin: boolean;
  isSubcontratado?: boolean;
}

export function PtManagementView({ initialPermits, isAdmin, isSubcontratado = false }: PtManagementViewProps) {
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [permits, setPermits] = useState<WorkPermitItem[]>(initialPermits);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EM_ANDAMENTO' | 'CONCLUIDO'>('ALL');

  // Modais de Visualização e Administração
  const [viewingPermit, setViewingPermit] = useState<WorkPermitItem | null>(null);
  const [editingPermit, setEditingPermit] = useState<WorkPermitItem | null>(null);
  const [deletingPermitId, setDeletingPermitId] = useState<string | null>(null);

  // Modais de Visualização e Compartilhamento da Carta de Conclusão
  const [previewingCarta, setPreviewingCarta] = useState<{
    permit: WorkPermitItem;
    carta: { id: string; fileName: string; driveViewUrl: string; driveDownloadUrl: string | null };
  } | null>(null);

  const [sharingCarta, setSharingCarta] = useState<{
    permit: WorkPermitItem;
    carta: { id: string; fileName: string; driveViewUrl: string; driveDownloadUrl: string | null };
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Modal de Envio Direto de Carta de Conclusão (para PTs concluídas ou atalho direto)
  const [uploadingCartaPermit, setUploadingCartaPermit] = useState<WorkPermitItem | null>(null);
  const [uploadCartaFotoFile, setUploadCartaFotoFile] = useState<File | null>(null);
  const [uploadCartaFotoPreview, setUploadCartaFotoPreview] = useState<string | null>(null);
  const [uploadCartaObservacoes, setUploadCartaObservacoes] = useState('');
  const [uploadCartaTecnicoNome, setUploadCartaTecnicoNome] = useState('');
  const [isUploadingCarta, setIsUploadingCarta] = useState(false);
  const [uploadCartaErro, setUploadCartaErro] = useState<string | null>(null);
  const uploadCartaCameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadCartaFileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal de Preenchimento do Término de Serviço (Item 14)
  const [concludingPermit, setConcludingPermit] = useState<WorkPermitItem | null>(null);
  const [terminoDataHora, setTerminoDataHora] = useState('');
  const [terminoNome, setTerminoNome] = useState('');
  const [terminoAssinatura, setTerminoAssinatura] = useState<DigitalSignature | null>(null);
  const [terminoObservacoes, setTerminoObservacoes] = useState('');
  const [terminoErro, setTerminoErro] = useState<string | null>(null);

  // Estados para Carta de Conclusão no Término
  const [cartaFotoFile, setCartaFotoFile] = useState<File | null>(null);
  const [cartaFotoPreview, setCartaFotoPreview] = useState<string | null>(null);
  const [cartaPdfBlob, setCartaPdfBlob] = useState<Blob | null>(null);
  const [cartaPdfUrl, setCartaPdfUrl] = useState<string | null>(null);
  const [isGerandoPdfCarta, setIsGerandoPdfCarta] = useState(false);
  const [cartaStatusMsg, setCartaStatusMsg] = useState<string | null>(null);
  const cartaCameraInputRef = useRef<HTMLInputElement | null>(null);
  const cartaFileInputRef = useRef<HTMLInputElement | null>(null);

  // Estados de loading e mensagens
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtros de busca e status
  const filteredPermits = permits.filter((item) => {
    const matchesSearch =
      item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contratoOrcamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipamento.toLowerCase().includes(searchTerm.toLowerCase());

    const isConcluido = item.status === 'CONCLUIDO' || item.status === 'FINALIZADA';
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'CONCLUIDO' ? isConcluido : item.status === statusFilter);

    return matchesSearch && matchesStatus;
  });

  // Abre o modal de término de serviço
  const handleOpenTerminoModal = (permit: WorkPermitItem) => {
    setConcludingPermit(permit);
    setTerminoDataHora(new Date().toISOString().slice(0, 16));
    setTerminoNome('');
    setTerminoAssinatura(null);
    setTerminoObservacoes('');
    setTerminoErro(null);
    setCartaFotoFile(null);
    setCartaFotoPreview(null);
    setCartaPdfBlob(null);
    if (cartaPdfUrl) {
      URL.revokeObjectURL(cartaPdfUrl);
      setCartaPdfUrl(null);
    }
    setCartaStatusMsg(null);
  };

// Otimiza e comprime imagens de documentos antes do upload para evitar ultrapassar limites de payload e agilizar o envio móvel
async function compressImageForUpload(file: File, maxDim = 1600, quality = 0.82): Promise<{ file: File; base64: string }> {
  if (file.type === 'application/pdf') {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.readAsDataURL(file);
    });
    return { file, base64 };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = (event.target?.result as string) || '';
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^.]+$/, '.jpg'),
                  { type: 'image/jpeg' }
                );
                resolve({ file: compressedFile, base64: compressedBase64 });
              } else {
                resolve({ file, base64: rawBase64 });
              }
            },
            'image/jpeg',
            quality
          );
        } else {
          resolve({ file, base64: rawBase64 });
        }
      };
      img.onerror = () => resolve({ file, base64: rawBase64 });
      img.src = rawBase64;
    };
    reader.onerror = () => resolve({ file, base64: '' });
    reader.readAsDataURL(file);
  });
}

  // Seleciona foto da carta de conclusão e gera o PDF automaticamente
  const handleSelectCartaFoto = async (file: File) => {
    if (!file) return;
    setCartaPdfBlob(null);
    if (cartaPdfUrl) {
      URL.revokeObjectURL(cartaPdfUrl);
      setCartaPdfUrl(null);
    }
    setCartaStatusMsg('Otimizando imagem para envio...');
    setIsGerandoPdfCarta(true);

    try {
      const { file: compressedFile, base64 } = await compressImageForUpload(file);
      setCartaFotoFile(compressedFile);
      setCartaFotoPreview(base64);

      const response = await fetch('/api/pt/carta-conclusao/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoPT: concludingPermit?.codigo || 'PT-REPARO',
          contratoOrcamento: concludingPermit?.contratoOrcamento || '',
          equipamento: concludingPermit?.equipamento || '',
          tecnicoNome: terminoNome || 'Técnico de Reparo',
          dataHoraTermino: terminoDataHora || new Date().toISOString(),
          observacoes: terminoObservacoes || '',
          fotoBase64: base64,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta ao gerar PDF.');
      }

      const blob = await response.blob();
      setCartaPdfBlob(blob);
      const url = URL.createObjectURL(blob);
      setCartaPdfUrl(url);
      setCartaStatusMsg('PDF oficial gerado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF da carta de conclusão:', err);
      setCartaStatusMsg('Aviso: Imagem pronta para envio.');
    } finally {
      setIsGerandoPdfCarta(false);
    }
  };

  const handleRemoverCartaFoto = () => {
    setCartaFotoFile(null);
    setCartaFotoPreview(null);
    setCartaPdfBlob(null);
    if (cartaPdfUrl) {
      URL.revokeObjectURL(cartaPdfUrl);
      setCartaPdfUrl(null);
    }
    setCartaStatusMsg(null);
  };

  const handleBaixarCartaPdf = () => {
    if (!cartaPdfUrl || !concludingPermit) return;
    const link = document.createElement('a');
    link.href = cartaPdfUrl;
    link.download = `Carta_Conclusao_${concludingPermit.codigo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCompartilharCartaPdf = async () => {
    if (!concludingPermit) return;

    if (cartaPdfBlob && typeof navigator !== 'undefined') {
      const fileName = `Carta_Conclusao_${concludingPermit.codigo}.pdf`;
      const pdfFile = new File([cartaPdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            title: `Carta de Conclusão - ${concludingPermit.codigo}`,
            text: `Segue a Carta de Conclusão e Aceite do Serviço de Reparo referente à PT ${concludingPermit.codigo} (Contrato: ${concludingPermit.contratoOrcamento}).`,
            files: [pdfFile],
          });
          return;
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn('Erro ao compartilhar via Web Share:', err);
          }
        }
      } else if (navigator.share) {
        try {
          await navigator.share({
            title: `Carta de Conclusão - ${concludingPermit.codigo}`,
            text: `Carta de Conclusão e Aceite do Serviço de Reparo referente à PT ${concludingPermit.codigo} (Contrato: ${concludingPermit.contratoOrcamento}).`,
          });
          return;
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn('Erro ao compartilhar texto:', err);
          }
        }
      }
    }

    if (cartaPdfUrl) {
      window.open(cartaPdfUrl, '_blank');
    }
  };

  // Funções de Compartilhamento da Carta de Conclusão
  const getFullShareUrl = (url: string) => {
    if (typeof window === 'undefined') return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleCopyLink = async (url: string) => {
    try {
      const fullUrl = getFullShareUrl(url);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Erro ao copiar link:', err);
    }
  };

  const handleShareWhatsApp = (permit: WorkPermitItem, cartaUrl: string) => {
    const fullUrl = getFullShareUrl(cartaUrl);
    const text =
      `*Carta de Conclusão e Aceite do Serviço - TKE*\n\n` +
      `*PT:* ${permit.codigo}\n` +
      `*Contrato / Orçamento:* ${permit.contratoOrcamento}\n` +
      `*Equipamento:* ${permit.equipamento}\n` +
      `*Status:* Concluído\n\n` +
      `Acesse a carta oficial assinada:\n${fullUrl}`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleNativeShare = async (permit: WorkPermitItem, cartaUrl: string) => {
    const fullUrl = getFullShareUrl(cartaUrl);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Carta de Conclusão - ${permit.codigo}`,
          text: `Carta de Conclusão e Aceite do Serviço referente à PT ${permit.codigo} (Contrato: ${permit.contratoOrcamento}).`,
          url: fullUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink(fullUrl);
        }
      }
    } else {
      handleCopyLink(fullUrl);
    }
  };

  // Envio Direto de Carta de Conclusão (para PTs concluídas ou envio rápido)
  const handleSalvarUploadCarta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingCartaPermit) return;
    if (!uploadCartaFotoFile && !uploadCartaFotoPreview) {
      setUploadCartaErro('Por favor, tire uma foto ou selecione o arquivo da Carta de Conclusão.');
      return;
    }

    setIsUploadingCarta(true);
    setUploadCartaErro(null);

    try {
      let finalFile: File = uploadCartaFotoFile!;

      // Se temos o preview da foto em base64, geramos o PDF oficial TKE com cabeçalho auditável
      if (uploadCartaFotoPreview) {
        try {
          const pdfRes = await fetch('/api/pt/carta-conclusao/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              codigoPT: uploadingCartaPermit.codigo,
              contratoOrcamento: uploadingCartaPermit.contratoOrcamento,
              equipamento: uploadingCartaPermit.equipamento,
              tecnicoNome: uploadCartaTecnicoNome || 'Técnico de Reparo TKE',
              dataHoraTermino: new Date().toISOString(),
              observacoes: uploadCartaObservacoes,
              fotoBase64: uploadCartaFotoPreview,
            }),
          });

          if (pdfRes.ok) {
            const blob = await pdfRes.blob();
            finalFile = new File(
              [blob],
              `Carta_Conclusao_${uploadingCartaPermit.codigo}.pdf`,
              { type: 'application/pdf' }
            );
          }
        } catch (pdfErr) {
          console.warn('Aviso: enviando imagem diretamente após falha na compilação do PDF:', pdfErr);
        }
      }

      // Envia via Server Action
      const formData = new FormData();
      formData.append('workPermitId', uploadingCartaPermit.id);
      formData.append('file', finalFile);
      if (uploadCartaObservacoes) {
        formData.append('observacoes', uploadCartaObservacoes);
      }

      const res = await anexarCartaConclusaoDirectAction(formData);

      if (res.success && res.carta) {
        const novaCarta = res.carta;
        // Atualiza a lista local de permits
        setPermits((prev) =>
          prev.map((p) => (p.id === uploadingCartaPermit.id ? { ...p, cartaConclusao: novaCarta } : p))
        );

        if (viewingPermit && viewingPermit.id === uploadingCartaPermit.id) {
          setViewingPermit((prev) => (prev ? { ...prev, cartaConclusao: novaCarta } : null));
        }

        setActionMessage({
          type: 'success',
          text: `Carta de Conclusão enviada e vinculada com sucesso à PT ${uploadingCartaPermit.codigo}!`,
        });

        const permitAtualizada = { ...uploadingCartaPermit, cartaConclusao: novaCarta };
        setUploadingCartaPermit(null);
        setUploadCartaFotoFile(null);
        setUploadCartaFotoPreview(null);
        setUploadCartaObservacoes('');
        setUploadCartaTecnicoNome('');

        // Abre a visualização imediatamente para comodidade do usuário
        setPreviewingCarta({
          permit: permitAtualizada,
          carta: novaCarta,
        });
      } else {
        setUploadCartaErro(res.error || 'Erro ao enviar e processar a carta.');
      }
    } catch {
      setUploadCartaErro('Erro inesperado ao enviar a carta.');
    } finally {
      setIsUploadingCarta(false);
    }
  };

  // Submissão do Término de Serviço
  const handleConcluirTermino = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concludingPermit) return;

    if (!terminoNome.trim()) {
      setTerminoErro('Por favor, informe o nome do responsável pelo término.');
      return;
    }

    if (!terminoAssinatura || !terminoAssinatura.assinaturaBase64) {
      setTerminoErro('Por favor, colete a assinatura digital gráfica do responsável pelo término.');
      return;
    }

    setIsProcessing(true);
    setTerminoErro(null);

    try {
      const res = await concluirTerminoPtReparoAction({
        workPermitId: concludingPermit.id,
        dataHoraTermino: terminoDataHora,
        emitenteNome: terminoNome,
        emitenteAssinaturaBase64: terminoAssinatura.assinaturaBase64,
        geolocalizacao: terminoAssinatura.geolocalizacao || null,
        observacoesFinais: terminoObservacoes,
      });

      if (res.success) {
        // Atualiza a lista local com status CONCLUIDO e os dados do término
        setPermits((prev) =>
          prev.map((p) => {
            if (p.id === concludingPermit.id) {
              const updatedItem: WorkPermitItem = {
                ...p,
                status: 'CONCLUIDO',
                dadosCompletos: {
                  ...p.dadosCompletos,
                  terminoServico: {
                    dataHoraTermino: terminoDataHora,
                    emitenteAssinatura: terminoAssinatura,
                  },
                  observacoesGerais: terminoObservacoes
                    ? `${p.dadosCompletos?.observacoesGerais || ''}\n[Término]: ${terminoObservacoes}`.trim()
                    : p.dadosCompletos?.observacoesGerais,
                },
              };
              return updatedItem;
            }
            return p;
          })
        );

        // Se o modal de visualização estiver aberto para a mesma PT, atualiza-o
        if (viewingPermit && viewingPermit.id === concludingPermit.id) {
          setViewingPermit((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'CONCLUIDO',
                  dadosCompletos: {
                    ...prev.dadosCompletos,
                    terminoServico: {
                      dataHoraTermino: terminoDataHora,
                      emitenteAssinatura: terminoAssinatura,
                    },
                  },
                }
              : null
          );
        }

        // Se houver carta de conclusão em PDF gerada, anexa à Ordem de Serviço
        if (cartaPdfBlob && concludingPermit.serviceOrderId) {
          try {
            const pdfFile = new File(
              [cartaPdfBlob],
              `Carta_Conclusao_${concludingPermit.codigo}.pdf`,
              { type: 'application/pdf' }
            );
            const uploadFormData = new FormData();
            uploadFormData.append('serviceOrderId', concludingPermit.serviceOrderId);
            uploadFormData.append('category', 'CARTA_CONCLUSAO');
            uploadFormData.append('files', pdfFile);
            const uploadRes = await uploadAttachmentsAction(uploadFormData);
            if (uploadRes.success && uploadRes.attachments && uploadRes.attachments.length > 0) {
              const uploadedCarta = uploadRes.attachments[0];
              const novaCarta = {
                id: uploadedCarta.id,
                fileName: uploadedCarta.fileName,
                driveViewUrl: uploadedCarta.driveViewUrl,
                driveDownloadUrl: uploadedCarta.driveDownloadUrl || null,
              };
              setPermits((prev) =>
                prev.map((p) =>
                  p.id === concludingPermit.id ? { ...p, cartaConclusao: novaCarta } : p
                )
              );
              if (viewingPermit && viewingPermit.id === concludingPermit.id) {
                setViewingPermit((prev) => (prev ? { ...prev, cartaConclusao: novaCarta } : null));
              }
            }
          } catch (anexoErr) {
            console.warn('[handleConcluirTermino] Aviso ao anexar carta à OS:', anexoErr);
          }
        }

        setActionMessage({
          type: 'success',
          text: `Término do serviço registrado com sucesso para a PT ${concludingPermit.codigo}! Status atualizado para Concluído.`,
        });
        setConcludingPermit(null);
      } else {
        setTerminoErro(res.error || 'Erro ao registrar o término do serviço.');
      }
    } catch {
      setTerminoErro('Erro inesperado ao registrar o término do serviço.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler para Exclusão (Admin)
  const handleDeleteConfirm = async (id: string) => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await deletePtReparoAction(id);
      if (res.success) {
        setPermits((prev) => prev.filter((p) => p.id !== id));
        setActionMessage({
          type: 'success',
          text: 'Permissão de Trabalho excluída com sucesso do banco de dados.',
        });
        setDeletingPermitId(null);
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Erro ao excluir a Permissão.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Erro inesperado ao excluir.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler para Salvar Edição (Admin)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermit) return;

    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await updatePtReparoAction(editingPermit.id, {
        contratoOrcamento: editingPermit.contratoOrcamento,
        equipamento: editingPermit.equipamento,
        classificacaoReparo: editingPermit.classificacaoReparo as any,
        observacoesGerais: editingPermit.dadosCompletos?.observacoesGerais || '',
      });

      if (res.success) {
        setPermits((prev) =>
          prev.map((p) => (p.id === editingPermit.id ? editingPermit : p))
        );
        setActionMessage({ type: 'success', text: 'Permissão de Trabalho atualizada com sucesso!' });
        setEditingPermit(null);
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Erro ao atualizar a Permissão.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Erro ao salvar alterações.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header Principal com Identidade TKE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-orange-600 tracking-wider uppercase bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
              Módulo de Segurança e Auditoria • TKE
            </span>
            {isAdmin && (
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Acesso Total (Administrador)
              </span>
            )}
            {isSubcontratado && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                🔒 Visão do Prestador (Suas APRs)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
            Permissões de Trabalho & APR - Reparos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isSubcontratado
              ? 'Visualize exclusivamente as Permissões de Trabalho & APRs preenchidas por você ou atribuídas à sua equipe, baixe o PDF oficial e registre o término de serviços.'
              : 'Visualize o histórico de autorizações, faça download do PDF oficial assinado, registre o término de serviços ou emita novas permissões de trabalho.'}
          </p>
        </div>

        {/* Botões das Abas */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('LIST')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'LIST'
                ? 'bg-white text-slate-900 shadow-xs scale-102 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📋</span>
            <span>{isSubcontratado ? `Suas APRs Salvas (${permits.length})` : `Permissões Salvas (${permits.length})`}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CREATE')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'CREATE'
                ? 'btn-tke-gradient text-white shadow-md shadow-orange-500/25 scale-102 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>✍️</span>
            <span>Nova Emissão (Em Branco)</span>
          </button>
          <Link
            href="/dashboard/reparo/acompanhamento"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-orange-600 hover:bg-white/80 transition flex items-center gap-1.5"
            title="Acessar Acompanhamento de Serviços no Mapa"
          >
            <span>📍</span>
            <span>Mapa de Serviços</span>
          </Link>
        </div>
      </div>

      {/* Alertas de Ação */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between shadow-2xs ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <span>{actionMessage.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{actionMessage.text}</span>
          </span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold underline ml-4 hover:opacity-80"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ABA 1: LISTAGEM DE PERMISSÕES SALVAS */}
      {activeTab === 'LIST' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-96 relative">
              <input
                type="text"
                placeholder="Buscar por código, contrato ou equipamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs sm:text-sm pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="CONCLUIDO">Concluídos</option>
              </select>

              <button
                type="button"
                onClick={() => setActiveTab('CREATE')}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-xs transition flex items-center gap-1.5 whitespace-nowrap ml-auto"
              >
                <span>+</span> Emitir PT
              </button>
            </div>
          </div>

          {/* Tabela de Permissões */}
          {filteredPermits.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <div className="text-4xl">📄</div>
              <h3 className="text-base font-bold text-slate-800">
                {isSubcontratado ? 'Nenhuma APR Emitida por Você' : 'Nenhuma Permissão de Trabalho Encontrada'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {isSubcontratado
                  ? 'Você ainda não preencheu nenhuma Permissão de Trabalho / APR ou não há registros com os filtros informados. Clique no botão abaixo para emitir sua APR.'
                  : 'Não há registros de PT / APR que correspondam aos filtros selecionados. Clique no botão abaixo para emitir uma nova permissão com campos em branco.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('CREATE')}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
              >
                Emitir Nova PT / APR
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[1100px]">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Código / PT</th>
                      <th className="py-3.5 px-4">Data Emissão</th>
                      <th className="py-3.5 px-4">Contrato / Orçamento</th>
                      <th className="py-3.5 px-4">Equipamento</th>
                      <th className="py-3.5 px-4">Mão de Obra</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-center">Fotos do Serviço</th>
                      <th className="py-3.5 px-4 text-center">Carta de Conclusão</th>
                      <th className="py-3.5 px-4 text-center">Relatório Conclusão (PDF)</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredPermits.map((permit) => {
                      const isConcluido =
                        permit.status === 'CONCLUIDO' || permit.status === 'FINALIZADA';
                      const qtdFotos = permit.totalFotos || ((permit.dadosCompletos as any)?.fotosServico?.length || 0);

                      return (
                        <tr key={permit.id} className="hover:bg-slate-50/80 transition">
                          {/* Código */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {permit.codigo}
                          </td>

                          {/* Data */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                            {new Date(permit.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          {/* Contrato */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {permit.contratoOrcamento}
                          </td>

                          {/* Equipamento */}
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={permit.equipamento}>
                            {permit.equipamento}
                          </td>

                          {/* Mão de Obra */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                permit.tipoMaoDeObra === 'TKE'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {permit.tipoMaoDeObra}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                                isConcluido
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              <span>{isConcluido ? '✓' : '⏳'}</span>
                              <span>{isConcluido ? 'Concluído' : 'Em Andamento'}</span>
                            </span>
                          </td>

                          {/* CAMPO DE FOTOS DO SERVIÇO (LEVA PARA TELA DEDICADA) */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <Link
                              href={`/dashboard/reparo/pt/${permit.id}/fotos`}
                              className={`inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1.5 rounded-lg border transition shadow-2xs hover:scale-102 active:scale-98 ${
                                qtdFotos > 0
                                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                                  : 'bg-amber-50/80 hover:bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                              title={
                                qtdFotos > 0
                                  ? `Visualizar e adicionar fotos (${qtdFotos} já salvas)`
                                  : 'Adicionar fotos do serviço em tela dedicada'
                              }
                            >
                              <span>📷</span>
                              <span>{qtdFotos > 0 ? `Fotos (${qtdFotos})` : '+ Enviar Fotos'}</span>
                            </Link>
                          </td>

                          {/* CAMPO DE CARTA DE CONCLUSÃO (VISUALIZAR, BAIXAR E COMPARTILHAR) */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {permit.cartaConclusao ? (
                              <div className="inline-flex items-center gap-1.5 justify-center flex-wrap">
                                {/* 1. Botão Visualizar Carta */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewingCarta({
                                      permit,
                                      carta: permit.cartaConclusao!,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 transition shadow-2xs hover:scale-102 active:scale-98"
                                  title="Visualizar Carta de Conclusão em tela"
                                >
                                  <span>👁️</span>
                                  <span>Visualizar</span>
                                </button>

                                {/* 2. Botão Baixar Carta */}
                                <a
                                  href={permit.cartaConclusao.driveDownloadUrl || permit.cartaConclusao.driveViewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-2xs hover:shadow-xs transition active:scale-98"
                                  title={`Baixar PDF da Carta (${permit.cartaConclusao.fileName})`}
                                >
                                  <span>📥</span>
                                  <span>Baixar</span>
                                </a>

                                {/* 3. Botão Compartilhar Carta */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSharingCarta({
                                      permit,
                                      carta: permit.cartaConclusao!,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-purple-200 transition shadow-2xs hover:scale-102 active:scale-98"
                                  title="Compartilhar via WhatsApp, Copiar Link ou Celular"
                                >
                                  <span>📲</span>
                                  <span>Compartilhar</span>
                                </button>
                              </div>
                            ) : isConcluido ? (
                              <button
                                type="button"
                                onClick={() => setUploadingCartaPermit(permit)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 hover:text-white bg-orange-50 hover:bg-orange-600 border border-orange-200 hover:border-orange-600 px-3 py-1.5 rounded-lg transition shadow-2xs hover:shadow-xs"
                                title="Anexar Carta de Conclusão / Aceite do Cliente"
                              >
                                <span>📎</span>
                                <span>+ Enviar Carta</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setUploadingCartaPermit(permit)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-orange-600 bg-slate-50 hover:bg-orange-50 border border-dashed border-slate-300 hover:border-orange-300 px-2.5 py-1.5 rounded-lg transition"
                                title="Anexar Carta de Conclusão para esta PT"
                              >
                                <span>📎</span>
                                <span>+ Enviar Carta</span>
                              </button>
                            )}
                          </td>

                          {/* CAMPO DE RELATÓRIO DE CONCLUSÃO EM PDF (JUNTA TUDO: APR + CARTA + FOTOS) */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex flex-col items-center justify-center gap-1">
                              <a
                                href={`/api/pt/${permit.id}/relatorio-conclusao`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs px-3 py-1.5 rounded-lg shadow-xs hover:shadow-md transition active:scale-95"
                                title="Gerar e Baixar Relatório Unificado de Conclusão (APR + Carta de Conclusão + Fotos do Serviço em PDF)"
                              >
                                <span>📑</span>
                                <span>Relatório Completo</span>
                              </a>
                              <a
                                href={`/api/pt/${permit.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-slate-500 hover:text-slate-800 underline font-medium hover:font-semibold"
                                title="Baixar apenas a folha da Permissão de Trabalho / APR"
                              >
                                Baixar apenas APR
                              </a>
                            </div>
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1">
                            {/* BOTÃO DE PREENCHIMENTO DO TÉRMINO DO SERVIÇO */}
                            {!isConcluido && (
                              <button
                                type="button"
                                onClick={() => handleOpenTerminoModal(permit)}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1.5 rounded-lg transition text-xs border border-emerald-300 shadow-2xs inline-flex items-center gap-1"
                                title="Preencher Término do Serviço de Reparo e Mudar Status para Concluído"
                              >
                                <span>🏁</span>
                                <span>Término</span>
                              </button>
                            )}

                            {/* Visualizar */}
                            <button
                              type="button"
                              onClick={() => setViewingPermit(permit)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-2.5 py-1.5 rounded-lg transition text-xs"
                              title="Visualizar Detalhes da APT"
                            >
                              👁️ Ver
                            </button>

                            {/* Se for Admin: Editar */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setEditingPermit({ ...permit })}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg transition text-xs border border-blue-200"
                                title="Editar Permissão de Trabalho"
                              >
                                ✏️ Editar
                              </button>
                            )}

                            {/* Se for Admin: Excluir */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeletingPermitId(permit.id)}
                                className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-2.5 py-1.5 rounded-lg transition text-xs border border-red-200"
                                title="Excluir Permissão de Trabalho"
                              >
                                🗑️ Excluir
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: FORMULÁRIO WIZARD (EM BRANCO) */}
      {activeTab === 'CREATE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <span className="text-xs text-slate-600">
              Preencha todos os campos da Análise Preliminar de Risco e Permissão de Trabalho. Todos os campos iniciam em branco.
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('LIST')}
              className="text-xs font-bold text-slate-700 hover:text-black underline"
            >
              ← Voltar para Permissões Salvas
            </button>
          </div>

          <PtReparoWizard
            serviceOrderId=""
            defaultContrato=""
            defaultEquipamento=""
          />
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO COMPLETA DA APT */}
      {viewingPermit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6 p-6">
            {/* Header do Modal */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                  Detalhamento da Permissão de Trabalho
                </span>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  {viewingPermit.codigo}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      viewingPermit.status === 'CONCLUIDO' || viewingPermit.status === 'FINALIZADA'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {viewingPermit.status === 'CONCLUIDO' || viewingPermit.status === 'FINALIZADA'
                      ? '✓ Concluído'
                      : '⏳ Em Andamento'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Emitida em:{' '}
                  {new Date(viewingPermit.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>

              {/* Botão de Fechar e Botões de Baixar PDF, Carta, Fotos e Relatório Completo */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* 1. Botão para Tela de Fotos do Serviço */}
                <Link
                  href={`/dashboard/reparo/pt/${viewingPermit.id}/fotos`}
                  className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs px-3 sm:px-4 py-2 rounded-xl shadow-2xs hover:scale-102 active:scale-98 transition"
                  title="Acessar galeria e envio de fotos do serviço"
                >
                  <span>📷</span>
                  <span>Fotos do Serviço</span>
                </Link>

                {/* 2. Botão de Relatório de Conclusão Unificado em PDF (Dossiê Completo) */}
                <a
                  href={`/api/pt/${viewingPermit.id}/relatorio-conclusao`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs px-3 sm:px-4 py-2 rounded-xl shadow-xs transition active:scale-98"
                  title="Gerar Dossiê Completo juntando APR, Carta de Conclusão e Fotos do Serviço em PDF"
                >
                  <span>📑</span>
                  <span>Relatório Completo (PDF)</span>
                </a>

                {/* 3. Botão Baixar Apenas PDF da PT */}
                <a
                  href={`/api/pt/${viewingPermit.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 sm:px-4 py-2 rounded-xl shadow-xs transition"
                >
                  <span>📄</span>
                  <span>Baixar PT (APR)</span>
                </a>
                {viewingPermit.cartaConclusao && (
                  <a
                    href={viewingPermit.cartaConclusao.driveDownloadUrl || viewingPermit.cartaConclusao.driveViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs px-3 sm:px-4 py-2 rounded-xl shadow-xs transition"
                    title={`Baixar Carta de Conclusão (${viewingPermit.cartaConclusao.fileName})`}
                  >
                    <span>📥</span>
                    <span>Carta de Conclusão</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setViewingPermit(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Conteúdo Detalhado */}
            <div className="space-y-6 text-xs text-slate-700">
              {/* 1 - 4: Dados Cadastrais */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                <h3 className="font-bold text-slate-900 uppercase">1 a 4. Identificação do Serviço</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div>
                    <span className="text-slate-500 block">Contrato / Orçamento:</span>
                    <span className="font-bold text-slate-900">{viewingPermit.contratoOrcamento}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Equipamento:</span>
                    <span className="font-bold text-slate-900">{viewingPermit.equipamento}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mão de Obra:</span>
                    <span className="font-bold text-slate-900">{viewingPermit.tipoMaoDeObra}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tipo de Equipamento:</span>
                    <span className="font-bold text-slate-900">
                      {viewingPermit.tipoEquipamento === 'COM_CASA_DE_MAQUINAS'
                        ? 'Com Casa de Máquinas'
                        : 'Sem Casa de Máquinas (MRL)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5: Serviços e Riscos */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 uppercase">5. Serviços & Riscos Identificados</h3>
                <div>
                  <span className="text-slate-500 block mb-1">Serviços Selecionados:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingPermit.dadosCompletos?.servicosRealizados?.length ? (
                      viewingPermit.dadosCompletos.servicosRealizados.map((s, idx) => (
                        <span key={idx} className="bg-red-50 text-red-800 border border-red-200 px-2 py-0.5 rounded text-[11px]">
                          ✓ {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">Nenhum serviço listado</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Riscos Potenciais:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingPermit.dadosCompletos?.riscosPotenciais?.length ? (
                      viewingPermit.dadosCompletos.riscosPotenciais.map((r, idx) => (
                        <span key={idx} className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                          ⚠️ {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">Nenhum risco apontado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 6: Supervisão Técnica */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h3 className="font-bold text-slate-900 uppercase">
                  6. Supervisão Técnica (Opcional)
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-500 block">Supervisor Responsável:</span>
                    <span className="font-bold text-slate-900">
                      {viewingPermit.dadosCompletos?.assinaturaSupervisao?.nome || 'Assinatura Dispensada / Opcional'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Data de Autorização:</span>
                    <span className="font-semibold text-slate-800">
                      {viewingPermit.dadosCompletos?.dataAutorizacaoSupervisao || '-'}
                    </span>
                  </div>
                </div>
                {viewingPermit.dadosCompletos?.assinaturaSupervisao?.assinaturaBase64 && (
                  <div className="pt-2">
                    <span className="text-slate-500 block mb-1">Assinatura Gráfica:</span>
                    <div className="bg-white border border-slate-200 rounded-lg p-2 inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={viewingPermit.dadosCompletos.assinaturaSupervisao.assinaturaBase64}
                        alt="Assinatura Supervisor"
                        className="h-16 max-w-xs object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 10: EPIs e EPCs */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 uppercase">EPIs e Equipamentos</h3>
                <div className="flex flex-wrap gap-1.5">
                  {viewingPermit.dadosCompletos?.episSelecionados?.length ? (
                    viewingPermit.dadosCompletos.episSelecionados.map((epi, idx) => (
                      <span key={idx} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                        🦺 {epi}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">Nenhum EPI registrado</span>
                  )}
                </div>
              </div>

              {/* 12 e 13: Assinaturas de Campo (Início e Integrantes) */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 uppercase">Assinaturas de Início & Equipe Técnica</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Responsável Início */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-500 block font-semibold">12. Responsável pelo Início:</span>
                    <span className="font-bold text-slate-900 block">
                      {viewingPermit.dadosCompletos?.inicioServico?.emitenteAssinatura?.nome || 'Não informado'}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Data/Hora: {viewingPermit.dadosCompletos?.inicioServico?.dataHoraInicio || '-'}
                    </span>
                    {viewingPermit.dadosCompletos?.inicioServico?.emitenteAssinatura?.assinaturaBase64 && (
                      <div className="bg-white border border-slate-200 rounded p-1 inline-block mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={viewingPermit.dadosCompletos.inicioServico.emitenteAssinatura.assinaturaBase64}
                          alt="Assinatura Início"
                          className="h-12 max-w-xs object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Integrantes da Equipe */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-500 block font-semibold">13. Integrantes da Equipe:</span>
                    {viewingPermit.dadosCompletos?.equipeReparo?.map((m, idx) => (
                      <div key={idx} className="border-b border-slate-200 pb-1 last:border-none">
                        <span className="font-bold text-slate-800 block">{m.nomeCompleto || `Integrante ${idx + 1}`}</span>
                        {m.assinatura?.assinaturaBase64 && (
                          <div className="bg-white border border-slate-200 rounded p-1 inline-block mt-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.assinatura.assinaturaBase64}
                              alt={`Assinatura ${m.nomeCompleto}`}
                              className="h-10 max-w-xs object-contain"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 14: TÉRMINO DO SERVIÇO DE REPARO */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                    <span>14. Término do Serviço de Reparo</span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        viewingPermit.dadosCompletos?.terminoServico
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {viewingPermit.dadosCompletos?.terminoServico ? '✓ Concluído' : '⏳ Em Andamento'}
                    </span>
                  </h3>
                  {!viewingPermit.dadosCompletos?.terminoServico && (
                    <button
                      type="button"
                      onClick={() => handleOpenTerminoModal(viewingPermit)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition flex items-center gap-1"
                    >
                      <span>🏁</span>
                      <span>Registrar Término</span>
                    </button>
                  )}
                </div>

                {viewingPermit.dadosCompletos?.terminoServico ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-slate-500 block">Responsável pelo Término:</span>
                      <span className="font-bold text-slate-900 block text-sm">
                        {viewingPermit.dadosCompletos.terminoServico.emitenteAssinatura?.nome}
                      </span>
                      <span className="text-slate-500 block mt-1">Data e Hora do Término:</span>
                      <span className="font-semibold text-emerald-800 block">
                        {new Date(viewingPermit.dadosCompletos.terminoServico.dataHoraTermino).toLocaleString('pt-BR')}
                      </span>
                      {viewingPermit.dadosCompletos.terminoServico.emitenteAssinatura?.geolocalizacao && (
                        <span className="text-[11px] text-slate-500 block mt-1">
                          📍 Coordenadas:{' '}
                          {viewingPermit.dadosCompletos.terminoServico.emitenteAssinatura.geolocalizacao.latitude.toFixed(5)},{' '}
                          {viewingPermit.dadosCompletos.terminoServico.emitenteAssinatura.geolocalizacao.longitude.toFixed(5)}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Assinatura Gráfica de Conclusão:</span>
                      <div className="bg-white border border-slate-200 rounded-lg p-2 inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={viewingPermit.dadosCompletos.terminoServico.emitenteAssinatura.assinaturaBase64}
                          alt="Assinatura Término"
                          className="h-14 max-w-xs object-contain"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-600 bg-white/70 p-3 rounded-lg border border-emerald-100 flex items-center justify-between">
                    <div>
                      <p className="font-medium">O serviço de reparo ainda está em andamento.</p>
                      <p className="text-[11px] text-slate-500">
                        Clique no botão ao lado para preencher o término e alterar o status para Concluído.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenTerminoModal(viewingPermit)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition whitespace-nowrap ml-2"
                    >
                      Preencher Término
                    </button>
                  </div>
                )}

                {/* Bloco de Carta de Conclusão / Aceite do Cliente */}
                {viewingPermit.cartaConclusao ? (
                  <div className="mt-3 pt-3 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">📄</span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block text-xs">
                          Carta de Conclusão / Aceite do Cliente Anexada
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-xs sm:max-w-md">
                          {viewingPermit.cartaConclusao.fileName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {/* Visualizar Carta */}
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewingCarta({
                            permit: viewingPermit,
                            carta: viewingPermit.cartaConclusao!,
                          })
                        }
                        className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-blue-200 transition shadow-2xs hover:scale-102"
                      >
                        <span>👁️</span>
                        <span>Visualizar Carta</span>
                      </button>

                      {/* Baixar Carta */}
                      <a
                        href={viewingPermit.cartaConclusao.driveDownloadUrl || viewingPermit.cartaConclusao.driveViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs hover:shadow-xs transition"
                        title="Baixar Arquivo PDF da Carta de Conclusão"
                      >
                        <span>📥</span>
                        <span>Baixar</span>
                      </a>

                      {/* Compartilhar Carta */}
                      <button
                        type="button"
                        onClick={() =>
                          setSharingCarta({
                            permit: viewingPermit,
                            carta: viewingPermit.cartaConclusao!,
                          })
                        }
                        className="inline-flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-purple-200 transition shadow-2xs hover:scale-102"
                        title="Compartilhar via WhatsApp, Link ou Celular"
                      >
                        <span>📲</span>
                        <span>Compartilhar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  (viewingPermit.status === 'CONCLUIDO' || viewingPermit.status === 'FINALIZADA') && (
                    <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between bg-white/70 p-3 rounded-xl border border-dashed border-slate-300">
                      <span className="text-xs text-slate-500">
                        Nenhuma Carta de Conclusão anexada para esta PT.
                      </span>
                      <button
                        type="button"
                        onClick={() => setUploadingCartaPermit(viewingPermit)}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-lg border border-orange-200 transition"
                      >
                        + Anexar Carta Agora
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* Observações Gerais */}
              {viewingPermit.dadosCompletos?.observacoesGerais && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-700 block mb-1">Observações Gerais:</span>
                  <p className="text-slate-600 whitespace-pre-wrap">{viewingPermit.dadosCompletos.observacoesGerais}</p>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-4 gap-3">
              <span className="text-xs text-slate-400">TKE Brasil • Sistema de Reparo & APR</span>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <a
                  href={`/api/pt/${viewingPermit.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
                >
                  📄 Baixar PDF PT
                </a>
                {viewingPermit.cartaConclusao && (
                  <a
                    href={viewingPermit.cartaConclusao.driveDownloadUrl || viewingPermit.cartaConclusao.driveViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
                  >
                    📥 Baixar Carta
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setViewingPermit(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs px-4 py-2 rounded-xl transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PREENCHIMENTO DO TÉRMINO DO SERVIÇO DE REPARO (ITEM 14) */}
      {concludingPermit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Encerramento da Atividade
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  14 - Término do Serviço de Reparo
                </h3>
                <p className="text-xs text-slate-500">
                  PT: <span className="font-bold text-slate-800">{concludingPermit.codigo}</span> • Contrato: {concludingPermit.contratoOrcamento}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConcludingPermit(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {terminoErro && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{terminoErro}</span>
              </div>
            )}

            <form onSubmit={handleConcluirTermino} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Data e Hora do Término *
                </label>
                <input
                  type="datetime-local"
                  value={terminoDataHora}
                  onChange={(e) => setTerminoDataHora(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome do Responsável pelo Término (Técnico Emitente) *
                </label>
                <input
                  type="text"
                  placeholder="Nome completo do responsável..."
                  value={terminoNome}
                  onChange={(e) => setTerminoNome(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Pad de Assinatura Digital com GPS */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">
                  Assinatura Digital de Término *
                </label>
                <p className="text-[11px] text-slate-500 pb-1">
                  Desenhe sua assinatura no quadro abaixo. Ela será vinculada às coordenadas GPS e carimbo auditável UTC.
                </p>
                <SignaturePad
                  label="Assinatura do Responsável pelo Término"
                  signatarioNome={terminoNome || 'Responsável pelo Término'}
                  signatarioCargo="Técnico de Reparo"
                  value={terminoAssinatura}
                  onChange={(sig) => setTerminoAssinatura(sig)}
                  required
                />
              </div>

              {/* SEÇÃO DE CARTA DE CONCLUSÃO / ACEITE DO CLIENTE */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📄</span>
                    <div>
                      <label className="font-bold text-slate-800 text-xs block">
                        Carta de Conclusão / Aceite do Cliente
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Adicione a foto da carta assinada para gerar o PDF oficial e compartilhar.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                    Opcional
                  </span>
                </div>

                {/* Inputs Ocultos de Câmera e Arquivo */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cartaCameraInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSelectCartaFoto(file);
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={cartaFileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSelectCartaFoto(file);
                    e.target.value = '';
                  }}
                />

                {!cartaFotoPreview ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => cartaCameraInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-semibold text-xs transition shadow-2xs hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <span>📷</span>
                      <span>Tirar Foto da Carta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => cartaFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-semibold text-xs transition shadow-2xs hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <span>📁</span>
                      <span>Escolher da Galeria</span>
                    </button>
                  </div>
                ) : (
                  /* Card da Foto Selecionada e PDF Gerado */
                  <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-start gap-3">
                      {/* Preview da Imagem */}
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cartaFotoPreview}
                          alt="Preview da Carta de Conclusão"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-800 text-xs truncate">
                            {cartaFotoFile?.name || 'Foto da Carta de Conclusão'}
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoverCartaFoto}
                            className="text-red-500 hover:text-red-700 font-semibold text-xs"
                            title="Remover foto"
                          >
                            ✕ Remover
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {cartaFotoFile ? `${(cartaFotoFile.size / 1024).toFixed(1)} KB` : ''}
                        </p>

                        {/* Status da Geração de PDF */}
                        {isGerandoPdfCarta ? (
                          <div className="flex items-center gap-1.5 text-xs text-orange-600 font-medium animate-pulse">
                            <span className="animate-spin">⏳</span>
                            <span>Gerando arquivo PDF oficial da carta...</span>
                          </div>
                        ) : cartaPdfBlob ? (
                          <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                            <span>✓</span>
                            <span>PDF oficial da carta gerado com sucesso!</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Botões de Ação do PDF: Baixar e Compartilhar */}
                    {cartaPdfBlob && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleBaixarCartaPdf}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                          title="Baixar o arquivo PDF da Carta de Conclusão"
                        >
                          <span>📥</span>
                          <span>Baixar PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCompartilharCartaPdf}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-700 to-orange-500 hover:brightness-110 text-white font-bold rounded-lg text-xs transition shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                          title="Compartilhar PDF via WhatsApp, e-mail ou abrir"
                        >
                          <span>📤</span>
                          <span>Compartilhar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => cartaCameraInputRef.current?.click()}
                          className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-auto"
                        >
                          Trocar foto
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observações Finais de Encerramento (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações sobre testes de funcionamento, limpeza da área, entrega do equipamento..."
                  value={terminoObservacoes}
                  onChange={(e) => setTerminoObservacoes(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setConcludingPermit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Gravando Término...</span>
                    </>
                  ) : (
                    <>
                      <span>🔒</span>
                      <span>Confirmar Término e Mudar para Concluído</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DA APT (ADMINISTRADOR) */}
      {editingPermit && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">Administração</span>
                <h3 className="text-lg font-bold text-slate-900">Editar Permissão {editingPermit.codigo}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPermit(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contrato / Orçamento</label>
                <input
                  type="text"
                  value={editingPermit.contratoOrcamento}
                  onChange={(e) =>
                    setEditingPermit({ ...editingPermit, contratoOrcamento: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Identificação do Equipamento</label>
                <input
                  type="text"
                  value={editingPermit.equipamento}
                  onChange={(e) =>
                    setEditingPermit({ ...editingPermit, equipamento: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Classificação do Reparo</label>
                <select
                  value={editingPermit.classificacaoReparo}
                  onChange={(e) =>
                    setEditingPermit({ ...editingPermit, classificacaoReparo: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="ROTINEIRO">Rotineiro</option>
                  <option value="NAO_ROTINEIRO">Não Rotineiro</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações Gerais</label>
                <textarea
                  rows={3}
                  value={editingPermit.dadosCompletos?.observacoesGerais || ''}
                  onChange={(e) =>
                    setEditingPermit({
                      ...editingPermit,
                      dadosCompletos: {
                        ...editingPermit.dadosCompletos,
                        observacoesGerais: e.target.value,
                      },
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPermit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isProcessing ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (ADMINISTRADOR) */}
      {deletingPermitId && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="text-4xl">⚠️</div>
            <h3 className="text-base font-bold text-slate-900">Confirmar Exclusão de PT?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir esta Permissão de Trabalho do banco de dados? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPermitId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirm(deletingPermitId)}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
              >
                {isProcessing ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: VISUALIZAÇÃO COMPLETA DA CARTA DE CONCLUSÃO */}
      {previewingCarta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">📄</span>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                    Carta de Conclusão • {previewingCarta.permit.codigo}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    Contrato: <span className="font-semibold text-slate-700">{previewingCarta.permit.contratoOrcamento}</span> • Equipamento: <span className="font-semibold text-slate-700">{previewingCarta.permit.equipamento}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Baixar */}
                <a
                  href={previewingCarta.carta.driveDownloadUrl || previewingCarta.carta.driveViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs transition active:scale-95"
                  title="Baixar arquivo da Carta"
                >
                  <span>📥</span>
                  <span className="hidden sm:inline">Baixar</span>
                </a>

                {/* Compartilhar */}
                <button
                  type="button"
                  onClick={() =>
                    setSharingCarta({
                      permit: previewingCarta.permit,
                      carta: previewingCarta.carta,
                    })
                  }
                  className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs transition active:scale-95"
                  title="Compartilhar Carta"
                >
                  <span>📲</span>
                  <span className="hidden sm:inline">Compartilhar</span>
                </button>

                {/* Fechar */}
                <button
                  type="button"
                  onClick={() => setPreviewingCarta(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg text-lg font-bold"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Viewer Iframe / Imagem / Link */}
            <div className="flex-1 min-h-[420px] sm:min-h-[560px] bg-slate-900 relative flex flex-col items-center justify-center overflow-hidden">
              {previewingCarta.carta.driveViewUrl.match(/\.(jpeg|jpg|png|webp)$/i) ? (
                <img
                  src={previewingCarta.carta.driveViewUrl}
                  alt={`Carta de Conclusão ${previewingCarta.permit.codigo}`}
                  className="max-h-[75vh] w-auto object-contain mx-auto p-2"
                />
              ) : (
                <iframe
                  src={
                    previewingCarta.carta.driveViewUrl.startsWith('http') && previewingCarta.carta.driveViewUrl.includes('drive.google.com')
                      ? previewingCarta.carta.driveViewUrl.replace(/\/view(\?usp=.*)?$/, '/preview')
                      : previewingCarta.carta.driveViewUrl
                  }
                  className="w-full h-full min-h-[420px] sm:min-h-[560px] border-0 bg-white"
                  title={`Carta de Conclusão ${previewingCarta.permit.codigo}`}
                  allow="autoplay"
                />
              )}
            </div>

            {/* Footer com Ações de Compartilhamento e Acesso Direto */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500 w-full sm:w-auto">
                <span>📎</span>
                <span className="truncate max-w-xs">{previewingCarta.carta.fileName}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                {/* Botão WhatsApp */}
                <button
                  type="button"
                  onClick={() =>
                    handleShareWhatsApp(
                      previewingCarta.permit,
                      previewingCarta.carta.driveViewUrl
                    )
                  }
                  className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-2 rounded-xl transition"
                >
                  <span>🟢</span>
                  <span>WhatsApp</span>
                </button>

                {/* Botão Copiar Link */}
                <button
                  type="button"
                  onClick={() => handleCopyLink(previewingCarta.carta.driveViewUrl)}
                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-2 rounded-xl transition"
                >
                  <span>{copySuccess ? '✓' : '📋'}</span>
                  <span>{copySuccess ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>

                {/* Abrir Documento em Nova Aba */}
                <a
                  href={previewingCarta.carta.driveViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-2 rounded-xl border border-blue-200 transition"
                >
                  <span>Abrir Documento ↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPARTILHAR CARTA DE CONCLUSÃO */}
      {sharingCarta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                  Compartilhar Documento
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Carta de Conclusão • {sharingCarta.permit.codigo}
                </h3>
                <p className="text-xs text-slate-500">
                  Contrato: {sharingCarta.permit.contratoOrcamento} • Equipamento: {sharingCarta.permit.equipamento}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSharingCarta(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Opção 1: WhatsApp */}
              <button
                type="button"
                onClick={() => {
                  handleShareWhatsApp(
                    sharingCarta.permit,
                    sharingCarta.carta.driveViewUrl
                  );
                  setSharingCarta(null);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-left transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
                    💬
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 text-sm block">
                      Enviar no WhatsApp
                    </span>
                    <span className="text-xs text-emerald-700 block">
                      Abre o WhatsApp com mensagem formatada e link oficial
                    </span>
                  </div>
                </div>
                <span className="text-emerald-700 font-bold text-sm">→</span>
              </button>

              {/* Opção 2: Copiar Link */}
              <button
                type="button"
                onClick={() => handleCopyLink(sharingCarta.carta.driveViewUrl)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
                    {copySuccess ? '✓' : '🔗'}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">
                      {copySuccess ? 'Link Copiado para a Área de Transferência!' : 'Copiar Link da Carta'}
                    </span>
                    <span className="text-xs text-slate-500 block truncate max-w-xs">
                      {sharingCarta.carta.driveViewUrl}
                    </span>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:text-slate-700 font-bold text-sm">📋</span>
              </button>

              {/* Opção 3: Baixar PDF */}
              <a
                href={sharingCarta.carta.driveDownloadUrl || sharingCarta.carta.driveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSharingCarta(null)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-left transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
                    📥
                  </div>
                  <div>
                    <span className="font-bold text-blue-950 text-sm block">
                      Baixar Arquivo PDF
                    </span>
                    <span className="text-xs text-blue-700 block">
                      Download do documento oficial assinado
                    </span>
                  </div>
                </div>
                <span className="text-blue-700 font-bold text-sm">↓</span>
              </a>

              {/* Opção 4: Compartilhar Nativo no Celular (se disponível) */}
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  type="button"
                  onClick={() => {
                    handleNativeShare(
                      sharingCarta.permit,
                      sharingCarta.carta.driveViewUrl
                    );
                    setSharingCarta(null);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
                      📲
                    </div>
                    <div>
                      <span className="font-bold text-purple-950 text-sm block">
                        Mais Opções de Compartilhamento
                      </span>
                      <span className="text-xs text-purple-700 block">
                        Abrir painel nativo do smartphone
                      </span>
                    </div>
                  </div>
                  <span className="text-purple-700 font-bold text-sm">→</span>
                </button>
              )}
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setSharingCarta(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ENVIAR CARTA DE CONCLUSÃO / ACEITE (DIRETO E RÁPIDO) */}
      {uploadingCartaPermit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                  Anexo de Documento
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Enviar Carta de Conclusão / Aceite
                </h3>
                <p className="text-xs text-slate-500">
                  PT: <span className="font-bold text-slate-800">{uploadingCartaPermit.codigo}</span> • Contrato: {uploadingCartaPermit.contratoOrcamento}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadingCartaPermit(null);
                  setUploadCartaFotoFile(null);
                  setUploadCartaFotoPreview(null);
                  setUploadCartaErro(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {uploadCartaErro && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{uploadCartaErro}</span>
              </div>
            )}

            <form onSubmit={handleSalvarUploadCarta} className="space-y-4 text-xs">
              {/* Inputs Ocultos */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={uploadCartaCameraInputRef}
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIsUploadingCarta(true);
                    setUploadCartaErro(null);
                    try {
                      const { file: compressedFile, base64 } = await compressImageForUpload(file);
                      setUploadCartaFotoFile(compressedFile);
                      setUploadCartaFotoPreview(base64);
                    } catch (err) {
                      setUploadCartaErro('Erro ao processar imagem.');
                    } finally {
                      setIsUploadingCarta(false);
                    }
                  }
                  e.target.value = '';
                }}
              />
              <input
                type="file"
                accept="image/*,application/pdf"
                ref={uploadCartaFileInputRef}
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIsUploadingCarta(true);
                    setUploadCartaErro(null);
                    try {
                      const { file: compressedFile, base64 } = await compressImageForUpload(file);
                      setUploadCartaFotoFile(compressedFile);
                      if (file.type.startsWith('image/')) {
                        setUploadCartaFotoPreview(base64);
                      } else {
                        setUploadCartaFotoPreview(null);
                      }
                    } catch (err) {
                      setUploadCartaErro('Erro ao processar arquivo.');
                    } finally {
                      setIsUploadingCarta(false);
                    }
                  }
                  e.target.value = '';
                }}
              />

              {/* Botões de Câmera e Arquivo */}
              {!uploadCartaFotoFile && !uploadCartaFotoPreview ? (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-3 bg-slate-50/60">
                  <div className="text-3xl">📷</div>
                  <h4 className="font-bold text-slate-800 text-sm">Adicione a Foto da Carta de Conclusão</h4>
                  <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
                    Tire uma foto nítida do documento assinado pelo cliente ou anexe o arquivo PDF/imagem.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => uploadCartaCameraInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95"
                    >
                      <span>📷</span>
                      <span>Tirar Foto (Câmera)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => uploadCartaFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold px-4 py-2.5 rounded-xl transition"
                    >
                      <span>📁</span>
                      <span>Escolher Arquivo / Foto</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate max-w-xs">
                      <span>✓</span>
                      <span className="truncate">{uploadCartaFotoFile?.name || 'Foto da Carta'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadCartaFotoFile(null);
                        setUploadCartaFotoPreview(null);
                      }}
                      className="text-red-600 hover:underline font-bold text-[11px] shrink-0"
                    >
                      Trocar
                    </button>
                  </div>

                  {uploadCartaFotoPreview && (
                    <div className="rounded-lg overflow-hidden border border-slate-200 bg-black/5 max-h-56 flex items-center justify-center">
                      <img
                        src={uploadCartaFotoPreview}
                        alt="Preview da Carta de Conclusão"
                        className="max-h-56 object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Responsável e Observações */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nome do Responsável pelo Envio (Opcional):
                </label>
                <input
                  type="text"
                  value={uploadCartaTecnicoNome}
                  onChange={(e) => setUploadCartaTecnicoNome(e.target.value)}
                  placeholder="Ex: Carlos Oliveira - Técnico de Reparo"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Observações (Opcional):
                </label>
                <textarea
                  value={uploadCartaObservacoes}
                  onChange={(e) => setUploadCartaObservacoes(e.target.value)}
                  placeholder="Ex: Assinado pelo síndico Sr. Marcos no local..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setUploadingCartaPermit(null);
                    setUploadCartaFotoFile(null);
                    setUploadCartaFotoPreview(null);
                  }}
                  disabled={isUploadingCarta}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-semibold text-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploadingCarta || (!uploadCartaFotoFile && !uploadCartaFotoPreview)}
                  className="btn-tke-gradient px-5 py-2 rounded-xl text-white font-bold shadow-md shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploadingCarta ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Gerando PDF e Enviando...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Salvar e Enviar Carta</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
