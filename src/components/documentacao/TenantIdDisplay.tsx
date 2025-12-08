import { useState } from 'react';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export function TenantIdDisplay({ tenantId }: { tenantId: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(tenantId);
    setCopied(true);
    toast.success('Tenant ID copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex-1">
        <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider font-semibold">Seu Tenant ID</label>
        <code className="text-sm font-mono text-cyan-400">
          {isVisible ? tenantId : '••••••••-••••-••••-••••-••••••••••••'}
        </code>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
          title={isVisible ? 'Ocultar' : 'Visualizar'}
        >
          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        <button
          onClick={handleCopy}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
          title="Copiar"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
