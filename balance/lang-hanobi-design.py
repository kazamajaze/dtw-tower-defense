import json, sys
S,W,K,B='m1','m2','m3','m4'
def g(m,c,i,d=0):return {"monsterId":m,"count":c,"interval":i,"delay":d}
def wave(groups,health,speed=1,brk=4):
    return {"groups":groups,"monsterId":groups[0]["monsterId"],"count":sum(x["count"] for x in groups),"interval":groups[0]["interval"],"break":brk,"health":health,"speed":speed,"boss":False,"rules":{"hp":1,"limit":0,"elementBonus":"","elementResist":"","attackRate":1}}
H=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
waves=[
 wave([g(S,6,1.8)],1.0*H,brk=5),
 wave([g(S,5,1.5),g(W,2,2,3)],1.1*H),
 wave([g(W,5,1.7),g(S,3,1.5,2)],1.2*H),
 wave([g(S,7,1.3),g(K,2,3.5,3)],1.3*H),
 wave([g(W,4,1.5),g(W,3,1.3,4)],1.35*H,1.02),
 wave([g(S,8,1.1),g(W,4,1.4,2)],1.5*H,1.03),
 wave([g(K,3,3),g(W,4,1.4,3)],1.55*H,1.04,5),
 wave([g(S,12,0.85),g(K,2,3,2)],1.7*H,1.05),
 wave([g(W,5,1.3),g(K,2,3,2),g(W,3,1.2,3)],1.8*H,1.06),
 wave([g(K,4,2.8),g(S,8,1,3)],1.95*H,1.07),
 wave([g(S,8,1),g(W,5,1.3,2),g(K,3,3,3)],2.05*H,1.08,6),
 wave([g(K,2,3),g(S,6,1.1,3),g(W,3,1.3,2),g(B,1,1,4)],2.25*H,1.1,3),
]
stage={"id":"stage2","name":"Làng Hanobi","mapId":"map1","difficulty":1,"lives":10,"gold":300,"reward":120,"waves":waves}
json.dump(stage,open('/tmp/claude-0/sim/stage2.json','w'),ensure_ascii=False)
print('monsters',sum(w['count'] for w in waves))
