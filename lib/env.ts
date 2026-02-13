function getEnv(name: string, fallback = "") {
  return process.env[name] ?? fallback;
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  PAYSTACK_SECRET_KEY: getEnv("PAYSTACK_SECRET_KEY"),
  ELEVENLABS_API_KEY: getEnv("ELEVENLABS_API_KEY"),
  APP_BASE_URL: getEnv("APP_BASE_URL", "http://localhost:3000")
};

export function hasServerEnv() {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY
  );
}
