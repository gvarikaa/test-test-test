-- Add CommentAnalysis and DiscussionAnalysis models

-- Create CommentAnalysis table
CREATE TABLE IF NOT EXISTS "CommentAnalysis" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "CommentAnalysis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommentAnalysis_commentId_key" UNIQUE ("commentId")
);

-- Create DiscussionAnalysis table
CREATE TABLE IF NOT EXISTS "DiscussionAnalysis" (
  "id" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "DiscussionAnalysis_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "CommentAnalysis" ADD CONSTRAINT "CommentAnalysis_commentId_fkey" 
  FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "CommentAnalysis_commentId_idx" ON "CommentAnalysis"("commentId");
CREATE INDEX IF NOT EXISTS "CommentAnalysis_createdAt_idx" ON "CommentAnalysis"("createdAt");
CREATE INDEX IF NOT EXISTS "DiscussionAnalysis_createdAt_idx" ON "DiscussionAnalysis"("createdAt");