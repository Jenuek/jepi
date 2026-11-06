// The built-in demo trip ("데모 둘러보기"): a generic first-timer's Osaka, 3 nights / 4 days. No personal taste in here on
// purpose. (It used to be src/js/066-demo-osaka.js.) hours: [open, close] in minutes · closed: weekdays (0 = Sunday) ·
// cost: [yen per person, note]. Loosely typed: it is the same shape as a saved plan.
/** a date this many days from today (YYYY-MM-DD) */
const isoPlus = (n: number): string => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` };

export function demoOsaka(): any {
  const A=(key: any,name: any,lat: any,lng: any,zone: any)=>({key,name,lat,lng,zone});
  const pl=(id: any,name: any,cat: any,area: any,zone: any,ll: any,dur: any,hours: any,cost: any,note: any,extra?: any)=>Object.assign({id:'os_'+id,name,cat,area,zone,ll,dur,
    hours:hours||undefined,always:!hours,closed:[],note,cost,tags:[],verify:'영업시간',best:'any'},extra||{});
  const pack={city:'오사카',country:'일본',intl:true,currency:'JPY',symbol:'¥',rate:9,transit:'전철',fare:{base:190,perKm:15,max:390},snack:1000,step:500,demo:true,
    arrivalNote:'간사이 공항에서 난카이 전철로 난바까지 약 45분.',
    areas:[A('namba','난바·도톤보리',34.6687,135.5013,'minami'),A('shinsaibashi','신사이바시·아메무라',34.6740,135.5005,'minami'),
      A('umeda','우메다',34.7025,135.4959,'kita'),A('nakanoshima','나카노시마',34.6925,135.4930,'kita'),A('tenma','덴마·텐진바시',34.7035,135.5119,'kita'),
      A('castle','오사카성',34.6873,135.5262,'castle'),A('tennoji','덴노지·신세카이',34.6520,135.5065,'south'),A('bay','베이 에어리어',34.6560,135.4320,'bay')],
    zones:{minami:'미나미 (난바·신사이바시)',kita:'키타 (우메다·나카노시마)',castle:'오사카성 주변',south:'덴노지·신세카이',bay:'베이 에어리어'},
    gateways:[{key:'gw_kix',iata:'KIX',name:'간사이 공항',kind:'air',lat:34.4320,lng:135.2304,min:50,fare:970}],
    checks:['간사이 공항 → 난바 난카이 전철표 (현장 구매 가능)','유니버설 스튜디오 재팬 입장권 날짜 지정 예매','교통카드(ICOCA) 또는 모바일 Suica 준비'],
    places:[
      pl('kuromon','구로몬 시장','food','난바','minami',[34.6655,135.5068],60,[540,1020],[2500,'꼬치·해산물 몇 가지'],'오사카의 부엌이라 불리는 시장. 해산물 꼬치와 과일을 조금씩 사 먹으며 걷기 좋아요.'),
      pl('dotonbori','도톤보리 강변 산책','walk','난바','minami',[34.6687,135.5013],60,null,[0,'무료'],'글리코 간판과 네온이 강물에 비치는 오사카 대표 풍경. 해 진 뒤가 가장 예뻐요.',{best:'evening'}),
      pl('takoyaki','도톤보리 타코야키','food','난바','minami',[34.6683,135.5025],30,[600,1380],[700,'8개 기준'],'겉은 바삭, 속은 촉촉. 줄이 짧은 가게로 골라도 충분히 맛있어요.'),
      pl('okonomi','오코노미야키 저녁','food','난바','minami',[34.6680,135.5032],60,[660,1320],[1800,'1인분 기준'],'철판에서 바로 구워 주는 오사카식 오코노미야키. 저녁엔 대기가 생길 수 있어요.'),
      pl('hozenji','호젠지 요코초','walk','난바','minami',[34.6680,135.5030],30,null,[0,'무료'],'이끼 낀 부동명왕상과 돌길 골목. 번화가 바로 옆 조용한 한 블록.',{best:'night'}),
      pl('urananba','우라난바 이자카야 골목','night','난바','minami',[34.6650,135.5040],90,[1020,1440],[3000,'한두 잔과 안주'],'난바역 뒤편 작은 선술집 골목. 서서 마시는 가게도 많아요.'),
      pl('denden','덴덴타운','shop','난바','minami',[34.6610,135.5060],75,[660,1200],[0,'구매 별도'],'게임, 피규어, 전자제품 가게가 모인 거리.'),
      pl('shinsai','신사이바시스지 쇼핑','shop','신사이바시','minami',[34.6748,135.5013],90,[660,1260],[0,'구매 별도'],'지붕 덮인 600m 쇼핑 거리. 드럭스토어와 브랜드 매장이 이어져요.'),
      pl('amemura','아메리카무라','walk','신사이바시','minami',[34.6720,135.4985],60,[660,1260],[0,'무료'],'빈티지 옷가게와 길거리 그래피티가 많은 젊은 동네.'),
      pl('castle','오사카성 천수각','art','오사카성','castle',[34.6873,135.5262],120,[540,1020],[1200,'천수각 입장료'],'성 안은 역사 전시관, 꼭대기 전망대에서 시내가 한눈에 보여요.',{must:'오사카에 처음이면 한 번은'}),
      pl('nishinomaru','니시노마루 정원','walk','오사카성','castle',[34.6855,135.5235],45,[540,1020],[200,'입장료'],'천수각이 가장 예쁘게 보이는 잔디 정원.',{closed:[1]}),
      pl('tenjin','텐진바시스지 상점가','shop','덴마','kita',[34.7035,135.5119],75,[600,1200],[1000,'군것질 기준'],'일본에서 가장 긴 상점가. 현지 반찬가게와 오래된 식당이 많아요.'),
      pl('tenma_lunch','덴마 점심 (카이센동)','food','덴마','kita',[34.7040,135.5125],45,[660,1400],[1500,'덮밥 기준'],'시장 근처 해산물 덮밥집이 많아요.'),
      pl('nakanoshima_museum','나카노시마 미술관','art','나카노시마','kita',[34.6914,135.4925],90,[600,1020],[1200,'전시마다 다름'],'검은 큐브 모양 건물의 근현대 미술관.',{closed:[1]}),
      pl('nakanoshima_park','나카노시마 공원','walk','나카노시마','kita',[34.6925,135.5070],45,null,[0,'무료'],'강 사이 섬 공원. 장미 정원과 중앙공회당 붉은 벽돌 건물.'),
      pl('umeda_sky','우메다 스카이 빌딩 공중정원','walk','우메다','kita',[34.7053,135.4896],75,[570,1350],[2000,'전망대 입장료'],'두 빌딩을 잇는 옥상 전망대. 노을부터 야경까지.',{best:'sunset'}),
      pl('grandfront','그랜드 프론트 오사카','shop','우메다','kita',[34.7046,135.4949],90,[600,1260],[0,'구매 별도'],'우메다역 바로 옆 대형 쇼핑몰. 비 오는 날 대안.'),
      pl('umeda_dinner','우메다 지하 식당가 저녁','food','우메다','kita',[34.7020,135.4980],60,[660,1380],[1800,'1인 저녁'],'역 지하에 식당이 수십 곳. 쿠시카츠, 우동, 돈카츠 무엇이든.'),
      pl('tsutenkaku','츠텐카쿠','walk','신세카이','south',[34.6525,135.5063],60,[600,1200],[1200,'전망대 입장료'],'신세카이 한가운데 레트로 전망탑.'),
      pl('kushikatsu','신세카이 쿠시카츠','food','신세카이','south',[34.6520,135.5060],60,[660,1380],[2500,'꼬치 여러 개'],'소스는 한 번만 찍기가 규칙인 오사카 꼬치튀김.'),
      pl('harukas','아베노 하루카스 300','walk','덴노지','south',[34.6459,135.5135],75,[540,1320],[2000,'전망대 입장료'],'일본에서 손꼽히게 높은 빌딩 전망대.',{best:'sunset'}),
      pl('usj','유니버설 스튜디오 재팬','walk','베이 에어리어','bay',[34.6654,135.4323],540,[540,1260],[9800,'1일권 기준 · 날짜마다 다름'],'하루를 통째로 쓰는 테마파크. 입장권은 날짜 지정 예매.',{must:'놀이기구를 좋아한다면'}),
      pl('kaiyukan','가이유칸 수족관','art','베이 에어리어','bay',[34.6545,135.4289],120,[600,1200],[2700,'입장료'],'고래상어가 있는 큰 수족관. 비 오는 날 좋아요.'),
      pl('tempozan','덴포잔 대관람차','walk','베이 에어리어','bay',[34.6560,135.4310],30,[600,1320],[900,'1회'],'바다와 시내가 보이는 관람차.',{best:'sunset'})
    ]};
  // 3 nights. Flight lands at KIX 10:40; the flight home leaves 15:30, so the last morning stays near the hotel.
  const profile={dest:'오사카',mode:'flight',local:'transit',startDate:isoPlus(21),nights:3,
    out:{airport:'gw_kix',dep:'08:30',arr:'10:40',flight:''},back:{airport:'gw_kix',dep:'15:30',arr:'17:20',flight:''},
    home:{area:'',min:60,fare:0,byMin:120},stays:[{name:'난바 숙소',area:'namba',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],
    purpose:'',pace:'normal',social:'some',breakfast:false,party:{type:'friends',adults:2,kids:0},
    flightSet:true,staySet:true,dateSet:true,nightsSet:true,dateUnknown:false,bookedFlight:true,bookedStay:true};
  const t=(s: any)=>{const [h,m]=s.split(':').map(Number);return h*60+m};
  const b=(id: any,day: any,start: any,dur: any)=>({id:'os_'+id,day,start:t(start),dur});
  const placed=[
    b('kuromon',0,'15:45',60),b('shinsai',0,'17:15',90),b('dotonbori',0,'19:00',60),b('okonomi',0,'20:15',60),b('hozenji',0,'21:30',30),
    b('castle',1,'09:30',120),b('nishinomaru',1,'11:45',45),b('tenma_lunch',1,'13:00',45),b('tenjin',1,'14:00',75),b('nakanoshima_museum',1,'15:40',75),b('umeda_sky',1,'17:45',75),b('umeda_dinner',1,'19:15',60),
    b('usj',2,'09:00',510),b('takoyaki',2,'19:15',30),b('urananba',2,'20:00',90),
    b('dotonbori',3,'09:00',45),b('takoyaki',3,'10:00',30)];
  return {pack,profile,placed,name:'오사카 3박 4일 (데모)'};
}
