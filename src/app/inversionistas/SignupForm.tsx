'use client'

import { useState } from 'react'

const montoOptions = [
  { label: '$50M - $100M', value: '50M-100M' },
  { label: '$100M - $200M', value: '100M-200M' },
  { label: '$200M - $400M', value: '200M-400M' },
]

export default function SignupForm() {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [monto, setMonto] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const montoLabel = montoOptions.find(o => o.value === monto)?.label || monto
    const subject = encodeURIComponent(`Aplicación inversionista ${nombre}`)
    const body = encodeURIComponent(
      `Hola soy ${nombre} ${apellido}.\nQuiero invertir con Aluri entre ${montoLabel}. Mi teléfono es ${telefono}.\nSaludos`
    )

    window.location.href = `mailto:contacto@aluri.co?subject=${subject}&body=${body}`
    setSent(true)
  }

  if (sent) {
    return (
      <div className="bg-slate-800/50 rounded-3xl p-8 md:p-12 border border-slate-700 text-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">Solicitud Enviada</h3>
        <p className="text-slate-400 mb-6">
          Se ha abierto tu cliente de correo. Si no se abrio automaticamente, escribenos a <a href="mailto:contacto@aluri.co" className="text-primary hover:underline">contacto@aluri.co</a>
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-primary hover:underline text-sm"
        >
          Enviar otra solicitud
        </button>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-3xl p-8 md:p-12 border border-slate-700">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              placeholder="Tu nombre"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Apellido</label>
            <input
              type="text"
              value={apellido}
              onChange={e => setApellido(e.target.value)}
              required
              placeholder="Tu apellido"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Telefono</label>
            <input
              type="tel"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              required
              placeholder="300 123 4567"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Monto a invertir</label>
          <select
            value={monto}
            onChange={e => setMonto(e.target.value)}
            required
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="" disabled>Selecciona un rango</option>
            {montoOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center px-8 h-14 bg-primary hover:bg-primary-dark text-slate-900 text-lg font-bold rounded-full shadow-lg shadow-primary/20 transition-all hover:translate-y-[-2px]"
        >
          Enviar Solicitud
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Si ya tienes cuenta, <a href="/login" className="text-primary hover:underline">inicia sesion aqui</a>
      </p>
    </div>
  )
}
