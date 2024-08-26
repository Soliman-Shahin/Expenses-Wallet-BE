const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:8200",
  "http://localhost:8100",
  "*",
];

export const corsOptions = {
  origin: (origin: any, callback: any) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  exposedHeaders: ["access-token", "refresh-token"],
};
