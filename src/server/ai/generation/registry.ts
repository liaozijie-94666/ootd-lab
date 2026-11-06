import type { ImageGenerationKind, ImageProviderId } from '@/types/image-generation'
import type { ImageProvider } from './types'
import { MockImageProvider } from './providers/mock'
import { FashnProvider } from './providers/fashn'
import { ReplicateProvider } from './providers/replicate'
import { IdmVtonProvider } from './providers/idm-vton'
import { ComfyUIProvider } from './providers/comfyui'
import { StableDiffusionProvider } from './providers/stable-diffusion'

const ALIASES: Record<string, ImageProviderId> = {
  mock: 'mock',
  fashn: 'fashn',
  replicate: 'replicate',
  'idm-vton': 'idm-vton',
  idm_vton: 'idm-vton',
  idmvton: 'idm-vton',
  comfyui: 'comfyui',
  comfy: 'comfyui',
  'stable-diffusion': 'stable-diffusion',
  stable_diffusion: 'stable-diffusion',
  sd: 'stable-diffusion',
}

const ALL_PROVIDERS: ImageProvider[] = [
  new FashnProvider(),
  new IdmVtonProvider(),
  new ReplicateProvider(),
  new ComfyUIProvider(),
  new StableDiffusionProvider(),
  new MockImageProvider(),
]

export function providerById(id: string): ImageProvider | undefined {
  const normalized = ALIASES[id.trim().toLowerCase()] ?? (id.trim().toLowerCase() as ImageProviderId)
  return ALL_PROVIDERS.find((provider) => provider.id === normalized)
}

export function providerChainIds(): ImageProviderId[] {
  return (process.env.IMAGE_PROVIDER_CHAIN?.trim() || 'mock')
    .split(',')
    .map((item) => ALIASES[item.trim().toLowerCase()])
    .filter((item): item is ImageProviderId => Boolean(item))
}

/**
 * 返回当前可用的供应商链（按 env 顺序）。
 * 未配置 Key 的供应商会被跳过；全部不可用时回退 Mock。
 */
export function resolveProviderChain(
  kind: ImageGenerationKind,
  preferred?: ImageProviderId,
): ImageProvider[] {
  const ids = providerChainIds()
  if (preferred && !ids.includes(preferred)) ids.unshift(preferred)

  const chain = ids
    .map((id) => providerById(id))
    .filter((provider): provider is ImageProvider => Boolean(provider))
    .filter((provider) => provider.isConfigured() && provider.supports(kind))

  if (chain.length === 0) {
    const mock = providerById('mock')
    if (!mock) throw new Error('Mock provider missing')
    return [mock]
  }

  return [...new Set(chain)]
}

export function dbProviderOf(id: ImageProviderId): 'MOCK' | 'FASHN' | 'REPLICATE' | 'COMFYUI' | 'STABLE_DIFFUSION' | 'IDM_VTON' {
  switch (id) {
    case 'fashn':
      return 'FASHN'
    case 'replicate':
      return 'REPLICATE'
    case 'comfyui':
      return 'COMFYUI'
    case 'stable-diffusion':
      return 'STABLE_DIFFUSION'
    case 'idm-vton':
      return 'IDM_VTON'
    default:
      return 'MOCK'
  }
}

export function providerFromDb(value: string): ImageProviderId {
  switch (value) {
    case 'FASHN':
      return 'fashn'
    case 'REPLICATE':
      return 'replicate'
    case 'COMFYUI':
      return 'comfyui'
    case 'STABLE_DIFFUSION':
      return 'stable-diffusion'
    case 'IDM_VTON':
      return 'idm-vton'
    default:
      return 'mock'
  }
}

export function providerStatus() {
  return ALL_PROVIDERS.map((provider) => ({
    id: provider.id,
    configured: provider.isConfigured(),
    tryon: provider.supports('tryon'),
    recommendation: provider.supports('recommendation'),
  }))
}
