// Transforme dist-single/index.html en page publiable comme artifact claude.ai
// (l'hébergeur ajoute lui-même doctype, head et body).
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist-single/index.html', 'utf8');
let head = src.match(/<head>([\s\S]*)<\/head>/)[1];
const body = src.match(/<body>([\s\S]*)<\/body>/)[1];
head = head.replace(/<meta charset="UTF-8" \/>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '');
const title = head.match(/<title>.*?<\/title>/)[0];
head = head.replace(title, '');
writeFileSync('dist-single/declic-artifact.html', `${title}\n${head.trim()}\n${body.trim()}\n`);
console.log('dist-single/declic-artifact.html écrit');
