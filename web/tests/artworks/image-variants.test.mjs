import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import sharp from 'sharp';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = new URL('../../lib/artworks/imageVariants.server.ts', import.meta.url);
const { outputText } = ts.transpileModule(readFileSync(source, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
});
const module = { exports: {} };
new Function('require', 'module', 'exports', outputText)(require, module, module.exports);
const { inspectArtworkImage, generateAndUploadArtworkVariants, ArtworkImageProcessingError } = module.exports;

function fixture(width = 2400, height = 1200) {
  return sharp({ create: { width, height, channels: 3, background: '#804020' } });
}

function storage(failUpload = false) {
  const uploaded = new Map();
  const removed = [];
  return {
    uploaded,
    removed,
    admin: { storage: { from(bucket) {
      assert.equal(bucket, 'artworks');
      return {
        async upload(path, buffer, options) {
          uploaded.set(path, { buffer, options });
          return { error: failUpload && path.endsWith('.card.webp') ? { message: 'Test storage failure' } : null };
        },
        async remove(paths) { removed.push(...paths); return { error: null }; },
        getPublicUrl(path) { return { data: { publicUrl: `https://storage.example.test/${path}` } }; },
      };
    } } },
  };
}

for (const format of ['jpeg', 'png', 'webp']) {
  test(`real image pipeline accepts ${format} and creates three valid WebP sizes`, async () => {
    const input = await fixture().toFormat(format).toBuffer();
    const metadata = await inspectArtworkImage(input, `image/${format}`);
    assert.deepEqual([metadata.width, metadata.height, metadata.format], [2400, 1200, format]);
    const state = storage();
    const result = await generateAndUploadArtworkVariants({ admin: state.admin, storagePath: `seller/artwork.${format}`, sourceBuffer: input });
    assert.equal(state.uploaded.size, 3);
    for (const [name, width] of [['thumbnail', 480], ['card', 960], ['detail', 1600]]) {
      const item = state.uploaded.get(result.paths[name]);
      assert.ok(item.buffer.length > 0);
      const decoded = await sharp(item.buffer).metadata();
      assert.deepEqual([decoded.format, decoded.width, decoded.height], ['webp', width, width / 2]);
      assert.equal(item.options.contentType, 'image/webp');
      assert.equal(item.options.upsert, false);
    }
  });
}

test('EXIF orientation is applied and small images are not enlarged', async () => {
  const input = await fixture(120, 60).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const metadata = await inspectArtworkImage(input, 'image/jpeg');
  assert.deepEqual([metadata.width, metadata.height], [60, 120]);
  const state = storage();
  await generateAndUploadArtworkVariants({ admin: state.admin, storagePath: 'seller/rotated.jpg', sourceBuffer: input });
  for (const { buffer } of state.uploaded.values()) {
    const decoded = await sharp(buffer).metadata();
    assert.deepEqual([decoded.width, decoded.height], [60, 120]);
  }
});

test('invalid images and a false declared type are rejected', async () => {
  await assert.rejects(inspectArtworkImage(Buffer.alloc(0)), ArtworkImageProcessingError);
  await assert.rejects(inspectArtworkImage(Buffer.from('not an image')), ArtworkImageProcessingError);
  const png = await fixture(40, 20).png().toBuffer();
  await assert.rejects(inspectArtworkImage(png, 'image/jpeg'), /non corrisponde/);
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>');
  await assert.rejects(inspectArtworkImage(svg), /non supportato/);
});

test('failed variant storage cleans up partial uploads and reports the failure', async () => {
  const state = storage(true);
  const input = await fixture(40, 20).png().toBuffer();
  await assert.rejects(generateAndUploadArtworkVariants({ admin: state.admin, storagePath: 'seller/failed.png', sourceBuffer: input }), ArtworkImageProcessingError);
  assert.equal(state.uploaded.size, 3);
  assert.deepEqual(state.removed.sort(), [...state.uploaded.keys()].sort());
});
