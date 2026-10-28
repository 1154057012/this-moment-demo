import fs from 'node:fs';
import path from 'node:path';
const required=['index.html','styles.css','app.mjs','core.mjs','player.mjs','downloads/product-brief.pdf','downloads/walkthrough.mp4','content/ai-usage.md','assets/media/SOURCES.md'];
for(let i=1;i<=8;i++)required.push(`assets/media/clip-${i}.mp4`,`assets/media/clip-${i}.jpg`);
for(const v of ['base','voice','short','both'])required.push(`assets/media/${v}.mp4`);
let errors=[];
for(const file of required){if(!fs.existsSync(file)||fs.statSync(file).size===0)errors.push(`Missing/empty: ${file}`);}
const html=fs.readFileSync('index.html','utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
 const ref=match[1]; if(/^https?:/.test(ref))continue;
 if(!fs.existsSync(path.resolve(ref)))errors.push(`Broken local reference: ${ref}`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`PASS: ${required.length} required files and all static references exist.`);
