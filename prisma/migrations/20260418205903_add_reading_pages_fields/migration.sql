-- AlterTable
ALTER TABLE "ReadingSession" ADD COLUMN     "bookType" TEXT,
ADD COLUMN     "pagesRead" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPages" INTEGER NOT NULL DEFAULT 0;
