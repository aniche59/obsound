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

    const imgSrc = data.coverArt || data.image || data.avatar || data.img;
    if (imgSrc && typeof imgSrc === 'string' && imgSrc.trim() !== '' && !imgSrc.includes('unsplash.com')) {
      const img = new Image();
      img.onload = () => { 
        node.img = img; 
      };
      img.onerror = () => { 
        node.img = null; 
      };
      img.src = imgSrc;
    } else if (type === 'artist') {
      // Automatically fetch genuine artist photo from Deezer / Wikipedia proxy
      fetch(`/api/artist-image?artist=${encodeURIComponent(label)}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.imageUrl) {
            const img = new Image();
            img.onload = () => { node.img = img; };
            img.src = resData.imageUrl;
          }
        }).catch(() => {});
    } else if (type === 'track') {
      // Query iTunes for genuine studio album cover
      const searchQ = ((data.artist || '') + ' ' + label).trim();
      if (searchQ) {
        fetch(`/api/itunes?term=${encodeURIComponent(searchQ)}`)
          .then(res => res.json())
          .then(resData => {
            if (resData.results && resData.results[0] && resData.results[0].artworkUrl100) {
              const coverUrl = resData.results[0].artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100.jpg', '600x600.jpg');
              const img = new Image();
              img.onload = () => { node.img = img; };
              img.src = coverUrl;
              node.data.coverArt = coverUrl;
              if (resData.results[0].previewUrl) {
                node.data.previewAudioUrl = resData.results[0].previewUrl;
              }
            }
          }).catch(() => {});
      }
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
    const friction = 0.88;

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

      // Settle nodes when velocity is small to stop distracting oscillations
      if (Math.abs(node.vx) < 0.015) node.vx = 0;
      if (Math.abs(node.vy) < 0.015) node.vy = 0;
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
    
    // Rabbit Hole Focus Mode: Spotlight the selected node and its trail
    for (const link of this.links) {
      const nodeA = this.nodeMap.get(link.source);
      const nodeB = this.nodeMap.get(link.target);
      if (!nodeA || !nodeB) continue;
      
      const isSelected = link.source === this.selectedNodeId || link.target === this.selectedNodeId;
      const isDimmed = this.selectedNodeId && !isSelected;

      this.ctx.beginPath();
      this.ctx.moveTo(nodeA.x, nodeA.y);
      this.ctx.lineTo(nodeB.x, nodeB.y);
      
      if (isSelected) {
        // Spotlight active branch of the rabbit hole
        this.ctx.strokeStyle = '#E76F51';
        this.ctx.lineWidth = 2.4;
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = '#E76F51';
      } else if (isDimmed) {
        // Fade unrelated connections to reduce clutter
        this.ctx.strokeStyle = 'rgba(209, 223, 216, 0.22)';
        this.ctx.lineWidth = 0.8;
        this.ctx.shadowBlur = 0;
      } else {
        this.ctx.strokeStyle = '#cad7d0';
        this.ctx.lineWidth = 1.1;
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

      const isFocused = !this.selectedNodeId || 
                        p.source === this.selectedNodeId || 
                        p.target === this.selectedNodeId;

      if (!isFocused) continue; // Don't draw distracting particles on dimmed links

      const x = nodeA.x + (nodeB.x - nodeA.x) * p.progress;
      const y = nodeA.y + (nodeB.y - nodeA.y) * p.progress;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      
      const palette = this.typeColors[nodeA.type] || { glow: '#ff5500' };
      this.ctx.shadowColor = palette.glow;
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawHexagon(ctx, x, y, radius) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = x + radius * Math.cos(angle);
      const hy = y + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
  }

  drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawNodes() {
    // Build set of connected neighbors for Rabbit Hole Focus spotlight
    const connectedNodeIds = new Set();
    if (this.selectedNodeId) {
      connectedNodeIds.add(this.selectedNodeId);
      for (const link of this.links) {
        if (link.source === this.selectedNodeId) connectedNodeIds.add(link.target);
        if (link.target === this.selectedNodeId) connectedNodeIds.add(link.source);
      }
    }

    for (const node of this.nodes) {
      const palette = this.typeColors[node.type] || { bg: '#fff', border: '#232533', glow: '#232533' };
      const isSelected = node.id === this.selectedNodeId;
      const isHovered = node === this.hoveredNode;
      const isConnected = connectedNodeIds.has(node.id);
      const isDimmed = this.selectedNodeId && !isConnected && !isHovered;

      this.ctx.save();
      // Rabbit Hole Focus Mode: Spotlight connected path and soften distant noise
      if (isDimmed) {
        this.ctx.globalAlpha = 0.28;
      } else {
        this.ctx.globalAlpha = 1.0;
      }
      
      // Beat pulse scaling
      let scale = 1.0;
      if (this.audioAmplitude > 0) {
        if (isSelected && node.type === 'track') {
          scale += this.audioAmplitude * 0.22;
        } else if (node.type === 'artist') {
          scale += this.audioAmplitude * 0.12;
        } else if (node.type === 'tag') {
          scale += this.audioAmplitude * 0.06;
        }
      }
      
      const currentRadius = node.radius * scale;
      
      // 1. GENRE / TAG HUBS: Glowing Hexagonal Sanctuaries
      if (node.type === 'tag') {
        this.ctx.shadowColor = isSelected ? '#ffffff' : palette.glow;
        this.ctx.shadowBlur = isSelected ? 22 : (isHovered ? 16 : 8);

        // Hexagon Outer Ring
        this.drawHexagon(this.ctx, node.x, node.y, currentRadius);
        this.ctx.strokeStyle = isSelected ? '#ffffff' : palette.border;
        this.ctx.lineWidth = isSelected ? 3.5 : 2.5;
        this.ctx.stroke();

        // Hexagon Fill
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = isSelected ? 'rgba(16, 185, 129, 0.4)' : (isHovered ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.95)');
        this.ctx.fill();

        // Inner decorative hex ring
        this.drawHexagon(this.ctx, node.x, node.y, currentRadius - 6);
        this.ctx.strokeStyle = palette.border;
        this.ctx.lineWidth = 1.0;
        this.ctx.stroke();

        // Center Genre Tag Symbol
        this.ctx.fillStyle = '#232533';
        this.ctx.font = '900 15px Outfit, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('#', node.x, node.y - 1);

        // Label Badge Underneath
        this.ctx.font = 'bold 12.5px Space Grotesk, sans-serif';
        this.ctx.fillStyle = '#232533';
        this.ctx.shadowColor = '#FAF7F2';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(node.label, node.x, node.y + currentRadius + 16);
      }

      // 2. ARTISTS: Circular Vinyl Disc Avatars with Authentic Portraits
      else if (node.type === 'artist') {
        this.ctx.shadowColor = isSelected ? '#ffffff' : (palette.glow || '#F4A261');
        this.ctx.shadowBlur = isSelected ? 20 : (isHovered ? 14 : 7);

        // Outer Double Vinyl Groove Ring
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = isSelected ? '#ffffff' : '#232533';
        this.ctx.lineWidth = isSelected ? 3.0 : 2.0;
        this.ctx.stroke();

        this.ctx.shadowBlur = 0;

        // Clip and Draw Authentic Artist Image
        if (node.img && node.img.complete && node.img.naturalWidth > 0) {
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.arc(node.x, node.y, currentRadius - 2, 0, Math.PI * 2);
          this.ctx.clip();
          this.ctx.drawImage(node.img, node.x - currentRadius, node.y - currentRadius, currentRadius * 2, currentRadius * 2);
          
          // Subtle circular gradient overlay
          this.ctx.fillStyle = 'rgba(35, 37, 51, 0.15)';
          this.ctx.fill();
          this.ctx.restore();
        } else {
          // Stylized Initials Fallback (Vinyl Record Center)
          this.ctx.fillStyle = '#FAF7F2';
          this.ctx.beginPath();
          this.ctx.arc(node.x, node.y, currentRadius - 2, 0, Math.PI * 2);
          this.ctx.fill();

          // Concentric subtle vinyl grooves
          this.ctx.strokeStyle = 'rgba(35, 37, 51, 0.15)';
          this.ctx.beginPath();
          this.ctx.arc(node.x, node.y, currentRadius - 8, 0, Math.PI * 2);
          this.ctx.stroke();

          // Initials
          const initials = (node.label || 'A').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
          this.ctx.fillStyle = '#E76F51';
          this.ctx.font = 'bold 12px Space Grotesk, sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(initials, node.x, node.y);
        }

        // Artist Label with Persona Badge
        this.ctx.font = '600 11.5px Space Grotesk, sans-serif';
        this.ctx.fillStyle = '#232533';
        this.ctx.textAlign = 'center';
        let artLabel = node.label;
        if (artLabel.length > 15) artLabel = artLabel.substring(0, 13) + '..';
        this.ctx.fillText(`👤 ${artLabel}`, node.x, node.y + currentRadius + 14);
      }

      // 3. SONGS / TRACKS: Rounded Square Miniature LP Cardboard Sleeves
      else {
        const side = currentRadius * 2;
        const half = currentRadius;
        const rx = node.x - half;
        const ry = node.y - half;

        this.ctx.shadowColor = isSelected ? '#ffffff' : (palette.glow || '#4A90E2');
        this.ctx.shadowBlur = isSelected ? 18 : (isHovered ? 12 : 5);

        // Rounded Square LP Sleeve Outline
        this.drawRoundRect(this.ctx, rx, ry, side, side, 6);
        this.ctx.strokeStyle = isSelected ? '#ffffff' : '#232533';
        this.ctx.lineWidth = isSelected ? 2.5 : 1.5;
        this.ctx.stroke();

        this.ctx.shadowBlur = 0;

        // Clip and Draw Authentic Album Cover Art
        if (node.img && node.img.complete && node.img.naturalWidth > 0) {
          this.ctx.save();
          this.drawRoundRect(this.ctx, rx + 1, ry + 1, side - 2, side - 2, 5);
          this.ctx.clip();
          this.ctx.drawImage(node.img, rx, ry, side, side);
          
          // Play indicator overlay if selected
          if (isSelected) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            this.ctx.fill();
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('▶', node.x, node.y);
          }
          this.ctx.restore();
        } else {
          // Cardboard Sleeve Fallback
          this.ctx.fillStyle = '#F4EFE6';
          this.drawRoundRect(this.ctx, rx + 1, ry + 1, side - 2, side - 2, 5);
          this.ctx.fill();

          this.ctx.fillStyle = '#646A7E';
          this.ctx.font = '12px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText('🎵', node.x, node.y);
        }

        // Track Title Label
        this.ctx.font = '500 11px Space Grotesk, sans-serif';
        this.ctx.fillStyle = isSelected ? '#E76F51' : '#646A7E';
        this.ctx.textAlign = 'center';
        let trkLabel = node.label;
        if (trkLabel.length > 14) trkLabel = trkLabel.substring(0, 12) + '..';
        this.ctx.fillText(trkLabel, node.x, node.y + currentRadius + 14);
      }

      // Rabbit-Hole Selected Node Focus Halo Ring
      if (isSelected) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, currentRadius + 8, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#E76F51';
        this.ctx.lineWidth = 2.5;
        this.ctx.setLineDash([4, 4]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
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
