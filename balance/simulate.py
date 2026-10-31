import asyncio, json, sys
from playwright.async_api import async_playwright
MOCK='''window.supabase={createClient(){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},upsert:async()=>({error:null}),maybeSingle:async()=>({data:null,error:null}),then(r){return Promise.resolve({data:[],error:null}).then(r)}};return{auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return{getPublicUrl:p=>({data:{publicUrl:p}})}}}}}}'''
BASE=json.load(open('/tmp/claude-0/sim/base.json'))
JS_SIM = r"""
async ([stage, units, placement]) => {
  const d=__data(); d.campaign=[stage]; d.collection=units; d.equipped=units.slice(0,4);
  const m=d.maps[0];
  // candidate spots
  const pts=[];const P=m.path.map(p=>({x:p.x*900,y:p.y*500}));
  const samples=[];for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],L=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.round(L/5));for(let k=0;k<n;k++)samples.push({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n})}
  for(let x=10;x<900;x+=10)for(let y=10;y<500;y+=10){if(__pd(m,x,y)<26)continue;let c=0;for(const s of samples)if(Math.hypot(s.x-x,s.y-y)<=130)c++;pts.push({x,y,c})}
  pts.sort((a,b)=>b.c-a.c);
  let spots=[];
  if(placement==='best'){for(const p of pts){if(spots.every(s=>Math.hypot(s.x-p.x,s.y-p.y)>60))spots.push(p);if(spots.length>=units.length)break}}
  else if(placement==='median'){const mid=pts.slice(Math.floor(pts.length*0.15),Math.floor(pts.length*0.35));for(let i=0;i<units.length;i++)spots.push(mid[(i*37)%mid.length])}
  else {const lo=pts.filter(p=>p.c>0).slice(-Math.floor(pts.length*0.4));for(let i=0;i<units.length;i++)spots.push(lo[(i*53)%lo.length])}
  __sb();const b=__b();b.paused=true;
  units.forEach((cid,i)=>b.units.push({id:'u'+i,charId:cid,x:spots[i].x,y:spots[i].y,level:0,cool:0,angle:0}));b.usedCharIds=[...units];
  let t=0;const log=[];let lastWave=-1,livesAtWave=b.lives;
  while(!b.ended&&t<1500){__ub(0.05);t+=0.05;if(b.wave!==lastWave){if(lastWave>=0)log.push({w:lastWave+1,lost:livesAtWave-b.lives});lastWave=b.wave;livesAtWave=b.lives}}
  log.push({w:lastWave+1,lost:livesAtWave-b.lives});
  return {won:b.won,lives:b.lives,start:stage.lives,t:Math.round(t),wave:b.wave+1,spots:spots.map(s=>s.c),log};
}
"""
async def run(stage, scenarios):
    out=[]
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for name,units,placement in scenarios:
            pg=await b.new_page();errs=[]
            pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.route('**/supabase-js@2*',lambda r:r.fulfill(body=MOCK,content_type='text/javascript'))
            await pg.goto('http://127.0.0.1:8765/index.html');await pg.evaluate('localStorage.clear()');await pg.reload();await pg.wait_for_timeout(500)
            await pg.evaluate('d=>__setData(d)',BASE)
            r=await pg.evaluate(JS_SIM,[stage,units,placement])
            r['name']=name;r['errs']=errs[:2];out.append(r);await pg.close()
        await b.close()
    return out
if __name__=='__main__':
    stage=json.load(open(sys.argv[1]))
    sc=json.load(open(sys.argv[2])) if len(sys.argv)>2 else None
    if not sc:
        sc=[[f'1x {u} best',[u],'best'] for u in ['zD','zK','zM','zH','zT','zL','zB','zP']]+[['1x zD median',['zD'],'median'],['1x zD poor',['zD'],'poor'],['2x zD+zH best',['zD','zH'],'best'],['2x zD+zM median',['zD','zM'],'median']]
    res=asyncio.run(run(stage,sc))
    for r in res:
        lost=[x['lost'] for x in r['log']]
        print(f"{r['name']:<22} {'WIN ' if r['won'] else 'LOSE'} lives {r['lives']}/{r['start']} wave {r['wave']} t={r['t']}s cov={r['spots']} lostPerWave={lost} {r['errs']}")
