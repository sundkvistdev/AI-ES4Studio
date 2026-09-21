/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pinny - The Annoying Office-Style Desktop Assistant for ES4 Studio 2002
 * Appears when "In-depth Help (CodeMagic)" setting is enabled.
 */

import React, { useState, useEffect } from 'react';
import { X, Sparkles, HelpCircle, MessageSquare, Flame } from 'lucide-react';

interface PinnyProps {
  onDisableHelp: () => void;
  diagnosticCount?: number;
  statusMessage?: string;
}

const HILARIOUS_TIPS = [
  "It looks like you're writing ECMAScript 4! Would you like me to prematurely abandon this draft and wait for ES6 in 2015?",
  "Hi there! I'm Pinny, your CodeMagic™ AI assistant! Did you know? In 2002, embedding raw XML (E4X) into JavaScript was considered peak enterprise engineering!",
  "It looks like you're declaring a variable. Would you like me to replace all your types with 'any' so it compiles regardless of truth?",
  "Warning: Your program has 0 classes. Why are you writing ES4 if you're not building a 7-tier polymorphic inheritance tree?",
  "I noticed you compiled to bytecode! Shall I rearrange your opcodes in alphabetical order to boost morale?",
  "Tip: Garbage collection is like love—if you don't force it manually with the GC button, you'll end up with a memory leak.",
  "Need help? I can either explain type annotations or pretend I didn't see that syntax error on line 1.",
  "Did you know? In ES4, 'const' cannot be reassigned, but your project deadlines certainly can.",
  "I am watching every single keystroke. Cutting-edge 2002 heuristics indicate you are doing great!",
  "Thinking about using 'eval()'? Don't worry, Netscape and Macromedia engineers assured us nothing could ever go wrong.",
  "It looks like you're writing a function! Would you like me to insert 40 lines of Javadoc boilerplate?",
  "Hot tip: If the VM halts with an error, just pretend it was an intentional design decision."
];

const BAD_ADVICE = [
  "Remove all semicolons! JavaScript is completely forgiving and will definitely guess your intentions accurately.",
  "Name every variable 'temp1', 'temp2', and 'temp_final_v2_real'. It saves time!",
  "Why use type annotations like ': int' when you can spend 3 hours debugging type coercion at 2 AM?",
  "If an error occurs, simply catch it and do nothing. Ignorance is bliss in runtime execution!",
  "Who needs comments? Real coders decipher the raw hex dump directly."
];

