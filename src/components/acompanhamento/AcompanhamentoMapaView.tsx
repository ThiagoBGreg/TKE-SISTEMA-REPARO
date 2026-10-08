'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import type { PontoAcompanhamentoAPR } from '@/actions/acompanhamentoActions';
import 'leaflet/dist/leaflet.css';

interface AcompanhamentoMapaViewProps {
  pontos: PontoAcompanhamentoAPR[];
  totalSemCoordenadas: number;
  isAdmin: boolean;
  isSubcontratado: boolean;
}

export function AcompanhamentoMapaView({
  pontos,
  totalSemCoordenadas,
  isAdmin,
  isSubcontratado,
}: AcompanhamentoMapaViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [id: string]: any }>({});

  const [selectedPontoId, setSelectedPontoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'EM_ANDAMENTO' | 'CONCLUIDO'>('ALL');
  const [filterMaoDeObra, setFilterMaoDeObra] = useState<'ALL' | 'TKE' | 'CONTRATADA'>('ALL');
  const [mapLayer, setMapLayer] = useState<'STREET' | 'SATELLITE'>('STREET');
  const tileLayerRef = useRef<any>(null);

  // Filtragem dos pontos
  const filteredPontos = useMemo(() => {
    return pontos.filter((p) => {
      const matchSearch =
        p.codigoPT.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.quemPreencheuNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contratoOrcamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.equipamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.clienteNome && p.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()));

      const isConcluido = p.status === 'CONCLUIDO' || p.status === 'FINALIZADA';
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'CONCLUIDO' ? isConcluido : !isConcluido);

      const matchMaoDeObra =
        filterMaoDeObra === 'ALL' || p.tipoMaoDeObra === filterMaoDeObra;

      return matchSearch && matchStatus && matchMaoDeObra;
    });
  }, [pontos, searchTerm, filterStatus, filterMaoDeObra]);

  // Contadores para os Cards de Métricas
  const stats = useMemo(() => {
    const total = pontos.length;
    const concluidos = pontos.filter(
      (p) => p.status === 'CONCLUIDO' || p.status === 'FINALIZADA'
    ).length;
    const emAndamento = total - concluidos;
    const tecnicosUnicos = new Set(pontos.map((p) => p.quemPreencheuNome)).size;

    return { total, concluidos, emAndamento, tecnicosUnicos };
  }, [pontos]);

  // Inicializa o Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    let isMounted = true;

    // Import dinâmico do Leaflet para ambiente seguro de SSR Next.js
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Ponto central padrão: média das coordenadas ou São Paulo/Brasil
      const defaultCenter: [number, number] =
        pontos.length > 0
          ? [pontos[0].latitude, pontos[0].longitude]
          : [-23.55052, -46.633308];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: pontos.length > 0 ? 13 : 11,
        zoomControl: true,
      });

      // Camada de Ruas (OpenStreetMap)
      const streetLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }
      );

      streetLayer.addTo(map);
      tileLayerRef.current = streetLayer;
      mapInstanceRef.current = map;

      // Renderiza os marcadores iniciais
      updateMarkers(L, map, filteredPontos);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Alternância de camadas (Ruas vs Satélite)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      if (mapLayer === 'SATELLITE') {
        tileLayerRef.current = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 18,
          }
        ).addTo(map);
      } else {
        tileLayerRef.current = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
          }
        ).addTo(map);
      }
    });
  }, [mapLayer]);

  // Atualiza os marcadores quando os pontos filtrados mudam
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      updateMarkers(L, mapInstanceRef.current, filteredPontos);
    });
  }, [filteredPontos]);

  // Função auxiliar para desenhar os marcadores
  const updateMarkers = (L: any, map: any, items: PontoAcompanhamentoAPR[]) => {
    // Remove marcadores antigos
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    if (items.length === 0) return;

    const bounds = L.latLngBounds([]);

    items.forEach((p) => {
      const isConcluido = p.status === 'CONCLUIDO' || p.status === 'FINALIZADA';
      const bgColor = isConcluido ? '#10b981' : '#dc2626'; // emerald vs red
      const borderColor = isConcluido ? '#047857' : '#991b1b';
      const iconSymbol = isConcluido ? '✓' : '⚡';

      const customIcon = L.divIcon({
        className: 'custom-pt-marker',
        html: `
          <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${bgColor}; opacity: 0.3; animation: pulse 2s infinite;"></div>
            <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background-color: ${bgColor}; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 15px;">
              ${iconSymbol}
            </div>
            <div style="position: absolute; bottom: -4px; width: 6px; height: 6px; border-radius: 50%; background-color: ${borderColor};"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -22],
      });

      const marker = L.marker([p.latitude, p.longitude], { icon: customIcon });

      // Conteúdo HTML rico do Popup
      const dataFormatada = p.dataHoraPreenchimento
        ? new Date(p.dataHoraPreenchimento).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Horário auditado';

      const statusBadge = isConcluido
        ? '<span style="background-color: #ecfdf5; color: #065f46; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid #a7f3d0;">✓ Concluído</span>'
        : '<span style="background-color: #fef2f2; color: #991b1b; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid #fecaca;">⚡ Em Andamento</span>';

      const maoDeObraBadge =
        p.tipoMaoDeObra === 'TKE'
          ? '<span style="background-color: #eff6ff; color: #1e40af; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px;">TKE Direta</span>'
          : `<span style="background-color: #fffbeb; color: #92400e; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px;">Subcontratado (${p.empresaContratada || 'Parceira'})</span>`;

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 250px; max-width: 310px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            <strong style="font-size: 14px; color: #0f172a;">${p.codigoPT}</strong>
            ${statusBadge}
          </div>

          <div style="margin-bottom: 10px; background-color: #f8fafc; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Quem Preencheu a APR:</div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 1px;">👤 ${p.quemPreencheuNome}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">
              ${p.quemPreencheuCargo ? `Função: ${p.quemPreencheuCargo} • ` : ''}${maoDeObraBadge}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
              🕒 <strong>Data/Hora:</strong> ${dataFormatada}
            </div>
          </div>

          <div style="font-size: 12px; color: #334155; margin-bottom: 8px; line-height: 1.4;">
            <div>🏢 <strong>Contrato:</strong> ${p.contratoOrcamento}</div>
            <div>🛗 <strong>Equipamento:</strong> ${p.equipamento}</div>
            ${p.clienteNome ? `<div>📍 <strong>Cliente:</strong> ${p.clienteNome}</div>` : ''}
            <div style="margin-top: 4px; font-size: 11px; color: #64748b;">
              🎯 <strong>GPS:</strong> ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)} ${p.accuracy ? `(±${Math.round(p.accuracy)}m)` : ''}
            </div>
          </div>

          <div style="display: flex; gap: 6px; margin-top: 10px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
            <a href="/api/pt/${p.id}/pdf" target="_blank" style="flex: 1; text-align: center; background-color: #dc2626; color: white; padding: 6px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block;">
              📄 Baixar PDF
            </a>
            <a href="https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}" target="_blank" style="flex: 1; text-align: center; background-color: #0f172a; color: white; padding: 6px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block;">
              🧭 Abrir no Maps
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 320 });
      marker.on('click', () => {
        setSelectedPontoId(p.id);
      });

      marker.addTo(map);
      markersRef.current[p.id] = marker;
      bounds.extend([p.latitude, p.longitude]);
    });

    if (items.length > 0 && map) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  };

  // Centraliza no ponto selecionado da lista lateral
  const handleSelectPonto = (ponto: PontoAcompanhamentoAPR) => {
    setSelectedPontoId(ponto.id);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([ponto.latitude, ponto.longitude], 16, { duration: 1.2 });
      const marker = markersRef.current[ponto.id];
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 600);
      }
    }
  };

  // Reseta visualização para todos os pontos
  const handleResetBounds = () => {
    if (!mapInstanceRef.current || filteredPontos.length === 0) return;
    import('leaflet').then((L) => {
      const bounds = L.latLngBounds(
        filteredPontos.map((p) => [p.latitude, p.longitude])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    });
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho do Módulo */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-red-600 tracking-wider uppercase bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100 flex items-center gap-1.5">
              <span>📍</span> Acompanhamento em Campo
            </span>
            {isAdmin && (
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Visão Geral (Todas as Equipes e Prestadores)
              </span>
            )}
            {isSubcontratado && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                🔒 Visão do Prestador (Suas Localizações)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Acompanhamento de Serviços & APR em Tempo Real
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Localização exata com geolocalização auditada de todas as Permissões de Trabalho (APR) preenchidas, indicando quem realizou o preenchimento no local do elevador.
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Link
            href="/dashboard/reparo/pt"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2"
          >
            <span>📋</span>
            <span>Ver Lista de PTs</span>
          </Link>
          <button
            type="button"
            onClick={handleResetBounds}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition flex items-center gap-2"
            title="Ajustar zoom para abranger todos os serviços"
          >
            <span>🎯</span>
            <span>Enquadrar Todos</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas em Tempo Real */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Serviços Mapeados
            </span>
            <span className="text-base">📍</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats.total}
          </div>
          <span className="text-[11px] text-slate-400">Com GPS validado em campo</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Em Andamento
            </span>
            <span className="text-base">⚡</span>
          </div>
          <div className="text-2xl font-black text-red-600 mt-1">
            {stats.emAndamento}
          </div>
          <span className="text-[11px] text-slate-400">Atividades ativas no momento</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Concluídos
            </span>
            <span className="text-base">✓</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {stats.concluidos}
          </div>
          <span className="text-[11px] text-slate-400">Com término registrado</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Técnicos / Prestadores
            </span>
            <span className="text-base">👤</span>
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {stats.tecnicosUnicos}
          </div>
          <span className="text-[11px] text-slate-400">Identificados nas assinaturas</span>
        </div>
      </div>

      {/* Alerta de Auditoria (se houver PT sem GPS) */}
      {totalSemCoordenadas > 0 && isAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">ℹ️</span>
            <span>
              <strong>Atenção Gestor:</strong> Existem <strong>{totalSemCoordenadas}</strong> permissão(ões) de trabalho preenchidas sem autorização de geolocalização no navegador móvel do técnico.
            </span>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            placeholder="Buscar por técnico, contrato, código ou elevador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <span className="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
        </div>

        {/* Filtros Dropdown & Estilo do Mapa */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">Status: Todos</option>
            <option value="EM_ANDAMENTO">⚡ Em Andamento</option>
            <option value="CONCLUIDO">✓ Concluído</option>
          </select>

          {/* Mão de Obra */}
          <select
            value={filterMaoDeObra}
            onChange={(e) => setFilterMaoDeObra(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">Mão de Obra: Todas</option>
            <option value="TKE">TKE Direta</option>
            <option value="CONTRATADA">Subcontratados</option>
          </select>

          {/* Modo do Mapa (Satélite / Ruas) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMapLayer('STREET')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                mapLayer === 'STREET'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗺️ Ruas
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('SATELLITE')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                mapLayer === 'SATELLITE'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🛰️ Satélite
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: MAPA + LISTA LATERAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Painel Lateral com Lista de Locais */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-xs p-4 flex flex-col h-[650px] overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>📋</span> Locais Mapeados ({filteredPontos.length})
            </h3>
            <span className="text-[11px] text-slate-400">Clique para focar</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 mt-2 pr-1 space-y-1">
            {filteredPontos.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum serviço encontrado com os filtros selecionados.
              </div>
            ) : (
              filteredPontos.map((p) => {
                const isSelected = selectedPontoId === p.id;
                const isConcluido = p.status === 'CONCLUIDO' || p.status === 'FINALIZADA';

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPonto(p)}
                    className={`p-3 rounded-xl cursor-pointer transition border text-xs ${
                      isSelected
                        ? 'bg-red-50/60 border-red-300 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900 text-xs">
                        {p.codigoPT}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isConcluido
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {isConcluido ? '✓ Concluído' : '⚡ Em Andamento'}
                      </span>
                    </div>

                    {/* Quem preencheu em destaque */}
                    <div className="mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Preenchido por:
                      </div>
                      <div className="text-xs font-black text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <span>👤</span>
                        <span>{p.quemPreencheuNome}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {p.quemPreencheuCargo || p.tipoMaoDeObra} • {p.tipoMaoDeObra === 'TKE' ? 'TKE' : p.empresaContratada || 'Subcontratada'}
                      </div>
                    </div>

                    <div className="mt-2 text-slate-600 text-[11px] space-y-0.5">
                      <div>🏢 <strong>Contrato:</strong> {p.contratoOrcamento}</div>
                      <div>🛗 <strong>Equipamento:</strong> {p.equipamento}</div>
                      <div className="text-slate-400 text-[10px] pt-1">
                        🕒 {p.dataHoraPreenchimento ? new Date(p.dataHoraPreenchimento).toLocaleString('pt-BR') : '-'}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400 font-mono text-[10px]">
                        📍 {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                      </span>
                      <span className="font-bold text-red-600 hover:underline">
                        Ver no mapa →
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Container do Mapa Leaflet */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden h-[650px] relative flex flex-col">
          <div
            ref={mapContainerRef}
            className="w-full h-full z-10"
            style={{ background: '#f1f5f9' }}
          />

          {/* Legenda Flutuante no canto do Mapa */}
          <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl p-3 shadow-md text-xs space-y-2 pointer-events-auto">
            <span className="font-bold text-slate-800 text-[11px] block uppercase tracking-wider">
              Legenda do Mapa
            </span>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white shadow-2xs inline-block"></span>
              <span>APR Em Andamento</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-white shadow-2xs inline-block"></span>
              <span>APR Concluída no Local</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
