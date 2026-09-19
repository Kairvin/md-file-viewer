import React, { useRef, useState } from 'react';
import { 
  X, 
  Check, 
  Settings, 
  Bell, 
  User, 
  FileSpreadsheet, 
  Layers, 
  ShieldCheck, 
  FileCode, 
  FileText, 
  Presentation,
  Sparkles,
  Upload
} from 'lucide-react';

export default function ToolsModal({
  isOpen,
  onClose,
  activeTool = 'markdown',
  onSelectTool,
  onOpenDocxFile,
  onOpenPptxFile,
  onOpenMarkdownFile,
  onLoadSampleWord,
  onLoadSamplePptx
}) {
  const [billingCycle, setBillingCycle] = useState('annual'); // 'annual' | 'monthly'
  const docxInputRef = useRef(null);
  const pptxInputRef = useRef(null);
  const mdInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e, handler) => {
    const file = e.target.files?.[0];
    if (file) {
      handler(file);
      onClose();
    }
    e.target.value = '';
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Editorial Sepia typography style
  const sepiaStyle = {
    fontFamily: "'Charter', 'Merriweather', 'Georgia', serif"
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto custom-scrollbar"
      onClick={handleBackdropClick}
    >
      {/* Outer Card with Warm Ambient Sepia Canvas */}
      <div 
        className="relative w-full max-w-6xl my-auto rounded-[2.25rem] sm:rounded-[2.75rem] bg-[#FBF8EE] text-[#2D261E] border border-[#E8DFCE] shadow-[0_35px_110px_-15px_rgba(45,38,30,0.32),0_0_0_1px_rgba(232,223,206,0.6)] overflow-hidden flex flex-col transition-all"
        style={sepiaStyle}
        role="dialog"
        aria-modal="true"
      >
        {/* Soft Golden Ambient Radial Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-200/25 blur-3xl rounded-full pointer-events-none -z-0" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-100/30 blur-3xl rounded-full pointer-events-none -z-0" />

        {/* Top Header Bar */}
        <div className="relative z-10 px-6 sm:px-10 pt-6 sm:pt-8 pb-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#EAE3D2]/70">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#232528] text-white flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-extrabold text-sm tracking-widest text-[#232528] uppercase font-sans">
              CREXTIO
            </span>
          </div>

          {/* Right Utility Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs text-[#554D40]">
            <span className="hidden md:inline-block px-3.5 py-1.5 rounded-full bg-white/80 border border-[#E6DECB] font-medium shadow-2xs">
              Dashboard
            </span>
            <span className="hidden md:inline-block px-3.5 py-1.5 rounded-full bg-white/80 border border-[#E6DECB] font-medium shadow-2xs">
              People
            </span>
            <span className="hidden lg:inline-block px-3.5 py-1.5 rounded-full bg-white/80 border border-[#E6DECB] font-medium shadow-2xs">
              Hiring
            </span>
            <span className="hidden lg:inline-block px-3.5 py-1.5 rounded-full bg-white/80 border border-[#E6DECB] font-medium shadow-2xs">
              Devices
            </span>
            <span className="hidden sm:inline-block px-3.5 py-1.5 rounded-full bg-white/80 border border-[#E6DECB] font-medium shadow-2xs">
              Salary
            </span>
            <span className="hidden sm:inline-block px-3.5 py-1.5 rounded-full bg-white/80 border border-[#E6DECB] font-medium shadow-2xs">
              Apps
            </span>

            <button 
              onClick={() => onSelectTool('markdown')}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-[#F2ECE0] border border-[#E6DECB] flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5 text-[#63594C]" />
              <span className="font-medium text-[11px]">Setting</span>
            </button>

            <div className="w-8 h-8 rounded-full bg-white border border-[#E6DECB] flex items-center justify-center text-[#63594C] shadow-2xs">
              <Bell className="w-3.5 h-3.5" />
            </div>

            <div className="w-8 h-8 rounded-full bg-white border border-[#E6DECB] flex items-center justify-center text-[#63594C] shadow-2xs">
              <User className="w-3.5 h-3.5" />
            </div>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#232528] hover:bg-black text-white flex items-center justify-center transition-colors shadow-xs ml-1"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Headline & Segmented Pill Switch */}
        <div className="relative z-10 px-6 sm:px-10 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#232528] tracking-tight">
            Pricing
          </h1>

          {/* Segmented Pill Switch (Annual vs Monthly) */}
          <div className="inline-flex items-center p-1 bg-[#232528] rounded-full shadow-xs self-start sm:self-center">
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 sm:px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                billingCycle === 'annual'
                  ? 'bg-[#3A3C40] text-white shadow-2xs'
                  : 'text-[#9FA6B2] hover:text-white'
              }`}
            >
              Annual
            </button>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 sm:px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-[#3A3C40] text-white shadow-2xs'
                  : 'text-[#9FA6B2] hover:text-white'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Hidden file pickers */}
        <input 
          type="file" 
          ref={docxInputRef} 
          accept=".docx" 
          className="hidden" 
          onChange={(e) => handleFileChange(e, onOpenDocxFile)} 
        />
        <input 
          type="file" 
          ref={pptxInputRef} 
          accept=".pptx" 
          className="hidden" 
          onChange={(e) => handleFileChange(e, onOpenPptxFile)} 
        />
        <input 
          type="file" 
          ref={mdInputRef} 
          accept=".md,.markdown,.txt" 
          className="hidden" 
          onChange={(e) => handleFileChange(e, onOpenMarkdownFile)} 
        />

        {/* 3 Pricing-Style Tool Cards */}
        <div className="relative z-10 px-6 sm:px-10 pb-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 items-stretch">
          
          {/* CARD 1: Recruit Basic / Markdown Engine (Light Card) */}
          <div className="relative rounded-[2rem] p-6 sm:p-7 bg-[#F4F1E8] border border-[#E6DECB] flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
            {/* Top-Right Pill Badge */}
            <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECE5D4] text-[#63594C] text-[11px] font-semibold border border-[#E0D6C1]">
              <span>Active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C]" />
            </div>

            <div>
              {/* Category Title */}
              <h3 className="text-base sm:text-lg font-bold text-[#232528] text-center mb-4 mt-1">
                Recruit Basic
              </h3>

              {/* Price / Hero Display */}
              <div className="flex items-baseline justify-center gap-2 mb-3">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#232528] tracking-tight">
                  $17
                </span>
                <div className="text-xs text-[#796C5E] leading-tight text-left">
                  <div>/ month (USD)</div>
                  <div className="text-[#968878] font-normal">$228 billed yearly</div>
                </div>
              </div>

              {/* Subtitle */}
              <p className="text-xs text-[#796C5E] text-center mb-6 leading-relaxed min-h-[44px]">
                Get started with essential tools to manage your team efficiently. Ideal for small teams with fundamental needs
              </p>

              {/* Dotted / Dashed Line */}
              <div className="border-t border-dashed border-[#DDD5C0] my-5" />

              {/* Feature Checklist */}
              <div className="space-y-3.5 mb-7 text-xs text-[#4A4237]">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Access to core HR features</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Employee record management</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Basic reporting tools</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Manage up to 10 team members</span>
                </div>

                {/* Inactive / Cross items */}
                <div className="flex items-center gap-3 text-[#A89F91]">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <X className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <span>Track employee attendance</span>
                </div>
                <div className="flex items-center gap-3 text-[#A89F91]">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <X className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <span>Assign and monitor tasks</span>
                </div>
                <div className="flex items-center gap-3 text-[#A89F91]">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <X className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <span>Email support</span>
                </div>
                <div className="flex items-center gap-3 text-[#A89F91]">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <X className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <span>Simple onboarding process</span>
                </div>
                <div className="flex items-center gap-3 text-[#A89F91]">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <X className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <span>Designed user-focused interfaces</span>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="space-y-2 mt-auto">
              <button
                onClick={() => {
                  onSelectTool('markdown');
                  onClose();
                }}
                className="w-full py-3 px-6 rounded-full bg-white hover:bg-[#EFE9DA] text-[#232528] border border-[#DDD5C0] font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>{activeTool === 'markdown' ? 'Currently Active' : 'Cancel'}</span>
              </button>
              <button
                onClick={() => mdInputRef.current?.click()}
                className="w-full text-center text-[11px] text-[#796C5E] hover:text-[#232528] underline transition-colors"
              >
                Open Markdown (.md) File
              </button>
            </div>
          </div>


          {/* CARD 2: Talent Pro / Word Document Studio (Center Charcoal Hero Card) */}
          <div className="relative rounded-[2rem] p-6 sm:p-7 bg-[#232528] text-white border-2 border-[#E5C858] shadow-[0_25px_60px_-10px_rgba(0,0,0,0.6),0_0_0_1px_rgba(229,200,88,0.4)] flex flex-col justify-between transition-all scale-[1.02] z-10">
            {/* Top-Right Diagonal Striped Yellow Badge */}
            <div 
              className="absolute top-0 right-8 px-4 py-1.5 rounded-b-2xl font-bold text-xs text-[#1E2023] flex items-center gap-1.5 shadow-md overflow-hidden select-none"
              style={{
                background: 'repeating-linear-gradient(45deg, #F5D365, #F5D365 7px, #E8C14A 7px, #E8C14A 14px)'
              }}
            >
              <span>Save 27%</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E2023]" />
            </div>

            <div>
              {/* Category Title */}
              <h3 className="text-base sm:text-lg font-bold text-white text-center mb-4 mt-2">
                Talent Pro
              </h3>

              {/* Price / Hero Display with Strikethrough & Gold Price */}
              <div className="flex items-baseline justify-center gap-2 mb-3">
                <span className="text-3xl font-extrabold text-[#757B85] line-through tracking-tight mr-1">
                  $26
                </span>
                <span className="text-4xl sm:text-5xl font-extrabold text-[#F4D35E] tracking-tight">
                  $19
                </span>
                <div className="text-xs text-[#9FA6B2] leading-tight text-left">
                  <div className="text-[#F4D35E]">/ month (USD)</div>
                  <div className="text-[#F4D35E]/80 font-normal">$228 billed yearly</div>
                </div>
              </div>

              {/* Subtitle */}
              <p className="text-xs text-[#9FA6B2] text-center mb-6 leading-relaxed min-h-[44px]">
                A comprehensive solution for growing teams, offering enhanced features to streamline HR processes
              </p>

              {/* Dotted / Dashed Line in Dark Card */}
              <div className="border-t border-dashed border-[#3A3D42] my-5" />

              {/* Feature Checklist */}
              <div className="space-y-3.5 mb-7 text-xs text-[#E1E4EA]">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Access to core HR features</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Employee record management</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Basic reporting tools</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Manage up to 10 team members</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Track employee attendance</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Assign and monitor tasks</span>
                </div>

                {/* Cross items */}
                <div className="flex items-center gap-3 text-[#5A606A]">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <X className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <span>Email support</span>
                </div>
                <div className="flex items-center gap-3 text-[#5A606A]">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <X className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <span>Simple onboarding process</span>
                </div>
                <div className="flex items-center gap-3 text-[#5A606A]">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <X className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <span>Designed user-focused interfaces</span>
                </div>
              </div>
            </div>

            {/* Bottom Button (High Contrast White Pill) */}
            <div className="space-y-2 mt-auto">
              <button
                onClick={() => {
                  onSelectTool('word');
                  onClose();
                }}
                className="w-full py-3.5 px-6 rounded-full bg-white hover:bg-[#F4F1EA] text-[#1F2124] font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>{activeTool === 'word' ? 'Currently Active' : 'Start 7-days Free Trial'}</span>
              </button>
              <div className="flex items-center justify-center gap-3 text-[11px] text-[#9FA6B2]">
                <button
                  onClick={() => docxInputRef.current?.click()}
                  className="hover:text-white underline transition-colors"
                >
                  Open .docx File
                </button>
                <span>·</span>
                <button
                  onClick={() => {
                    onLoadSampleWord();
                    onClose();
                  }}
                  className="hover:text-white underline transition-colors"
                >
                  Try Sample Brief
                </button>
              </div>
            </div>
          </div>


          {/* CARD 3: HR Master / PowerPoint Studio (Light Card) */}
          <div className="relative rounded-[2rem] p-6 sm:p-7 bg-[#FFFFFF] border border-[#E6DECB] flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
            {/* Top-Right Pill Badge */}
            <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3EFE4] text-[#63594C] text-[11px] font-semibold border border-[#E0D6C1]">
              <span>Popular</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#528A2C]" />
            </div>

            <div>
              {/* Category Title */}
              <h3 className="text-base sm:text-lg font-bold text-[#232528] text-center mb-4 mt-1">
                HR Master
              </h3>

              {/* Price / Hero Display */}
              <div className="flex items-baseline justify-center gap-2 mb-3">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#232528] tracking-tight">
                  $34
                </span>
                <div className="text-xs text-[#796C5E] leading-tight text-left">
                  <div>/ month (USD)</div>
                  <div className="text-[#968878] font-normal">$408 billed yearly</div>
                </div>
              </div>

              {/* Subtitle */}
              <p className="text-xs text-[#796C5E] text-center mb-6 leading-relaxed min-h-[44px]">
                Maximize team performance with premium tools and full customization options, perfect for larger organizations
              </p>

              {/* Dotted / Dashed Line */}
              <div className="border-t border-dashed border-[#DDD5C0] my-5" />

              {/* Feature Checklist (All green checkmarks) */}
              <div className="space-y-3.5 mb-7 text-xs text-[#4A4237]">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Access to core HR features</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Employee record management</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Basic reporting tools</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Manage up to 10 team members</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Track employee attendance</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Assign and monitor tasks</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Email support</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Simple onboarding process</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Designed user-focused interfaces</span>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="space-y-2 mt-auto">
              <button
                onClick={() => {
                  onSelectTool('pptx');
                  onClose();
                }}
                className="w-full py-3.5 px-6 rounded-full bg-white hover:bg-[#EFE9DA] text-[#232528] border border-[#DDD5C0] font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>{activeTool === 'pptx' ? 'Currently Active' : 'Start 7-days Free Trial'}</span>
              </button>
              <div className="flex items-center justify-center gap-3 text-[11px] text-[#796C5E]">
                <button
                  onClick={() => pptxInputRef.current?.click()}
                  className="hover:text-[#232528] underline transition-colors"
                >
                  Open .pptx File
                </button>
                <span>·</span>
                <button
                  onClick={() => {
                    onLoadSamplePptx();
                    onClose();
                  }}
                  className="hover:text-[#232528] underline transition-colors"
                >
                  Try Sample Deck
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Subtle Footer Note */}
        <div className="relative z-10 px-8 py-3.5 bg-[#F2ECE0]/60 border-t border-[#EAE3D2] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#6B5E4E]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#528A2C]" />
            <span>100% Client-Side Engine · IndexedDB Persistence · Zero Cloud Uploads</span>
          </div>
          <div className="flex items-center gap-2 text-[#857766]">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#DDD5C0] font-mono text-[10px]">Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
