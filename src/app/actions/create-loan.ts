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
    estado?: string // Optional initial estado (default: 'publicado')
    // New risk profile fields
    monthlyIncome?: number
    profession?: string

    warrantyAnalysis?: string
    // New types
    contractType?: 'hipotecario' | 'retroventa'
    amortizationType?: 'francesa' | 'solo_interes'
}

export async function createLoan(params: LoanParams) {
    const supabase = await createClient()
    const { borrowerId, amount, interestRate, termMonths, startDate, estado, monthlyIncome, profession, warrantyAnalysis, contractType, amortizationType } = params

    // 1. Cálculo Financiero
    const i = interestRate / 100
    const n = termMonths

    // Determinar cuota según tipo de amortización
    let monthlyPayment = 0

    if (amortizationType === 'solo_interes') {
        // Solo intereses: Cuota = Saldo * Tasa
        monthlyPayment = amount * i
    } else {
        // Francesa (Default): Cuota Fija
        monthlyPayment = i === 0
            ? amount / n
            : (amount * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
    }

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
            estado: estado || 'publicado', // Custom estado or default to workflow-ready state
            saldo_capital: amount,
            saldo_intereses: 0,
            saldo_mora: 0,
            numero_credito: params.creditCode || `CR-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Custom or generated
            producto: 'consumo',
            ingresos_mensuales: monthlyIncome || 0,
            profesion: profession || null,
            analisis_garantia: warrantyAnalysis || null,
            tipo_contrato: contractType || 'hipotecario',
            tipo_amortizacion: amortizationType || 'francesa'
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

        let capitalPart = 0
        let endingBalance = 0

        if (amortizationType === 'solo_interes') {
            // En solo interés, no se abona a capital hasta el final (o nunca, depende del esquema exacto, 
            // pero usualmente es balloon al final o renovable.
            // Asumiremos balloon al final para cerrar el crédito en el plazo)
            if (mes === termMonths) {
                capitalPart = currentBalance
                endingBalance = 0
                // La cuota final es intereses + todo el capital
                // Ajustamos monthlyPayment solo para este mes en el registro, 
                // aunque la variable monthlyPayment la mantuvimos fija arriba.
                // Mejor estrategia: definir valores por iteración.
            } else {
                capitalPart = 0
                endingBalance = currentBalance
            }
        } else {
            // Francesa
            capitalPart = monthlyPayment - interestPart
            endingBalance = currentBalance - capitalPart
        }


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
            valor_cuota: amortizationType === 'solo_interes' && mes === termMonths ? interestPart + capitalPart : monthlyPayment,
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
