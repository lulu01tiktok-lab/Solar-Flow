
import { PERFORMANCE_RATIO, PANEL_DEGRADATION_RATE } from '../constants';
import { SharedUnit, GeneratingUnit, AnnualProjection } from '../types';

/**
 * Calculates System Size (kWp)
 * Logic:
 * - If irradiation > 24, treats it as Annual PVOUT (kWh/kWp/year).
 * - If irradiation <= 24, treats it as Daily HSP (Peak Sun Hours) (kWh/m²/day).
 */
export const calculateSystemSize = (consumption: number, irradiation: number, orientationFactor: number = 1): number => {
  if (irradiation <= 0) return 0;
  
  // Case 1: Annual Specific Yield (PVOUT) - e.g., 1703.6
  if (irradiation > 24) {
      // Formula Requested: consumo / ( (Irradiação / 12 * 0,90) * fator_orientacao )
      const monthlyYieldPerKwp = (irradiation / 12) * 0.90 * orientationFactor;
      
      const size = consumption / monthlyYieldPerKwp;
      return parseFloat(size.toFixed(2));
  }

  // Case 2: Daily HSP (Peak Sun Hours) - e.g., 5.5
  const dailyConsumption = consumption / 30;
  const effectivePSH = irradiation * orientationFactor; 
  const size = dailyConsumption / (effectivePSH * PERFORMANCE_RATIO);
  return parseFloat(size.toFixed(2));
};

export const calculateGeneration = (systemSize: number, irradiation: number, orientationFactor: number = 1): number => {
  if (systemSize <= 0 || irradiation <= 0) return 0;

  // Case 1: Annual Specific Yield (PVOUT)
  if (irradiation > 24) {
      const monthlyYieldPerKwp = (irradiation / 12) * 0.90 * orientationFactor;
      const generation = systemSize * monthlyYieldPerKwp;
      return Math.floor(generation);
  }

  // Case 2: Daily HSP
  const effectivePSH = irradiation * orientationFactor;
  const generation = systemSize * effectivePSH * 30 * PERFORMANCE_RATIO;
  return Math.floor(generation);
};

/**
 * Retorna a porcentagem de cobrança do Fio B conforme o ano (Lei 14.300)
 */
const getFioBProgressivePercentage = (year: number): number => {
    if (year <= 2022) return 0;
    if (year === 2023) return 0.15; // 15%
    if (year === 2024) return 0.30; // 30%
    if (year === 2025) return 0.45; // 45%
    if (year === 2026) return 0.60; // 60%
    if (year === 2027) return 0.75; // 75%
    if (year === 2028) return 0.90; // 90%
    return 1.0; // 2029 em diante: 100% do Fio B
};

const getMinKwh = (type: string): number => {
    if (type === 'MONO') return 30;
    if (type === 'BIFASICO') return 50;
    if (type === 'TRIFASICO') return 100;
    return 30; // Default
};

/**
 * Calcula a Economia Mensal Detalhada (Lei 14.300)
 * Suporta Geração Compartilhada com múltiplas unidades.
 */
