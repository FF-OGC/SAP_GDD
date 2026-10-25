// GDD-owned layout definitions. No game files are read or written here.
import { writeFileSync } from 'node:fs';
const root = new URL('../design/ui-proposals/', import.meta.url);
const base = 'PetsCollection/Container';
const sprite = 'Assets/Sprites/NewAssets/ShopItemBG.png';
const gift = 'Assets/Sprites/Icons/Giftcode3DIcon.png';
const transform = (x,y,w,h,ax=0,ay=1) => ({ anchorMin:{x:ax,y:ay},anchorMax:{x:ax,y:ay},pivot:{x:0,y:1},anchoredPosition:{x,y},sizeDelta:{x:w,y:h},rotate:0 });
const label = (name,text,x,y,w,h,size=18) => ({id:'reward-'+name,name,type:'UITextEntity',transform:transform(x,-y,w,h),text:{value:text,fontSize:size,color:'#FFFFFF',alignment:{h:'left',v:'middle'}}});
const button = (name,text,x,y,w,h) => ({id:'reward-'+name,name,type:'UIButtonEntity',transform:transform(x,-y,w,h),button:{spriteKey:sprite,normal:'#D7A54B',pressed:'#B18539',disabled:'#657384',fillType:1,disableCollider:false},children:[label(name+'Text',text,8,0,w-16,h,18)]});
const panel = (name,x,y,w,h,children,color='#233E59') => ({id:'reward-'+name,name,type:'UIImageEntity',transform:transform(x,-y,w,h),image:{spriteKey:sprite,color,fillType:1},children});
const add = (parent,entity,reason) => ({op:'add',parent,entity,reason});
const set = (path,field,value,reason) => ({op:'set',path,field,value,reason});
const giftBadge = name => ({id:'reward-'+name,name,type:'UIImageEntity',transform:{...transform(-2,-2,27,27,1,1),pivot:{x:1,y:1}},image:{spriteKey:gift,color:'#FFFFFF',fillType:5}});
const common = () => [
  add(base+'/PetsLayout/Pet (1)',{...giftBadge('PetGift'),transform:transform(2,-2,27,27)},'Dấu quà cho pet có ít nhất một mốc chưa nhận; góc trái giữ riêng HasMW ở góc phải.'),
  ...['All','Common','Rare','Epic','Legendary','Mythic','Apex','Limited'].map(name=>add(base+'/RarityTabsLayout/'+name+'TabButton',giftBadge(name+'Gift'),'OR quà chưa nhận của mọi pet trong rarity, gồm các trang chưa xem.')),
  ...['Mutations','Weathers'].map(name=>add(base+'/DetailsTabsLayout/'+name+'TabButton',giftBadge(name+'Gift'),'Quà chưa nhận của nhánh tương ứng trên pet đang chọn.')),
  add(base,button('RewardEntry','Quà pet',860,182,150,26),'Mở lộ trình hai nhánh của pet được chọn; đặt giữa rarity và nguồn nhận, không đè tab.'),
  add(base,panel('RewardRoadmap',225,70,795,500,[
    label('RoadTitle','LỘ TRÌNH THƯỞNG · PET ĐANG CHỌN',22,12,650,34,24),
    button('RoadClose','Đóng',680,12,95,34),
    label('RoadRule','Mỗi 4 loại / nhánh · không cộng Mutation với Weather',22,48,740,30),
    ...['Mutations','Weathers'].flatMap((type,i)=>[
      label(type+'RoadTitle',type,22,90+i*165,740,30,21),
      ...Array.from({length:2},(_,j)=>panel(type+'Milestone'+j,22+j*380,126+i*165,365,122,[
        label(type+'MilestoneLabel'+j,'Mốc '+((j+1)*4),14,8,337,28,23),
        label(type+'MilestoneReward'+j,'Cash + Dust\nchưa có dữ liệu',14,41,195,64,18),
        button(type+'Claim'+j,'Chưa đạt',222,67,129,40)
      ]))
    ]),
    button('RoadPrev','← Mốc trước',22,444,155,34),
    label('RoadPage','Các mốc 4 / 8',195,444,360,34,17),
    button('RoadNext','Mốc sau →',595,444,178,34)
  ]),'Lộ trình phân trang: hiện tất cả mốc cấu hình có thể đạt; nhận độc lập từng mốc, giữ mốc cũ chưa nhận.')
];
const proposals = [
  {id:'collection-rewards-inline',title:'A · Thanh thưởng trong tab',summary:'Khuyến nghị: xem loại đang thiếu và nhận quà trong cùng tab. Thanh chân giữ mốc gần nhất; nút Mốc sau mở toàn bộ lộ trình.',ops:[
    set(base+'/DetailsTabsLayout','transform.anchoredPosition.y',256,'Dịch tab lên 40 để dành chân cho thanh thưởng.'),
    set(base+'/MutationsWeathers','transform.anchoredPosition.y',74,'Dịch lưới lên 44; giữ kích thước icon và 5 cột từ baseline.'),
    add(base,panel('InlineReward',670,512,350,72,[label('InlineProgress','Mutation · 4 / 8',12,0,205,24),label('InlineRewardValue','Cash + Dust · chưa có dữ liệu',12,24,205,23,13),button('InlineClaim','Nhận',225,8,112,31),button('InlineMore','Mốc sau',225,41,112,25)]),'Thanh chỉ hiện trong tab Mutation/Weather, ưu tiên mốc cũ chưa nhận trước mốc kế tiếp.')
  ]},
  {id:'collection-rewards-overview',title:'B · Hai thẻ thưởng ở Info',summary:'Hai nhánh cạnh nhau trong Info: thấy đồng thời Mutation và Weather. Mỗi thẻ có tiến độ, quà và nút nhận; danh sách loại vẫn ở tab riêng.',ops:[
    ...['Value','Mutations','Weathers'].map(name=>set(base+'/Info/'+name,'active',false,'Thay vùng tóm tắt bằng hai thẻ tiến độ; Value vẫn cần giữ trong triển khai game ở phần pet phía trên.')),
    add(base+'/Info',label('OverviewValue','Thu nhập pet',0,0,350,26,16),'Giữ thu nhập nhìn thấy trong Info.'),
    ...['Mutations','Weathers'].map((type,i)=>add(base+'/Info',panel(type+'Card',i*178,30,172,165,[label(type+'CardTitle',i===0?'Đột Biến':'Thời Tiết',10,4,152,27,19),label(type+'CardProgress','0 / 4',10,32,152,25,20),label(type+'CardReward','Cash + Dust\nchưa có dữ liệu',10,60,152,44,14),button(type+'CardClaim','Chưa đạt',10,111,152,35)]),'Thẻ độc lập cho mỗi nhánh; không gộp hai bộ đếm.'))
  ]},
  {id:'collection-rewards-roadmap',title:'C · Cửa sổ lộ trình riêng',summary:'Giữ bố cục Collection; nút Quà pet mở cửa sổ lớn với hai đường mốc. Hợp người chơi lâu năm có nhiều mốc chờ nhận, đổi lại cần thêm một lần chạm.',ops:[]}
];
for (const p of proposals) writeFileSync(new URL('collection/'+p.id+'.json',root),JSON.stringify({$schema:'../proposal.schema.json',screen:'collection',author:'GDD · Collection rewards',status:'draft',newAssets:[],...p,ops:[...p.ops,...common()]},null,2)+'\n');
const spec = {
  proposalIds:proposals.map(p=>p.id),step:4,milestonesPerPage:2,
  source:'Yêu cầu người dùng 2026-10-25: mỗi 4 mutation hoặc 4 weather trên từng pet có quà cash/dust. Chưa cung cấp lượng thưởng.',
  assumptions:['Đếm loại khác nhau đã ghi nhận trong Collection của pet, không phải số hiệu ứng đồng thời trên một cá thể.','Hai nhánh độc lập, mốc nhận một lần; nhận không tiêu hao tiến độ.','Không tự thêm mốc lẻ cuối danh mục nếu tổng loại không chia hết cho 4.','Giữ tiến độ đã ghi nhận khi pet bị mất/đổi; cần đối chiếu persistence ở game khi triển khai.'],
  audience:{primary:'Mid: săn loại còn thiếu để đạt mốc 4 tiếp theo.',secondary:'Late: tìm và nhận nhiều mốc bị bỏ sót.',protected:'New: rarity/pet vẫn là luồng chính; không báo đỏ cho mốc chưa đạt.'},
  variants:{
    'collection-rewards-inline':{recommendation:'Ưu tiên A để triển khai đầu tiên.',pros:'Ít lần chạm; phần thưởng gắn ngay với hành động tìm loại còn thiếu.',cons:'Không thấy cả hai nhánh cùng lúc; phải dịch lưới và kiểm tra chật trên màn nhỏ.'},
    'collection-rewards-overview':{recommendation:'B phù hợp nếu muốn quà là nội dung chính khi chọn pet.',pros:'So hai nhánh ngay ở Info; người mới dễ hiểu mục tiêu gần.',cons:'Info dày hơn; danh sách hiệu ứng và lộ trình nằm sau thao tác khác.'},
    'collection-rewards-roadmap':{recommendation:'C phù hợp khi số mốc và quà tăng, hoặc cần ít thay đổi màn cũ.',pros:'Xem hai nhánh và nhiều mốc rõ; dễ mở rộng, giữ lưới cũ.',cons:'Thêm lần chạm; cửa sổ che danh sách pet khi đang nhận.'}
  },
  notifications:'Gift trên pet = có mốc đủ điều kiện chưa nhận. Gift trên rarity/All = OR toàn bộ pet thuộc nhóm, kể cả ngoài trang. Gift trên Mutation/Weather = nhánh tương ứng của pet chọn. Mở UI hoặc đổi tab không xóa dấu; chỉ nhận thành công mới cập nhật. Nếu nhận một nhánh, nhánh kia còn quà vẫn giữ dấu pet/rarity.',
  implementation:'Demo chỉ lưu trong bộ nhớ trang. Game cần key nhận theo account + pet type + nhánh + mốc và claim server có tính idempotent; cập nhật badge sau xác nhận thành công, giữ nguyên khi lỗi. Không giả lập cấp tiền thật. Lượng Cash/Dust và quy tắc retroactive cần nối config hiện hành trước triển khai.',
  demo:{mutationCount:8,weatherCount:3,claimedMutation:[],claimedWeather:[]}
};
writeFileSync(new URL('collection-reward-experiments.json',root),JSON.stringify(spec,null,2)+'\n');
console.log('Created three GDD-owned proposal patches and reward experiment spec');
