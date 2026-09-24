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

  // Native binaries that Node File Trace cannot discover on its own.
  //
  // Both packages locate these through *runtime-computed* requires, so the
  // static trace never sees them and they are pruned from the deployed
  // function:
  //   sharp        require(`@img/sharp-libvips-${platform}/lib`)  -> dist/libvips.cjs
  //   onnxruntime  bin/napi-v6/${process.platform}/${process.arch}/...
  // On Windows this went unnoticed because sharp ships libvips *inside*
  // @img/sharp-win32-x64. On Vercel (linux-x64) libvips is a separate
  // package, so `libvips-cpp.so.8.18.6` went missing and every /api/rag/*
  // route 500'd at import time with "cannot open shared object file".
  //
  // Scoped to /api/rag/* - those are the only routes that import
  // @/lib/rag/embeddings, so the rest of the app pays nothing for this.
  outputFileTracingIncludes: {
    "/api/rag/*": [
      "./node_modules/@huggingface/transformers/node_modules/@img/**/*",
      `./node_modules/onnxruntime-node/bin/*/${process.platform}/${process.arch}/**/*`,
    ],
  },
};

export default nextConfig;
