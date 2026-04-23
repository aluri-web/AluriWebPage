import { FileSignature } from 'lucide-react'
import DocumentosForm from './DocumentosForm'

export default function DocumentosPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-xl">
          <FileSignature size={24} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Generador de Documentos</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Genera contratos de mutuo con hipoteca o compraventa con pacto de retroventa
          </p>
        </div>
      </header>

      <DocumentosForm />
    </div>
  )
}
