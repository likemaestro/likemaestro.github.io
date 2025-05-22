import React, { useRef, useEffect, useCallback, useMemo } from "react";

interface Particle {
  x: number;
  y: number;
  originX: number; // For returning to original area after mouse interaction
  originY: number; // For returning to original area after mouse interaction
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isPulsing?: boolean;
  pulseTime?: number;
  pulseDuration?: number;
  maxPulseRadius?: number;
  glowColor?: string; // Added for glow effect
  justStartedPulsing?: boolean; // Flag for when a particle starts pulsing
}

interface Line {
  from: Particle;
  to: Particle;
  isSignal?: boolean; // Indicates if the line is currently an active signal
  signalProgress?: number; // Progress of the signal's travel (0 to 1)
  signalStartTime?: number; // Timestamp when the signal started
}

interface ParticleNetworkProps {
  className?: string;
  particleCount?: number;
  interactive?: boolean; // Prop to enable/disable general interactivity
  connectToMouse?: boolean; // New prop to control line connection to mouse
}

const ParticleNetwork: React.FC<ParticleNetworkProps> = ({
  className,
  particleCount: propParticleCount,
  interactive = true,
  connectToMouse = false, // Default to false, so lines don't connect to mouse unless specified
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const lines = useRef<Line[]>([]);
  const animationFrameId = useRef<number | undefined>(undefined);
  const mousePosition = useRef<{ x: number; y: number } | null>(null);
  const isVisible = useRef(true); // Added to track visibility

  // Memoize config to prevent re-creation on every render unless propParticleCount changes
  const config = useMemo(
    () => ({
      particleCount: propParticleCount || 50, // Default number of particles
      particleColor: "rgba(100, 180, 255, 0.7)", // Base color of particles
      particleRadius: 1.5, // Base radius of particles
      particleGlowColor: "rgba(173, 216, 230, 0.5)", // Glow effect color for particles
      pulseColor: "rgba(220, 240, 255, 1)", // Color of particles during their pulse animation
      pulseFrequency: 0.01, // Chance per frame for a particle to start pulsing
      pulseDuration: 2000, // Duration of a single particle pulse in milliseconds
      maxPulseRadiusFactor: 2.5, // Factor by which particle radius increases at peak pulse
      velocityFactor: 0.15, // Base speed factor for particle movement
      maxVelocity: 0.1, // Maximum speed of particles
      returnForce: 0.002, // Strength of force pulling particles towards their origin area
      connectionDistance: 250, // Maximum distance for particles to connect with a line
      lineColor: "rgba(0, 150, 255, 0.2)", // Color of standard connection lines
      signalColor: "rgba(255, 255, 255, 1)", // Color of the traveling signal (bright white)
      signalDuration: 2000, // Duration of a signal's travel in milliseconds
      signalRadiusFactor: 0.5, // Factor for signal head size relative to particleRadius
      mouseRepelDistance: 200, // Distance at which particles are repelled by the mouse
      mouseRepelStrength: 0.5, // Strength of mouse repulsion effect
      minParticleDistance: 20, // Minimum distance between particles
      particleRepelStrength: 0.02, // Strength of repulsion between particles
      edgeRepelDistance: 20, // Distance from edge to start repelling
      edgeRepelStrength: 0.01, // Strength of edge repulsion
    }),
    [propParticleCount]
  );

  const initializeParticles = useCallback(
    (width: number, height: number) => {
      particles.current = [];
      for (let i = 0; i < config.particleCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        particles.current.push({
          x, // Shorthand
          y, // Shorthand
          originX: x, // Store initial position
          originY: y, // Store initial position
          vx: (Math.random() - 0.5) * config.velocityFactor * 2,
          vy: (Math.random() - 0.5) * config.velocityFactor * 2,
          radius: config.particleRadius,
          color: config.particleColor,
          glowColor: config.particleGlowColor,
        });
      }
      lines.current = [];
    },
    [config] // config is now a dependency
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Intersection Observer setup
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          // Restart animation if it was stopped
          if (!animationFrameId.current) {
            animationFrameId.current = requestAnimationFrame(draw);
          }
        } else {
          // Stop animation when not visible
          if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = undefined;
          }
        }
      },
      { threshold: 0.01 } // Trigger if at least 1% is visible
    );

    observer.observe(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let resizeAnimationFrameId: number;

    const setCanvasDimensionsAndInitialize = () => {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();

      // Sanity check for canvas dimensions
      if (
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.width > 8192 ||
        rect.height > 8192
      ) {
        // console.warn("ParticleNetwork: Invalid or excessive canvas dimensions attempted.", rect.width, rect.height);
        return; // Skip update if dimensions are invalid or too large
      }

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      // Check if ctx is still valid after potential re-render or context loss
      if (ctx.canvas !== canvas) {
        // console.warn("ParticleNetwork: Canvas context lost or changed.");
        return;
      }
      try {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Apply DPR scaling
      } catch (e) {
        // console.error("ParticleNetwork: Error setting canvas transform.", e);
        return; // Stop if transform fails (e.g., canvas too large despite checks)
      }
      // Pass current dimensions from rect, not canvas.width/height which are scaled by DPR
      initializeParticles(rect.width, rect.height);
    };

    setCanvasDimensionsAndInitialize();

    const handleMouseMove = (event: MouseEvent) => {
      if (!interactive || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mousePosition.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      if (!interactive) return;
      mousePosition.current = null;
    };

    if (interactive) {
      window.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseleave", handleMouseLeave);
    }

    const draw = () => {
      if (!canvas || !ctx || !isVisible.current) {
        // Check visibility before drawing
        // If not visible but animation frame was requested, ensure it's cleaned up
        if (animationFrameId.current && !isVisible.current) {
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = undefined;
        }
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const currentWidth = rect.width;
      const currentHeight = rect.height;

      ctx.clearRect(0, 0, currentWidth, currentHeight);

      const now = Date.now();
      const currentLines: Line[] = [];

      particles.current.forEach((p) => {
        p.justStartedPulsing = false; // Reset flag at the start of each particle's update

        // Mouse repulsion
        if (interactive && mousePosition.current) {
          const dxMouse = p.x - mousePosition.current.x;
          const dyMouse = p.y - mousePosition.current.y;
          const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

          if (distMouse < config.mouseRepelDistance) {
            const force =
              (config.mouseRepelDistance - distMouse) /
              config.mouseRepelDistance;
            p.vx += (dxMouse / distMouse) * force * config.mouseRepelStrength;
            p.vy += (dyMouse / distMouse) * force * config.mouseRepelStrength;
          }
        }

        // Force to return to a general area around originX/Y (gentle pull)
        // This prevents particles from drifting too far off-screen due to repulsion
        const dxOrigin = p.originX - p.x;
        const dyOrigin = p.originY - p.y;
        // Only apply return force if significantly away, to allow natural drift
        if (Math.abs(dxOrigin) > currentWidth * 0.1)
          p.vx += dxOrigin * config.returnForce;
        if (Math.abs(dyOrigin) > currentHeight * 0.1)
          p.vy += dyOrigin * config.returnForce;

        // Cap velocity
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > config.maxVelocity) {
          p.vx = (p.vx / speed) * config.maxVelocity;
          p.vy = (p.vy / speed) * config.maxVelocity;
        }

        // Edge Repulsion
        if (p.x < config.edgeRepelDistance) {
          const proximity =
            (config.edgeRepelDistance - p.x) / config.edgeRepelDistance;
          p.vx += proximity * config.edgeRepelStrength;
        } else if (p.x > currentWidth - config.edgeRepelDistance) {
          const proximity =
            (p.x - (currentWidth - config.edgeRepelDistance)) /
            config.edgeRepelDistance;
          p.vx -= proximity * config.edgeRepelStrength;
        }

        if (p.y < config.edgeRepelDistance) {
          const proximity =
            (config.edgeRepelDistance - p.y) / config.edgeRepelDistance;
          p.vy += proximity * config.edgeRepelStrength;
        } else if (p.y > currentHeight - config.edgeRepelDistance) {
          const proximity =
            (p.y - (currentHeight - config.edgeRepelDistance)) /
            config.edgeRepelDistance;
          p.vy -= proximity * config.edgeRepelStrength;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Strict Boundary Enforcement (replaces old wall bouncing)
        // This acts as a fallback; repulsion should ideally prevent hitting these.
        if (p.x - p.radius < 0) {
          p.x = p.radius;
          p.vx *= -0.5; // Dampen and reverse velocity
        } else if (p.x + p.radius > currentWidth) {
          p.x = currentWidth - p.radius;
          p.vx *= -0.5; // Dampen and reverse velocity
        }

        if (p.y - p.radius < 0) {
          p.y = p.radius;
          p.vy *= -0.5; // Dampen and reverse velocity
        } else if (p.y + p.radius > currentHeight) {
          p.y = currentHeight - p.radius;
          p.vy *= -0.5; // Dampen and reverse velocity
        }

        // Pulsing logic
        if (p.isPulsing) {
          if (now - (p.pulseTime || 0) > (p.pulseDuration || 0)) {
            p.isPulsing = false;
            p.pulseTime = undefined;
            // p.justStartedPulsing remains false or will be set if it re-pulses immediately
          }
        } else if (Math.random() < config.pulseFrequency / 60) {
          // Assuming 60 FPS for pulse check
          p.isPulsing = true;
          p.pulseTime = now;
          p.pulseDuration = config.pulseDuration;
          p.maxPulseRadius =
            config.particleRadius * config.maxPulseRadiusFactor;
          p.justStartedPulsing = true; // Set flag when pulse starts
        }

        // Draw particle
        ctx.beginPath();
        let currentRadius = p.radius;
        let currentColor = p.color;
        let currentShadowBlur = 0;
        let currentShadowColor = "transparent"; // Default to no glow

        if (p.isPulsing && p.pulseTime && p.pulseDuration && p.maxPulseRadius) {
          const pulseProgressRatio = (now - p.pulseTime) / p.pulseDuration;
          // Ensure pulseProgress is clamped between 0 and 1
          const clampedProgress = Math.max(0, Math.min(1, pulseProgressRatio));
          const easedProgress = Math.sin(Math.PI * clampedProgress); // 0 -> 1 -> 0

          currentRadius =
            p.radius + (p.maxPulseRadius - p.radius) * easedProgress;

          const basePulseAlpha = 0.7; // Min alpha for the particle fill during pulse
          const dynamicPulseAlpha =
            basePulseAlpha + (1 - basePulseAlpha) * easedProgress; // Alpha from basePulseAlpha to 1
          currentColor = config.pulseColor.replace(
            /rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/,
            `rgba($1,$2,$3,${dynamicPulseAlpha})`
          );

          // Enhanced glow for pulsing particle
          currentShadowBlur = 10 + 15 * easedProgress; // Glow size from 10 up to 25

          const baseGlowAlpha = 0.3; // Min alpha for pulse glow
          const dynamicGlowAlpha =
            baseGlowAlpha + (0.7 - baseGlowAlpha) * easedProgress; // Glow alpha from 0.3 to 0.7

          const pulseRgbMatch = config.pulseColor.match(
            /rgba\((\d+,\s*\d+,\s*\d+)/
          );
          if (pulseRgbMatch) {
            currentShadowColor = `rgba(${pulseRgbMatch[1]}, ${dynamicGlowAlpha})`;
          } else {
            // Fallback if regex fails
            currentShadowColor = `rgba(255, 255, 255, ${dynamicGlowAlpha})`;
          }
        } else if (p.glowColor) {
          // Standard glow for non-pulsing particles
          currentShadowBlur = 10;
          currentShadowColor = p.glowColor; // Uses config.particleGlowColor (e.g., "rgba(173, 216, 230, 0.5)")
        }
        // If not pulsing and no p.glowColor, shadowBlur remains 0, shadowColor "transparent".

        ctx.shadowBlur = currentShadowBlur;
        ctx.shadowColor = currentShadowColor;

        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = currentColor;
        ctx.fill();

        // Reset shadow for next drawing operation (IMPORTANT for lines, signals, and other particles)
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
      });

      // Draw cursor follow particle - REMOVED
      // if (interactive && mousePosition.current) {
      //   ctx.beginPath();
      //   ctx.arc(
      //     mousePosition.current.x,
      //     mousePosition.current.y,
      //     config.cursorFollowParticleRadius, // This would cause an error as it's removed
      //     0,
      //     Math.PI * 2
      //   );
      //   ctx.fillStyle = config.cursorFollowParticleColor; // This would cause an error
      //   ctx.shadowBlur = 8;
      //   ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
      //   ctx.fill();
      //   ctx.shadowBlur = 0; // Reset shadow
      // }

      // Line and signal logic
      const newFrameLines: Line[] = [];
      for (let i = 0; i < particles.current.length; i++) {
        const p1 = particles.current[i];
        for (let j = i + 1; j < particles.current.length; j++) {
          const p2 = particles.current[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Particle repulsion
          if (distance < config.minParticleDistance && distance > 0) {
            // distance > 0 to avoid division by zero if particles overlap perfectly
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const repelForce =
              ((config.minParticleDistance - distance) /
                config.minParticleDistance) *
              config.particleRepelStrength;

            p1.vx += forceDirectionX * repelForce;
            p1.vy += forceDirectionY * repelForce;
            p2.vx -= forceDirectionX * repelForce;
            p2.vy -= forceDirectionY * repelForce;
          }

          if (distance < config.connectionDistance) {
            let lineToPushThisFrame: Line | null = null;

            const existingLineFromLastFrame = lines.current.find(
              (l) =>
                (l.from === p1 && l.to === p2) || (l.from === p2 && l.to === p1)
            );

            if (p1.justStartedPulsing) {
              lineToPushThisFrame = {
                from: p1,
                to: p2,
                isSignal: true,
                signalProgress: 0,
                signalStartTime: now,
              };
            } else if (p2.justStartedPulsing) {
              lineToPushThisFrame = {
                from: p2,
                to: p1,
                isSignal: true,
                signalProgress: 0,
                signalStartTime: now,
              };
            } else if (
              existingLineFromLastFrame &&
              existingLineFromLastFrame.isSignal &&
              existingLineFromLastFrame.signalStartTime
            ) {
              const progress =
                (now - existingLineFromLastFrame.signalStartTime) /
                config.signalDuration;
              if (progress < 1) {
                lineToPushThisFrame = {
                  from: existingLineFromLastFrame.from, // Maintain original direction
                  to: existingLineFromLastFrame.to,
                  isSignal: true,
                  signalProgress: progress,
                  signalStartTime: existingLineFromLastFrame.signalStartTime,
                };
              } else {
                // Signal completed
                lineToPushThisFrame = {
                  from: p1,
                  to: p2,
                  isSignal: false,
                  signalProgress: 1,
                  signalStartTime: undefined,
                };
              }
            } else {
              // No new pulse, no ongoing signal from last frame, or signal completed. Just a static line.
              lineToPushThisFrame = {
                from: p1,
                to: p2,
                isSignal: false,
                signalProgress: 1,
                signalStartTime: undefined,
              };
            }

            if (lineToPushThisFrame) {
              newFrameLines.push(lineToPushThisFrame);
            }
          }
        }
      }

      // Add lines to mouse if connectToMouse is true and mouse is present
      if (interactive && connectToMouse && mousePosition.current) {
        const { x: mouseX, y: mouseY } = mousePosition.current;
        particles.current.forEach((p) => {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < config.connectionDistance) {
            // Create a pseudo-particle for the mouse to use existing line drawing logic
            // This is a simplified approach; a more robust solution might involve
            // directly drawing lines to the mouse coordinates without creating a particle.
            const mouseParticle: Particle = {
              x: mouseX,
              y: mouseY,
              originX: mouseX,
              originY: mouseY,
              vx: 0,
              vy: 0,
              radius: 0, // Mouse doesn't have a radius in this context
              color: "", // Not drawn
            };
            newFrameLines.push({
              from: p,
              to: mouseParticle, // Connect particle to the mouse position
              isSignal: false, // Or true if you want signals to mouse
              signalProgress: 1,
              signalStartTime: undefined,
            });
          }
        });
      }
      lines.current = newFrameLines;

      lines.current.forEach((line) => {
        // Always draw the base connection line first
        ctx.beginPath();
        ctx.moveTo(line.from.x, line.from.y);
        ctx.lineTo(line.to.x, line.to.y);
        ctx.strokeStyle = config.lineColor;
        ctx.lineWidth = 0.4;
        ctx.stroke();

        // If this line has an active signal, draw it on top
        if (
          line.isSignal &&
          typeof line.signalProgress === "number" &&
          line.signalProgress < 1 &&
          line.signalProgress >= 0 // Ensure progress is valid
        ) {
          const progress = line.signalProgress;
          const startX = line.from.x;
          const startY = line.from.y;
          const endX = line.to.x;
          const endY = line.to.y;

          const signalHeadX = startX + (endX - startX) * progress;
          const signalHeadY = startY + (endY - startY) * progress;

          // Draw the signal as a bright circle
          ctx.beginPath();
          const signalRadius =
            config.particleRadius * config.signalRadiusFactor;
          ctx.arc(signalHeadX, signalHeadY, signalRadius, 0, Math.PI * 2);

          ctx.fillStyle = config.signalColor;

          // Subtle glow for the signal head
          ctx.shadowBlur = 7;
          // Correctly parse RGB from signalColor and apply new alpha for glow
          const signalRgbPartsMatch = config.signalColor.match(
            /rgba\\((\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+),[^)]*\\)/
          );
          if (signalRgbPartsMatch && signalRgbPartsMatch[1]) {
            ctx.shadowColor = `rgba(${signalRgbPartsMatch[1]}, 0.7)`;
          } else {
            // Fallback if signalColor is not in expected rgba format
            // Attempt to use signalColor directly, or use a default glow
            ctx.shadowColor = "rgba(255, 255, 255, 0.7)"; // Default white glow
          }

          ctx.fill();
          ctx.shadowBlur = 0; // Reset shadowBlur
        }
      });

      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      if (resizeAnimationFrameId) {
        cancelAnimationFrame(resizeAnimationFrameId);
      }
      resizeAnimationFrameId = requestAnimationFrame(() => {
        setCanvasDimensionsAndInitialize();
      });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (canvas) {
      // Ensure canvas exists before observing
      resizeObserver.observe(canvas);
    }

    // Initial animation start
    if (isVisible.current) {
      // Only start if initially visible
      animationFrameId.current = requestAnimationFrame(draw);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener("mousemove", handleMouseMove);
      // Ensure canvas is not null before removing event listener
      if (canvas) {
        canvas.removeEventListener("mouseleave", handleMouseLeave);
      }
      observer.unobserve(canvas); // Clean up IntersectionObserver
      resizeObserver.disconnect(); // Clean up ResizeObserver
    };
  }, [initializeParticles, interactive, config, connectToMouse]); // Added config and connectToMouse to dependencies

  return (
    <canvas
      ref={canvasRef}
      className={className} // className is now applied directly to the canvas
      style={{
        width: "100%", // Canvas will take full width of its parent
        height: "100%", // Canvas will take full height of its parent
        display: "block", // Recommended for canvas to avoid extra space
        touchAction: "none",
      }}
    />
  );
};

export default ParticleNetwork;
