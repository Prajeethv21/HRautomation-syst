import React from 'react';

export const FlowingConnectionLines: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Layer 3: Soft radial gradient glow in the background */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full pointer-events-none z-0" 
        style={{
          background: 'radial-gradient(circle, rgba(168, 214, 114, 0.15) 0%, rgba(248, 255, 246, 0) 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* SVG Container for Lines and Leaves */}
      <svg className="w-full h-full relative z-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" preserveAspectRatio="none">
        <defs>
          {/* Subtle gradients matching branding for flowing lines */}
          <linearGradient id="flow-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8BC34A" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#A8D672" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#6FAF45" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="flow-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6FAF45" stopOpacity="0.32" />
            <stop offset="50%" stopColor="#8BC34A" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#A8D672" stopOpacity="0.32" />
          </linearGradient>
          <linearGradient id="flow-grad-3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A8D672" stopOpacity="0.30" />
            <stop offset="50%" stopColor="#6FAF45" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#8BC34A" stopOpacity="0.28" />
          </linearGradient>
        </defs>
        
        {/* Layer 1: Gentle flowing sustainability curves/paths */}
        <path
          d="M-50,150 C200,90 400,240 700,120 C1000,0 1100,180 1250,130"
          fill="none"
          stroke="url(#flow-grad-1)"
          strokeWidth="2.2"
          className="flow-path-s1"
        />

        <path
          d="M-20,100 C250,180 450,50 750,170 C1050,290 1120,100 1230,160"
          fill="none"
          stroke="url(#flow-grad-2)"
          strokeWidth="1.6"
          className="flow-path-s2"
        />

        <path
          d="M-80,200 C150,230 380,80 650,200 C920,320 1080,120 1260,180"
          fill="none"
          stroke="url(#flow-grad-3)"
          strokeWidth="1.8"
          className="flow-path-s3"
        />

        {/* Layer 2: Floating leaf outlines */}
        {/* Leaf 1 (Top Left) */}
        <g className="floating-leaf leaf-pos-1">
          <path 
            d="M 0,0 C 10,-12 25,-12 35,0 C 25,12 10,12 0,0 Z M 0,0 L 35,0" 
            fill="none" 
            stroke="#6FAF45" 
            strokeOpacity="0.32" 
            strokeWidth="1.2"
          />
        </g>
        
        {/* Leaf 2 (Mid Left/Bottom) */}
        <g className="floating-leaf leaf-pos-2">
          <path 
            d="M 0,0 C 8,-10 20,-10 28,0 C 20,10 8,10 0,0 Z M 0,0 L 28,0" 
            fill="none" 
            stroke="#A8D672" 
            strokeOpacity="0.35" 
            strokeWidth="1.0"
          />
        </g>

        {/* Leaf 3 (Top Right) */}
        <g className="floating-leaf leaf-pos-3">
          <path 
            d="M 0,0 C 12,-15 30,-15 42,0 C 30,15 12,15 0,0 Z M 0,0 L 42,0" 
            fill="none" 
            stroke="#8BC34A" 
            strokeOpacity="0.30" 
            strokeWidth="1.2"
          />
        </g>

        {/* Leaf 4 (Bottom Right) */}
        <g className="floating-leaf leaf-pos-4">
          <path 
            d="M 0,0 C 10,-12 25,-12 35,0 C 25,12 10,12 0,0 Z M 0,0 L 35,0" 
            fill="none" 
            stroke="#6FAF45" 
            strokeOpacity="0.32" 
            strokeWidth="1.1"
          />
        </g>

        {/* Gentle indicator flow pulses along paths */}
        <circle cx="0" cy="0" r="3.5" fill="#6FAF45" fillOpacity="0.5" className="moving-pulse-1" />
        <circle cx="0" cy="0" r="3" fill="#A8D672" fillOpacity="0.5" className="moving-pulse-2" />
      </svg>
      <style>{`
        /* Curve flowing animations using dashoffset */
        .flow-path-s1 {
          stroke-dasharray: 80, 40;
          animation: flowStroke 24s linear infinite;
        }
        .flow-path-s2 {
          stroke-dasharray: 60, 60;
          animation: flowStroke 32s linear infinite reverse;
        }
        .flow-path-s3 {
          stroke-dasharray: 100, 50;
          animation: flowStroke 40s linear infinite;
        }
        
        @keyframes flowStroke {
          to {
            stroke-dashoffset: -1000;
          }
        }

        /* Moving pulses along SVG paths */
        .moving-pulse-1 {
          motion-path: path("M-50,150 C200,90 400,240 700,120 C1000,0 1100,180 1250,130");
          offset-path: path("M-50,150 C200,90 400,240 700,120 C1000,0 1100,180 1250,130");
          animation: moveAlong 18s linear infinite;
        }

        .moving-pulse-2 {
          motion-path: path("M-20,100 C250,180 450,50 750,170 C1050,290 1120,100 1230,160");
          offset-path: path("M-20,100 C250,180 450,50 750,170 C1050,290 1120,100 1230,160");
          animation: moveAlong 25s linear infinite reverse;
        }

        @keyframes moveAlong {
          0% {
            offset-distance: 0%;
            motion-offset: 0%;
          }
          100% {
            offset-distance: 100%;
            motion-offset: 100%;
          }
        }

        /* Floating leaf placement and animations using CSS transforms */
        .leaf-pos-1 {
          transform: translate(120px, 40px) rotate(15deg);
          animation: leafFloat1 9s ease-in-out infinite;
        }
        .leaf-pos-2 {
          transform: translate(350px, 220px) rotate(-30deg);
          animation: leafFloat2 12s ease-in-out infinite;
        }
        .leaf-pos-3 {
          transform: translate(820px, 50px) rotate(45deg);
          animation: leafFloat3 10s ease-in-out infinite;
        }
        .leaf-pos-4 {
          transform: translate(1020px, 190px) rotate(-10deg);
          animation: leafFloat4 14s ease-in-out infinite;
        }

        @keyframes leafFloat1 {
          0%, 100% { transform: translate(120px, 40px) rotate(15deg); }
          50% { transform: translate(125px, 32px) rotate(22deg); }
        }

        @keyframes leafFloat2 {
          0%, 100% { transform: translate(350px, 220px) rotate(-30deg); }
          50% { transform: translate(342px, 228px) rotate(-22deg); }
        }

        @keyframes leafFloat3 {
          0%, 100% { transform: translate(820px, 50px) rotate(45deg); }
          50% { transform: translate(828px, 42px) rotate(52deg); }
        }

        @keyframes leafFloat4 {
          0%, 100% { transform: translate(1020px, 190px) rotate(-10deg); }
          50% { transform: translate(1015px, 182px) rotate(-5deg); }
        }
      `}</style>
    </div>
  );
};

export default FlowingConnectionLines;
