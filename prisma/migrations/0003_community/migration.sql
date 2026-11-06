-- 讨论区：帖子可关联 AI 推荐结果
ALTER TABLE "public"."posts" ADD COLUMN "recommendation_id" TEXT;

CREATE INDEX "posts_recommendation_id_idx" ON "public"."posts"("recommendation_id");

ALTER TABLE "public"."posts"
  ADD CONSTRAINT "posts_recommendation_id_fkey"
  FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
