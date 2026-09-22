import axios from 'axios';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';


const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
const stream = true;

const headers = {
  "Authorization": "Bearer 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",
  "Accept": stream ? "text/event-stream" : "application/json"
};

function findMediaPath(kind, index, mimeTypes) {
  for (const suffix of Object.keys(mimeTypes)) {
    const path = `${kind}_${index}${suffix}`;
    if (existsSync(path)) {
      return path;
    }
  }
  const expected = Object.keys(mimeTypes).join("/");
  throw new Error(`Expected ${kind}_${index}${expected}`);
}

async function readMediaB64(path) {
  return Buffer.from(await readFile(path)).toString('base64');
}

function mediaDataUrl(path, mediaB64, mimeTypes) {
  return `data:${mimeTypes[extname(path).toLowerCase()]};base64,${mediaB64}`;
}

async function main() {
  const imageMimeTypes = {".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp"};
  const imagePaths = [findMediaPath("image", 1, imageMimeTypes)];
  const imageB64s = await Promise.all(imagePaths.map(readMediaB64));
  const imageDataUrls = imagePaths.map((path, index) => mediaDataUrl(path, imageB64s[index], imageMimeTypes));
  const payload = {"messages":[{"role":"user","content":[{"type":"image_url","image_url":{"url":imageDataUrls[0]}},{"type":"text","text":"What is in this image?"}]}],"model":"moonshotai/kimi-k3","max_tokens":16384,"seed":0,"stream":stream,"temperature":1,"reasoning_effort":"max"};

  const response = await axios.post(invokeUrl, payload, {
    headers: headers,
    responseType: stream ? 'stream' : 'json'
  });

  if (stream) {
    response.data.on('data', (chunk) => {
      console.log(chunk.toString());
    });
  } else {
    console.log(JSON.stringify(response.data));
  }
}

main().catch(error => {
  if (error.response) {
    console.error(`HTTP ${error.response.status}`);
    if (error.response.data?.on) {
      error.response.data.on('data', (chunk) => console.error(chunk.toString()));
    } else {
      console.error(error.response.data);
    }
  } else {
    console.error(error);
  }
});
