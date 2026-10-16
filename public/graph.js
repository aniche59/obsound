// public/graph.js - Interactive 2D Physics-based Force-Directed Canvas Graph Engine
export class MusicGraph {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) throw new Error(`Canvas with ID "${canvasId}" not found.`);
    
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.links = [];
    this.nodeMap = new Map();
    this.particles = [];
    
    // Viewport transforms (Pan & Zoom)
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoomScale = 1.0;
    
    // Interactions
    this.draggedNode = null;
    this.hoveredNode = null;
    this.selectedNodeId = null;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    
    // Animation/Camera Focus Target
    this.cameraTargetX = null;
    this.cameraTargetY = null;
    
    // Audio sync reactive variables
    this.audioAmplitude = 0; // 0 to 1
    
    // Color palettes for nodes (Light Theme matching Green & Amber accents)
    this.typeColors = {
      tag: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#ffffff', glow: '#10b981' },
      artist: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#ffffff', glow: '#f59e0b' },
      track: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#ffffff', glow: '#3b82f6' }
    };
    
    this.initEvents();
    this.resize();
    this.loopActive = false;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    
    this.width = rect.width;
    this.height = rect.height;
    
    // Set initial offsets to center
    if (this.offsetX === 0 && this.offsetY === 0) {
      this.offsetX = this.width / 2;
      this.offsetY = this.height / 2;
    }
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());
    
    // Prevent default touch actions on canvas
    this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
    
    // Double click to reset zoom
    this.canvas.addEventListener('dblclick', () => {
      this.zoomScale = 1.0;
      this.offsetX = this.width / 2;
      this.offsetY = this.height / 2;
    });
  }

  // Get mouse coordinates transformed by pan & zoom
  getTransformedCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Map canvas coordinates to simulated world coordinates
    const worldX = (x - this.offsetX) / this.zoomScale;
    const worldY = (y - this.offsetY) / this.zoomScale;
    return { x: worldX, y: worldY };
  }

  // Add a node
  addNode(id, label, type, data = {}) {
    if (this.nodeMap.has(id)) {
      // Node already exists, update data if needed
      return this.nodeMap.get(id);
    }
    
    // Initial random placement around current center to avoid stacking
    const radius = type === 'tag' ? 42 : type === 'artist' ? 32 : 24;
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 120;
    
    // If center exists, place around center, else origin
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const x = (this.cameraTargetX !== null ? this.cameraTargetX : centerX) + Math.cos(angle) * distance;
    const y = (this.cameraTargetY !== null ? this.cameraTargetY : centerY) + Math.sin(angle) * distance;

    const node = {
      id,
      label,
      type,
      data,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      img: null,
      pulse: 0
    };

    if (data.coverArt) {
      const img = new Image();
      img.src = data.coverArt;
      img.crossOrigin = "anonymous";
      img.onload = () => { node.img = img; };
      node.img = img;
    }

    this.nodes.push(node);
    this.nodeMap.set(id, node);
    return node;
  }

  // Add connection link
  addLink(sourceId, targetId, length = null) {
    // Prevent duplicate links
    const linkExists = this.links.some(l => 
      (l.source === sourceId && l.target === targetId) ||
      (l.source === targetId && l.target === sourceId)
    );
    
    if (linkExists) return;
    
    const sourceNode = this.nodeMap.get(sourceId);
    const targetNode = this.nodeMap.get(targetId);
    if (!sourceNode || !targetNode) return;
    
    // Set default physical distance based on node types
    let targetLength = length;
    if (!targetLength) {
      if (sourceNode.type === 'tag' && targetNode.type === 'tag') targetLength = 220;
      else if (sourceNode.type === 'tag' && targetNode.type === 'artist') targetLength = 140;
      else if (sourceNode.type === 'artist' && targetNode.type === 'artist') targetLength = 120;
      else targetLength = 90; // artist to track
    }
    
    this.links.push({
      source: sourceId,
      target: targetId,
      length: targetLength
    });
  }

  clear() {
    this.nodes = [];
    this.links = [];
    this.nodeMap.clear();
    this.particles = [];
    this.selectedNodeId = null;
    this.draggedNode = null;
    this.hoveredNode = null;
    this.cameraTargetX = null;
    this.cameraTargetY = null;
  }

  // Focus and pan to a specific node smoothly
  focusNode(nodeId) {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;
    
    this.selectedNodeId = nodeId;
    this.cameraTargetX = node.x;
    this.cameraTargetY = node.y;
  }

  updateAudioAmplitude(amplitude) {
    this.audioAmplitude = Math.max(0, Math.min(1, amplitude));
  }

  // Event handlers
  onMouseDown(e) {
    const { x, y } = this.getTransformedCoords(e.clientX, e.clientY);
    
    // Check if clicked a node
    let clickedNode = null;
    // Iterate backwards to select nodes rendered on top
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const dx = x - node.x;
      const dy = y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= node.radius) {
        clickedNode = node;
        break;
      }
    }
    
    if (clickedNode) {
      this.draggedNode = clickedNode;
      this.draggedNode.vx = 0;
      this.draggedNode.vy = 0;
    } else {
      this.isPanning = true;
      this.startX = e.clientX - this.offsetX;
      this.startY = e.clientY - this.offsetY;
    }
  }

  onMouseMove(e) {
    const { x, y } = this.getTransformedCoords(e.clientX, e.clientY);
    
    if (this.draggedNode) {
      // Drag node
      this.draggedNode.x = x;
      this.draggedNode.y = y;
      this.draggedNode.vx = 0;
      this.draggedNode.vy = 0;
    } else if (this.isPanning) {
      // Pan viewport
      this.offsetX = e.clientX - this.startX;
      this.offsetY = e.clientY - this.startY;
      // Interrupt camera focus transitions
      this.cameraTargetX = null;
      this.cameraTargetY = null;
    } else {
      // Check node hover
      let hover = null;
      for (let i = this.nodes.length - 1; i >= 0; i--) {
        const node = this.nodes[i];
        const dx = x - node.x;
        const dy = y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= node.radius) {
          hover = node;
          break;
        }
      }
      
      if (hover !== this.hoveredNode) {
        this.hoveredNode = hover;
        this.canvas.style.cursor = hover ? 'pointer' : 'default';
        if (this.onHoverCallback) this.onHoverCallback(hover, e.clientX, e.clientY);
      }
    }
  }

  onMouseUp(e) {
    if (this.draggedNode) {
      // Click event check (dragged very little or none)
      const clicked = this.draggedNode;
      this.draggedNode = null;
      
      // Focus camera
      this.focusNode(clicked.id);
      
      if (this.clickCallback) {
        this.clickCallback(clicked);
      }
    }
    this.isPanning = false;
  }

  onMouseLeave() {
    this.draggedNode = null;
    this.isPanning = false;
    this.hoveredNode = null;
    if (this.onHoverCallback) this.onHoverCallback(null);
  }

  onWheel(e) {
    e.preventDefault();
    
    // Zoom focus matching mouse position
    const mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
    const mouseY = e.clientY - this.canvas.getBoundingClientRect().top;
    
    const beforeZoomX = (mouseX - this.offsetX) / this.zoomScale;
    const beforeZoomY = (mouseY - this.offsetY) / this.zoomScale;
    
    // Calculate new zoom factor
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    this.zoomScale *= zoomFactor;
    
    // Clamp zoom scale between 0.15 and 3.0
    this.zoomScale = Math.max(0.15, Math.min(3.0, this.zoomScale));
    
    // Re-adjust offset to keep mouse position anchored
    this.offsetX = mouseX - beforeZoomX * this.zoomScale;
    this.offsetY = mouseY - beforeZoomY * this.zoomScale;
    
    // Interrupt camera focus transitions
    this.cameraTargetX = null;
    this.cameraTargetY = null;
  }

  onNodeSelected(callback) {
    this.clickCallback = callback;
  }

  onNodeHovered(callback) {
    this.onHoverCallback = callback;
  }

  // Core physics solver loop
  updatePhysics() {
    // 1. Repulsion force between ALL pairs of nodes
    const repulsionConstant = 2500;
    for (let i = 0; i < this.nodes.length; i++) {
      const nodeA = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeB = this.nodes[j];
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // Repel threshold
        const targetMinDist = nodeA.radius + nodeB.radius + 80;
        if (dist < targetMinDist) {
          const force = (targetMinDist - dist) * 0.15;
          const pushX = (dx / dist) * force;
          const pushY = (dy / dist) * force;
          
          if (nodeA !== this.draggedNode) {
            nodeA.vx -= pushX;
            nodeA.vy -= pushY;
          }
          if (nodeB !== this.draggedNode) {
            nodeB.vx += pushX;
            nodeB.vy += pushY;
          }
        }
      }
    }

    // 2. Attraction force along connections (Links)
    const springStrength = 0.055;
    for (const link of this.links) {
      const nodeA = this.nodeMap.get(link.source);
      const nodeB = this.nodeMap.get(link.target);
      if (!nodeA || !nodeB) continue;
      
      const dx = nodeB.x - nodeA.x;
      const dy = nodeB.y - nodeA.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const targetDist = link.length;
      const displacement = dist - targetDist;
      const pull = displacement * springStrength;
      const pullX = (dx / dist) * pull;
      const pullY = (dy / dist) * pull;
      
      if (nodeA !== this.draggedNode) {
        nodeA.vx += pullX;
        nodeA.vy += pullY;
      }
      if (nodeB !== this.draggedNode) {
        nodeB.vx -= pullX;
        nodeB.vy -= pullY;
      }
    }

    // 3. Update node positions & damp velocity (friction)
    const centerPull = 0.0015;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const friction = 0.82;

    for (const node of this.nodes) {
      if (node === this.draggedNode) continue;
      
      // Pull nodes slightly to center gravity to avoid drifting
      const pullX = (centerX - node.x) * centerPull;
      const pullY = (centerY - node.y) * centerPull;
      
      node.vx += pullX;
      node.vy += pullY;
      
      node.x += node.vx;
      node.y += node.vy;
      
      node.vx *= friction;
      node.vy *= friction;
    }

    // 4. Update data-packet particles traveling along links
    this.updateParticles();
    
    // 5. Smooth Camera centering focus
    if (this.cameraTargetX !== null && this.cameraTargetY !== null) {
      const targetOffsetX = this.width / 2 - this.cameraTargetX * this.zoomScale;
      const targetOffsetY = this.height / 2 - this.cameraTargetY * this.zoomScale;
      
      // Interpolate camera translation (linear lerp)
      this.offsetX += (targetOffsetX - this.offsetX) * 0.085;
      this.offsetY += (targetOffsetY - this.offsetY) * 0.085;
      
      // Stop focusing once very close
      if (Math.abs(targetOffsetX - this.offsetX) < 0.2 && Math.abs(targetOffsetY - this.offsetY) < 0.2) {
        this.offsetX = targetOffsetX;
        this.offsetY = targetOffsetY;
        this.cameraTargetX = null;
        this.cameraTargetY = null;
      }
    }
  }

  updateParticles() {
    // Generate packet flow particles on connections
    if (Math.random() < 0.035 && this.links.length > 0) {
      const link = this.links[Math.floor(Math.random() * this.links.length)];
      // Direct particles from tag -> artist -> track
      const source = this.nodeMap.get(link.source);
      const target = this.nodeMap.get(link.target);
      
      if (source && target) {
        const isForward = (source.type === 'tag' && target.type === 'artist') || 
                          (source.type === 'artist' && target.type === 'track') ||
                          (source.type === 'tag' && target.type === 'tag');
                          
        this.particles.push({
          source: isForward ? link.source : link.target,
          target: isForward ? link.target : link.source,
          progress: 0,
          speed: 0.012 + Math.random() * 0.018
        });
      }
    }

    // Advance particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.progress += p.speed;
      if (p.progress >= 1.0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Draw loop
  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Cyber Grid Background (moves with panning)
    this.drawBackgroundGrid();

    this.ctx.save();
    // Translate and Zoom view
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.zoomScale, this.zoomScale);

    // 1. Draw connections (links)
    this.drawLinks();

    // 2. Draw packet particles flow
    this.drawParticles();

    // 3. Draw nodes
    this.drawNodes();

    this.ctx.restore();
  }

  drawBackgroundGrid() {
    const gridSpacing = 40;
    this.ctx.strokeStyle = '#e2ede8';
    this.ctx.lineWidth = 1.0;
    
    // Calculate visible boundaries based on zoom & offset
    const startX = ((-this.offsetX) % (gridSpacing * this.zoomScale)) / this.zoomScale;
    const startY = ((-this.offsetY) % (gridSpacing * this.zoomScale)) / this.zoomScale;
    
    this.ctx.beginPath();
    // Vertical lines
    for (let x = startX; x < this.width; x += gridSpacing) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
    }
    // Horizontal lines
    for (let y = startY; y < this.height; y += gridSpacing) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
    }
    this.ctx.stroke();
  }

  drawLinks() {
    this.ctx.save();
    for (const link of this.links) {
      const nodeA = this.nodeMap.get(link.source);
      const nodeB = this.nodeMap.get(link.target);
      if (!nodeA || !nodeB) continue;
      
      const isSelected = link.source === this.selectedNodeId || link.target === this.selectedNodeId;
      
      // Dynamic link styling: glowing lines for selected relationships
      this.ctx.beginPath();
      this.ctx.moveTo(nodeA.x, nodeA.y);
      this.ctx.lineTo(nodeB.x, nodeB.y);
      
      if (isSelected) {
        this.ctx.strokeStyle = '#10b981';
        this.ctx.lineWidth = 2.0;
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = '#10b981';
      } else {
        this.ctx.strokeStyle = '#d1dfd8';
        this.ctx.lineWidth = 1.2;
        this.ctx.shadowBlur = 0;
      }
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawParticles() {
    this.ctx.save();
    for (const p of this.particles) {
      const nodeA = this.nodeMap.get(p.source);
      const nodeB = this.nodeMap.get(p.target);
      if (!nodeA || !nodeB) continue;

      const x = nodeA.x + (nodeB.x - nodeA.x) * p.progress;
      const y = nodeA.y + (nodeB.y - nodeA.y) * p.progress;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      
      // Determine glow color from source type
      const palette = this.typeColors[nodeA.type] || { glow: '#ff5500' };
      this.ctx.shadowColor = palette.glow;
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawNodes() {
    for (const node of this.nodes) {
      const palette = this.typeColors[node.type];
      const isSelected = node.id === this.selectedNodeId;
      const isHovered = node === this.hoveredNode;
      
      // Compute beat pulse scaling for nodes
      // Root tag nodes pulse slightly, artist nodes moderately, active track nodes pulse heavily!
      let scale = 1.0;
      if (this.audioAmplitude > 0) {
        if (isSelected && node.type === 'track') {
          scale += this.audioAmplitude * 0.22; // heavy pulse for current playing song
        } else if (node.type === 'artist') {
          scale += this.audioAmplitude * 0.10;
        } else if (node.type === 'tag') {
          scale += this.audioAmplitude * 0.05;
        }
      }
      
      const currentRadius = node.radius * scale;
      
      this.ctx.save();
      
      // Glowing shadow
      this.ctx.shadowColor = palette.glow;
      if (isSelected) {
        this.ctx.shadowBlur = 18 + (this.audioAmplitude * 15);
      } else if (isHovered) {
        this.ctx.shadowBlur = 12;
      } else {
        this.ctx.shadowBlur = 6;
      }

      // Draw outer glowing ring
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
      
      if (isSelected) {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3.0;
      } else {
        this.ctx.strokeStyle = palette.border;
        this.ctx.lineWidth = 1.8;
      }
      this.ctx.stroke();

      // Node background/fill
      this.ctx.shadowBlur = 0; // turn off shadow to draw crisp body
      
      if (node.type === 'track' && node.img && node.img.complete) {
        // Draw album art inside track node
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, currentRadius - 1.5, 0, Math.PI * 2);
        this.ctx.clip();
        this.ctx.drawImage(node.img, node.x - currentRadius, node.y - currentRadius, currentRadius * 2, currentRadius * 2);
        this.ctx.restore();
        
        // Semi-transparent overlay to keep text/border readable
        this.ctx.fillStyle = 'rgba(28, 35, 49, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, currentRadius - 1.5, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = palette.bg;
        this.ctx.fill();
        
        // Draw generic music/artist symbol icons inside nodes if empty
        this.ctx.fillStyle = palette.border;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        if (node.type === 'tag') {
          this.ctx.font = 'bold 16px Outfit';
          this.ctx.fillText('#', node.x, node.y);
        } else if (node.type === 'artist') {
          this.ctx.font = '14px sans-serif';
          this.ctx.fillText('👤', node.x, node.y - 1);
        } else {
          this.ctx.font = '12px sans-serif';
          this.ctx.fillText('🎵', node.x, node.y);
        }
      }

      // Draw label (under node or inside if tag)
      this.ctx.font = node.type === 'tag' ? 'bold 13px Outfit' : '11px Space Grotesk';
      this.ctx.textAlign = 'center';
      
      if (node.type === 'tag') {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = '#000000';
        this.ctx.fillText(node.label, node.x, node.y + currentRadius + 16);
      } else {
        this.ctx.fillStyle = '#9ca3af';
        // Truncate long track/artist titles
        let label = node.label;
        if (label.length > 14) label = label.substring(0, 12) + '...';
        this.ctx.fillText(label, node.x, node.y + currentRadius + 14);
      }

      this.ctx.restore();
    }
  }

  // Animation cycle loop
  start() {
    if (this.loopActive) return;
    this.loopActive = true;
    
    const animate = () => {
      if (!this.loopActive) return;
      
      this.updatePhysics();
      this.draw();
      
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }

  stop() {
    this.loopActive = false;
  }
}
