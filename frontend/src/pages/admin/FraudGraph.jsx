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
      // Default 7 days
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

  // Initial load or when query params change
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
  }, []); // Run on mount

  // Render / Update Cytoscape Graph
  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    // Transform API elements to Cytoscape format
    const cyNodes = (graphData.nodes || []).map((node) => {
      let nodeShape = 'ellipse';
      let nodeSize = 42;
      let bgColor = '#64748b';
      let borderColor = node.isBlacklisted ? '#ef4444' : '#1e293b';
      let borderWidth = node.isBlacklisted ? 4 : 2;

      if (node.type === 'USER') {
        nodeShape = 'ellipse';
        const txnCount = (node.data && node.data.totalTransactions) || 1;
        nodeSize = Math.min(68, Math.max(38, 38 + txnCount * 2));
        if (node.riskLevel === 'HIGH') bgColor = '#ef4444';
        else if (node.riskLevel === 'MEDIUM') bgColor = '#f59e0b';
        else if (node.riskLevel === 'LOW') bgColor = '#10b981';
        else bgColor = '#64748b';
      } else if (node.type === 'IP') {
        nodeShape = 'diamond';
        const txnCount = (node.data && node.data.transactionCount) || 1;
        nodeSize = Math.min(60, Math.max(34, 34 + txnCount * 1.5));
        bgColor = '#38bdf8';
        if (node.data && (node.data.isVpn || node.data.isTor)) {
          borderColor = '#ef4444';
          borderWidth = 3;
        }
      } else if (node.type === 'DEVICE') {
        nodeShape = 'round-rectangle';
        const sharedCount = (node.data && node.data.sharedAcrossAccounts) || 1;
        nodeSize = Math.min(64, Math.max(36, 36 + sharedCount * 6));
        bgColor = sharedCount > 2 ? '#ef4444' : sharedCount > 1 ? '#f97316' : '#a855f7';
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
        },
      };
    });

    const cyEdges = (graphData.edges || []).map((edge) => {
      let lineColor = '#64748b';
      let lineStyle = 'solid';
      let lineWidth = 2;
      let targetArrow = 'triangle';
      let arrowColor = '#64748b';

      if (edge.type === 'SUBMITTED') {
        lineColor = '#64748b';
        lineWidth = 2;
        targetArrow = 'triangle';
        arrowColor = '#64748b';
      } else if (edge.type === 'USED_DEVICE') {
        lineColor = '#c084fc';
        lineWidth = 2.5;
        targetArrow = 'triangle';
        arrowColor = '#c084fc';
      } else if (edge.type === 'SHARED_IP') {
        lineColor = '#38bdf8';
        lineStyle = 'dashed';
        lineWidth = Math.min(6, Math.max(2.5, edge.weight * 1.2));
        targetArrow = 'none';
      } else if (edge.type === 'SHARED_DEVICE') {
        lineColor = '#ef4444';
        lineWidth = 5; // Extra thick dangerous connection
        targetArrow = 'none';
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
            label: 'data(label)',
            'text-valign': 'bottom',
            'text-margin-y': 7,
            color: '#e2e8f0',
            'font-size': '11px',
            'font-family': 'ui-sans-serif, system-ui, sans-serif',
            'font-weight': 600,
            'text-background-opacity': 0.85,
            'text-background-color': '#0f172a',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': '0.2s',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#38bdf8',
            'border-width': 4,
            'shadow-blur': 15,
            'shadow-color': '#38bdf8',
            'shadow-opacity': 0.8,
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
            'curve-style': 'bezier',
            opacity: 0.85,
            label: 'data(label)',
            'font-size': '9px',
            color: '#94a3b8',
            'text-rotation': 'autorotate',
            'text-background-opacity': 0.8,
            'text-background-color': '#020617',
            'text-background-padding': '2px',
          },
        },
        {
          selector: 'edge[type = "SHARED_DEVICE"]',
          style: {
            opacity: 1,
            'line-color': '#ef4444',
            width: 5.5,
            'shadow-blur': 10,
            'shadow-color': '#ef4444',
            'shadow-opacity': 0.8,
          },
        },
      ],
      layout: {
        name: 'cola',
        animate: true,
        randomize: false,
        maxSimulationTime: 2500,
        nodeSpacing: 55,
        edgeLengthVal: 130,
        padding: 40,
        fit: true,
      },
    });

    // Node selection handler
    cy.on('tap', 'node', (evt) => {
      const nodeData = evt.target.data('rawNode');
      setSelectedNode(nodeData);
    });

    // Double-tap on USER node: expand graph with depth=2
    cy.on('dbltap', 'node[type = "USER"]', (evt) => {
      const uId = evt.target.data('id');
      setSeedUserId(uId);
      setDepth(2);
      toast.info(`Expanding network graph for user ${uId} (2 hops)...`);
      fetchGraphData({ seedUserId: uId, depth: 2 });
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
  }, [graphData]);

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
      cyRef.current.fit(null, 40);
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

      // Update node in graph state to show red border
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-4 backdrop-blur-sm shadow-xl flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Fraud Syndicate Link Graph
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold tracking-normal">
                  Interactive Network
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Visualizing correlated fraud rings across shared device fingerprints, IP addresses, and customer accounts.
              </p>
            </div>
          </div>

          {/* Stats Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="font-semibold">{stats.totalNodes}</span> nodes
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="font-semibold">{stats.totalEdges}</span> edges
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-semibold">{stats.highRiskNodes}</span> high risk
            </div>
            {stats.sharedDeviceConnections > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-300 flex items-center gap-1.5 font-medium animate-pulse">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span>{stats.sharedDeviceConnections} shared devices</span>
              </div>
            )}
            {stats.blacklistedNodes > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-rose-400" />
                <span>{stats.blacklistedNodes} blacklisted</span>
              </div>
            )}
          </div>
        </div>

        {/* INPUTS & FILTERS ROW */}
        <form onSubmit={handleBuildGraph} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-800/80 text-xs">
          {/* Seed User ID */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Seed User ID</label>
            <input
              type="text"
              placeholder="e.g. user_104"
              value={seedUserId}
              onChange={(e) => setSeedUserId(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Seed IP Address */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Seed IP Address</label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.1"
              value={seedIpAddress}
              onChange={(e) => setSeedIpAddress(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Seed Fingerprint */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Seed Device Fingerprint</label>
            <input
              type="text"
              placeholder="e.g. 3a7f8e91..."
              value={seedFingerprint}
              onChange={(e) => setSeedFingerprint(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Date Range Presets */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Time Horizon</label>
            <div className="flex rounded-lg bg-slate-950/80 p-0.5 border border-slate-700/70">
              {['24h', '7d', '30d'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDateRangePreset(preset)}
                  className={clsx(
                    'flex-1 py-1 rounded-md text-[11px] font-medium transition-colors',
                    dateRangePreset === preset
                      ? 'bg-brand-500 text-white shadow-sm'
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
              <span>Max Nodes</span>
              <span className="text-slate-200 font-mono">{maxNodes}</span>
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
              className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Build Graph</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              title="Reset Filters"
              className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* MAIN CONTENT AREA: GRAPH (70%) + DETAIL PANEL (30%) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* GRAPH CANVAS WRAPPER */}
        <div className="flex-1 relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          {/* Zoom & Fit Floating Toolbar */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl p-1 backdrop-blur-md shadow-lg">
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
          </div>

          {/* Cytoscape Canvas Container */}
          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-200">Building syndicate link graph...</p>
              <p className="text-xs text-slate-400 mt-1">Traversing customer identities, IP subnets, and hardware fingerprints</p>
            </div>
          )}

          {/* Empty State Overlay */}
          {!loading && graphData && (!graphData.nodes || graphData.nodes.length === 0) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
              <div className="p-4 rounded-full bg-slate-800/80 border border-slate-700/60 mb-3 text-slate-400">
                <Network className="w-8 h-8 opacity-40" />
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-1">No Connections Discovered</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                No connected entities matched the selected parameters. Try expanding the time horizon to 30 days or removing specific seed constraints.
              </p>
            </div>
          )}

          {/* Graph Legend Floating Card */}
          <div className="absolute bottom-4 left-4 z-10 bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 backdrop-blur-md shadow-xl text-[11px] space-y-1.5 pointer-events-none select-none">
            <span className="font-semibold text-slate-300 uppercase tracking-wider block text-[10px] mb-1">Graph Legend</span>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>High Risk User</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Medium Risk User</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Low Risk User</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 bg-blue-400 rotate-45 transform" />
              <span>IP Address</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-2 rounded bg-purple-400" />
              <span>Device Fingerprint</span>
            </div>
            <div className="flex items-center gap-2 text-red-400 font-semibold pt-1 border-t border-slate-800">
              <span className="w-4 h-1 bg-red-500 rounded" />
              <span>Shared Device (Fraud Ring!)</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <span className="w-4 border-b border-dashed border-blue-400" />
              <span>Shared IP Subnet</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: NODE INSPECTION & DETAILS (30%) */}
        <div className="w-full lg:w-96 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between overflow-y-auto shadow-2xl flex-shrink-0">
          {!selectedNode ? (
            /* DEFAULT EMPTY INSPECTION STATE */
            <div className="h-full flex flex-col justify-center items-center text-center p-4 text-slate-400">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 mb-3 text-slate-500">
                <Info className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Entity Inspector</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-4">
                Click any node on the graph to inspect forensic telemetry, risk score breakdown, and shared actor links.
              </p>
              <div className="w-full p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left text-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Pro-Tips</span>
                <p className="text-slate-300">
                  • <strong>Double-click</strong> any User node to dynamically expand its 2-hop connection web.
                </p>
                <p className="text-slate-300">
                  • Thick red edges signify <strong>Shared Devices</strong>—the most definitive indicator of multi-accounting syndicates.
                </p>
              </div>
            </div>
          ) : (
            /* SELECTED ENTITY DETAIL VIEW */
            <div className="space-y-4">
              {/* Type Badge & Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span
                  className={clsx(
                    'px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase',
                    selectedNode.type === 'USER'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                      : selectedNode.type === 'IP'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                  )}
                >
                  {selectedNode.type} Entity
                </span>

                {selectedNode.isBlacklisted && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1">
                    <Ban className="w-3 h-3" />
                    Blacklisted
                  </span>
                )}
              </div>

              {/* USER ENTITY INSPECTOR */}
              {selectedNode.type === 'USER' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-white font-bold text-base select-none">
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

                  {/* Risk & Account KPIs */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Risk Level</span>
                      <span
                        className={clsx(
                          'font-bold mt-0.5 inline-block',
                          selectedNode.riskLevel === 'HIGH'
                            ? 'text-red-400'
                            : selectedNode.riskLevel === 'MEDIUM'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        )}
                      >
                        {selectedNode.riskLevel}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Account Age</span>
                      <span className="font-semibold text-slate-200 mt-0.5 inline-block">
                        {selectedNode.data?.accountAgeDays !== undefined
                          ? `${selectedNode.data.accountAgeDays} days old`
                          : 'Recent'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Total Transactions</span>
                      <span className="font-semibold text-slate-200 mt-0.5 inline-block">
                        {selectedNode.data?.totalTransactions || 0}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Avg Risk Score</span>
                      <span className="font-mono font-bold text-slate-200 mt-0.5 inline-block">
                        {selectedNode.data?.avgRiskScore !== undefined
                          ? Math.round(selectedNode.data.avgRiskScore)
                          : 'N/A'}{' '}
                        / 100
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => navigate(`/admin?search=${encodeURIComponent(selectedNode.id)}`)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View User Transactions</span>
                    </button>

                    {selectedNode.data?.email && (
                      <button
                        onClick={() => openBlacklistModal('EMAIL', selectedNode.data.email)}
                        className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
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
                    <span className="text-[11px] text-slate-400 block mb-1">IP Address</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-white">{selectedNode.label}</span>
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
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Location</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <CountryFlag countryCode={selectedNode.data?.country} />
                        <span className="font-medium text-slate-200 truncate">{selectedNode.data?.country || 'Unknown'}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Transaction Volume</span>
                      <span className="font-semibold text-slate-200 mt-0.5 inline-block">
                        {selectedNode.data?.transactionCount || 1} txns
                      </span>
                    </div>
                  </div>

                  {/* Anonymizer Flags */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                    <span className="text-[11px] text-slate-400 block">Network Threat Telemetry</span>
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-md font-mono text-[11px]',
                          selectedNode.data?.isVpn
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30 font-semibold'
                            : 'bg-slate-800 text-slate-400'
                        )}
                      >
                        VPN: {selectedNode.data?.isVpn ? 'YES' : 'NO'}
                      </span>
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-md font-mono text-[11px]',
                          selectedNode.data?.isTor
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30 font-bold'
                            : 'bg-slate-800 text-slate-400'
                        )}
                      >
                        TOR: {selectedNode.data?.isTor ? 'YES' : 'NO'}
                      </span>
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-md font-mono text-[11px]',
                          selectedNode.data?.isProxy
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-slate-800 text-slate-400'
                        )}
                      >
                        Proxy: {selectedNode.data?.isProxy ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => navigate(`/admin?search=${encodeURIComponent(selectedNode.label)}`)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View IP Transactions</span>
                    </button>

                    <button
                      onClick={() => openBlacklistModal('IP', selectedNode.label)}
                      className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
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
                    <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-red-300">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span>FRAUD RING SIGNAL DETECTED</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-red-200/90">
                        This physical device fingerprint is shared across{' '}
                        <strong>{selectedNode.data?.sharedAcrossAccounts} distinct accounts</strong>. High probability of coordinated identity farming or multi-accounting fraud.
                      </p>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Hardware Fingerprint</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-purple-300 break-all">
                        {selectedNode.id.replace('device_', '')}
                      </span>
                      <button
                        onClick={() => handleCopy(selectedNode.id.replace('device_', ''))}
                        className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex-shrink-0 ml-2"
                        title="Copy Fingerprint"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
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

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Total Hits</span>
                      <span className="font-semibold text-slate-200 mt-0.5 inline-block">
                        {selectedNode.data?.transactionCount || 1} txns
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => navigate(`/admin?search=${encodeURIComponent(selectedNode.id.replace('device_', ''))}`)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Device Transactions</span>
                    </button>

                    <button
                      onClick={() => openBlacklistModal('FINGERPRINT', selectedNode.id.replace('device_', ''))}
                      className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Blacklist {blacklistModal.targetType}</h3>
                <p className="text-xs text-slate-400 font-mono break-all">{blacklistModal.targetValue}</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-slate-300 font-medium">Justification / Reason</label>
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
                className="py-1.5 px-3.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlacklist}
                disabled={submittingBlacklist || !blacklistModal.reason}
                className="py-1.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
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
