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

  // Files that Node File Trace under-reports for this route.
  //
  // Two separate traps, both invisible on Windows because the native
  // packages ship a different layout there:
  //
  //   sharp / onnxruntime / @napi-rs/canvas resolve their binaries through
  //   *runtime-computed* requires, which the static trace cannot follow:
  //     sharp        require(`@img/sharp-libvips-${platform}/lib`)
  //     onnxruntime  bin/napi-v6/${process.platform}/${process.arch}/...
  //     @napi-rs     require(`@napi-rs/canvas-${platform}-${arch}-${libc}`)
  //   On Vercel (linux-x64) sharp's libvips is a separate package, so
  //   `libvips-cpp.so.8.18.6` went missing and every /api/rag/* route 500'd
  //   at import time with "cannot open shared object file".
  //
  //   pdf-parse -> pdfjs-dist is worse: pdf-parse imports it only from inside
  //   its own bundle (PDFParse.js: `from 'pdfjs-dist/legacy/build/pdf.mjs'`),
  //   and the trace recorded exactly one file of pdfjs-dist - no
  //   pdf.worker.mjs, no cjs entry of pdf-parse - yet even that one file was
  //   absent from the deployed function. Every upload failed with
  //     Cannot find module '/var/task/node_modules/pdfjs-dist/legacy/build/pdf.mjs'
  //   which pdf-parse wrapped as "Setting up worker failed" and our handler
  //   surfaced as a 422 "could not extract text".
  //
  // Pinning the packages whole sidesteps guessing at each layout. Scoped to
  // /api/rag/* - the only routes that import pdf-parse or
  // @/lib/rag/embeddings - so the rest of the app pays nothing for this.
  outputFileTracingIncludes: {
    "/api/rag/*": [
      "./node_modules/@huggingface/transformers/node_modules/@img/**/*",
      `./node_modules/onnxruntime-node/bin/*/${process.platform}/${process.arch}/**/*`,
      "./node_modules/@napi-rs/**/*",
      "./node_modules/pdf-parse/**/*",
      "./node_modules/pdfjs-dist/**/*",
    ],
  },
};

export default nextConfig;
