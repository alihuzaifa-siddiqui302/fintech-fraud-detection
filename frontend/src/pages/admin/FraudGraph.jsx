import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import {
  Network,
  Search,
  RotateCcw,
  AlertTriangle,
  Ban,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Info,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Radar,
  GitFork,
  Radio,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Filter,
} from 'lucide-react';
import { getGraph, addBlacklist } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import CountryFlag from '../../components/CountryFlag';
import clsx from 'clsx';

// Register cola layout plugin with cytoscape once
if (!cytoscape.prototype._colaRegistered) {
  cytoscape.use(cola);
  cytoscape.prototype._colaRegistered = true;
}

// Crisp inline SVGs for high-tech node icons
const USER_ICON_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
const IP_ICON_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
const DEVICE_ICON_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`;

export const FraudGraph = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const containerRef = useRef(null);
  const cyRef = useRef(null);

  // Filter & Query States
  const [seedUserId, setSeedUserId] = useState(searchParams.get('seedUserId') || '');
  const [seedIpAddress, setSeedIpAddress] = useState(searchParams.get('seedIpAddress') || '');
  const [seedFingerprint, setSeedFingerprint] = useState(searchParams.get('seedFingerprint') || '');
  const [depth, setDepth] = useState(1);
  const [maxNodes, setMaxNodes] = useState(80);
  const [dateRangePreset, setDateRangePreset] = useState('7d'); // '24h', '7d', '30d'

  // Visual & Layout Controls
  const [activeLayout, setActiveLayout] = useState('cola'); // 'cola', 'concentric', 'breadthfirst'
  const [canvasFilter, setCanvasFilter] = useState('');
  const [hoveredNode, setHoveredNode] = useState(null);

  // Graph Data & Status
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  // Blacklist Modal State
  const [blacklistModal, setBlacklistModal] = useState({
    isOpen: false,
    targetType: '',
    targetValue: '',
    reason: 'Identified in fraud syndicate network analysis',
  });
  const [submittingBlacklist, setSubmittingBlacklist] = useState(false);

  // Calculate fromDate ISO string based on preset
  const calculateFromDate = useCallback((preset) => {
    const now = new Date();
    if (preset === '24h') {
      now.setDate(now.getDate() - 1);
    } else if (preset === '30d') {
      now.setDate(now.getDate() - 30);
    } else {
      now.setDate(now.getDate() - 7);
    }
    return now.toISOString().split('T')[0];
  }, []);

  // Fetch graph data from backend
  const fetchGraphData = useCallback(async (customParams = {}) => {
    setLoading(true);
    setSelectedNode(null);

    const fromDate = calculateFromDate(customParams.dateRangePreset || dateRangePreset);
    const query = {
      seedUserId: (customParams.seedUserId !== undefined ? customParams.seedUserId : seedUserId) || undefined,
      seedIpAddress: (customParams.seedIpAddress !== undefined ? customParams.seedIpAddress : seedIpAddress) || undefined,
      seedFingerprint: (customParams.seedFingerprint !== undefined ? customParams.seedFingerprint : seedFingerprint) || undefined,
      depth: customParams.depth || depth,
      maxNodes: customParams.maxNodes || maxNodes,
      fromDate: fromDate,
    };

    try {
      const data = await getGraph(query);
      setGraphData(data);
    } catch (err) {
      console.error('Failed to load fraud syndicate graph:', err);
      toast.error('Failed to load syndicate graph data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [seedUserId, seedIpAddress, seedFingerprint, depth, maxNodes, dateRangePreset, calculateFromDate, toast]);

  // Initial load
  useEffect(() => {
    const urlSeedUser = searchParams.get('seedUserId') || '';
    const urlSeedIp = searchParams.get('seedIpAddress') || '';
    const urlSeedFp = searchParams.get('seedFingerprint') || '';

    if (urlSeedUser) setSeedUserId(urlSeedUser);
    if (urlSeedIp) setSeedIpAddress(urlSeedIp);
    if (urlSeedFp) setSeedFingerprint(urlSeedFp);

    fetchGraphData({
      seedUserId: urlSeedUser,
      seedIpAddress: urlSeedIp,
      seedFingerprint: urlSeedFp,
    });
  }, []);

  // Apply layout helper
  const applyLayout = useCallback((layoutName, cyInstance) => {
    const cy = cyInstance || cyRef.current;
    if (!cy) return;

    let layoutConfig = {
      name: 'cola',
      animate: true,
      randomize: false,
      maxSimulationTime: 2500,
      nodeSpacing: 60,
      edgeLengthVal: 140,
      padding: 50,
      fit: true,
    };

    if (layoutName === 'concentric') {
      layoutConfig = {
        name: 'concentric',
        animate: true,
        animationDuration: 800,
        padding: 50,
        fit: true,
        concentric: (node) => {
          if (node.data('type') === 'USER') return 3;
          if (node.data('type') === 'DEVICE') return 2;
          return 1;
        },
        levelWidth: () => 1,
      };
    } else if (layoutName === 'breadthfirst') {
      layoutConfig = {
        name: 'breadthfirst',
        animate: true,
        animationDuration: 800,
        directed: true,
        spacingFactor: 1.3,
        padding: 50,
        fit: true,
      };
    }

    const layout = cy.layout(layoutConfig);
    layout.run();
  }, []);

  // Render / Update Cytoscape Graph
  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    // Transform API elements to Cytoscape format with futuristic styling tokens
    const cyNodes = (graphData.nodes || []).map((node) => {
      let nodeShape = 'ellipse';
      let nodeSize = 46;
      let bgColor = '#64748b';
      let borderColor = node.isBlacklisted ? '#ef4444' : '#1e293b';
      let borderWidth = node.isBlacklisted ? 4 : 2.5;
      let shadowColor = 'transparent';
      let shadowBlur = 0;
      let shadowOpacity = 0;
      let iconSvg = USER_ICON_SVG;

      if (node.type === 'USER') {
        nodeShape = 'ellipse';
        iconSvg = USER_ICON_SVG;
        const txnCount = (node.data && node.data.totalTransactions) || 1;
        nodeSize = Math.min(74, Math.max(46, 46 + txnCount * 2));

        if (node.riskLevel === 'HIGH') {
          bgColor = '#ef4444';
          shadowColor = '#ef4444';
          shadowBlur = 24;
          shadowOpacity = 0.85;
          borderColor = '#b91c1c';
        } else if (node.riskLevel === 'MEDIUM') {
          bgColor = '#f59e0b';
          shadowColor = '#f59e0b';
          shadowBlur = 18;
          shadowOpacity = 0.8;
          borderColor = '#d97706';
        } else if (node.riskLevel === 'LOW') {
          bgColor = '#10b981';
          shadowColor = '#10b981';
          shadowBlur = 14;
          shadowOpacity = 0.7;
          borderColor = '#059669';
        } else {
          bgColor = '#64748b';
        }
      } else if (node.type === 'IP') {
        nodeShape = 'diamond';
        iconSvg = IP_ICON_SVG;
        const txnCount = (node.data && node.data.transactionCount) || 1;
        nodeSize = Math.min(62, Math.max(38, 38 + txnCount * 1.5));
        bgColor = '#0284c7'; // Electric cyan / sky

        if (node.data && (node.data.isVpn || node.data.isTor)) {
          borderColor = '#ef4444';
          borderWidth = 3.5;
          shadowColor = '#ef4444';
          shadowBlur = 20;
          shadowOpacity = 0.85;
        } else {
          shadowColor = '#0ea5e9';
          shadowBlur = 12;
          shadowOpacity = 0.65;
        }
      } else if (node.type === 'DEVICE') {
        nodeShape = 'round-rectangle';
        iconSvg = DEVICE_ICON_SVG;
        const sharedCount = (node.data && node.data.sharedAcrossAccounts) || 1;
        nodeSize = Math.min(66, Math.max(40, 40 + sharedCount * 6));

        if (sharedCount > 2) {
          bgColor = '#ef4444';
          shadowColor = '#ef4444';
          shadowBlur = 25;
          shadowOpacity = 0.9;
          borderColor = '#fee2e2';
        } else if (sharedCount > 1) {
          bgColor = '#f97316';
          shadowColor = '#f97316';
          shadowBlur = 20;
          shadowOpacity = 0.85;
          borderColor = '#ffedd5';
        } else {
          bgColor = '#8b5cf6'; // Vivid violet
          shadowColor = '#8b5cf6';
          shadowBlur = 14;
          shadowOpacity = 0.7;
          borderColor = '#c4b5fd';
        }
      }

      return {
        group: 'nodes',
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          riskLevel: node.riskLevel,
          isBlacklisted: node.isBlacklisted,
          details: node.data || {},
          rawNode: node,
          bgColor,
          borderColor,
          borderWidth,
          nodeShape,
          nodeSize,
          shadowColor,
          shadowBlur,
          shadowOpacity,
          iconSvg,
        },
      };
    });

    const cyEdges = (graphData.edges || []).map((edge) => {
      let lineColor = '#475569';
      let lineStyle = 'solid';
      let lineWidth = 2;
      let targetArrow = 'triangle';
      let arrowColor = '#475569';
      let edgeGlowColor = 'transparent';
      let edgeGlowBlur = 0;

      if (edge.type === 'SUBMITTED') {
        lineColor = '#475569';
        lineWidth = 2;
        targetArrow = 'triangle';
        arrowColor = '#64748b';
      } else if (edge.type === 'USED_DEVICE') {
        lineColor = '#8b5cf6';
        lineWidth = 2.5;
        targetArrow = 'triangle';
        arrowColor = '#a78bfa';
        edgeGlowColor = '#8b5cf6';
        edgeGlowBlur = 8;
      } else if (edge.type === 'SHARED_IP') {
        lineColor = '#06b6d4';
        lineStyle = 'dashed';
        lineWidth = Math.min(6, Math.max(2.5, edge.weight * 1.3));
        targetArrow = 'none';
        edgeGlowColor = '#06b6d4';
        edgeGlowBlur = 10;
      } else if (edge.type === 'SHARED_DEVICE') {
        lineColor = '#ef4444';
        lineWidth = 5.5; // High danger pulse
        targetArrow = 'none';
        edgeGlowColor = '#ef4444';
        edgeGlowBlur = 18;
      }

      return {
        group: 'edges',
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label || '',
          type: edge.type,
          lineColor,
          lineStyle,
          lineWidth,
          targetArrow,
          arrowColor,
          edgeGlowColor,
          edgeGlowBlur,
          rawEdge: edge,
        },
      };
    });

    // Destroy existing instance before creating new one
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      boxSelectionEnabled: true,
      autounselectify: false,
      style: [
        {
          selector: 'node',
          style: {
            shape: 'data(nodeShape)',
            width: 'data(nodeSize)',
            height: 'data(nodeSize)',
            'background-color': 'data(bgColor)',
            'border-color': 'data(borderColor)',
            'border-width': 'data(borderWidth)',
            'background-image': 'data(iconSvg)',
            'background-fit': 'none',
            'background-width': '46%',
            'background-height': '46%',
            'background-position-x': '50%',
            'background-position-y': '50%',
            'background-repeat': 'no-repeat',
            'shadow-blur': 'data(shadowBlur)',
            'shadow-color': 'data(shadowColor)',
            'shadow-opacity': 'data(shadowOpacity)',
            label: 'data(label)',
            'text-valign': 'bottom',
            'text-margin-y': 8,
            color: '#f8fafc',
            'font-size': '11px',
            'font-family': 'ui-sans-serif, system-ui, sans-serif',
            'font-weight': 600,
            'text-background-opacity': 0.9,
            'text-background-color': '#090d16',
            'text-background-padding': '4px 6px',
            'text-background-shape': 'roundrectangle',
            'text-border-color': '#1e293b',
            'text-border-width': '1px',
            'text-border-opacity': 0.8,
            'transition-property': 'background-color, border-color, width, height, opacity, shadow-blur, shadow-opacity',
            'transition-duration': '0.22s',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#38bdf8',
            'border-width': 4.5,
            'shadow-blur': 25,
            'shadow-color': '#38bdf8',
            'shadow-opacity': 0.95,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 'data(lineWidth)',
            'line-color': 'data(lineColor)',
            'line-style': 'data(lineStyle)',
            'target-arrow-shape': 'data(targetArrow)',
            'target-arrow-color': 'data(arrowColor)',
            'shadow-blur': 'data(edgeGlowBlur)',
            'shadow-color': 'data(edgeGlowColor)',
            'shadow-opacity': 0.8,
            'curve-style': 'bezier',
            opacity: 0.85,
            label: 'data(label)',
            'font-size': '9.5px',
            'font-weight': 500,
            color: '#94a3b8',
            'text-rotation': 'autorotate',
            'text-background-opacity': 0.88,
            'text-background-color': '#020617',
            'text-background-padding': '3px 5px',
            'text-background-shape': 'roundrectangle',
            'transition-property': 'opacity, line-color, width',
            'transition-duration': '0.22s',
          },
        },
        // Dimmed state for dynamic hover spotlighting
        {
          selector: '.dimmed',
          style: {
            opacity: 0.15,
            'shadow-opacity': 0,
          },
        },
        // Spotlight state for hovered entity & direct neighborhood
        {
          selector: '.highlighted',
          style: {
            opacity: 1,
            'z-index': 999,
          },
        },
      ],
    });

    // Apply layout
    applyLayout(activeLayout, cy);

    // Interactive Hover Spotlight
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      setHoveredNode(node.data('rawNode'));
      cy.elements().addClass('dimmed');
      node.removeClass('dimmed').addClass('highlighted');
      node.neighborhood().removeClass('dimmed').addClass('highlighted');
    });

    cy.on('mouseout', 'node', () => {
      setHoveredNode(null);
      cy.elements().removeClass('dimmed').removeClass('highlighted');
    });

    // Node selection handler
    cy.on('tap', 'node', (evt) => {
      const nodeData = evt.target.data('rawNode');
      setSelectedNode(nodeData);
    });

    // Double-tap on USER node: expand graph with depth=2
    cy.on('dbltap', 'node[type = "USER"]', (evt) => {
      const rawId = evt.target.data('id') || '';
      const cleanUserId = rawId.replace(/^user_/, '');
      const userLabel = evt.target.data('label') || cleanUserId;
      setSeedUserId(cleanUserId);
      setDepth(2);
      toast.info(`Expanding network graph for ${userLabel} (2 hops)...`);
      fetchGraphData({ seedUserId: cleanUserId, depth: 2 });
    });

    // Unselect node when canvas background clicked
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [graphData, applyLayout]);

  // Handle Search Submission
  const handleBuildGraph = (e) => {
    if (e) e.preventDefault();
    const newParams = {};
    if (seedUserId) newParams.seedUserId = seedUserId;
    if (seedIpAddress) newParams.seedIpAddress = seedIpAddress;
    if (seedFingerprint) newParams.seedFingerprint = seedFingerprint;
    setSearchParams(newParams);

    fetchGraphData();
  };

  // Reset Filters
  const handleReset = () => {
    setSeedUserId('');
    setSeedIpAddress('');
    setSeedFingerprint('');
    setDepth(1);
    setMaxNodes(80);
    setDateRangePreset('7d');
    setSearchParams({});
    fetchGraphData({
      seedUserId: '',
      seedIpAddress: '',
      seedFingerprint: '',
      depth: 1,
      maxNodes: 80,
      dateRangePreset: '7d',
    });
  };

  // Zoom Controls
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.25);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(null, 45);
    }
  };

  // Switch layout on the fly
  const handleLayoutChange = (newLayout) => {
    setActiveLayout(newLayout);
    applyLayout(newLayout);
  };

  // Focus high risk node action
  const handleFocusHighRisk = () => {
    if (!cyRef.current) return;
    const highRiskNodes = cyRef.current.nodes('[riskLevel = "HIGH"]');
    if (highRiskNodes.length > 0) {
      cyRef.current.animate({
        center: { eles: highRiskNodes },
        zoom: 1.6,
        duration: 800,
      });
      setSelectedNode(highRiskNodes.first().data('rawNode'));
      toast.info(`Focused on high-risk entity: ${highRiskNodes.first().data('label')}`);
    } else {
      // Fallback: focus on first user node
      const userNodes = cyRef.current.nodes('[type = "USER"]');
      if (userNodes.length > 0) {
        cyRef.current.animate({
          center: { eles: userNodes },
          zoom: 1.4,
          duration: 800,
        });
        setSelectedNode(userNodes.first().data('rawNode'));
      }
    }
  };

  // Quick Find Node by text on canvas
  const handleCanvasSearch = (query) => {
    setCanvasFilter(query);
    if (!cyRef.current) return;
    if (!query || query.trim() === '') {
      cyRef.current.elements().removeClass('dimmed').removeClass('highlighted');
      return;
    }
    const q = query.toLowerCase().trim();
    const matched = cyRef.current.nodes().filter((node) => {
      const label = (node.data('label') || '').toLowerCase();
      const id = (node.data('id') || '').toLowerCase();
      return label.includes(q) || id.includes(q);
    });

    if (matched.length > 0) {
      cyRef.current.elements().addClass('dimmed');
      matched.removeClass('dimmed').addClass('highlighted');
      matched.neighborhood().removeClass('dimmed').addClass('highlighted');
      cyRef.current.animate({
        center: { eles: matched },
        zoom: 1.5,
        duration: 500,
      });
      setSelectedNode(matched.first().data('rawNode'));
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Blacklist modal trigger
  const openBlacklistModal = (targetType, targetValue) => {
    setBlacklistModal({
      isOpen: true,
      targetType,
      targetValue,
      reason: `Identified in fraud syndicate network analysis for ${targetType}: ${targetValue}`,
    });
  };

  const handleConfirmBlacklist = async () => {
    if (!blacklistModal.targetValue || !blacklistModal.reason) return;
    setSubmittingBlacklist(true);
    try {
      await addBlacklist(blacklistModal.targetType, blacklistModal.targetValue, blacklistModal.reason);
      toast.success(`${blacklistModal.targetType} added to blacklist.`);

      if (selectedNode) {
        setSelectedNode({ ...selectedNode, isBlacklisted: true });
      }
      if (cyRef.current && selectedNode) {
        const cyNode = cyRef.current.getElementById(selectedNode.id);
        if (cyNode) {
          cyNode.data('borderColor', '#ef4444');
          cyNode.data('borderWidth', 4);
          cyNode.data('isBlacklisted', true);
        }
      }
      setBlacklistModal({ isOpen: false, targetType: '', targetValue: '', reason: '' });
    } catch (err) {
      toast.error('Failed to blacklist item: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingBlacklist(false);
    }
  };

  const stats = graphData?.stats || {
    totalNodes: 0,
    totalEdges: 0,
    userNodes: 0,
    ipNodes: 0,
    deviceNodes: 0,
    blacklistedNodes: 0,
    highRiskNodes: 0,
    sharedDeviceConnections: 0,
    sharedIpConnections: 0,
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-2rem)] p-4 md:p-6 overflow-hidden">
      {/* HEADER & CONTROLS BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-4 backdrop-blur-md shadow-2xl flex-shrink-0 relative overflow-hidden">
        {/* Subtle cyber background line accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-80" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-brand-400 shadow-inner">
              <Network className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-400 ring-2 ring-slate-900 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Fraud Syndicate Link Graph
                </h1>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/30 font-bold tracking-wider">
                  Live SOC Topology
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-actor link analysis correlating shared device fingerprints, IP proxy clusters, and synthetic identities.
              </p>
            </div>
          </div>

          {/* Stats Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5 font-medium shadow-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="font-bold text-white">{stats.totalNodes}</span> nodes
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5 font-medium shadow-sm">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="font-bold text-white">{stats.totalEdges}</span> links
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 flex items-center gap-1.5 font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>{stats.highRiskNodes} high risk</span>
            </div>
            {stats.sharedDeviceConnections > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/50 text-purple-300 flex items-center gap-1.5 font-bold shadow-lg shadow-purple-900/20 animate-pulse">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span>{stats.sharedDeviceConnections} shared devices</span>
              </div>
            )}
            {stats.blacklistedNodes > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center gap-1.5 font-semibold">
                <Ban className="w-3.5 h-3.5 text-rose-400" />
                <span>{stats.blacklistedNodes} blacklisted</span>
              </div>
            )}
          </div>
        </div>

        {/* INPUTS & FILTERS ROW */}
        <form onSubmit={handleBuildGraph} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2.5 border-t border-slate-800/80 text-xs">
          {/* Seed User ID */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Seed User ID / UUID</label>
            <input
              type="text"
              placeholder="e.g. user_104"
              value={seedUserId}
              onChange={(e) => setSeedUserId(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Seed IP Address */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Seed IP Address</label>
            <input
              type="text"
              placeholder="e.g. 185.220.101.45"
              value={seedIpAddress}
              onChange={(e) => setSeedIpAddress(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Seed Fingerprint */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Seed Device Fingerprint</label>
            <input
              type="text"
              placeholder="e.g. a6029fd..."
              value={seedFingerprint}
              onChange={(e) => setSeedFingerprint(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Date Range Presets */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Time Horizon</label>
            <div className="flex rounded-lg bg-slate-950/90 p-0.5 border border-slate-700/70">
              {['24h', '7d', '30d'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDateRangePreset(preset)}
                  className={clsx(
                    'flex-1 py-1 rounded-md text-[11px] font-semibold transition-all duration-150',
                    dateRangePreset === preset
                      ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {preset === '24h' ? '24h' : preset === '7d' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>

          {/* Max Nodes Slider */}
          <div className="lg:col-span-2">
            <div className="flex justify-between text-[11px] font-medium text-slate-400 mb-1">
              <span>Max Graph Nodes</span>
              <span className="text-brand-400 font-mono font-bold">{maxNodes}</span>
            </div>
            <input
              type="range"
              min="20"
              max="150"
              step="10"
              value={maxNodes}
              onChange={(e) => setMaxNodes(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-brand-500 mt-1"
            />
          </div>

          {/* Action Buttons */}
          <div className="lg:col-span-2 flex items-end gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md shadow-brand-500/20 active:scale-95"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Build Graph</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              title="Reset Filters"
              className="p-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* MAIN CONTENT AREA: GRAPH (70%) + DETAIL PANEL (30%) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* GRAPH CANVAS WRAPPER */}
        <div className="flex-1 relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:24px_24px]">
          {/* Subtle cyber scanlines overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/60 pointer-events-none z-0" />

          {/* FLOATING TOP CANVAS TOOLBAR: ZOOM, LAYOUTS & QUICK FIND */}
          <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Left Tools: Zoom, Center & Focus */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 backdrop-blur-md shadow-xl pointer-events-auto">
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-800 mx-0.5" />
              <button
                onClick={handleFit}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Fit to Screen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-800 mx-0.5" />
              <button
                onClick={handleFocusHighRisk}
                className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Fly camera to high-risk actors"
              >
                <Crosshair className="w-3.5 h-3.5 text-red-400" />
                <span>Focus Risk</span>
              </button>
            </div>

            {/* Center Tools: High-Tech Layout Switcher */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 backdrop-blur-md shadow-xl pointer-events-auto">
              <button
                onClick={() => handleLayoutChange('cola')}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all',
                  activeLayout === 'cola'
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )}
                title="Force-directed physics simulation"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Physics</span>
              </button>
              <button
                onClick={() => handleLayoutChange('concentric')}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all',
                  activeLayout === 'concentric'
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )}
                title="Concentric radar rings"
              >
                <Radar className="w-3.5 h-3.5" />
                <span>Radar</span>
              </button>
              <button
                onClick={() => handleLayoutChange('breadthfirst')}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all',
                  activeLayout === 'breadthfirst'
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )}
                title="Hierarchical attack tree"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Tree</span>
              </button>
            </div>

            {/* Right Tools: Canvas Filter / Quick Search */}
            <div className="relative pointer-events-auto hidden sm:block">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Find node on canvas..."
                value={canvasFilter}
                onChange={(e) => handleCanvasSearch(e.target.value)}
                className="bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 w-44 backdrop-blur-md shadow-xl"
              />
            </div>
          </div>

          {/* Cytoscape Canvas Container */}
          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing relative z-0" />

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20">
              <div className="relative mb-4">
                <Loader2 className="w-12 h-12 text-brand-400 animate-spin" />
                <div className="absolute inset-0 rounded-full border-2 border-brand-500/40 animate-ping" />
              </div>
              <p className="text-sm font-bold text-white tracking-wide">Synthesizing Fraud Link Graph...</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">Running topological correlation across devices, IPs & accounts</p>
            </div>
          )}

          {/* Empty State Overlay */}
          {!loading && graphData && (!graphData.nodes || graphData.nodes.length === 0) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
              <div className="p-4 rounded-full bg-slate-900 border border-slate-800 mb-3 text-slate-500 shadow-xl">
                <Network className="w-10 h-10 opacity-30" />
              </div>
              <h3 className="text-base font-bold text-slate-200 mb-1">No Correlated Links Found</h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                No connected entities matched the seed parameters. Try expanding the time horizon to 30 days or removing seed restrictions.
              </p>
            </div>
          )}

          {/* Graph Legend Floating Card */}
          <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 backdrop-blur-md shadow-2xl text-[11px] space-y-2 select-none">
            <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
              SOC Topology Legend
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                <span>High Risk User</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <span>Medium Risk User</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <span>Low Risk User</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 bg-sky-500 rotate-45 transform shadow-sm shadow-sky-500/50" />
                <span>IP Address</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3 h-2 rounded bg-purple-500 shadow-sm shadow-purple-500/50" />
                <span>Device Fingerprint</span>
              </div>
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <span className="w-4 h-1 bg-red-500 rounded shadow-sm shadow-red-500/80 animate-pulse" />
                <span>Shared Device (Ring!)</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: FORENSIC DOSSIER & ENTITY INSPECTOR (30%) */}
        <div className="w-full lg:w-96 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between overflow-y-auto shadow-2xl flex-shrink-0">
          {!selectedNode ? (
            /* DEFAULT EMPTY INSPECTION STATE */
            <div className="h-full flex flex-col justify-center items-center text-center p-4 text-slate-400">
              <div className="relative mb-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-brand-400 shadow-xl">
                  <Eye className="w-8 h-8" />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-brand-500 text-slate-950">
                  <Sparkles className="w-3 h-3" />
                </div>
              </div>
              <h3 className="text-base font-bold text-white mb-1">Forensic Entity Dossier</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-5 leading-relaxed">
                Click any node on the graph to inspect device hashes, threat intelligence flags, and multi-accounting confederates.
              </p>
              <div className="w-full p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-left text-xs space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider block">
                  Interactive Features
                </span>
                <p className="text-slate-300 leading-relaxed">
                  • <strong>Hover</strong> any entity to spotlight its direct network neighborhood and dim background noise.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  • <strong>Double-click</strong> a User node to dynamically query and append its 2-hop connection web.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  • Use the <strong>Radar / Tree</strong> layout buttons above to reveal topological hierarchy.
                </p>
              </div>
            </div>
          ) : (
            /* SELECTED ENTITY DETAIL VIEW */
            <div className="space-y-4">
              {/* Type Badge & Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase',
                      selectedNode.type === 'USER'
                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                        : selectedNode.type === 'IP'
                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                        : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                    )}
                  >
                    {selectedNode.type} Entity
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Dossier</span>
                </div>

                {selectedNode.isBlacklisted && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 animate-pulse">
                    <Ban className="w-3 h-3" />
                    Blacklisted
                  </span>
                )}
              </div>

              {/* USER ENTITY INSPECTOR */}
              {selectedNode.type === 'USER' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/30 to-purple-600/30 border border-brand-500/40 flex items-center justify-center text-white font-bold text-base select-none shadow-md">
                      {selectedNode.data?.name
                        ? selectedNode.data.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()
                        : 'US'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-white truncate">{selectedNode.data?.name || 'Customer Account'}</h3>
                      <p className="text-xs text-slate-400 truncate">{selectedNode.data?.email || selectedNode.id}</p>
                    </div>
                  </div>

                  {/* Risk Score Dial & Threat Classification */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Threat Classification</span>
                      <span
                        className={clsx(
                          'text-sm font-bold mt-0.5 inline-block',
                          selectedNode.riskLevel === 'HIGH'
                            ? 'text-red-400'
                            : selectedNode.riskLevel === 'MEDIUM'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        )}
                      >
                        {selectedNode.riskLevel} RISK ACTOR
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Avg Risk Score</span>
                      <span className="text-lg font-mono font-bold text-white">
                        {selectedNode.data?.avgRiskScore !== undefined ? Math.round(selectedNode.data.avgRiskScore) : 0}
                        <span className="text-xs text-slate-500 font-normal">/100</span>
                      </span>
                    </div>
                  </div>

                  {/* Account Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Account Age</span>
                      <span className="font-semibold text-slate-200 mt-0.5 inline-block">
                        {selectedNode.data?.accountAgeDays !== undefined
                          ? `${selectedNode.data.accountAgeDays} days`
                          : 'New'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Total Payments</span>
                      <span className="font-semibold text-slate-200 mt-0.5 inline-block">
                        {selectedNode.data?.totalTransactions || 0} checkouts
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => {
                        const searchTerm = selectedNode.data?.email || selectedNode.id.replace(/^user_/, '');
                        navigate(`/admin?search=${encodeURIComponent(searchTerm)}`);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View User Transactions</span>
                    </button>

                    {selectedNode.data?.email && (
                      <button
                        onClick={() => openBlacklistModal('EMAIL', selectedNode.data.email)}
                        className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Blacklist User Email</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* IP ENTITY INSPECTOR */}
              {selectedNode.type === 'IP' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">IP Address & Gateway</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-sky-400">{selectedNode.label}</span>
                      <button
                        onClick={() => handleCopy(selectedNode.label)}
                        className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                        title="Copy IP"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Geolocation</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <CountryFlag countryCode={selectedNode.data?.country} />
                        <span className="font-medium text-slate-200 truncate">{selectedNode.data?.country || 'Unknown'}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Transaction Volume</span>
                      <span className="font-semibold text-slate-200 mt-0.5 inline-block">
                        {selectedNode.data?.transactionCount || 1} hits
                      </span>
                    </div>
                  </div>

                  {/* Anonymizer Threat Badges */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                    <span className="text-[11px] font-semibold text-slate-400 block">Threat Intelligence Telemetry</span>
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold',
                          selectedNode.data?.isVpn
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-slate-800/80 text-slate-400'
                        )}
                      >
                        VPN: {selectedNode.data?.isVpn ? 'DETECTED' : 'CLEAR'}
                      </span>
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-md font-mono text-[11px] font-bold',
                          selectedNode.data?.isTor
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                            : 'bg-slate-800/80 text-slate-400'
                        )}
                      >
                        TOR: {selectedNode.data?.isTor ? 'EXIT NODE' : 'CLEAR'}
                      </span>
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-md font-mono text-[11px]',
                          selectedNode.data?.isProxy
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-slate-800/80 text-slate-400'
                        )}
                      >
                        PROXY: {selectedNode.data?.isProxy ? 'ACTIVE' : 'NO'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => navigate(`/admin?search=${encodeURIComponent(selectedNode.label)}`)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View IP Transactions</span>
                    </button>

                    <button
                      onClick={() => openBlacklistModal('IP', selectedNode.label)}
                      className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Blacklist IP Address</span>
                    </button>
                  </div>
                </div>
              )}

              {/* DEVICE ENTITY INSPECTOR */}
              {selectedNode.type === 'DEVICE' && (
                <div className="space-y-4">
                  {/* Fraud Ring Alert if Shared > 1 */}
                  {(selectedNode.data?.sharedAcrossAccounts || 1) > 1 && (
                    <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 space-y-1 shadow-lg shadow-red-950/40 animate-pulse">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-red-300">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span>COORDINATED FRAUD RING DETECTED</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-red-200/90">
                        This physical hardware hash is shared across{' '}
                        <strong className="text-white underline">{selectedNode.data?.sharedAcrossAccounts} distinct accounts</strong>. Definitive signature of identity farming or credential-stuffing botnets.
                      </p>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Hardware Fingerprint Hash</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-purple-300 break-all">
                        {selectedNode.id.replace('dev_', '').replace('device_', '')}
                      </span>
                      <button
                        onClick={() => handleCopy(selectedNode.id.replace('dev_', '').replace('device_', ''))}
                        className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex-shrink-0 ml-2"
                        title="Copy Fingerprint"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Connected Accounts</span>
                      <span
                        className={clsx(
                          'font-bold text-sm mt-0.5 inline-block',
                          (selectedNode.data?.sharedAcrossAccounts || 1) > 1 ? 'text-red-400' : 'text-slate-200'
                        )}
                      >
                        {selectedNode.data?.sharedAcrossAccounts || 1} accounts
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Total Hits</span>
                      <span className="font-semibold text-slate-200 mt-0.5 inline-block">
                        {selectedNode.data?.transactionCount || 1} txns
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => navigate(`/admin?search=${encodeURIComponent(selectedNode.id.replace('dev_', '').replace('device_', ''))}`)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Device Transactions</span>
                    </button>

                    <button
                      onClick={() => openBlacklistModal('FINGERPRINT', selectedNode.id.replace('dev_', '').replace('device_', ''))}
                      className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Blacklist Device Fingerprint</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QUICK BLACKLIST MODAL */}
      {blacklistModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Blacklist {blacklistModal.targetType}</h3>
                <p className="text-xs text-slate-400 font-mono break-all">{blacklistModal.targetValue}</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-slate-300 font-semibold">Forensic Justification / Enforcement Reason</label>
              <textarea
                rows={3}
                value={blacklistModal.reason}
                onChange={(e) => setBlacklistModal({ ...blacklistModal, reason: e.target.value })}
                placeholder="Specify forensic justification for blacklist enforcement..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlacklistModal({ isOpen: false, targetType: '', targetValue: '', reason: '' })}
                disabled={submittingBlacklist}
                className="py-1.5 px-3.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlacklist}
                disabled={submittingBlacklist || !blacklistModal.reason}
                className="py-1.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {submittingBlacklist ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                <span>Confirm Blacklist</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FraudGraph;
