-- CreateTable
CREATE TABLE "Session" (
    "sid" VARCHAR NOT NULL,
    "data" TEXT NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "Session"("expire");
