import type { ClothingCategory, ClothingColor } from './studio'

export interface CommunityAuthor {
  id: string
  name: string
  handle: string
  avatarUrl: string | null
  isFollowing?: boolean
}

export interface CommunityTag {
  id: string
  name: string
  slug: string
}

export interface CommunityPostCard {
  id: string
  title: string
  excerpt: string
  coverUrl: string | null
  author: CommunityAuthor
  tags: CommunityTag[]
  likeCount: number
  commentCount: number
  bookmarkCount: number
  liked: boolean
  favorited: boolean
  status: string
  createdAt: string
}

export interface CommunityOutfitItem {
  name: string
  category: ClothingCategory
  categoryLabel: string
  color: ClothingColor
  colorHex: string
  material: string | null
  brand: string | null
  price: number | null
  imageUrl: string | null
  purchaseUrl: string | null
  reason?: string | null
}

export interface CommunityPostDetail extends CommunityPostCard {
  content: string
  images: Array<{ id: string; url: string; width: number | null; height: number | null }>
  isAuthor: boolean
  followingAuthor: boolean
  outfit: {
    id: string
    title: string
    items: CommunityOutfitItem[]
  } | null
  recommendation: {
    id: string
    styleSummary: string
    reason: string
    items: CommunityOutfitItem[]
  } | null
}

export interface CommunityComment {
  id: string
  content: string
  parentId: string | null
  author: CommunityAuthor
  likeCount: number
  createdAt: string
  isAuthor: boolean
  replies: CommunityComment[]
}

export interface CommunityFeedResponse {
  items: CommunityPostCard[]
  page: number
  total: number
  hasMore: boolean
}

export interface CommunityProfileResponse {
  user: {
    id: string
    name: string
    handle: string
    avatarUrl: string | null
    bio: string | null
    city: string | null
    createdAt: string
  }
  stats: { posts: number; followers: number; following: number; outfits: number }
  isSelf: boolean
  isFollowing: boolean
  posts: CommunityPostCard[]
  favorites: CommunityPostCard[]
  outfits: Array<{
    id: string
    title: string
    coverUrl: string | null
    itemCount: number
    isPublic: boolean
  }>
}
