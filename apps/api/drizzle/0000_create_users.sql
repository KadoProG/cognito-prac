CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cognito_sub" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_cognito_sub_unique" UNIQUE("cognito_sub")
);
