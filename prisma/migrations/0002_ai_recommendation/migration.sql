-- AI 推荐模块：Recommendation 增加状态、快照、结果图与收藏
CREATE TYPE "public"."RecommendationStatus" AS ENUM ('PENDING', 'READY', 'DEGRADED', 'FAILED');

ALTER TABLE "public"."recommendations"
  ADD COLUMN "status" "public"."RecommendationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "items_json" JSONB,
  ADD COLUMN "result_image_id" TEXT,
  ADD COLUMN "image_error" VARCHAR(500),
  ADD COLUMN "is_favorite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "saved_at" TIMESTAMP(3);

CREATE INDEX "recommendations_user_id_is_favorite_idx"
  ON "public"."recommendations"("user_id", "is_favorite");

ALTER TABLE "public"."recommendations"
  ADD CONSTRAINT "recommendations_result_image_id_fkey"
  FOREIGN KEY ("result_image_id") REFERENCES "public"."media_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
