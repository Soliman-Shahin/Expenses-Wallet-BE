// Allow overriding origins from environment variable (comma-separated)
const envOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const defaultOrigins = [
  "http://localhost", // Android WebView default origin
  "http://localhost:4200",
  "http://localhost:8200",
  "http://localhost:8100",
  "http://127.0.0.1:51802",
  // Ionic/Capacitor mobile webview origins
  "capacitor://localhost",
  "ionic://localhost",
  "https://expenses-wallet.up.railway.app", // API itself (not typically needed but safe)
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow server-to-server or non-browser requests (no origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "access-token",
    "refresh-token",
    "_id",
    "X-Requested-With",
  ],
  exposedHeaders: ["access-token", "refresh-token", "_id"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
