import type { Button, ActionRow } from './schema'

export function createButton(params: {
  style: number
  customId: string | null
  label: string
  url?: string
  disabled?: boolean
}): Button {
  const button: Button = {
    type: 2,
    style: params.style as Button['style'],
    label: params.label,
  }
  if (params.customId !== null) {
    button.custom_id = params.customId
  }
  if (params.url) {
    button.url = params.url
  }
  if (params.disabled) {
    button.disabled = params.disabled
  }
  return button
}

export function createActionRow(...components: Button[]): ActionRow {
  return { type: 1, components }
}

export function createApproveDenyRow(approveCustomId: string, denyCustomId: string): ActionRow {
  return createActionRow(
    createButton({
      style: 1,
      customId: approveCustomId,
      label: 'Approve',
    }),
    createButton({
      style: 4,
      customId: denyCustomId,
      label: 'Deny',
    })
  )
}
