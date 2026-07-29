import {readJson,root,validateReview,reports} from './linguistic-lib.mjs';import path from 'node:path';
const results=readJson(path.join(root,'linguistic-audit-results.json'),[]);if(!Array.isArray(results))throw new Error('linguistic-audit-results.json must be an array');for(const result of results)validateReview(result,result.textId);console.log(JSON.stringify(reports(results,false)));
