'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

interface LoanParams {
    borrowerId: string
    amount: number
    interestRate: number // Tasa Mensual %
    termMonths: number
    startDate: string // YYYY-MM-DD
    creditCode?: string // Optional custom code
}

export async function createLoan(params: LoanParams) {
    const supabase = await createClient()
    const { borrowerId, amount, interestRate, termMonths, startDate } = params

    // 1. Cálculo Financiero (Sistema Francés - Cuota Fija)
    const i = interestRate / 100
    const n = termMonths

    // Validación: si tasa es 0, división simple. Si no, fórmula de anualidad.
    const monthlyPayment = i === 0
        ? amount / n
        : (amount * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)

    // 2. Insertar Cabecera del Crédito
    // Mapping params to DB columns:
    // - monto_solicitado <- amount
    // - monto_aprobado <- amount (initial assumption)
    // - fecha_desembolso <- startDate
    // - numero_credito <- Generated
    const { data: loan, error: loanError } = await supabase
        .from('creditos')
        .insert({
            cliente_id: borrowerId,
            monto_solicitado: amount,
            monto_aprobado: amount,
            tasa_interes: interestRate,
            plazo_meses: termMonths,
            fecha_desembolso: new Date(startDate).toISOString(),
            estado: 'aprobado',
            saldo_capital: amount,
            saldo_intereses: 0,
            saldo_mora: 0,
            numero_credito: params.creditCode || `CR-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Custom or generated
            producto: 'consumo'
        })
        .select()
        .single()

    if (loanError) {
        console.error('Error creando crédito:', loanError)
        return { error: loanError.message }
    }

    // 3. Generar Tabla de Amortización (Proyección)
    const amortizationSchedule = []
    let currentBalance = amount
    let currentDate = new Date(startDate)

    for (let mes = 1; mes <= termMonths; mes++) {
        const interestPart = currentBalance * i
        const capitalPart = monthlyPayment - interestPart
        const endingBalance = currentBalance - capitalPart

        // Avanzar un mes para la fecha de pago
        currentDate.setMonth(currentDate.getMonth() + 1)

        // Mapping schedule to DB columns:
        // - valor_cuota <- monthlyPayment
        // - intereses <- interestPart
        // - saldo_capital <- endingBalance
        amortizationSchedule.push({
            credito_id: loan.id,
            numero_cuota: mes,
            fecha_vencimiento: currentDate.toISOString().split('T')[0],
            valor_cuota: monthlyPayment,
            capital: capitalPart,
            intereses: interestPart,
            saldo_capital: endingBalance < 0 ? 0 : endingBalance, // Evitar negativos por redondeo
            estado: 'pendiente'
        })
        currentBalance = endingBalance
    }

    // 4. Insertar Plan de Pagos en Batch
    const { error: planError } = await supabase
        .from('plan_pagos')
        .insert(amortizationSchedule)

    if (planError) {
        console.error('Error insertando plan de pagos:', planError)
        // Rollback manual simple: borrar el crédito si falla el plan
        await supabase.from('creditos').delete().eq('id', loan.id)
        return { error: 'Error generando el plan de pagos: ' + planError.message }
    }

    return { success: true, loanId: loan.id }
}
