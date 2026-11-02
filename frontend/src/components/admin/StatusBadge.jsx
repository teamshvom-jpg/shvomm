import React from 'react';

export default function StatusBadge({ status = 'New' }) {
  const styles = {
    New: 'bg-[#B89B6A]/15 text-[#B89B6A] border-[#B89B6A]/30',
    Contacted: 'bg-stone-200 text-stone-800 border-stone-300',
    Quoted: 'bg-amber-100 text-amber-900 border-amber-300',
    Confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    Closed: 'bg-stone-100 text-stone-500 border-stone-200'
  };

  const currentStyle = styles[status] || styles.New;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 border text-[10px] font-sans uppercase tracking-[0.14em] font-medium rounded-sm ${currentStyle}`}
    >
      {status}
    </span>
  );
}
