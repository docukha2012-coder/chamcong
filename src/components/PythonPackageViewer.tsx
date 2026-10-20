import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  FolderTree, 
  Info, 
  FileText,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { PYTHON_CODE_PACKAGE, PythonFileItem } from '../data/pythonCodePackage';

export const PythonPackageViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<PythonFileItem>(PYTHON_CODE_PACKAGE[3]); // default main.py
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const handleCopy = (content: string, filename: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  const handleDownloadFile = (file: PythonFileItem) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Instructions Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-semibold mb-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>Mã Nguồn Backend Python / FastAPI Độc Lập Cho Mạng LAN</span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Gói Dự Án Máy Chủ Nội Bộ (PRD Section 4 &amp; 5)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Toàn bộ source code Python chuẩn chỉnh để bạn triển khai trực tiếp lên máy tính bàn tại văn phòng công ty.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownloadFile(selectedFile)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Tải file: {selectedFile.filename}</span>
            </button>
          </div>
        </div>

        {/* Quick 3-Step Setup Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-1">Bước 1: Chuẩn bị thư mục</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tạo thư mục dự án <code className="text-slate-300 font-mono">qr_attendance_system/</code> trên máy tính văn phòng, lưu các file mã nguồn bên dưới.
            </p>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-1">Bước 2: Cấp key Google Sheets</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tạo Service Account trên Google Cloud Console, tải file <code className="text-slate-300 font-mono">service_account.json</code> và share quyền Editor vào Google Sheet.
            </p>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-1">Bước 3: Chạy server</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Trên Windows, nhấp đúp file <code className="text-emerald-300 font-mono font-bold">run_server.bat</code>. Server sẽ tự lấy IP LAN và in mã QR ra file PNG!
            </p>
          </div>
        </div>
      </div>

      {/* File Explorer & Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Sidebar: File List */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 flex items-center gap-1.5 border-b border-slate-800 mb-2">
            <FolderTree className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cấu Trúc Thư Mục Dự Án</span>
          </div>

          {PYTHON_CODE_PACKAGE.map((file) => {
            const isSelected = selectedFile.filename === file.filename;
            return (
              <button
                key={file.filename}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-mono transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="truncate">{file.filename}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Area: Code Editor Display */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          {/* Header of Code Pane */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-white">{selectedFile.filename}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 uppercase">
                  {selectedFile.language}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{selectedFile.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(selectedFile.content, selectedFile.filename)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              >
                {copiedFile === selectedFile.filename ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Đã Sao Chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao Chép Code</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleDownloadFile(selectedFile)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Về</span>
              </button>
            </div>
          </div>

          {/* Code Window */}
          <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed max-h-[540px] select-text">
            <pre>
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