export const calculateSavings = (
    generation: number, 
    totalTariff: number, 
    selfConsumptionPercentage: number = 0,
    fioBPercentage: number = 0,
    tusdRawValue: number = 0,
    icmsTaxPercentage: number = 0,
    generatingUnit?: GeneratingUnit,
    beneficiaryUnits?: SharedUnit[],
    currentYear: number = new Date().getFullYear()
): { savings: number, billWithoutSolar: number, billWithSolar: number } => {
  
  const progressiveFactor = getFioBProgressivePercentage(currentYear);
  const fullFioBValue = totalTariff * (fioBPercentage / 100);
  const fioBUnitCost = fullFioBValue * progressiveFactor;
  const icmsUnitCost = tusdRawValue * (icmsTaxPercentage / 100);
  const costPerCompensatedKwh = fioBUnitCost + icmsUnitCost;

  let totalSavings = 0;
  let totalOriginalBill = 0;
  let totalFinalBill = 0;
  let remainingGeneration = generation;

  // 1. Unidade Geradora
  if (generatingUnit) {
      const consumption = generatingUnit.consumption;
      
      // Simultaneidade (Apenas na geradora)
      const simultaneousKwh = generation * (selfConsumptionPercentage / 100);
      const validSimultaneous = Math.min(simultaneousKwh, consumption);
      
      remainingGeneration -= validSimultaneous;
      
      // Consumo Líquido a abater com créditos
      const netConsumption = consumption - validSimultaneous;
      const compensated = Math.min(remainingGeneration, netConsumption);
      
      remainingGeneration -= compensated;

      // Custo da Energia Compensada (Fio B + ICMS)
      const costForCompensated = compensated * costPerCompensatedKwh;
      
      // Energia Comprada da Rede (O que faltou)
      const energyBought = netConsumption - compensated;
      
      // Custo de Disponibilidade
      const minKwh = getMinKwh(generatingUnit.type);
      
      // Fatura COM Solar
      // Pela Lei 14.300: Paga-se o Custo de Disponibilidade (se consumo rede < mínimo) + Fio B/ICMS sobre compensado
      // Ou seja: Max(ConsumoRede, Mínimo) * Tarifa + CustoCompensado
      const energyCost = Math.max(energyBought, minKwh) * totalTariff;
      const finalBill = energyCost + costForCompensated;
      
      // Fatura SEM Solar (Original)
      const originalBill = Math.max(minKwh * totalTariff, consumption * totalTariff);
      
      totalSavings += (originalBill - finalBill);
      totalOriginalBill += originalBill;
      totalFinalBill += finalBill;
  } else {
      // Fallback para modo simples
      const selfConsumedEnergy = generation * (selfConsumptionPercentage / 100);
      const selfConsumedSavings = selfConsumedEnergy * totalTariff;
      const injectedEnergy = generation - selfConsumedEnergy;
      const grossInjectedCredit = injectedEnergy * totalTariff;
      const totalFioBCost = injectedEnergy * fioBUnitCost;
      const icmsCost = injectedEnergy * icmsUnitCost;
      const netInjectedSavings = grossInjectedCredit - totalFioBCost - icmsCost;
      
      totalSavings = selfConsumedSavings + netInjectedSavings;
      
      // Estimativa simples para fallback
      // Assumindo consumo = geração para simplificar o cálculo de "conta original" neste modo legado
      // Se não tem generatingUnit, não temos consumo definido.
      // Vamos assumir que o consumo é igual a geração para fins de estimativa
      totalOriginalBill = Math.max(30 * totalTariff, generation * totalTariff); 
      
      // Fatura com solar seria apenas o custo de disponibilidade + taxas sobre injetado
      // Assumindo monofásico (30kWh) como padrão
      const minKwh = 30;
      
      // No fallback, assumimos consumo = geração, logo consumo da rede = 0 (tudo abatido ou injetado/consumido)
      // Então paga-se o mínimo + custo do injetado
      const energyCost = minKwh * totalTariff;
      
      // Custo sobre injetado (que volta como crédito)
      const costForInjected = injectedEnergy * costPerCompensatedKwh;
      
      totalFinalBill = energyCost + costForInjected;
  }

  // 2. Unidades Beneficiárias
  if (beneficiaryUnits && beneficiaryUnits.length > 0) {
      for (const unit of beneficiaryUnits) {
          const consumption = unit.consumption;
          
          // Sem simultaneidade
          const compensated = Math.min(remainingGeneration, consumption);
          remainingGeneration -= compensated;
          
          // Custo sobre compensado (Fio B + ICMS)
          const costForCompensated = compensated * costPerCompensatedKwh;
          
          // Energia Comprada
          const energyBought = consumption - compensated;
          
          // Custo Disponibilidade
          const minKwh = getMinKwh(unit.type);
          
          // Fatura COM Solar
          const energyCost = Math.max(energyBought, minKwh) * totalTariff;
          const finalBill = energyCost + costForCompensated;
          
          // Fatura SEM Solar
          const originalBill = Math.max(minKwh * totalTariff, consumption * totalTariff);
          
          totalSavings += (originalBill - finalBill);
          totalOriginalBill += originalBill;
          totalFinalBill += finalBill;
      }
  }

  // 3. Excedente (Sobras)
  if (remainingGeneration > 0) {
       const surplusValue = remainingGeneration * (totalTariff - costPerCompensatedKwh);
       totalSavings += surplusValue;
       // O excedente reduz a conta futura, mas para o mês corrente não afeta o desembolso imediato além do que já foi calculado.
       // Poderíamos considerar como "receita" negativa na conta final, mas contabilmente é crédito.
       // Vamos manter totalFinalBill como o que se paga em dinheiro.
  }

  return {
      savings: parseFloat(totalSavings.toFixed(2)),
      billWithoutSolar: parseFloat(totalOriginalBill.toFixed(2)),
      billWithSolar: parseFloat(totalFinalBill.toFixed(2))
  };
};

