import type { InteractionCallbackData, interactionResponseSchema, InteractionResponse } from './schema'
import type { z } from 'zod'

type ResponseType = z.infer<typeof interactionResponseSchema>['type']

function buildResponse(type: ResponseType, data?: InteractionCallbackData): InteractionResponse {
  return data ? { type, data } : ({ type } as InteractionResponse)
}

export function respondPong(): InteractionResponse {
  return buildResponse(1)
}

export function respondDefer(ephemeral?: boolean): InteractionResponse {
  const data: InteractionCallbackData = {}
  if (ephemeral) {
    data.flags = 64
  }
  return buildResponse(5, data)
}

export function respondDeferUpdate(): InteractionResponse {
  return buildResponse(6)
}

export function respondMessage(
  content: string,
  opts?: {
    embeds?: InteractionCallbackData['embeds']
    components?: InteractionCallbackData['components']
    ephemeral?: boolean
  }
): InteractionResponse {
  const data: InteractionCallbackData = { content }
  if (opts?.embeds) data.embeds = opts.embeds
  if (opts?.components) data.components = opts.components
  if (opts?.ephemeral) {
    data.flags = (data.flags ?? 0) | 64
  }
  return buildResponse(4, data)
}

export function respondUpdateMessage(
  content: string,
  opts?: {
    embeds?: InteractionCallbackData['embeds']
    components?: InteractionCallbackData['components']
  }
): InteractionResponse {
  const data: InteractionCallbackData = { content }
  if (opts?.embeds) data.embeds = opts.embeds
  if (opts?.components) data.components = opts.components
  return buildResponse(7, data)
}
