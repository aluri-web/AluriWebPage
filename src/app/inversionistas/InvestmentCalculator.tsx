'use client'

import { useState, useEffect } from 'react'

export default function InvestmentCalculator() {
  const [amount, setAmount] = useState(40000000)
  const [term, setTerm] = useState(12)
  const monthlyRate = 0.017 // 1.7% monthly

  const totalReturn = amount * monthlyRate * term
  const monthlyReturn = totalReturn / term
  const finalAmount = amount + totalReturn

  const formatCurrency = (num: number) => {
    return '$' + num.toLocaleString('es-CO', { maximumFractionDigits: 0 })
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 border border-slate-700 shadow-2xl">
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <label className="block text-sm font-semibold text-white mb-3" htmlFor="investmentAmount">
            Monto a Invertir (COP)
          </label>
          <input
            type="number"
            id="investmentAmount"
            className="w-full px-4 h-12 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={10000000}
            max={1000000000}
            step={5000000}
          />
          <input
            type="range"
            className="w-full mt-3 accent-primary"
            min={10000000}
            max={1000000000}
            step={5000000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>$40M</span>
            <span>$1,000M</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-white mb-3" htmlFor="investmentTerm">
            Plazo (Meses)
          </label>
          <input
            type="number"
            id="investmentTerm"
            className="w-full px-4 h-12 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={term}
            onChange={(e) => setTerm(Number(e.target.value))}
            min={3}
            max={60}
            step={3}
          />
          <input
            type="range"
            className="w-full mt-3 accent-primary"
            min={3}
            max={60}
            step={3}
            value={term}
            onChange={(e) => setTerm(Number(e.target.value))}
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>3 meses</span>
            <span>60 meses</span>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl p-4 border border-primary/30">
          <p className="text-sm text-slate-300 font-medium">Tasa de Rentabilidad Mensual Fija</p>
          <p className="text-3xl font-bold text-primary mt-1">1.7%</p>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-primary/30 to-primary/20 rounded-2xl p-6 text-center border border-primary/30 shadow-lg shadow-primary/10">
            <p className="text-sm text-slate-300 mb-2 font-medium">Ganancia Total</p>
            <p className="text-3xl font-black text-primary">{formatCurrency(totalReturn)}</p>
          </div>
          <div className="bg-gradient-to-br from-primary/40 to-primary/10 rounded-2xl p-6 text-center border border-primary/50 shadow-lg shadow-primary/20">
            <p className="text-sm text-slate-300 mb-2 font-medium">Ingreso Mensual</p>
            <p className="text-3xl font-black text-primary">{formatCurrency(monthlyReturn)}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6 text-center border border-slate-600 shadow-lg">
            <p className="text-sm text-slate-300 mb-2 font-medium">Total Final</p>
            <p className="text-3xl font-black text-white">{formatCurrency(finalAmount)}</p>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6 italic">
        * Calculos estimados. Monto final sujeto a evaluacion
      </p>
    </div>
  )
}
