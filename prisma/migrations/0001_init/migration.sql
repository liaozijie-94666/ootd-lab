-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_SAY');

-- CreateEnum
CREATE TYPE "public"."GarmentGender" AS ENUM ('WOMEN', 'MEN', 'UNISEX');

-- CreateEnum
CREATE TYPE "public"."BodyShape" AS ENUM ('HOURGLASS', 'PEAR', 'APPLE', 'RECTANGLE', 'INVERTED_TRIANGLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."ConsentType" AS ENUM ('TERMS', 'PRIVACY', 'FACE_IMAGE_PROCESSING', 'MARKETING');

-- CreateEnum
CREATE TYPE "public"."EncryptionMode" AS ENUM ('NONE', 'AES_256_GCM');

-- CreateEnum
CREATE TYPE "public"."MediaKind" AS ENUM ('FACE', 'FULL_BODY', 'GARMENT_RAW', 'GARMENT_CUTOUT', 'RESULT', 'POST_IMAGE', 'EXPORT');

-- CreateEnum
CREATE TYPE "public"."MediaStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."MediaVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "public"."ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "public"."ModerationDecision" AS ENUM ('PASS', 'REVIEW', 'BLOCK');

-- CreateEnum
CREATE TYPE "public"."ModerationSource" AS ENUM ('HEURISTIC', 'AI', 'HUMAN');

-- CreateEnum
CREATE TYPE "public"."GarmentCategory" AS ENUM ('TOP', 'BOTTOM', 'DRESS', 'OUTERWEAR', 'SHOES', 'BAG', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "public"."Slot" AS ENUM ('TOP', 'BOTTOM', 'DRESS', 'OUTERWEAR', 'SHOES', 'BAG', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "public"."ColorTag" AS ENUM ('BLACK', 'WHITE', 'GRAY', 'BEIGE', 'BROWN', 'RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'NAVY', 'PURPLE', 'PINK', 'GOLD', 'SILVER', 'MULTI');

-- CreateEnum
CREATE TYPE "public"."StyleTag" AS ENUM ('MINIMAL', 'CASUAL', 'STREET', 'BUSINESS', 'SMART_CASUAL', 'SPORTY', 'ROMANTIC', 'VINTAGE', 'Y2K', 'KOREAN', 'FRENCH', 'OUTDOOR', 'PREPPY', 'GOTHIC');

-- CreateEnum
CREATE TYPE "public"."Season" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'ALL_SEASON');

-- CreateEnum
CREATE TYPE "public"."GarmentStatus" AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."GarmentSource" AS ENUM ('PLATFORM', 'USER_UPLOAD', 'AI_GENERATED');

-- CreateEnum
CREATE TYPE "public"."OutfitSource" AS ENUM ('FREE_STYLE', 'AI_RECOMMENDATION');

-- CreateEnum
CREATE TYPE "public"."OutfitVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "public"."OutfitStatus" AS ENUM ('DRAFT', 'SAVED', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."TaskType" AS ENUM ('VIRTUAL_TRYON', 'BG_REMOVAL', 'SCENE_RECOMMEND', 'DATA_EXPORT');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('QUEUED', 'PREPROCESSING', 'RUNNING', 'POSTPROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."AIProvider" AS ENUM ('MOCK', 'FASHN', 'REPLICATE', 'COMFYUI');

-- CreateEnum
CREATE TYPE "public"."TagKind" AS ENUM ('STYLE', 'SCENE', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."PostStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'REMOVED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."CommentStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."ReportTargetType" AS ENUM ('POST', 'COMMENT', 'USER');

-- CreateEnum
CREATE TYPE "public"."ReportReason" AS ENUM ('SEXUAL', 'ILLEGAL', 'VIOLENCE', 'COPYRIGHT', 'SPAM', 'HARASSMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('GENERATION_DONE', 'GENERATION_FAILED', 'LIKE', 'COMMENT', 'FOLLOW', 'MENTION', 'SYSTEM', 'MODERATION');

-- CreateEnum
CREATE TYPE "public"."UsageKind" AS ENUM ('TRYON', 'CUTOUT', 'REROLL', 'EXPORT');

-- CreateEnum
CREATE TYPE "public"."DraftStatus" AS ENUM ('EDITING', 'GENERATED', 'SAVED', 'DISCARDED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "password_hash" TEXT,
    "name" TEXT,
    "image" TEXT,
    "handle" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" VARCHAR(40),
    "bio" VARCHAR(280),
    "gender" "public"."Gender" NOT NULL DEFAULT 'PREFER_NOT_SAY',
    "height_cm" INTEGER,
    "weight_kg" INTEGER,
    "body_shape" "public"."BodyShape",
    "city" VARCHAR(40),
    "style_prefs" "public"."StyleTag"[],
    "avoided_colors" "public"."ColorTag"[],
    "budget_min" INTEGER,
    "budget_max" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "public"."ConsentType" NOT NULL,
    "policy_version" VARCHAR(20) NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "ip_hash" TEXT,
    "user_agent" VARCHAR(512),
    "media_asset_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."media_assets" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "kind" "public"."MediaKind" NOT NULL,
    "status" "public"."MediaStatus" NOT NULL DEFAULT 'PENDING',
    "visibility" "public"."MediaVisibility" NOT NULL DEFAULT 'PRIVATE',
    "storage_key" TEXT NOT NULL,
    "mime_type" VARCHAR(64) NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "checksum" TEXT,
    "encryption" "public"."EncryptionMode" NOT NULL DEFAULT 'NONE',
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "moderation_status" "public"."ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "expires_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."brands" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_key" TEXT,
    "site_url" TEXT,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."garments" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "category" "public"."GarmentCategory" NOT NULL,
    "sub_category" VARCHAR(40),
    "gender" "public"."GarmentGender" NOT NULL DEFAULT 'UNISEX',
    "colors" "public"."ColorTag"[],
    "primary_color_hex" VARCHAR(9),
    "styles" "public"."StyleTag"[],
    "seasons" "public"."Season"[],
    "materials" TEXT[],
    "fit" VARCHAR(40),
    "brand_id" TEXT,
    "price_cents" INTEGER,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "purchase_url" TEXT,
    "image_id" TEXT,
    "cutout_id" TEXT,
    "attributes" JSONB,
    "source" "public"."GarmentSource" NOT NULL DEFAULT 'PLATFORM',
    "owner_id" TEXT,
    "status" "public"."GarmentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."outfits" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "source" "public"."OutfitSource" NOT NULL DEFAULT 'FREE_STYLE',
    "status" "public"."OutfitStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "public"."OutfitVisibility" NOT NULL DEFAULT 'PRIVATE',
    "base_photo_id" TEXT,
    "face_photo_id" TEXT,
    "result_image_id" TEXT,
    "cover_image_id" TEXT,
    "note" VARCHAR(500),
    "favorite_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outfits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."outfit_items" (
    "id" TEXT NOT NULL,
    "outfit_id" TEXT NOT NULL,
    "garment_id" TEXT NOT NULL,
    "slot" "public"."Slot" NOT NULL,
    "z_index" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "transform" JSONB,
    "reason" VARCHAR(200),

    CONSTRAINT "outfit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."outfit_drafts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_photo_id" TEXT,
    "face_photo_id" TEXT,
    "layers" JSONB NOT NULL DEFAULT '[]',
    "status" "public"."DraftStatus" NOT NULL DEFAULT 'EDITING',
    "result_image_id" TEXT,
    "outfit_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outfit_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."generation_tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "public"."TaskType" NOT NULL,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" "public"."AIProvider" NOT NULL DEFAULT 'MOCK',
    "provider_job_id" TEXT,
    "idempotency_key" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "cost_cents" INTEGER NOT NULL DEFAULT 0,
    "outfit_id" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."generation_events" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "status" "public"."TaskStatus" NOT NULL,
    "message" VARCHAR(500),
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recommendations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scene_text" VARCHAR(200) NOT NULL,
    "parsed" JSONB,
    "inputs" JSONB,
    "style_title" VARCHAR(60),
    "rationale" TEXT,
    "tips" TEXT[],
    "avoid_tips" TEXT[],
    "outfit_id" TEXT,
    "task_id" TEXT,
    "parent_id" TEXT,
    "provider" VARCHAR(40),
    "model" VARCHAR(60),
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."posts" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "body" TEXT NOT NULL,
    "cover_image_id" TEXT,
    "outfit_id" TEXT,
    "status" "public"."PostStatus" NOT NULL DEFAULT 'DRAFT',
    "moderation_status" "public"."ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "bookmark_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "hot_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."post_images" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "post_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tags" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(40) NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "kind" "public"."TagKind" NOT NULL DEFAULT 'GENERAL',
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."post_tags" (
    "post_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("post_id","tag_id")
);

-- CreateTable
CREATE TABLE "public"."comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "body" VARCHAR(500) NOT NULL,
    "status" "public"."CommentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."post_likes" (
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id","user_id")
);

-- CreateTable
CREATE TABLE "public"."comment_likes" (
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("comment_id","user_id")
);

-- CreateTable
CREATE TABLE "public"."post_bookmarks" (
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_bookmarks_pkey" PRIMARY KEY ("post_id","user_id")
);

-- CreateTable
CREATE TABLE "public"."outfit_favorites" (
    "outfit_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_favorites_pkey" PRIMARY KEY ("outfit_id","user_id")
);

-- CreateTable
CREATE TABLE "public"."follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "target_type" "public"."ReportTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" "public"."ReportReason" NOT NULL,
    "detail" VARCHAR(500),
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'OPEN',
    "handled_by_id" TEXT,
    "resolution" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."moderation_records" (
    "id" TEXT NOT NULL,
    "target_type" VARCHAR(20) NOT NULL,
    "target_id" TEXT NOT NULL,
    "source" "public"."ModerationSource" NOT NULL,
    "labels" TEXT[],
    "score" DOUBLE PRECISION,
    "decision" "public"."ModerationDecision" NOT NULL,
    "reviewer_id" TEXT,
    "note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sensitive_terms" (
    "id" TEXT NOT NULL,
    "term" VARCHAR(60) NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "action" VARCHAR(10) NOT NULL DEFAULT 'BLOCK',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensitive_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "type" "public"."NotificationType" NOT NULL,
    "entity_type" VARCHAR(20),
    "entity_id" TEXT,
    "payload" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" VARCHAR(60) NOT NULL,
    "target_type" VARCHAR(20),
    "target_id" TEXT,
    "ip_hash" TEXT,
    "user_agent" VARCHAR(512),
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usage_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "kind" "public"."UsageKind" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "cost_cents" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "public"."users"("handle");

-- CreateIndex
CREATE INDEX "users_status_created_at_idx" ON "public"."users"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "public"."accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "public"."verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "public"."verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "public"."profiles"("user_id");

-- CreateIndex
CREATE INDEX "consents_user_id_type_idx" ON "public"."consents"("user_id", "type");

-- CreateIndex
CREATE INDEX "consents_media_asset_id_idx" ON "public"."consents"("media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "public"."media_assets"("storage_key");

-- CreateIndex
CREATE INDEX "media_assets_owner_id_kind_idx" ON "public"."media_assets"("owner_id", "kind");

-- CreateIndex
CREATE INDEX "media_assets_status_created_at_idx" ON "public"."media_assets"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "public"."brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "garments_slug_key" ON "public"."garments"("slug");

-- CreateIndex
CREATE INDEX "garments_category_status_idx" ON "public"."garments"("category", "status");

-- CreateIndex
CREATE INDEX "garments_status_popularity_idx" ON "public"."garments"("status", "popularity" DESC);

-- CreateIndex
CREATE INDEX "garments_owner_id_idx" ON "public"."garments"("owner_id");

-- CreateIndex
CREATE INDEX "outfits_owner_id_status_idx" ON "public"."outfits"("owner_id", "status");

-- CreateIndex
CREATE INDEX "outfits_visibility_created_at_idx" ON "public"."outfits"("visibility", "created_at");

-- CreateIndex
CREATE INDEX "outfit_items_outfit_id_slot_idx" ON "public"."outfit_items"("outfit_id", "slot");

-- CreateIndex
CREATE INDEX "outfit_items_garment_id_idx" ON "public"."outfit_items"("garment_id");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_drafts_outfit_id_key" ON "public"."outfit_drafts"("outfit_id");

-- CreateIndex
CREATE INDEX "outfit_drafts_user_id_status_idx" ON "public"."outfit_drafts"("user_id", "status");

-- CreateIndex
CREATE INDEX "generation_tasks_status_created_at_idx" ON "public"."generation_tasks"("status", "created_at");

-- CreateIndex
CREATE INDEX "generation_tasks_provider_job_id_idx" ON "public"."generation_tasks"("provider_job_id");

-- CreateIndex
CREATE INDEX "generation_tasks_outfit_id_idx" ON "public"."generation_tasks"("outfit_id");

-- CreateIndex
CREATE UNIQUE INDEX "generation_tasks_user_id_idempotency_key_key" ON "public"."generation_tasks"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "generation_events_task_id_created_at_idx" ON "public"."generation_events"("task_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_outfit_id_key" ON "public"."recommendations"("outfit_id");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_task_id_key" ON "public"."recommendations"("task_id");

-- CreateIndex
CREATE INDEX "recommendations_user_id_created_at_idx" ON "public"."recommendations"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "posts_status_published_at_idx" ON "public"."posts"("status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "posts_status_hot_score_idx" ON "public"."posts"("status", "hot_score" DESC);

-- CreateIndex
CREATE INDEX "posts_author_id_created_at_idx" ON "public"."posts"("author_id", "created_at");

-- CreateIndex
CREATE INDEX "post_images_media_id_idx" ON "public"."post_images"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_images_post_id_position_key" ON "public"."post_images"("post_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "public"."tags"("slug");

-- CreateIndex
CREATE INDEX "tags_kind_usage_count_idx" ON "public"."tags"("kind", "usage_count" DESC);

-- CreateIndex
CREATE INDEX "post_tags_tag_id_idx" ON "public"."post_tags"("tag_id");

-- CreateIndex
CREATE INDEX "comments_post_id_created_at_idx" ON "public"."comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "comments_parent_id_idx" ON "public"."comments"("parent_id");

-- CreateIndex
CREATE INDEX "post_likes_user_id_idx" ON "public"."post_likes"("user_id");

-- CreateIndex
CREATE INDEX "post_bookmarks_user_id_created_at_idx" ON "public"."post_bookmarks"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "outfit_favorites_user_id_idx" ON "public"."outfit_favorites"("user_id");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "public"."follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "public"."follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "public"."reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "reports_target_type_target_id_idx" ON "public"."reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "moderation_records_target_type_target_id_idx" ON "public"."moderation_records"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "moderation_records_created_at_idx" ON "public"."moderation_records"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sensitive_terms_term_key" ON "public"."sensitive_terms"("term");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_read_at_created_at_idx" ON "public"."notifications"("recipient_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "public"."audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "public"."audit_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "usage_ledger_user_id_day_kind_key" ON "public"."usage_ledger"("user_id", "day", "kind");

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consents" ADD CONSTRAINT "consents_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media_assets" ADD CONSTRAINT "media_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."garments" ADD CONSTRAINT "garments_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."garments" ADD CONSTRAINT "garments_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."garments" ADD CONSTRAINT "garments_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."garments" ADD CONSTRAINT "garments_cutout_id_fkey" FOREIGN KEY ("cutout_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfits" ADD CONSTRAINT "outfits_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfits" ADD CONSTRAINT "outfits_base_photo_id_fkey" FOREIGN KEY ("base_photo_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfits" ADD CONSTRAINT "outfits_face_photo_id_fkey" FOREIGN KEY ("face_photo_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfits" ADD CONSTRAINT "outfits_result_image_id_fkey" FOREIGN KEY ("result_image_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfits" ADD CONSTRAINT "outfits_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_items" ADD CONSTRAINT "outfit_items_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_items" ADD CONSTRAINT "outfit_items_garment_id_fkey" FOREIGN KEY ("garment_id") REFERENCES "public"."garments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_drafts" ADD CONSTRAINT "outfit_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_drafts" ADD CONSTRAINT "outfit_drafts_user_photo_id_fkey" FOREIGN KEY ("user_photo_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_drafts" ADD CONSTRAINT "outfit_drafts_face_photo_id_fkey" FOREIGN KEY ("face_photo_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_drafts" ADD CONSTRAINT "outfit_drafts_result_image_id_fkey" FOREIGN KEY ("result_image_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_drafts" ADD CONSTRAINT "outfit_drafts_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."generation_tasks" ADD CONSTRAINT "generation_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."generation_tasks" ADD CONSTRAINT "generation_tasks_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."generation_events" ADD CONSTRAINT "generation_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."generation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recommendations" ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recommendations" ADD CONSTRAINT "recommendations_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recommendations" ADD CONSTRAINT "recommendations_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."generation_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recommendations" ADD CONSTRAINT "recommendations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."post_images" ADD CONSTRAINT "post_images_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."post_images" ADD CONSTRAINT "post_images_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."post_tags" ADD CONSTRAINT "post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."post_tags" ADD CONSTRAINT "post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."post_bookmarks" ADD CONSTRAINT "post_bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."post_bookmarks" ADD CONSTRAINT "post_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_favorites" ADD CONSTRAINT "outfit_favorites_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_favorites" ADD CONSTRAINT "outfit_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_handled_by_id_fkey" FOREIGN KEY ("handled_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."moderation_records" ADD CONSTRAINT "moderation_records_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_ledger" ADD CONSTRAINT "usage_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
