CREATE TABLE "page_views" (
	"day" date NOT NULL,
	"path" text NOT NULL,
	"locale" "locale" NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "page_views_day_path_locale_pk" PRIMARY KEY("day","path","locale")
);
