/** Compare frontend API fields and enums with the committed backend schema. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(join(root,'apps/web/package.json'));
const ts=require('typescript');
const file=join(root,'apps/web/src/api/types.ts');
const program=ts.createProgram([file],{strict:true,target:ts.ScriptTarget.ES2022,skipLibCheck:true,noEmit:true});
const checker=program.getTypeChecker();
const source=program.getSourceFile(file);
const schemas=JSON.parse(readFileSync(join(root,'packages/contracts/openapi.json'),'utf8')).components.schemas;
const pairs={Crew:'Crew',Route:'Route',Voyage:'Voyage',VoyageCreate:'VoyageCreate',VoyageUpdate:'VoyageUpdate',Source:'Source',VoyageRecord:'Record',Port:'Port',Trade:'Trade',Task:'Task',TaskEvent:'Event',Usage:'Usage',ModelInfo:'ModelInfo',Scene:'Scene'};
let enums=0;
for(const [clientName,serverName] of Object.entries(pairs)){
 const node=source.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text===clientName);
 assert(node,clientName);
 const properties=checker.getTypeAtLocation(node).getProperties();
 const server=schemas[serverName].properties;
 assert.deepEqual(properties.map(p=>p.name).sort(),Object.keys(server).sort(),`${clientName} fields`);
 for(const property of properties){
  const schema=server[property.name];
  const values=schema.enum??('const' in schema?[schema.const]:null);
  if(!values)continue;
  const type=checker.getTypeOfSymbolAtLocation(property,node);
  const members=type.isUnion()?type.types:[type];
  const actual=members.filter(t=>t.flags&(ts.TypeFlags.StringLiteral|ts.TypeFlags.NumberLiteral)).map(t=>t.value);
  assert.deepEqual(actual.sort(),[...values].sort(),`${clientName}.${property.name} enum`);
  enums++;
 }
}
console.log(`API contract: ${Object.keys(pairs).length} frontend interfaces and ${enums} enums match backend OpenAPI.`);
