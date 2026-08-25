window.SEED={
companies:[
{id:1,name:"Atlas Lojistik",type:"Nakliyeci",status:"Aktif"},
{id:2,name:"Delta Taşımacılık",type:"Nakliyeci",status:"Aktif"},
{id:3,name:"Nova Tank",type:"Tank Operatörü",status:"Aktif"}
],
vehicles:[
{id:1,companyId:1,tractor:"34 SYM 101",trailer:"34 SYM 901",iso:"SYMU 100001-1",type:"ISO Tank",tank:"L4BH",capacity:26000,adr:"Uygun"},
{id:2,companyId:2,tractor:"41 SYM 202",trailer:"41 SYM 902",iso:"-",type:"Tanker",tank:"L10CH",capacity:28500,adr:"Uygun"},
{id:3,companyId:3,tractor:"06 SYM 303",trailer:"06 SYM 903",iso:"SYMU 100003-3",type:"ISO Tank",tank:"L4BN",capacity:24000,adr:"Kontrol"}
],
drivers:[
{id:1,companyId:1,name:"Emre Kaya",license:"CE",src:"SRC-5",health:"2027-02-12",status:"Uygun"},
{id:2,companyId:2,name:"Mert Demir",license:"CE",src:"SRC-5",health:"2026-11-21",status:"Uygun"},
{id:3,companyId:3,name:"Can Yıldız",license:"CE",src:"SRC-5",health:"2026-09-08",status:"Süre Yakın"}
],
documents:[
{id:1,owner:"34 SYM 101",type:"T9 / ADR Muayene",expiry:"2027-03-14",status:"Bekliyor"},
{id:2,owner:"SYMU 100003-3",type:"Tank Basınç Raporu",expiry:"2026-12-02",status:"Bekliyor"},
{id:3,owner:"Can Yıldız",type:"Yüksekte Çalışabilir",expiry:"2026-09-08",status:"Süre Yakın"},
{id:4,owner:"41 SYM 202",type:"Trafik Sigortası",expiry:"2027-04-11",status:"Onaylı"}
],
products:[
{id:1,un:"1203",name:"Benzin",class:"3",packing:"II",tank:"LGBF",vehicle:"FL",adr:true},
{id:2,un:"1830",name:"Sülfürik Asit",class:"8",packing:"II",tank:"L4BN",vehicle:"AT",adr:true},
{id:3,un:"3082",name:"Çevre İçin Tehlikeli Sıvı",class:"9",packing:"III",tank:"L4BH",vehicle:"AT",adr:true},
{id:4,un:"-",name:"Tehlikesiz Sıvı Ürün",class:"-",packing:"-",tank:"Operasyon Kuralı",vehicle:"Standart",adr:false}
],
requests:[
{id:"SYM-260825-014",companyId:1,vehicleId:1,driverId:1,productId:1,tonnage:24000,plan:"2026-08-25T09:30",stage:"Pregate",status:"Aktif",fieldChecks:{phone:true,ppe:true,marking:false},card:null,inWeight:null,outWeight:null,rejection:null},
{id:"SYM-260825-013",companyId:2,vehicleId:2,driverId:2,productId:4,tonnage:18500,plan:"2026-08-25T09:00",stage:"Operasyon",status:"Aktif",fieldChecks:{phone:true,ppe:true,marking:true},card:"K-1042",inWeight:15420,outWeight:null,rejection:null},
{id:"SYM-260825-012",companyId:3,vehicleId:3,driverId:3,productId:2,tonnage:20000,plan:"2026-08-25T10:15",stage:"Evrak Kontrol",status:"Bekliyor",fieldChecks:{phone:false,ppe:false,marking:false},card:null,inWeight:null,outWeight:null,rejection:null}
],
logs:[
{time:"09:02",text:"41 SYM 202 operasyon aşamasında."},
{time:"08:56",text:"34 SYM 101 Pregate kaydı açıldı."},
{time:"08:42",text:"Yeni yükleme talebi oluşturuldu."}
]
};