/**
 * Gera a projeção financeira de 25 anos (Fluxo de Caixa Ano Calendário)
 */
export const calculateFinancialProjection = (
    initialMonthlyGeneration: number,
    initialTotalTariff: number,
    initialTusd: number, // Necessário para cálculo do ICMS futuro
    inflationRate: number, // % Inflação Energética (ex: 6.0)
    fioBPercentage: number, // % do Fio B na tarifa (ex: 29.47)
    icmsTaxPercentage: number, // % ICMS (ex: 18)
    selfConsumption: number, // % Simultaneidade
    generatingUnit?: GeneratingUnit,
    beneficiaryUnits?: SharedUnit[]
): AnnualProjection[] => {
    const projection: AnnualProjection[] = [];
    const today = new Date();
    const startYear = today.getFullYear();
    const currentMonthIndex = today.getMonth(); // 0 = Janeiro
    
    let accumulatedSavings = 0;

    for (let i = 0; i < 25; i++) {
        const year = startYear + i;
        
        let monthsInYear = 12;
        if (i === 0) {
            monthsInYear = Math.max(0, 12 - (currentMonthIndex + 1));
        }

        // 1. Degradação dos Painéis
        const degradationFactor = Math.pow(1 - PANEL_DEGRADATION_RATE, i);
        const monthlyGen = initialMonthlyGeneration * degradationFactor;
        
        // 2. Inflação Energética
        const inflationFactor = Math.pow(1 + (inflationRate / 100), i);
        const currentTotalTariff = initialTotalTariff * inflationFactor;
        const currentTusd = initialTusd * inflationFactor;

        // 3. Cálculo da Economia Mensal
        const result = calculateSavings(
            monthlyGen, 
            currentTotalTariff, 
            selfConsumption, 
            fioBPercentage, 
            currentTusd,
            icmsTaxPercentage,
            generatingUnit,
            beneficiaryUnits,
            year
        );

        const monthlyNetSavings = result.savings;

        // Estimativa de Custo Fio B (Apenas informativo para a tabela)
        const injected = monthlyGen * (1 - (selfConsumption / 100));
        const fullFioBValue = currentTotalTariff * (fioBPercentage / 100);
        const progressiveFactor = getFioBProgressivePercentage(year);
        const monthlyFioBCost = injected * (fullFioBValue * progressiveFactor);

        // Estimativa de Custo ICMS TUSD (Apenas informativo para a tabela)
        const icmsUnitCost = currentTusd * (icmsTaxPercentage / 100);
        const monthlyIcmsCost = injected * icmsUnitCost;

        const annualSavings = monthlyNetSavings * monthsInYear;
        const annualFioBCost = monthlyFioBCost * monthsInYear;
        const annualIcmsCost = monthlyIcmsCost * monthsInYear;
        const annualGeneration = monthlyGen * monthsInYear;
        
        const annualBillWithoutSolar = result.billWithoutSolar * monthsInYear;
        const annualBillWithSolar = result.billWithSolar * monthsInYear;
        
        accumulatedSavings += annualSavings;

        projection.push({
            year: i + 1,
            calendarYear: year,
            generation: Math.floor(annualGeneration),
            tariff: parseFloat(currentTotalTariff.toFixed(4)),
            savings: parseFloat(annualSavings.toFixed(2)),
            billWithoutSolar: parseFloat(annualBillWithoutSolar.toFixed(2)),
            billWithSolar: parseFloat(annualBillWithSolar.toFixed(2)),
            fioBCost: parseFloat(annualFioBCost.toFixed(2)),
            icmsCost: parseFloat(annualIcmsCost.toFixed(2)),
            accumulatedSavings: parseFloat(accumulatedSavings.toFixed(2))
        });
    }

    return projection;
};

export const calculatePayback = (totalPrice: number, monthlySavings: number): number => {
  if (monthlySavings <= 0) return 0;
  const months = totalPrice / monthlySavings;
  const years = months / 12;
  return parseFloat(years.toFixed(1));
};
