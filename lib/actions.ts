import { type State, type CartLine } from './model';
export class AppError extends Error { constructor(message:string,public status=400,public code='INVALID'){super(message);} }
function fail(message:string,status=400,code='INVALID'):never { throw new AppError(message,status,code); }
const text=(v:unknown,max=180)=>typeof v==='string' && v.trim().length>0 && v.length<=max;
export function applyAction(s:State,a:any,now=Date.now()):any {
 if(!a || typeof a.action!=='string') fail('Invalid request.');
 if(a.action==='join'){
  if(!Number.isInteger(a.table)||a.table<1||a.table>s.settings.tables)fail('This table does not exist.');
  let v=s.visits.find(v=>v.table===a.table&&!v.closedAt);
  if(!v){v={id:crypto.randomUUID(),token:crypto.randomUUID(),table:a.table,openedAt:now};s.visits.push(v);}
  return {token:v.token,visitId:v.id};
 }
 if(['order','assist'].includes(a.action)){
  const v=s.visits.find(v=>v.token===a.token&&!v.closedAt);
  if(!v)fail('This table visit has ended. Start a new visit to order.',410,'VISIT_CLOSED');
  if(a.action==='assist'){if(v.assistance)return {ok:true};v.assistance=now;return {ok:true};}
  if(!text(a.requestId,100))fail('Missing order reference.');
  const existing=s.orders.find(o=>o.requestId===a.requestId&&o.visitId===v.id);
  if(existing)return {order:existing};
  if(s.settings.paused)fail('Ordering is paused. Please speak to our team.',409,'PAUSED');
  if(v.paid)fail('This visit is settled. Ask staff to close it before ordering again.',409,'SETTLED');
  if(!Array.isArray(a.lines)||a.lines.length<1||a.lines.length>40)fail('Add between 1 and 40 items.');
  const lines=a.lines.map((l:CartLine)=>{
   if(!l||!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>20)fail('Choose a quantity between 1 and 20.');
   const item=s.menu.find(i=>i.id===l.itemId);if(!item||!item.available)fail('An item is no longer available. Please update your bag.',409,'UNAVAILABLE');
   const option=item.options.find(o=>o.id===l.optionId);if(!option)fail('An item option changed. Please add that item again.',409,'PRICE_CHANGED');
   const unitPrice=item.price+option.price;
   if(l.expectedPrice!==unitPrice)fail('A price changed. Please remove and re-add that item to review its new price.',409,'PRICE_CHANGED');
   return {itemId:item.id,name:item.name,ar:item.ar,quantity:l.quantity,optionId:option.id,optionName:option.name,optionAr:option.ar,unitPrice};
  });
  const order={id:crypto.randomUUID(),requestId:a.requestId,visitId:v.id,table:v.table,lines,total:lines.reduce((t:number,l:any)=>t+l.unitPrice*l.quantity,0),status:'queued' as const,createdAt:now,serviceMode:s.settings.serviceMode};
  s.orders.push(order);return {order};
 }
 if(a.action==='status'){
  const o=s.orders.find(o=>o.id===a.id);if(!o)fail('Order not found.',404);
  const next:Record<string,string>={queued:'preparing',preparing:'ready',ready:'served'};
  if(a.status==='cancelled'){
   if(!['queued','preparing','ready'].includes(o.status))fail('This order cannot be cancelled.');
   if(!text(a.reason,300))fail('Please give the guest a cancellation reason.');
   const v=s.visits.find(v=>v.id===o.visitId);if(v?.paid)fail('Settled orders cannot be cancelled.');
   o.reason=a.reason.trim();
  }else if(next[o.status]!==a.status)fail('Order status changed. Refresh and try again.',409);
  o.status=a.status;return {ok:true};
 }
 if(a.action==='settle'||a.action==='close'||a.action==='resolve'){
  const v=s.visits.find(v=>v.id===a.id&&!v.closedAt);if(!v)fail('Visit not found.',404);
  if(a.action==='resolve'){delete v.assistance;return {ok:true};}
  const orders=s.orders.filter(o=>o.visitId===v.id);
  if(orders.some(o=>!['served','cancelled'].includes(o.status)))fail('Serve or cancel all tickets before settling or closing.');
  const total=orders.filter(o=>o.status!=='cancelled').reduce((n,o)=>n+o.total,0);
  if(a.action==='settle'){
   if(!['cash','card'].includes(a.method))fail('Choose cash or card.');
   v.paid=true;v.paymentMethod=a.method;v.paidAt=now;v.settledTotal=total;
  }else{if(total>0&&!v.paid)fail('Record payment before closing the visit.');v.closedAt=now;delete v.assistance;}
  return {ok:true};
 }
 if(a.action==='settings'){
  const p=a.settings;
  if(!p||!text(p.name,60)||!text(p.nameAr,60)||!text(p.tagline,150)||!text(p.taglineAr,150)||!['table','counter'].includes(p.serviceMode)||!Number.isInteger(p.tables)||p.tables<1||p.tables>50||typeof p.paused!=='boolean'||!/^#[0-9a-f]{6}$/i.test(p.accent))fail('Check restaurant settings. Tables must be between 1 and 50.');
  if(s.visits.some(v=>!v.closedAt&&v.table>p.tables))fail('Close active visits before removing their tables.');
  if(!Array.isArray(p.categories)||p.categories.length<1||p.categories.length>20||p.categories.some((c:any)=>!text(c.id,40)||!text(c.name,60)||!text(c.ar,60))||new Set(p.categories.map((c:any)=>c.id)).size!==p.categories.length)fail('Provide unique categories with English and Arabic names.');
  if(s.menu.some(i=>!p.categories.some((c:any)=>c.id===i.category)))fail('Move menu items before removing their category.');
  s.settings={name:p.name,nameAr:p.nameAr,tagline:p.tagline,taglineAr:p.taglineAr,serviceMode:p.serviceMode,tables:p.tables,paused:p.paused,accent:p.accent,categories:p.categories};return {ok:true};
 }
 if(a.action==='availability'){
  const item=s.menu.find(i=>i.id===a.id);if(!item||typeof a.available!=='boolean')fail('Item not found.');item.available=a.available;return {ok:true};
 }
 if(a.action==='item'){
  const i=a.item;
  if(!i||!text(i.id,80)||!text(i.name,80)||!text(i.ar,80)||!text(i.description,400)||!text(i.descriptionAr,400)||!s.settings.categories.some(c=>c.id===i.category)||!Number.isInteger(i.price)||i.price<0||i.price>100000||typeof i.available!=='boolean'||typeof i.image!=='string'||(i.image&&!/^https:\/\//.test(i.image))||typeof i.badge!=='string'||i.badge.length>50)fail('Check the item fields and price. Images must use HTTPS.');
  if(!Array.isArray(i.options)||i.options.length<1||i.options.length>15||i.options.some((o:any)=>!text(o.id,80)||!text(o.name,100)||!text(o.ar,100)||!Number.isInteger(o.price)||o.price<0||o.price>100000)||new Set(i.options.map((o:any)=>o.id)).size!==i.options.length)fail('Provide valid options with unique IDs and non-negative prices.');
  const clean={id:i.id,name:i.name,ar:i.ar,description:i.description,descriptionAr:i.descriptionAr,category:i.category,price:i.price,image:i.image,available:i.available,badge:i.badge,options:i.options.map((o:any)=>({id:o.id,name:o.name,ar:o.ar,price:o.price}))};
  const idx=s.menu.findIndex(m=>m.id===i.id);if(idx<0)s.menu.push(clean);else s.menu[idx]=clean;return {ok:true};
 }
 fail('Unknown action.');
}
export function guestState(s:State,token:string|null){
 const visit=s.visits.find(v=>v.token===token&&!v.closedAt);
 return {settings:s.settings,menu:s.menu,visit:visit?{id:visit.id,table:visit.table,paid:visit.paid,assistance:visit.assistance}:null,orders:visit?s.orders.filter(o=>o.visitId===visit.id):[],closed:!!token&&!visit};
}
