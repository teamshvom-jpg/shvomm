import React from 'react';
import { motion } from 'framer-motion';

export default function ProgressBar({ currentStep, totalSteps, stepTitles = [] }) {
  const percentage = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between text-[11px] font-sans tracking-[0.2em] uppercase text-[#8E8880] mb-2.5">
        <span className="font-medium text-[#1A1A1A]">
          Phase {currentStep} of {totalSteps}
        </span>
        <span className="text-[#B89B6A] truncate ml-2 text-right">
          {stepTitles[currentStep - 1] || 'Curation in Progress'}
        </span>
      </div>

      <div className="h-[2px] w-full bg-[#E7E3DC] relative overflow-hidden">
        <motion.div
          className="h-full bg-[#B89B6A]"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
