export const fantasyErrors = {
  network: 'Budbäraren nådde inte fram. Kontrollera din anslutning till de yttre sfärerna.',
  pdfCorrupt: 'Skriftrullen är skadad eller förseglade med fientlig magi.',
  sessionTimeout: 'Dina sinnen vandrar iväg i dimman. Återvänd när du är redo.',
  apiError: 'Oraklet tiger. En mystisk kraft störde kommunikationen.',
  uploadFailed: 'Relikten vägrade att arkiveras. Försök igen.',
  notFound: 'Denna plats existerar inte i kända kartor.',
  unauthorized: 'Du saknar tillstånd att beträda dessa marker.',
  chatFailed: 'Berättarens röst tystnar i mörkret. Försök igen om en stund.',
  deleteFailed: 'Föremålet vägrar att försvinna. Mörk magi håller det kvar.',
  saveFailed: 'Krönikan kunde inte skrivas. Bläcket har torkat.',
  loadFailed: 'Arkivet är otillgängligt. Väktaren sover.',
  ttsFailed: 'Rösten kan inte nå dig genom dimman.',
  imageFailed: 'Synen flimrar och bleknar bort. Illusionen misslyckades.',
  syncFailed: 'Länken mellan världarna bröts. Försök knyta an på nytt.',
} as const

export type FantasyErrorKey = keyof typeof fantasyErrors

export function toFantasyError(error: unknown): string {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return fantasyErrors.network
  }
  const msg = error instanceof Error ? error.message : String(error)
  if (msg.includes('timeout') || msg.includes('Timeout')) return fantasyErrors.sessionTimeout
  if (msg.includes('401') || msg.includes('Unauthorized')) return fantasyErrors.unauthorized
  if (msg.includes('404') || msg.includes('Not Found')) return fantasyErrors.notFound
  if (msg.includes('Upload') || msg.includes('upload') || msg.includes('Storage')) return fantasyErrors.uploadFailed
  return fantasyErrors.apiError
}
