import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, X, RefreshCw, ZoomIn, ZoomOut, Maximize, AlertCircle } from 'lucide-react';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './MindMapPanel.css';
import { getApiUrl } from '../utils/geminiApi';

const MindMapPanel = ({ chunks = [], isOpen, onClose }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasGenerated, setHasGenerated] = useState(false);

    const generateMap = async () => {
        if (!chunks || chunks.length === 0) {
            setError("No notes available to generate a mind map. Please upload notes first.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            // Combine chunks for context (limit to ~15k chars to avoid huge payloads)
            const textContext = chunks.map(c => c.text).join('\n\n').substring(0, 15000);

            const response = await fetch(getApiUrl('/api/mindmap'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textContext })
            });

            if (!response.ok) {
                throw new Error("Failed to generate mind map from server.");
            }

            const data = await response.json();

            // Format nodes for ReactFlow (add positions and styles)
            const formattedNodes = (data.nodes || []).map((node, index) => {
                // Determine a basic spiral/circle layout layout
                const angle = (index / data.nodes.length) * Math.PI * 2;
                const radius = node.id === "1" ? 0 : 250 + (Math.random() * 50); // Root is center

                return {
                    id: String(node.id),
                    position: {
                        x: Math.cos(angle) * radius + 400, // Center X offset
                        y: Math.sin(angle) * radius + 300  // Center Y offset
                    },
                    data: { label: node.data?.label || 'Unknown' },
                    type: node.id === "1" ? 'input' : 'default', // Center node is 'input' style
                    className: `mindmap-node ${node.id === "1" ? 'root-node' : ''}`
                };
            });

            const formattedEdges = (data.edges || []).map((edge, i) => ({
                id: edge.id || `e${i}`,
                source: String(edge.source),
                target: String(edge.target),
                label: edge.label,
                animated: true,
                style: { stroke: '#6366f1', strokeWidth: 2 }
            }));

            setNodes(formattedNodes);
            setEdges(formattedEdges);
            setHasGenerated(true);
        } catch (err) {
            console.error(err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    // Auto-generate if opened and empty
    useEffect(() => {
        if (isOpen && !hasGenerated && !isLoading && !error && chunks.length > 0) {
            generateMap();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="mindmap-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="mindmap-modal-content"
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                    >
                        <div className="mindmap-header">
                            <div className="mindmap-title">
                                <Network className="text-accent" />
                                <h2>AI Knowledge Graph</h2>
                            </div>
                            <div className="mindmap-actions">
                                <button className="btn-secondary small" onClick={generateMap} disabled={isLoading}>
                                    <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
                                    Regenerate
                                </button>
                                <button className="icon-btn-close" onClick={onClose}>
                                    <X />
                                </button>
                            </div>
                        </div>

                        <div className="mindmap-body">
                            {isLoading && (
                                <div className="mindmap-loading">
                                    <div className="orb-scanner"></div>
                                    <p>AI is analyzing concepts and building relationships...</p>
                                </div>
                            )}

                            {error && !isLoading && (
                                <div className="mindmap-error">
                                    <AlertCircle size={32} />
                                    <p>{error}</p>
                                </div>
                            )}

                            {!isLoading && !error && nodes.length === 0 && hasGenerated && (
                                <div className="mindmap-empty">
                                    <p>No concepts could be extracted from the current notes.</p>
                                </div>
                            )}

                            {!isLoading && nodes.length > 0 && (
                                <div className="react-flow-wrapper">
                                    <ReactFlow
                                        nodes={nodes}
                                        edges={edges}
                                        onNodesChange={onNodesChange}
                                        onEdgesChange={onEdgesChange}
                                        onConnect={onConnect}
                                        fitView
                                        attributionPosition="bottom-right"
                                    >
                                        <Background color="#ffffff" gap={16} size={1} opacity={0.05} />
                                        <Controls />
                                        <Panel position="top-left" className="mindmap-panel-info">
                                            <p>Scroll to zoom. Drag nodes to organize.</p>
                                        </Panel>
                                    </ReactFlow>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MindMapPanel;
