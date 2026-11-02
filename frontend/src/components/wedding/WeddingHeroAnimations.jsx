import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart } from 'lucide-react';

/**
 * Traditional Hanging Brass Temple Bell with Chain, Clapper, Red Silk Tassel, and Chime Waves
 */
function HangingBrassBell({
  xPosition = "10%",
  chainHeight = 70,
  bellScale = 1,
  swingAngle = 7,
  duration = 4.5,
  delay = 0,
  showChime = true
}) {
  return (
    <motion.div
      className="absolute top-0 pointer-events-none select-none z-10"
      style={{
        left: xPosition,
        transformOrigin: "top center"
      }}
      animate={{
        rotate: [-swingAngle, swingAngle, -swingAngle]
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <svg
        width={40 * bellScale}
        height={(chainHeight + 65) * bellScale}
        viewBox={`0 0 40 ${chainHeight + 65}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible drop-shadow-[0_6px_14px_rgba(184,155,106,0.3)]"
      >
        {/* Brass Chain Links */}
        <g stroke="url(#antiqueBrassGrad)" strokeWidth="2.2">
          {Array.from({ length: Math.floor(chainHeight / 11) }).map((_, i) => (
            <ellipse
              key={i}
              cx="20"
              cy={6 + i * 11}
              rx="3"
              ry="5.5"
              fill="none"
            />
          ))}
        </g>

        {/* Hanging Ring / Hook */}
        <ellipse
          cx="20"
          cy={chainHeight}
          rx="4.5"
          ry="4"
          fill="none"
          stroke="url(#antiqueBrassGrad)"
          strokeWidth="2.5"
        />

        {/* Bell Body Group */}
        <g transform={`translate(0, ${chainHeight + 3})`}>
          {/* Bell Top Dome */}
          <path
            d="M 16 2 C 16 0.5, 24 0.5, 24 2 C 26 5, 27 8, 28 10 L 12 10 C 13 8, 14 5, 16 2 Z"
            fill="url(#brassDomeGrad)"
          />

          {/* Main Bell Flute */}
          <path
            d="M 12 10 C 13 18, 9 26, 4 33 C 4 37, 36 37, 36 33 C 31 26, 27 18, 28 10 Z"
            fill="url(#antiqueBrassGrad)"
            stroke="#7A5210"
            strokeWidth="0.8"
          />

          {/* Decorative Engraved Traditional Bands */}
          <path
            d="M 11 16 C 16 18, 24 18, 29 16"
            stroke="#593906"
            strokeWidth="1"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M 8 24 C 15 26.5, 25 26.5, 32 24"
            stroke="#593906"
            strokeWidth="1.2"
            fill="none"
            opacity="0.8"
          />

          {/* Auspicious Lotus Petal Engravings along the Bell Rim */}
          <path
            d="M 6 32 Q 9 28 12 32 Q 15 28 18 32 Q 21 28 24 32 Q 27 28 30 32 Q 33 28 35 32"
            stroke="#FFE49E"
            strokeWidth="1"
            fill="none"
            opacity="0.9"
          />

          {/* Fluted Bottom Lip */}
          <ellipse
            cx="20"
            cy="33"
            rx="16"
            ry="4"
            fill="url(#brassLipGrad)"
            stroke="#7A5210"
            strokeWidth="0.8"
          />
          <ellipse
            cx="20"
            cy="33"
            rx="13.5"
            ry="2.8"
            fill="#3B2503"
          />

          {/* Bell Clapper (Inner Pendulum Tongue) */}
          <g>
            {/* Clapper Rod */}
            <line x1="20" y1="30" x2="20" y2="40" stroke="#9C7536" strokeWidth="2" />
            {/* Golden Clapper Ball */}
            <circle cx="20" cy="40" r="3.8" fill="url(#brassBallGrad)" stroke="#5C3B05" strokeWidth="0.6" />

            {/* Sacred Red Silk Mauli Tassel beneath the bell */}
            <path
              d="M 19 43 L 17 56 C 18 57, 22 57, 23 56 L 21 43 Z"
              fill="url(#sacredRedTassel)"
            />
            {/* Golden Tassel Tie Band */}
            <line x1="18.5" y1="46" x2="21.5" y2="46" stroke="#FFEAA7" strokeWidth="1.2" />
          </g>
        </g>
      </svg>

      {/* Auspicious Chime Glow Ring (Sound Waves of the Bell) */}
      {showChime && (
        <motion.div
          className="absolute rounded-full border border-[#D4AF37]/40 pointer-events-none"
          style={{
            left: 20 * bellScale - 18,
            top: (chainHeight + 42) * bellScale,
            width: 36,
            height: 36
          }}
          animate={{
            scale: [0.8, 2.2],
            opacity: [0.65, 0]
          }}
          transition={{
            duration: 2.2,
            delay: delay + 0.4,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      )}
    </motion.div>
  );
}


/**
 * Traditional Hanging Toran (Auspicious Mango Leaves & Marigold Floral Swag along the top)
 */
function TraditionalFloralToran() {
  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none select-none z-0 overflow-hidden h-20 opacity-70">
      <svg
        width="100%"
        height="70"
        viewBox="0 0 1200 70"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Scalloped Gold & Marigold Hanging Garland Swags */}
        {Array.from({ length: 6 }).map((_, i) => {
          const startX = i * 200;
          const midX = startX + 100;
          const endX = startX + 200;
          return (
            <g key={i}>
              {/* Auspicious Green Mango Leaf (Aam ke Patte) at junctions */}
              <path
                d={`M ${startX} 0 C ${startX - 8} 12, ${startX - 12} 24, ${startX} 34 C ${startX + 12} 24, ${startX + 8} 12, ${startX} 0 Z`}
                fill="url(#mangoLeafGrad)"
              />
              <path
                d={`M ${startX} 4 L ${startX} 30`}
                stroke="#6B8E23"
                strokeWidth="0.8"
                opacity="0.8"
              />

              {/* Scalloped Golden Marigold Garland Thread */}
              <path
                d={`M ${startX} 10 Q ${midX} 52 ${endX} 10`}
                stroke="url(#marigoldOrange)"
                strokeWidth="3.5"
                strokeDasharray="4 3"
                fill="none"
              />
              <path
                d={`M ${startX} 12 Q ${midX} 54 ${endX} 12`}
                stroke="url(#marigoldYellow)"
                strokeWidth="2.5"
                strokeDasharray="3 4"
                fill="none"
              />

              {/* Marigold Blossom Beads along the scalloped curve */}
              <circle cx={startX + 35} cy={22} r="4" fill="url(#marigoldOrange)" />
              <circle cx={startX + 70} cy={37} r="4.5" fill="url(#marigoldYellow)" />
              <circle cx={midX} cy={42} r="5" fill="url(#marigoldOrange)" />
              <circle cx={startX + 130} cy={37} r="4.5" fill="url(#marigoldYellow)" />
              <circle cx={startX + 165} cy={22} r="4" fill="url(#marigoldOrange)" />

              {/* Mogra (Jasmine) white bead spacers */}
              <circle cx={midX} cy={48} r="2.5" fill="#FFFFFF" />
              <circle cx={midX} cy={54} r="2" fill="#FFF9E6" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Traditional Royal Palace Jharokha & Mandap Corner Arch (Udaipur & Jaipur Heritage)
 */
function TraditionalHeritageCorner({ position = "left" }) {
  const isRight = position === "right";
  return (
    <div
      className={`absolute top-0 ${
        isRight ? "right-0 scale-x-[-1]" : "left-0"
      } pointer-events-none hidden md:block select-none opacity-45 z-0`}
    >
      <motion.svg
        width="190"
        height="190"
        viewBox="0 0 190 190"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{
          opacity: [0.35, 0.65, 0.35]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Scalloped Royal Mughal / Rajput Palace Arch Lines */}
        <path
          d="M 0 0 C 50 6, 95 25, 130 65 C 165 105, 185 150, 190 190"
          stroke="#C29F72"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
        <path
          d="M 0 25 C 40 30, 75 48, 105 80 C 135 112, 152 148, 158 185"
          stroke="#B89B6A"
          strokeWidth="1.4"
        />

        {/* Traditional Auspicious Kalash & Diya Motif */}
        <g transform="translate(65, 65)">
          {/* Lotus Petal Arch Flourish */}
          <path
            d="M 0 0 C 12 -12, 28 -8, 28 8 C 28 24, 12 28, 0 0 Z"
            fill="#FAF2E6"
            stroke="#B89B6A"
            strokeWidth="1.2"
          />
          <circle cx="15" cy="8" r="3.5" fill="url(#marigoldOrange)" />
        </g>

        {/* Traditional Hanging Brass Bell Silhouette from the Corner */}
        <g transform="translate(35, 95)">
          <line x1="0" y1="0" x2="0" y2="28" stroke="#B89B6A" strokeWidth="1.2" strokeDasharray="2 2" />
          <path d="M -7 28 C -7 34, -11 40, -14 44 C -14 46, 14 46, 14 44 C 11 40, 7 34, 7 28 Z" fill="url(#antiqueBrassGrad)" />
          <circle cx="0" cy="48" r="2.5" fill="#FFEAA7" />
          <path d="M -1 51 L 0 58 L 1 51 Z" fill="#C0392B" />
        </g>

        <circle cx="28" cy="28" r="4" fill="#D4BE96" />
        <circle cx="60" cy="18" r="2.5" fill="#B89B6A" />
        <circle cx="18" cy="60" r="2.5" fill="#B89B6A" />
      </motion.svg>
    </div>
  );
}

/**
 * Traditional Pushpa Vrishti Petal Shower
 * - Marigold Orange (Genda Phool)
 * - Turmeric Yellow Marigold
 * - Fragrant White Jasmine (Mogra)
 * - Velvet Red Rose (Gulab)
 */
const TRADITIONAL_PETALS = [
  { id: 1, left: 5, size: 22, delay: 0, duration: 11, sway: 26, rotate: 180, type: 'marigold-orange' },
  { id: 2, left: 14, size: 18, delay: 3, duration: 13, sway: -22, rotate: 240, type: 'jasmine' },
  { id: 3, left: 23, size: 24, delay: 1.5, duration: 10, sway: 32, rotate: 320, type: 'marigold-yellow' },
  { id: 4, left: 32, size: 20, delay: 5, duration: 14, sway: -28, rotate: 160, type: 'gulab' },
  { id: 5, left: 41, size: 22, delay: 2.2, duration: 12, sway: 25, rotate: 210, type: 'marigold-orange' },
  { id: 6, left: 50, size: 17, delay: 6, duration: 11.5, sway: -20, rotate: 290, type: 'jasmine' },
  { id: 7, left: 59, size: 25, delay: 0.8, duration: 13.5, sway: 30, rotate: 190, type: 'marigold-yellow' },
  { id: 8, left: 68, size: 21, delay: 4.2, duration: 12, sway: -26, rotate: 270, type: 'gulab' },
  { id: 9, left: 77, size: 23, delay: 2.8, duration: 14, sway: 28, rotate: 220, type: 'marigold-orange' },
  { id: 10, left: 86, size: 18, delay: 1, duration: 10.5, sway: -24, rotate: 340, type: 'jasmine' },
  { id: 11, left: 93, size: 24, delay: 3.5, duration: 12.8, sway: 24, rotate: 200, type: 'marigold-yellow' },
  { id: 12, left: 28, size: 19, delay: 7, duration: 15, sway: -22, rotate: 170, type: 'gulab' },
  { id: 13, left: 73, size: 20, delay: 5.5, duration: 13, sway: 26, rotate: 230, type: 'marigold-orange' }
];

function TraditionalPetal({ petal }) {
  let fill = "url(#marigoldOrange)";
  let opacity = 0.85;

  if (petal.type === 'jasmine') {
    fill = "url(#jasmineMogra)";
    opacity = 0.8;
  } else if (petal.type === 'marigold-yellow') {
    fill = "url(#marigoldYellow)";
    opacity = 0.9;
  } else if (petal.type === 'gulab') {
    fill = "url(#gulabRose)";
    opacity = 0.85;
  }

  const isJasmine = petal.type === 'jasmine';

  return (
    <motion.div
      className="absolute top-0 pointer-events-none select-none"
      style={{
        left: `${petal.left}%`,
        width: petal.size,
        height: petal.size * (isJasmine ? 1 : 1.25),
        zIndex: 5
      }}
      initial={{
        y: -40,
        x: 0,
        opacity: 0,
        rotate: 0,
        scale: 0.7
      }}
      animate={{
        y: ["0vh", "92vh"],
        x: [0, petal.sway, -petal.sway * 0.7, petal.sway * 0.4, 0],
        opacity: [0, opacity, opacity, opacity * 0.75, 0],
        rotate: [0, petal.rotate * 0.4, petal.rotate * 0.8, petal.rotate],
        scale: [0.8, 1, 0.95, 0.9]
      }}
      transition={{
        duration: petal.duration,
        delay: petal.delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <svg
        viewBox={isJasmine ? "0 0 24 24" : "0 0 28 35"}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_6px_rgba(184,155,106,0.2)]"
      >
        {isJasmine ? (
          /* Star-shaped Jasmine (Mogra) Flower */
          <g transform="translate(12, 12)">
            {Array.from({ length: 5 }).map((_, i) => (
              <path
                key={i}
                d="M 0 0 C -2.5 -5, -1 -9, 0 -11 C 1 -9, 2.5 -5, 0 0 Z"
                fill="url(#jasmineMogra)"
                stroke="#E5DAC5"
                strokeWidth="0.4"
                transform={`rotate(${i * 72})`}
              />
            ))}
            <circle cx="0" cy="0" r="1.8" fill="#FFEAA7" />
          </g>
        ) : (
          /* Marigold / Rose Petal */
          <>
            <path
              d="M 14 2 C 22 2, 27 10, 26 21 C 25 29, 18 33, 14 33 C 10 33, 3 29, 2 21 C 1 10, 6 2, 14 2 Z"
              fill={fill}
            />
            <path
              d="M 14 6 C 14.5 15, 14.2 24, 14 29"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </motion.div>
  );
}

/**
 * Auspicious Golden Sparkles
 */
const SPARKLE_POINTS = [
  { top: '16%', left: '16%', size: 14, delay: 0 },
  { top: '24%', left: '82%', size: 16, delay: 1.2 },
  { top: '48%', left: '10%', size: 12, delay: 0.5 },
  { top: '64%', left: '88%', size: 15, delay: 1.8 },
  { top: '76%', left: '22%', size: 13, delay: 2.3 },
  { top: '30%', left: '50%', size: 11, delay: 0.9 },
  { top: '70%', left: '74%', size: 14, delay: 1.4 }
];

function AuspiciousSparkle({ point }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none text-[#C29F72]"
      style={{
        top: point.top,
        left: point.left,
        width: point.size,
        height: point.size
      }}
      animate={{
        scale: [0.5, 1.3, 0.5],
        opacity: [0.15, 0.85, 0.15],
        rotate: [0, 90, 180]
      }}
      transition={{
        duration: 3.6,
        delay: point.delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M 12 0 Q 12 12 24 12 Q 12 12 12 24 Q 12 12 0 12 Q 12 12 12 0 Z" />
      </svg>
    </motion.div>
  );
}

/**
 * Master Wedding Hero Animations (Traditional Royal Indian / Vivah Aesthetics)
 * Features:
 * - Hanging Temple Brass Bells (Ghanti) with sway & chime waves
 * - Traditional Floral Toran (Mango Leaves & Marigolds) along top
 * - Pushpa Vrishti (Marigold, Jasmine Mogra & Rose Petals)
 * - Auspicious Palace Jharokha Corner Filigree
 * - Traditional Blessings Floating Chips
 */
export default function WeddingHeroAnimations() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Universal Gradients for Brass, Marigolds, Sacred Silks & Heirlooms */}
      <svg width="0" height="0" className="absolute">
        <defs>
          {/* Antique Royal Brass Bell Gradient */}
          <linearGradient id="antiqueBrassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2D6" />
            <stop offset="25%" stopColor="#E2BD75" />
            <stop offset="60%" stopColor="#A87B2E" />
            <stop offset="85%" stopColor="#6E4810" />
            <stop offset="100%" stopColor="#B88A36" />
          </linearGradient>

          <linearGradient id="brassDomeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4AB58" />
            <stop offset="50%" stopColor="#FFF4D9" />
            <stop offset="100%" stopColor="#8A5C16" />
          </linearGradient>

          <linearGradient id="brassLipGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9C7228" />
            <stop offset="50%" stopColor="#FFEAA7" />
            <stop offset="100%" stopColor="#754E10" />
          </linearGradient>

          <radialGradient id="brassBallGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFF8E7" />
            <stop offset="45%" stopColor="#E0B669" />
            <stop offset="100%" stopColor="#6E470E" />
          </radialGradient>

          {/* Sacred Red Silk Mauli Tassel */}
          <linearGradient id="sacredRedTassel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#961B1B" />
            <stop offset="45%" stopColor="#D63031" />
            <stop offset="100%" stopColor="#781111" />
          </linearGradient>

          {/* Saffron Orange Marigold (Genda Phool) */}
          <linearGradient id="marigoldOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE082" />
            <stop offset="35%" stopColor="#FF9800" />
            <stop offset="80%" stopColor="#F57C00" />
            <stop offset="100%" stopColor="#E65100" />
          </linearGradient>

          {/* Turmeric Gold Marigold (Haldi Genda) */}
          <linearGradient id="marigoldYellow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF9C4" />
            <stop offset="45%" stopColor="#FFD54F" />
            <stop offset="85%" stopColor="#FFC107" />
            <stop offset="100%" stopColor="#FFA000" />
          </linearGradient>

          {/* Fragrant White Jasmine (Mogra) */}
          <linearGradient id="jasmineMogra" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="65%" stopColor="#FBF7EE" />
            <stop offset="100%" stopColor="#E8DFCF" />
          </linearGradient>

          {/* Auspicious Velvet Rose (Gulab) */}
          <linearGradient id="gulabRose" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFB3B3" />
            <stop offset="40%" stopColor="#D9455B" />
            <stop offset="80%" stopColor="#9C1A30" />
            <stop offset="100%" stopColor="#69091A" />
          </linearGradient>

          {/* Mango Leaf Green */}
          <linearGradient id="mangoLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8BC34A" />
            <stop offset="50%" stopColor="#558B2F" />
            <stop offset="100%" stopColor="#33691E" />
          </linearGradient>

          {/* Aura Sunburst Glow */}
          <radialGradient id="auraSunburst" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFEAA7" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0" />
          </radialGradient>

          {/* Lotus Petal Gradients */}
          <linearGradient id="lotusPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE0EB" />
            <stop offset="60%" stopColor="#F48FB1" />
            <stop offset="100%" stopColor="#C2185B" />
          </linearGradient>
          <linearGradient id="lotusGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF9E6" />
            <stop offset="60%" stopColor="#E2BD75" />
            <stop offset="100%" stopColor="#8A5C16" />
          </linearGradient>
        </defs>
      </svg>

      {/* 1. Traditional Hanging Floral Toran (Mango Leaves & Marigolds) */}
      <TraditionalFloralToran />

      {/* 2. Hanging Traditional Brass Temple Bells (Ghanti) with Pendulum Swing & Chime Glow */}
      {/* Left Pair */}
      <HangingBrassBell
        xPosition="8%"
        chainHeight={50}
        bellScale={1.05}
        swingAngle={8}
        duration={4.2}
        delay={0}
      />
      <HangingBrassBell
        xPosition="18%"
        chainHeight={95}
        bellScale={0.88}
        swingAngle={6}
        duration={4.8}
        delay={0.8}
      />

      {/* Center Left Subtle Accent */}
      <HangingBrassBell
        xPosition="29%"
        chainHeight={45}
        bellScale={0.75}
        swingAngle={7}
        duration={5.1}
        delay={1.5}
      />

      {/* Center Right Subtle Accent */}
      <HangingBrassBell
        xPosition="71%"
        chainHeight={48}
        bellScale={0.75}
        swingAngle={6.5}
        duration={4.9}
        delay={1.2}
      />

      {/* Right Pair */}
      <HangingBrassBell
        xPosition="82%"
        chainHeight={90}
        bellScale={0.88}
        swingAngle={6}
        duration={4.6}
        delay={0.5}
      />
      <HangingBrassBell
        xPosition="91%"
        chainHeight={55}
        bellScale={1.05}
        swingAngle={8}
        duration={4.3}
        delay={1.8}
      />

      {/* 3. Heritage Jharokha Corner Filigree in Top Corners */}
      <TraditionalHeritageCorner position="left" />
      <TraditionalHeritageCorner position="right" />

      {/* 4. Traditional Pushpa Vrishti (Marigold, Jasmine Mogra & Rose Petals) */}
      {TRADITIONAL_PETALS.map((petal) => (
        <TraditionalPetal key={petal.id} petal={petal} />
      ))}

      {/* 5. Auspicious Golden Sparkles */}
      {SPARKLE_POINTS.map((point, idx) => (
        <AuspiciousSparkle key={idx} point={point} />
      ))}

      {/* 6. Traditional Left Pill Tag (Desktop) */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{
          opacity: [0.85, 1, 0.85],
          y: [-5, 7, -5],
          x: 0
        }}
        transition={{
          y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          x: { duration: 0.8, ease: "easeOut" }
        }}
        className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-[#E8DFC8] shadow-[0_4px_16px_rgba(184,155,106,0.15)] absolute top-40 left-8 xl:left-14"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E65100] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E65100]"></span>
        </span>
        <span className="text-[#C0392B] text-sm">✦</span>
        <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#5A5A58] font-medium">
          Shubh Vivah Keepsakes
        </span>
      </motion.div>

      {/* 7. Traditional Right Pill Tag (Desktop) */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{
          opacity: [0.85, 1, 0.85],
          y: [6, -6, 6],
          x: 0
        }}
        transition={{
          y: { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
          opacity: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
          x: { duration: 0.8, ease: "easeOut" }
        }}
        className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-[#E8DFC8] shadow-[0_4px_16px_rgba(184,155,106,0.15)] absolute top-44 right-8 xl:right-14"
      >
        <span className="text-[#B89B6A] text-sm">❦</span>
        <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#5A5A58] font-medium">
          Pure Silver & Brass Heirlooms
        </span>
      </motion.div>
    </div>
  );
}