export const Pinny: React.FC<PinnyProps> = ({ onDisableHelp, diagnosticCount = 0, statusMessage }) => {
  const [tipIndex, setTipIndex] = useState(0);
  const [speechText, setSpeechText] = useState(HILARIOUS_TIPS[0]);
  const [isWiggling, setIsWiggling] = useState(false);
  const [eyeState, setEyeState] = useState<'normal' | 'blink' | 'wink' | 'look_left'>('normal');
  const [isBubbleOpen, setIsBubbleOpen] = useState(true);

  // Periodic unhelpful advice & blink animations
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeState('blink');
      setTimeout(() => setEyeState('normal'), 250);
    }, 4500);

    return () => clearInterval(blinkInterval);
  }, []);

  // React to errors if any
  useEffect(() => {
    if (diagnosticCount > 0) {
      setSpeechText(`Uh-oh! I detected ${diagnosticCount} compiler problem${diagnosticCount > 1 ? 's' : ''}! Would you like me to blame the parser?`);
      setIsBubbleOpen(true);
      triggerWiggle();
    }
  }, [diagnosticCount]);

  const triggerWiggle = () => {
    setIsWiggling(true);
    setTimeout(() => setIsWiggling(false), 700);
  };

  const handleNextTip = () => {
    const nextIdx = (tipIndex + 1) % HILARIOUS_TIPS.length;
    setTipIndex(nextIdx);
    setSpeechText(HILARIOUS_TIPS[nextIdx]);
    setEyeState('wink');
    setTimeout(() => setEyeState('normal'), 400);
    triggerWiggle();
  };

  const handleBadAdvice = () => {
    const randomBad = BAD_ADVICE[Math.floor(Math.random() * BAD_ADVICE.length)];
    setSpeechText(randomBad);
    setEyeState('look_left');
    setTimeout(() => setEyeState('normal'), 600);
    triggerWiggle();
  };

  const handlePoke = () => {
    const pokeResponses = [
      "Ouch! Watch the pin point!",
      "Hey! I'm an advanced 2002 AI, not a pincushion!",
      "Poking me won't fix your stack overflow!",
      "*Wiggle wiggle* I am pleased to assist you!",
      "Stop clicking me and write some ECMAScript 4!"
    ];
    setSpeechText(pokeResponses[Math.floor(Math.random() * pokeResponses.length)]);
    setIsBubbleOpen(true);
    triggerWiggle();
  };

  return (
    <div className="fixed bottom-9 right-8 z-50 flex flex-col items-end pointer-events-none select-none">
      {/* Retro Speech Bubble (Windows Assistant style) */}
      {isBubbleOpen && (
        <div 
          className="pointer-events-auto mb-2 w-72 bg-[#ffffea] border-2 border-[#404040] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] rounded-lg p-2.5 text-[11px] text-[#222] font-sans relative swing-bevel-raised"
          style={{ fontFamily: 'Tahoma, Arial, sans-serif' }}
        >
          {/* Bubble Header */}
          <div className="flex items-center justify-between border-b border-[#e0deb0] pb-1 mb-1.5">
            <div className="flex items-center gap-1 font-bold text-[#0a246a]">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Pinny - CodeMagic™ Assistant</span>
            </div>
            <button
              onClick={() => setIsBubbleOpen(false)}
              title="Minimize Bubble"
              className="text-[#888] hover:text-black font-bold px-1 rounded-xs hover:bg-[#eae8c0]"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Assistant Text */}
          <p className="leading-snug text-[#111] min-h-[42px]">
            {speechText}
          </p>

          {/* Interactive Choice Buttons */}
          <div className="mt-2.5 pt-1.5 border-t border-[#d8d6a8] flex flex-col gap-1">
            <button
              onClick={handleNextTip}
              className="w-full text-left px-1.5 py-0.5 bg-[#f6f4d2] hover:bg-[#0a246a] hover:text-white border border-[#ccc] rounded-xs text-[10px] flex items-center gap-1 font-semibold cursor-pointer"
            >
              <HelpCircle className="w-3 h-3 text-blue-700" />
              <span>Give me another tip</span>
            </button>
            <button
              onClick={handleBadAdvice}
              className="w-full text-left px-1.5 py-0.5 bg-[#f6f4d2] hover:bg-[#0a246a] hover:text-white border border-[#ccc] rounded-xs text-[10px] flex items-center gap-1 text-[#802000] font-semibold cursor-pointer"
            >
              <Flame className="w-3 h-3 text-red-600" />
              <span>Give me terrible advice</span>
            </button>
          </div>

          {/* Footer to turn off */}
          <div className="mt-2 flex items-center justify-between text-[9px] text-gray-500 pt-1 border-t border-dotted border-[#ccc]">
            <button 
              onClick={onDisableHelp} 
              className="underline hover:text-red-700 cursor-pointer"
            >
              Don't show this assistant
            </button>
            <span className="italic text-gray-400">In-depth Help (Active)</span>
          </div>

          {/* Speech Bubble Arrow pointing to Pinny */}
          <div 
            className="absolute -bottom-2 right-12 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#404040]"
          />
          <div 
            className="absolute -bottom-[6px] right-12 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[7px] border-t-[#ffffea]"
          />
        </div>
      )}

      {/* Pinny Mascot Avatar */}
      <div
        onClick={handlePoke}
        title="Click Pinny for help (or annoyance)!"
        className={`pointer-events-auto cursor-pointer transition-transform duration-200 ${
          isWiggling ? 'animate-bounce scale-110 rotate-6' : 'hover:scale-105'
        }`}
      >
        <svg
          width="76"
          height="88"
          viewBox="0 0 100 110"
          className="drop-shadow-lg"
          style={{ filter: 'drop-shadow(3px 5px 3px rgba(0,0,0,0.35))' }}
        >
          {/* Shadow underneath */}
          <ellipse cx="50" cy="104" rx="20" ry="4" fill="rgba(0,0,0,0.25)" />

          {/* Metal Needle Tip */}
          <polygon points="50,105 45,72 55,72" fill="#b0b0b0" stroke="#505050" strokeWidth="1.5" />
          <polygon points="50,105 48,72 52,72" fill="#e0e0e0" />

          {/* Metallic Pin Collar */}
          <ellipse cx="50" cy="72" rx="12" ry="4" fill="#888" stroke="#444" strokeWidth="1.5" />
          <ellipse cx="50" cy="71" rx="10" ry="3" fill="#ccc" />

          {/* Pushpin Lower Body (Conical Stem) */}
          <path
            d="M 40,71 C 42,56 36,44 32,38 L 68,38 C 64,44 58,56 60,71 Z"
            fill="#e53935"
            stroke="#8e0000"
            strokeWidth="2"
          />
          {/* Highlight on stem */}
          <path
            d="M 46,70 C 47,56 42,46 39,40 L 44,40 C 47,46 51,56 50,70 Z"
            fill="#ff7961"
            opacity="0.6"
          />

          {/* Pushpin Waist / Ridge */}
          <ellipse cx="50" cy="38" rx="24" ry="7" fill="#c62828" stroke="#5f0000" strokeWidth="2" />
          <ellipse cx="50" cy="36" rx="22" ry="5.5" fill="#ef5350" />

          {/* Pushpin Top Knob (Head) */}
          <ellipse cx="50" cy="24" rx="28" ry="16" fill="#e53935" stroke="#8e0000" strokeWidth="2" />
          {/* Top Head Specular Highlight */}
          <ellipse cx="44" cy="18" rx="16" ry="7" fill="#ff867c" opacity="0.8" />
          <ellipse cx="40" cy="15" rx="7" ry="3" fill="#ffffff" opacity="0.9" />

          {/* Pinny Cartoon Eyebrows */}
          <path d="M 33,14 Q 41,10 47,15" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" />
          <path d="M 53,15 Q 59,10 67,14" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" />

          {/* Left Googly Eye */}
          <ellipse cx="40" cy="24" rx="7.5" ry="9" fill="#ffffff" stroke="#333" strokeWidth="1.5" />
          {eyeState === 'blink' ? (
            <line x1="33" y1="24" x2="47" y2="24" stroke="#222" strokeWidth="2.5" />
          ) : (
            <>
              <circle
                cx={eyeState === 'look_left' ? 36 : 41}
                cy={25}
                r="3.5"
                fill="#000"
              />
              <circle
                cx={eyeState === 'look_left' ? 35 : 39}
                cy={23}
                r="1.2"
                fill="#fff"
              />
            </>
          )}

          {/* Right Googly Eye */}
          <ellipse cx="60" cy="24" rx="7.5" ry="9" fill="#ffffff" stroke="#333" strokeWidth="1.5" />
          {eyeState === 'blink' || eyeState === 'wink' ? (
            <path d="M 53,24 Q 60,28 67,24" fill="none" stroke="#222" strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <>
              <circle
                cx={eyeState === 'look_left' ? 56 : 59}
                cy={25}
                r="3.5"
                fill="#000"
              />
              <circle
                cx={eyeState === 'look_left' ? 55 : 57}
                cy={23}
                r="1.2"
                fill="#fff"
              />
            </>
          )}

          {/* Pinny Cheerful / Sarcastic Smirk */}
          <path
            d="M 44,32 Q 51,37 58,31"
            fill="none"
            stroke="#3a0000"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        {/* Small Notification Indicator if bubble is closed */}
        {!isBubbleOpen && (
          <div className="absolute -top-1 -right-1 bg-amber-400 text-black rounded-full p-1 border border-black shadow animate-pulse">
            <MessageSquare className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );
};
