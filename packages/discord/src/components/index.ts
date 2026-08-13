import { ButtonStyle } from './schema'
import type { ActionRow, Button } from './schema'

type NonLinkButtonStyle = Exclude<Button['style'], typeof ButtonStyle.LINK>

export type ButtonParams =
  | { style: NonLinkButtonStyle; customId: string; label: string; disabled?: boolean }
  | { style: typeof ButtonStyle.LINK; url: string; label: string; disabled?: boolean }

export function createButton(params: ButtonParams): Button {
  const button: Button = {
    type: 2,
    style: params.style,
    label: params.label,
  }
  if ('customId' in params) {
    button.custom_id = params.customId
  }
  if ('url' in params) {
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
      style: ButtonStyle.PRIMARY,
      customId: approveCustomId,
      label: 'Approve',
    }),
    createButton({
      style: ButtonStyle.DANGER,
      customId: denyCustomId,
      label: 'Deny',
    })
  )
}
