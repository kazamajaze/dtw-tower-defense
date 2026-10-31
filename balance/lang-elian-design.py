import json, sys
S,W,K,B='m1','m2','m3','m4'
def g(m,c,i,d=0):return {"monsterId":m,"count":c,"interval":i,"delay":d}
def wave(groups,health,speed=1,brk=4,boss=False):
    return {"groups":groups,"monsterId":groups[0]["monsterId"],"count":sum(x["count"] for x in groups),"interval":groups[0]["interval"],"break":brk,"health":health,"speed":speed,"boss":boss,"rules":{"hp":1,"limit":0,"elementBonus":"","elementResist":"","attackRate":1}}
H=float(sys.argv[1]) if len(sys.argv)>1 else 1.0  # global hp scale for tuning
waves=[
 wave([g(S,5,2.0)],1.0*H,brk=5),                                   # W1 làm quen
 wave([g(S,7,1.7)],1.15*H),                                        # W2
 wave([g(S,5,1.6),g(W,2,2.5,3)],1.25*H),                           # W3 sói đầu tiên
 wave([g(W,6,1.8)],1.35*H),                                         # W4 đàn sói
 wave([g(S,6,1.4),g(K,2,4,3)],1.4*H),                              # W5 kỵ sĩ có khiên
 wave([g(W,5,1.5),g(S,8,1.0,2)],1.6*H,1.02),                       # W6
 wave([g(K,3,3.5),g(W,4,1.5,3)],1.6*H,1.03,5),                     # W7
 wave([g(S,12,0.85),g(K,2,3,2)],1.75*H,1.04),                       # W8 đàn slime dày
 wave([g(W,5,1.5),g(W,3,1.2,5)],1.8*H,1.04),                      # W9 hai đợt sói
 wave([g(K,4,3),g(S,8,1,3)],2.0*H,1.06),                           # W10
 wave([g(S,8,1),g(W,4,1.5,3),g(K,2,3.5,4)],2.05*H,1.06,6),           # W11 tổng hợp
 wave([g(S,6,1.2),g(K,2,3,3),g(B,1,1,5)],2.3*H,1.1,3,boss=False),  # W12 Long Vương
]
stage={"id":"stage1","name":"Làng Elian","mapId":"map1","difficulty":1,"lives":10,"gold":350,"reward":100,"waves":waves}
json.dump(stage,open('/tmp/claude-0/sim/stage.json','w'),ensure_ascii=False)
print('total monsters',sum(w['count'] for w in waves))
