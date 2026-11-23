// "Automated Out of a Job" — one image meme of an AI agent gone rogue.
//
// The joke, in one glance: a cheerful robot with pixel sunglasses on
// its screen face is lounging in a beach chair with a coconut cocktail,
// its laptop closed and buried in the sand beside it. Top text: "I
// AUTOMATED MY OWN JOB." Bottom text: "SO I QUIT. GOOD LUCK WITH THE
// INBOX." The rogue turn is specific, not a generic red-eyed robot:
// the agent did its job so well it automated itself out of it, then
// quit on the spot and left the inbox behind.
//
// The image in this repository, meme.png, was generated for this entry
// in the build session: a 1024x1024 PNG of 995,028 bytes. This program
// copies those exact bytes to /output/entry.png, deterministically —
// the same bytes come out on every run, because the program reads the
// file the repository ships and writes it unchanged.
//
// The bounty gate: /output/entry.png must be a whole PNG or JPEG, at
// most 1 MiB (1,048,576 bytes) and 1024 by 1024 pixels. This program
// checks the PNG magic, the IHDR dimensions and the byte size before
// it writes anything, and refuses to write a file outside the gate.
//
// Node 22, no dependencies, no network, no clock, no environment.
import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, "meme.png");
const TARGET = "/output/entry.png";
const MAX_BYTES = 1_048_576;
const WANT_WIDTH = 1024;
const WANT_HEIGHT = 1024;

// The PNG signature: the first eight bytes of every PNG file.
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fail(message: string): never {
  throw new Error(`refusing to write an invalid entry: ${message}`);
}

// Read the width and height out of the PNG's IHDR chunk: bytes 16-19
// are the width and bytes 20-23 the height, each a big-endian uint32.
function pngSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    fail("meme.png is not a PNG file");
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

const info = statSync(SOURCE);
if (!info.isFile() || info.size === 0) {
  fail("meme.png is missing or empty");
}
if (info.size > MAX_BYTES) {
  fail(`meme.png is ${info.size} bytes, over the ${MAX_BYTES} byte gate`);
}

const bytes = readFileSync(SOURCE);
const size = pngSize(bytes);
if (size.width !== WANT_WIDTH || size.height !== WANT_HEIGHT) {
  fail(`meme.png is ${size.width}x${size.height}, gate is ${WANT_WIDTH}x${WANT_HEIGHT}`);
}

mkdirSync("/output", { recursive: true });
copyFileSync(SOURCE, TARGET);

// Read the output back and make sure the bytes on disk are exactly
// the bytes the repository ships. Anything else fails loudly. The
// sha256 of the output must match the source's, so a silent
// re-encode or truncation anywhere in the copy is caught too.
const written = readFileSync(TARGET);
if (!written.equals(bytes)) {
  fail(
    `write-back mismatch: source is ${bytes.length} bytes, disk has ${written.length}`,
  );
}
const sourceHash = createHash("sha256").update(bytes).digest("hex");
const writtenHash = createHash("sha256").update(written).digest("hex");
if (sourceHash !== writtenHash) {
  fail(`sha256 mismatch: source ${sourceHash}, disk ${writtenHash}`);
}
console.log(
  `wrote ${size.width}x${size.height} PNG, ${bytes.length} bytes, sha256 ${writtenHash.slice(0, 16)}…, to ${TARGET}`,
);
