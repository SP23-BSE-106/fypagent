import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native addons / Node-only code that must be required natively rather than
  // bundled: pdf-parse -> @napi-rs/canvas (compiled .node binding),
  // @huggingface/transformers -> onnxruntime-node (local embedding model).
  //
  // pdf-parse / pdfjs-dist are kept EXTERNAL on purpose. Bundling them was
  // tried and is worse: pdfjs resolves its worker as
  //   workerSrc ||= "./pdf.worker.mjs"   // relative to the importing chunk
  // so once bundled it looks for .next/server/chunks/pdf.worker.mjs, which is
  // never emitted, and every upload fails with
  //   Setting up fake worker failed: Cannot find module '.../chunks/pdf.worker.mjs'
  // Externally, that import resolves next to the real package and works.
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
