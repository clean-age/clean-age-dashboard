import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="text-left">
          <h3 className="font-semibold text-slate-900 text-lg">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          size={20}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200`}
        style={{
          maxHeight: isOpen ? '1000px' : '0px',
        }}
      >
        <div className="px-6 py-4 border-t border-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
}