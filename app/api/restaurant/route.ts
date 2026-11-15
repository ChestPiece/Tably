import { env } from 'cloudflare:workers';
import { initialState, type State } from '@/lib/model';
import { applyAction, AppError, guestState } from '@/lib/actions';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function read(){
 if(!env.DB)throw new Error('Database is unavailable');
 await env.DB.prepare('INSERT OR IGNORE INTO restaurant_state (id, version, data) VALUES (?, 0, ?)').bind('chestbest',JSON.stringify(initialState())).run();
 const row=await env.DB.prepare('SELECT version, data FROM restaurant_state WHERE id = ?').bind('chestbest').first<{version:number,data:string}>();
 if(!row)throw new Error('Database is unavailable');return {version:row.version,state:JSON.parse(row.data) as State};
}
export async function GET(req:Request){try{const {state}=await read();const url=new URL(req.url);if(url.searchParams.get('view')==='staff')return reply({...state,visits:state.visits.map(({token,...v})=>v)});return reply(guestState(state,url.searchParams.get('token')));}catch{return reply({error:'Unable to connect. Please retry or speak to our team.',code:'CONNECTION'},503);}}
export async function POST(req:Request){
 try{
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Invalid origin.'},403);
  const raw=await req.text();if(raw.length>60000)return reply({error:'Request too large.'},413);
  let action;try{action=JSON.parse(raw);}catch{return reply({error:'Invalid request.'},400);}
  for(let attempt=0;attempt<8;attempt++){
   const {state,version}=await read();const result=applyAction(state,action);
   const update=await env.DB!.prepare('UPDATE restaurant_state SET data = ?, version = version + 1 WHERE id = ? AND version = ?').bind(JSON.stringify(state),'chestbest',version).run();
   if(update.meta.changes===1)return reply(result);
  }
  return reply({error:'Busy right now. Retry your request.',code:'BUSY'},409);
 }catch(e){if(e instanceof AppError)return reply({error:e.message,code:e.code},e.status);return reply({error:'Connection interrupted. Retry safely; your order will not be duplicated.',code:'CONNECTION'},503);}
}
