import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These pull in native addons / Node-only code. Keep them out of the server
  // bundle and let Node require them natively:
  //   · pdf-parse / pdfjs-dist -> @napi-rs/canvas
  //   · @huggingface/transformers -> onnxruntime-node (local embedding model)
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
    "@napi-rs/canvas",
    "@huggingface/transformers",
    "onnxruntime-node",
  ],
};

export default nextConfig;
