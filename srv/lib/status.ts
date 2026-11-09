export type Status = 'Offen' | 'InLieferung' | 'Geliefert' | 'Verzoegert'

export interface StatusInput {
  orderDeliveryStatus?: string  // A_SalesOrder.OverallTotalDeliveryStatus
  goodsMovementStatus?: string  // A_OutbDeliveryHeader.OverallGoodsMovementStatus
  plannedDate?: string          // YYYY-MM-DD
  manualDelay: boolean
  today?: string                // only set in tests
}

export function calculateStatus(input: StatusInput): Status {
  const today = input.today ?? new Date().toISOString().slice(0, 10)

  if (input.goodsMovementStatus === 'C') return 'Geliefert'
  if (input.manualDelay) return 'Verzoegert'
  if (
    input.goodsMovementStatus === 'B' ||
    input.orderDeliveryStatus === 'B' ||
    input.orderDeliveryStatus === 'C'
  ) return 'InLieferung'
  if (input.plannedDate && input.plannedDate < today) return 'Verzoegert'
  return 'Offen'
}