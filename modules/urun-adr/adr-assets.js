(function(global){
  'use strict';

  var renderSerial=0;

  var LABEL_NAMES={
    '1':'Patlayıcı maddeler','1.4':'Patlayıcı maddeler, bölüm 1.4','1.5':'Patlayıcı maddeler, bölüm 1.5','1.6':'Patlayıcı maddeler, bölüm 1.6',
    '2.1':'Yanıcı gaz','2.2':'Yanıcı olmayan, zehirli olmayan gaz','2.3':'Zehirli gaz','3':'Yanıcı sıvı',
    '4.1':'Yanıcı katı','4.2':'Kendiliğinden yanmaya yatkın madde','4.3':'Suyla temasında yanıcı gaz çıkaran madde',
    '5.1':'Yükseltgen madde','5.2':'Organik peroksit','6.1':'Zehirli madde','6.2':'Bulaşıcı madde',
    '7':'Radyoaktif madde','7A':'Radyoaktif I-BEYAZ','7B':'Radyoaktif II-SARI','7C':'Radyoaktif III-SARI','7D':'Radyoaktif placard','7E':'Bölünebilir madde',
    '8':'Aşındırıcı madde','9':'Çeşitli tehlikeli madde','9A':'Lityum pil',
    'limited':'Sınırlı Miktar','limited-icao':'Sınırlı Miktar ICAO','environment':'Çevre Tehlikesi','orange-blank':'Boş Turuncu Levha',
    'excepted':'İstisnai Miktar','danger':'Tehlike','warning':'Uyarı','overpack':'Üst Ambalaj','orientation':'Yön Oku','hot':'Sıcak Madde'
  };

  var CLASS_ASSETS={
    '1':'class-1.svg','1.4':'class-1-4.svg','1.5':'class-1-5.svg','1.6':'class-1-6.svg',
    '2.1':'class-2-1.svg','2.2':'class-2-2.svg','2.3':'class-2-3.svg','3':'class-3.svg',
    '4.1':'class-4-1.svg','4.2':'class-4-2.svg','4.3':'class-4-3.svg',
    '5.1':'class-5-1.svg','5.2':'class-5-2.svg','6.1':'class-6-1.svg','6.2':'class-6-2.svg',
    '7':'class-7d.svg','7A':'class-7a.svg','7B':'class-7b.svg','7C':'class-7c.svg','7D':'class-7d.svg','7E':'class-7e.svg',
    '8':'class-8.svg','9':'class-9.svg','9A':'class-9a.svg'
  };

  function esc(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }

  function flame(fill){
    return '<path d="M50 60c-11-8-15-18-10-29 2-5 6-9 10-12-1 8 3 13 6 9 5-7 0-17 5-24 8 12 6 22 12 29 5 10 0 21-11 27-4 3-9 3-12 0Z" fill="'+fill+'"/>';
  }

  function skull(fill,bg){
    return '<g fill="'+fill+'"><path d="M36 35c0-12 6-20 14-20s14 8 14 20c0 7-3 12-8 15v8H44v-8c-5-3-8-8-8-15Z"/>'+
      '<path d="M28 60l4-5 40 25-4 5Zm44 0-4-5-40 25 4 5Z"/></g>'+
      '<g fill="'+bg+'"><circle cx="44" cy="34" r="4"/><circle cx="56" cy="34" r="4"/><path d="M50 39l-4 7h8Z"/></g>';
  }

  function radiation(){
    return '<g fill="#111"><circle cx="50" cy="44" r="6"/><path d="M47 36 34 15a28 28 0 0 1 32 0L53 36a10 10 0 0 0-6 0Zm-6 13L18 61a28 28 0 0 1 1-32l22 14a10 10 0 0 0 0 6Zm18 0 23 12a28 28 0 0 0-1-32L59 43a10 10 0 0 1 0 6Z"/></g>';
  }

  function biohazard(){
    return '<g fill="none" stroke="#111" stroke-width="5"><circle cx="50" cy="44" r="8"/><circle cx="50" cy="27" r="12"/><circle cx="35" cy="53" r="12"/><circle cx="65" cy="53" r="12"/></g><circle cx="50" cy="44" r="4" fill="#111"/>';
  }

  function cylinder(fill){
    return '<g transform="rotate(-35 50 40)" fill="'+fill+'"><rect x="31" y="32" width="38" height="14" rx="7"/><rect x="68" y="36" width="7" height="6" rx="1"/></g>';
  }

  function corrosion(){
    return '<g fill="#111"><path d="M22 22h22v7H22Zm34 0h22v7H56Z"/><path d="M32 28l9 22-5 2-9-22Zm36 0L58 50l5 2 10-22Z"/>'+
      '<path d="M18 61h35v8H18Zm44-7h21v8H62Z"/><circle cx="39" cy="55" r="3"/><circle cx="61" cy="55" r="3"/></g>';
  }

  function oxidizer(fill){
    return '<circle cx="50" cy="55" r="10" fill="none" stroke="'+fill+'" stroke-width="4"/>'+flame(fill);
  }

  function stripes(color,height){
    var out='';
    for(var x=14;x<92;x+=12) out+='<rect x="'+x+'" y="0" width="7" height="'+height+'" fill="'+color+'"/>';
    return out;
  }

  function classNumber(value,color,y){
    var shown={'2.1':'2','2.2':'2','2.3':'2','4.1':'4','4.2':'4','4.3':'4','6.1':'6','6.2':'6','7A':'7','7B':'7','7C':'7','7D':'7'}[value]||value;
    return '<text x="50" y="'+(y||86)+'" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="900" fill="'+color+'">'+esc(shown)+'</text>';
  }

  function diamond(inner,fill,border){
    return '<polygon points="50,2 98,50 50,98 2,50" fill="'+fill+'" stroke="'+(border||'#111')+'" stroke-width="2"/>'+inner;
  }

  function makeClass(code,uid){
    var inner='';
    if(code==='1'||code==='1.4'||code==='1.5'||code==='1.6'){
      inner='<path d="M50 17l5 16 15-9-8 16 17 3-16 7 13 12-18-3 2 18-10-15-10 15 2-18-18 3 13-12-16-7 17-3-8-16 15 9Z" fill="#111"/>'+classNumber(code,'#111');
      return diamond(inner,'#f29b38');
    }
    if(code==='2.1') return diamond(flame('#fff')+classNumber(code,'#fff'),'#d93636');
    if(code==='2.2') return diamond(cylinder('#fff')+classNumber(code,'#fff'),'#3d8a4e');
    if(code==='2.3') return diamond(skull('#111','#fff')+classNumber(code,'#111'),'#fff');
    if(code==='3') return diamond(flame('#fff')+classNumber(code,'#fff'),'#d93636');
    if(code==='4.1') return diamond('<defs><clipPath id="adr-c-'+uid+'"><polygon points="50,2 98,50 50,98 2,50"/></clipPath></defs><g clip-path="url(#adr-c-'+uid+')">'+stripes('#d93636',100)+'</g>'+flame('#111')+classNumber(code,'#111'),'#fff');
    if(code==='4.2') return diamond('<polygon points="2,50 98,50 50,98" fill="#d93636"/>'+flame('#111')+classNumber(code,'#fff'),'#fff');
    if(code==='4.3') return diamond(flame('#fff')+classNumber(code,'#fff'),'#2674b8');
    if(code==='5.1') return diamond(oxidizer('#111')+classNumber(code,'#111'),'#f4cf2f');
    if(code==='5.2') return diamond('<polygon points="2,50 98,50 50,98" fill="#f4cf2f"/>'+flame('#fff')+classNumber(code,'#111'),'#d93636');
    if(code==='6.1') return diamond(skull('#111','#fff')+classNumber(code,'#111'),'#fff');
    if(code==='6.2') return diamond(biohazard()+classNumber(code,'#111'),'#fff');
    if(code==='7'||code==='7A'||code==='7B'||code==='7C'||code==='7D'){
      var top=(code==='7B'||code==='7C')?'#f4cf2f':'#fff';
      var lower=(code==='7B'||code==='7C')?'<polygon points="2,50 98,50 50,98" fill="#fff"/>':'';
      var cat=code==='7A'?'I-WHITE':code==='7B'?'II-YELLOW':code==='7C'?'III-YELLOW':'';
      return diamond(lower+radiation()+(cat?'<text x="50" y="70" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" font-weight="700">'+cat+'</text>':'')+classNumber(code,'#111',88),top);
    }
    if(code==='7E') return diamond(radiation()+'<text x="50" y="69" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="800">FISSILE</text>'+classNumber('7','#111',88),'#fff');
    if(code==='8') return diamond('<polygon points="2,50 98,50 50,98" fill="#111"/>'+corrosion()+classNumber(code,'#fff'),'#fff');
    if(code==='9'||code==='9A'){
      var battery=code==='9A'?'<g fill="none" stroke="#111" stroke-width="3"><rect x="32" y="53" width="14" height="17"/><rect x="55" y="53" width="14" height="17"/><path d="M35 50v-4h8v4m15 0v-4h8v4M48 58l-8 8m20-8 8 8"/></g>':'';
      return diamond('<defs><clipPath id="adr-nine-'+uid+'"><polygon points="50,2 98,50 50,98 2,50"/></clipPath></defs><g clip-path="url(#adr-nine-'+uid+')">'+stripes('#111',50)+'</g>'+battery+classNumber(code,'#111'),'#fff');
    }
    return diamond(classNumber(code,'#111',57),'#eee');
  }

  function makeOther(code){
    if(code==='limited'||code==='limited-icao'){
      var center=code==='limited-icao'?'<text x="50" y="57" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" font-weight="900">Y</text>':'';
      return diamond('<polygon points="50,2 98,50 50,22 2,50" fill="#111"/><polygon points="2,50 50,78 98,50 50,98" fill="#111"/>'+center,'#fff');
    }
    if(code==='environment') return diamond(
      '<g fill="#111">'+
        '<path d="M17 73h68v4H17Z"/>'+
        '<path d="M36 73 43 57l-1-13-10-9 3-4 7 7-1-17h5l2 15 8-10 4 3-11 14 1 12 8-8 4 4-11 11 5 11Z"/>'+
        '<path d="M55 68c5-8 13-11 22-8l7-5-1 9 1 9-8-5c-8 5-15 5-21 0Z"/>'+
      '</g><circle cx="75" cy="63" r="1.7" fill="#fff"/>',
      '#fff'
    );
    if(code==='orange-blank') return '<rect x="3" y="18" width="94" height="64" rx="2" fill="#f28c00" stroke="#111" stroke-width="3"/>';
    if(code==='excepted') return diamond('<text x="50" y="60" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="900">E</text>','#fff');
    if(code==='orientation') return '<rect x="8" y="7" width="84" height="86" fill="#fff" stroke="#111" stroke-width="2"/><path d="M34 75V30m0 0-10 13m10-13 10 13m22 32V30m0 0-10 13m10-13 10 13" fill="none" stroke="#111" stroke-width="5"/>';
    if(code==='hot') return '<polygon points="50,4 96,50 50,96 4,50" fill="#fff" stroke="#111" stroke-width="2"/><path d="M30 62c7-7 7-17 0-24m15 24c7-7 7-17 0-24m15 24c7-7 7-17 0-24" fill="none" stroke="#111" stroke-width="4"/>';
    var word={danger:'TEHLİKE',warning:'UYARI',overpack:'ÜST AMBALAJ'}[code]||LABEL_NAMES[code]||code;
    return '<rect x="4" y="22" width="92" height="56" rx="4" fill="#fff" stroke="#111" stroke-width="3"/><text x="50" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-size="'+(word.length>8?'10':'13')+'" font-weight="900">'+esc(word)+'</text>';
  }

  function renderKemler(hazard,un,opts){
    opts=opts||{};
    var width=Number(opts.width)||64;
    var height=Math.round(width*0.75);
    var hazardText=String(hazard||'').replace(/[^0-9X]/gi,'').toUpperCase().slice(0,4);
    var unText=String(un||'').replace(/UN\s*/i,'').replace(/\D/g,'').slice(0,4);
    var numbered=!!(hazardText||unText);
    var uid='kemler-'+(++renderSerial);
    var title=numbered?('Kemler levhası '+hazardText+' / '+unText):'Boş turuncu Kemler levhası';
    var figures=numbered?
      '<line x1="0" y1="150" x2="400" y2="150" stroke="#0b0b0b" stroke-width="15"/>'+
      '<text x="200" y="126" text-anchor="middle" font-family="Arial Narrow,DIN Condensed,Arial,sans-serif" font-size="104" font-weight="900" letter-spacing="5" fill="#050505">'+esc(hazardText)+'</text>'+
      '<text x="200" y="270" text-anchor="middle" font-family="Arial Narrow,DIN Condensed,Arial,sans-serif" font-size="104" font-weight="900" letter-spacing="5" fill="#050505">'+esc(unText)+'</text>':'';
    return '<svg class="kemler-plate" role="img" aria-label="'+esc(title)+'" viewBox="0 0 400 300" width="'+width+'" height="'+height+'" xmlns="http://www.w3.org/2000/svg">'+
      '<title>'+esc(title)+'</title><defs><linearGradient id="'+uid+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb02e"/><stop offset=".42" stop-color="#f28c00"/><stop offset="1" stop-color="#d96f00"/></linearGradient></defs>'+
      '<rect x="8" y="8" width="384" height="284" rx="2" fill="url(#'+uid+')" stroke="#0b0b0b" stroke-width="15"/>'+
      '<path d="M24 32h352" stroke="#ffd071" stroke-width="6" opacity=".45"/>'+figures+'</svg>';
  }

  function render(code,opts){
    opts=opts||{};
    var size=Number(opts.size)||46;
    var title=LABEL_NAMES[code]||('ADR '+code);
    var asset=CLASS_ASSETS[code];
    if(asset){
      return '<img class="adr-label" src="assets/adr/'+asset+'?v=20260821" alt="'+esc(title)+'" title="'+esc(title)+'" width="'+size+'" height="'+size+'" decoding="async" draggable="false">';
    }
    var uid='adr-'+(++renderSerial);
    var inner=makeOther(code);
    return '<svg class="adr-label" role="img" aria-label="'+esc(title)+'" viewBox="0 0 100 100" width="'+size+'" height="'+size+'" xmlns="http://www.w3.org/2000/svg" title="'+esc(title)+'">'+inner+'</svg>';
  }

  global.ADR_LABELS={render:render,renderKemler:renderKemler,names:LABEL_NAMES,classAssets:CLASS_ASSETS,supported:Object.keys(LABEL_NAMES)};
})(window);
