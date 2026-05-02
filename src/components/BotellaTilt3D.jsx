import { useRef, useState } from 'react'

/**
 * Botella con efecto 3D parallax + flotación + reflejo.
 * - Sigue al puntero del ratón con una rotación suave (perspective tilt).
 * - En móvil tiene una animación de flotación lenta.
 * - Reflejo bajo la botella que se desplaza ligeramente con la rotación.
 *
 * Props:
 *   src         — URL de la imagen
 *   alt         — texto alternativo
 *   tamaño      — 'pequeño' | 'mediano' | 'grande'  (default mediano)
 *   intensidad  — número de 0 a 30, grados máximos de rotación (default 14)
 *   reflejo     — true/false (default true)
 */
export default function BotellaTilt3D({
  src,
  alt = '',
  tamaño = 'mediano',
  intensidad = 14,
  reflejo = true,
}) {
  const ref = useRef(null)
  const [rot, setRot] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState(false)

  const dim = {
    pequeño:  { w: 70,  h: 110 },
    mediano:  { w: 130, h: 200 },
    grande:   { w: 220, h: 330 },
  }[tamaño] || { w: 130, h: 200 }

  function handleMove(e) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width   // 0..1
    const py = (e.clientY - rect.top) / rect.height
    const rotY = (px - 0.5) * intensidad * 2   // -intensidad..+intensidad
    const rotX = (0.5 - py) * intensidad * 2
    setRot({ x: rotX, y: rotY })
  }
  function handleLeave() {
    setRot({ x: 0, y: 0 })
    setHover(false)
  }

  // El reflejo se mueve en sentido contrario para dar sensación de profundidad
  const reflejoOffsetX = -rot.y * 0.4
  const reflejoSkew = rot.y * 0.3

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={handleLeave}
      style={{
        width: dim.w,
        height: dim.h + (reflejo ? 36 : 0),
        position: 'relative',
        perspective: '900px',
        transformStyle: 'preserve-3d',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* La botella en sí */}
      <div
        className="botella-3d-flotar"
        style={{
          width: '100%',
          height: dim.h,
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg) ${hover ? 'translateZ(20px)' : 'translateZ(0)'}`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.18s cubic-bezier(0.22,1,0.36,1)',
          willChange: 'transform',
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            // Multiply funde el fondo blanco de la foto con el fondo crema de la app
            mixBlendMode: 'multiply',
            // Sombra dinámica que sigue a la rotación → profundidad
            filter: `drop-shadow(${rot.y * -0.6}px ${8 + Math.abs(rot.x) * 0.4}px ${10 + Math.abs(rot.y) * 0.5}px rgba(40,30,20,${0.20 + Math.abs(rot.y) * 0.005}))`,
            imageRendering: 'auto',
            transition: 'filter 0.2s',
          }}
        />
      </div>

      {/* Reflejo en el "suelo" */}
      {reflejo && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '36px',
            transform: `translateX(${reflejoOffsetX}px) skewX(${reflejoSkew}deg) scaleY(-1)`,
            transformOrigin: 'top center',
            opacity: 0.22,
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 80%)',
            pointerEvents: 'none',
            transition: 'transform 0.18s, opacity 0.2s',
          }}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '120%',  /* recortamos solo la base */
              objectFit: 'contain',
              objectPosition: 'top',
              filter: 'blur(1px)',
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes botella3d-flotar {
          0%, 100% { translate: 0 0; }
          50%      { translate: 0 -4px; }
        }
        .botella-3d-flotar {
          animation: botella3d-flotar 4.5s ease-in-out infinite;
        }
        .botella-3d-flotar:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .botella-3d-flotar { animation: none; }
        }
      `}</style>
    </div>
  )
}
