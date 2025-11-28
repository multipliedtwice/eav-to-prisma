-- CreateTable
CREATE TABLE "content_model" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "component" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "content_instance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "model_id" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'en',
    "attribute_values" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "content_model_slug_key" ON "content_model"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "component_slug_key" ON "component"("slug");

-- CreateIndex
CREATE INDEX "content_instance_model_id_idx" ON "content_instance"("model_id");

-- CreateIndex
CREATE INDEX "content_instance_lang_idx" ON "content_instance"("lang");
