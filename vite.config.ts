import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vite loads .env files for the app bundle, but those values are not on process.env while this
// config is evaluated, so read the dotenv files directly. Real environment variables win.
function readEnvFile(file: string): Record<string, string> {
  const full = path.join(__dirname, file);
  if (!fs.existsSync(full)) return {};
  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return values;
}

const localEnv = { ...readEnvFile(".env"), ...readEnvFile(".env.local") };
const pick = (...names: string[]): string | undefined => {
  for (const name of names) {
    const value = process.env[name] ?? localEnv[name];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
};

const supabaseUrl = pick("NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL");
const supabaseAnonKey = pick("NEXT_PUBLIC_SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");

function requireSupabaseEnv(): Plugin {
  return {
    name: "require-supabase-env",
    configResolved(config) {
      if (config.command !== "build") return;
      const missing: string[] = [];
      if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
      if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      if (!missing.length) return;
      throw new Error(
        `Build failed: missing Supabase environment variables: ${missing.join(", ")}.\n` +
          "Vite inlines these at build time, so the deployed app cannot reach Supabase without them.\n" +
          "Set them in your host's environment variables, or in a local .env.local for development builds.\n" +
          "To build without cloud support on purpose, run: SKIP_SUPABASE_ENV_CHECK=1 npm run build",
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    ...(mode === "test" || process.env.SKIP_SUPABASE_ENV_CHECK === "1" ? [] : [requireSupabaseEnv()]),
    react(),
    tailwindcss(),
    viteSingleFile(),
  ],
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
}));

