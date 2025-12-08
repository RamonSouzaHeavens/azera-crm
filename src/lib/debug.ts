/**
 * Debug utilities para rastrear fluxo de mensagens
 */

export function logDebug(section: string, message: string, data?: any) {
  const timestamp = new Date().toLocaleTimeString('pt-BR')
  const formatted = `[${timestamp}] [${section}] ${message}`
  
  console.log(`%c${formatted}`, 'color: #00ff00; font-weight: bold')
  if (data) {
    console.log(`%cDados:`, 'color: #ffff00')
    console.log(data)
  }
}

export function logError(section: string, message: string, error?: any) {
  const timestamp = new Date().toLocaleTimeString('pt-BR')
  const formatted = `[${timestamp}] [${section}] ❌ ${message}`
  
  console.log(`%c${formatted}`, 'color: #ff0000; font-weight: bold')
  if (error) {
    console.error(error)
  }
}

export function logStep(step: number, description: string) {
  console.log(`%c${step}️⃣ ${description}`, 'color: #0099ff; font-weight: bold; font-size: 12px')
}
