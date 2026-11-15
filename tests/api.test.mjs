import {test} from 'node:test';
import assert from 'node:assert/strict';
const origin=process.env.DEMO_TEST_ORIGIN||'http://localhost:5178';
async function request(body,query=''){
 const r=await fetch(origin+'/api/restaurant'+query,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 return {status:r.status,data:await r.json()};
}
test('D1 API preserves concurrent orders, deduplicates retries, and revokes closed visits',async()=>{
 const joins=await Promise.all(Array.from({length:3},()=>request({action:'join',table:12})));
 for(const r of joins)assert.equal(r.status,200);
 const {token,visitId}=joins[0].data;assert.equal(new Set(joins.map(r=>r.data.visitId)).size,1);
 const baseline=(await request(undefined,'?token='+token)).data.orders.length;
 const a={action:'order',token,requestId:crypto.randomUUID(),lines:[{itemId:'signature',optionId:'meal',quantity:2,expectedPrice:4000}]};
 const duplicates=await Promise.all(Array.from({length:3},()=>request(a)));
 assert.equal(new Set(duplicates.map(r=>r.data.order.id)).size,1);
 const parallel=await Promise.all(Array.from({length:4},()=>request({...a,requestId:crypto.randomUUID()})));
 for(const r of parallel)assert.equal(r.status,200,JSON.stringify(r.data));
 const visible=await request(undefined,'?token='+token);assert.equal(visible.data.orders.length,baseline+5);
 assert.equal((await request()).data.orders.length,0);
 assert.equal((await request(undefined,'?token=fake')).data.orders.length,0);
 for(const o of visible.data.orders){if(['queued','preparing','ready'].includes(o.status))assert.equal((await request({action:'status',id:o.id,status:'cancelled',reason:'Automated local QA complete'})).status,200);}
 assert.equal((await request({action:'close',id:visitId})).status,200);
 assert.equal((await request({...a,requestId:crypto.randomUUID()})).status,410);
 const closed=await request(undefined,'?token='+token);assert.deepEqual(closed.data.orders,[]);assert.equal(closed.data.closed,true);
 const newer=await request({action:'join',table:12});assert.notEqual(newer.data.token,token);
 assert.deepEqual((await request(undefined,'?token='+newer.data.token)).data.orders,[]);
 await request({action:'close',id:newer.data.visitId});
});
