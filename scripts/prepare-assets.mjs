import { mkdir, copyFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
await mkdir(path.join(root,'public/ocr/core'),{recursive:true});
await mkdir(path.join(root,'public/ocr/lang'),{recursive:true});
await copyFile('node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js');
for(const file of await readdir('node_modules/tesseract.js-core')) {
  if(file.includes('lstm')&&(file.endsWith('.wasm.js')||file.endsWith('.wasm'))) await copyFile(path.join('node_modules/tesseract.js-core',file),path.join('public/ocr/core',file));
}
for(const lang of ['eng','chi_tra']) await copyFile(`node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,`public/ocr/lang/${lang}.traineddata.gz`);
console.log('Local OCR worker, WebAssembly core and Chinese/English models are ready.');
