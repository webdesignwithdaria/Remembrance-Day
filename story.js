/* Native scrolling is the clock; GSAP handles the timed introduction and eases.
   All positions are reconstructed from scroll distance, including reverse scroll. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const reading = new URLSearchParams(location.search).get('motion') === 'reduce';
  const hero = $('.section_hero'), heading = $('.hero_heading'), city = $('.hero_city');
  const people = all('.hero_people'), panels = all('.story_panel'), sky = $('.story_twilight');
  const stage = $('.story_stage'), flower = $('.poppy_component'), rotor = $('.poppy_rotation');
  const finale = $('.section_finale'), field = $('.finale_field'), bloom = $('.finale_bloom');
  const footer = $('.finale_footer'), closing = $('.finale_content'), emission = $('.finale_emission');
  const themeColor = $('meta[name="theme-color"]');
  const figures = [], mobileWoman = $('.is-woman img'), mobileMan = $('.is-man img');
  const clamp = (n,a=0,b=1) => Math.min(b,Math.max(a,n));
  const lerp = (a,b,t) => a+(b-a)*t;
  const progress = (n,a,b) => clamp((n-a)/(b-a));
  const smooth = t => t*t*(3-2*t);
  const phase = (n,a,b) => smooth(progress(n,a,b));
  let total = 10.35, catchEnd, landingEnd;
  const mount = $('.story_mount'), rail = $('.story_rail');
  let mobileGate = false, gateTween;
  const gate = {value:0}, chapterWords = [], chapterSplits = [];
  let finalWords=[];
  const turns = [1.86,3.31,4.76], turnLength = .78;
  const releaseEnd = 1, lastHold = 6.13;
  let enabled=false, ready=false, dimensions, raf=0, intro, splits=[], introDone=false;
  const pin = {opacity:0};
  const gs = window.gsap;
  if (!gs || !window.SplitText || !window.remembranceCrowd) {
    root.classList.remove('motion-boot'); return; // Complete, ordinary reading layout.
  }
  gs.registerPlugin(window.SplitText);
  const enterEase=gs.parseEase('power3.out'), travelEase=gs.parseEase('sine.inOut');

  // Each crop samples the same source image at exactly its original coordinates.
  const plate = $('.hero_people-desktop'), source = plate.querySelector('img');
  window.remembranceCrowd.forEach(({left,width,clip}) => {
    const frame=document.createElement('div'), img=source.cloneNode(false);
    frame.className='hero_figure'; frame.style.cssText='left:'+left+'%;width:'+width+'%;clip-path:'+clip;
    img.style.width=(10000/width)+'%'; img.style.left=(-100*left/width)+'%';
    frame.append(img); plate.append(frame); figures.push(frame);
  });
  function interruptIntro() {
    intro?.kill(); intro=null;
    splits.forEach(split=>split.revert()); splits=[];
  }
  function introduce() {
    const elapsed=intro?.time() || 0;
    interruptIntro();
    if (!enabled || !ready) return;
    gs.set([heading,...people],{visibility:'visible'});
    if(introDone || scrollY > dimensions.h*.38) {
      gs.set([...figures,mobileMan,mobileWoman],{opacity:1,clearProps:'transform'});
      pin.opacity=1; introDone=true; queue();return;
    }
    intro=gs.timeline({onUpdate:queue,onComplete(){introDone=true;queue();}});
    let lineTime=.24, sentenceCue=.24;
    [...heading.children].forEach((el,n)=>{
      const split=SplitText.create(el,{type:'lines,words',linesClass:'hero_line',wordsClass:'focus_word',aria:'auto'});
      splits.push(split);
      if(n===1){
        sentenceCue=lineTime;
        lineTime=intro.duration()+0.30;
      }
      split.lines.forEach(line=>{
        const words=line.querySelectorAll('.focus_word');
        intro.fromTo(words,{opacity:0,y:6,filter:'blur(5px)'},{opacity:1,y:0,filter:'blur(0px)',duration:.92,stagger:.042,ease:'power2.out'},lineTime);
        lineTime+=.28;
      });
      lineTime+=.12;
    });
    // Keep the crowd on its original cue, independently of the reader's pause.
    const startCrowd=sentenceCue+.14;
    const order=[2,5,8,1,9,0,10,3,7,6,4];
    const crowd=dimensions.mobile?[mobileMan,mobileWoman]:order.map(i=>figures[i]);
    const step=dimensions.mobile?.43:.145;
    crowd.forEach((el,i)=>{
      const distant=!dimensions.mobile && [2,5,8].includes(order[i]);
      intro.fromTo(el,{opacity:0,scale:distant?1.032:1,transformOrigin:'50% 85%'},
        {opacity:1,scale:1,duration:.92,ease:'sine.inOut'},startCrowd+i*step);
    });
    intro.fromTo(pin,{opacity:0},{opacity:1,duration:.92,ease:'sine.inOut'},startCrowd+(crowd.length-1)*step);
    intro.time(Math.min(elapsed,intro.duration()));
  }
  function measure(preserve=true) {
    if (!enabled) return;
    const old=dimensions, oldP=old?scrollY/old.h:0;
    root.style.removeProperty('--stage-height');
    const h=stage.clientHeight||innerHeight, w=root.clientWidth, mobile=w<=767;
    const art=Math.max(1,w/1818), compact=h<500, smallArt=mobile||compact;
    root.style.setProperty('--art-scale',art);
    root.style.setProperty('--stage-height',h+'px');
    const marker=hero.querySelector(mobile?'.is-woman .hero_lapel':'.hero_people-desktop .hero_lapel').getBoundingClientRect();
    const origin=hero.getBoundingClientRect();
    const pinX=marker.left-origin.left,pinY=marker.top-origin.top;
    // Silhouette supports measured from opaque pixels in the original cropped image,
    // not the transparent corners of its rotated bounding rectangle.
    const top=mobile?[.47748,.49368,.47428,.49243]:[.50997,.54439,.52487,.51088];
    const bottom=mobile?[.47428,.49243,.47748,.49368]:[.52487,.51088,.50997,.54439];
    const heights=panels.map(el=>el.querySelector('.story_copy').offsetHeight);
    const minTop=compact?12:mobile?(h<760?16:48):30;
    const desired=smallArt?(h<620?112:h<760?180:238):798.579;
    const size=Math.min(desired,(h-24)/(top[3]+bottom[3]),
      ...(smallArt?heights.map((n,i)=>Math.max(48,(h-minTop-n-60-8)/(top[i]+bottom[i]))):[]));
    const seat=Math.max(pinY+Math.min(30,h*.035),
      smallArt?h-(h<760?120:238):h+21.342,
      ...heights.map((n,i)=>minTop+n+60+size*top[i]));
    const clearTops=heights.map((n,i)=>seat-size*top[i]-60-n);
    const tallest=Math.max(...heights);
    const sharedTop=mobile?Math.min(h*.12,...clearTops):
      h>=w*1.15?Math.min((h-tallest)/2,...clearTops):null;
    panels.forEach((el,i)=>{el.style.top=(sharedTop??clearTops[i])+'px';});
    // Solve for the instant the detached pin crosses the waist on the scrolling coat.
    const waistDrop=mobile?87:101*art;
    let lo=0,hi=1;
    for(let i=0;i<12;i++){
      const t=(lo+hi)/2;
      if(t*h+(seat-pinY)*travelEase(t)<waistDrop)lo=t;else hi=t;
    }
    const fw=field.offsetWidth,fh=field.offsetHeight;
    const landX=mobile?w/2+fw*(.4955-.5):w/2+219.945*Math.max(1,w/1920);
    const landY=h-fh*(mobile?.300:.35165);
    const center=h/2+(top[3]-bottom[3])*size/2;
    catchEnd=lastHold+Math.max(0,seat-center)/h;
    landingEnd=catchEnd+(mobile?1.18:1.50);total=landingEnd+(mobile?.35:1.32);
    rail.style.height=((lastHold+1)*h)+'px';
    root.style.setProperty('--scroll-distance',(h*total)+'px');
    bloom.style.setProperty('--seed-x',(100*((landX-w/2)/fw+.5))+'%');
    bloom.style.setProperty('--seed-y',mobile?'70%':'65%');
    dimensions={w,h,art,mobile,size,seat,center,pinX,pinY,landX,landY,waist:hi};
    if(preserve && old && (old.w!==w||Math.abs(old.h-h)>75)) window.scrollTo(0,oldP*h);
    if(old && old.w!==w && ready) introduce();
    queue();
  }
  function focusWords(el,words,reveal){
    if(!words || reveal===el._lastReveal)return;
    el._lastReveal=reveal;
    words.forEach((word,j)=>{
      const f=enterEase(clamp((reveal-.32*j/Math.max(1,words.length-1))/.68));
      word.style.opacity=f===1?'':f.toFixed(3);
      word.style.filter=f===1?'none':'blur('+((1-f)*5).toFixed(2)+'px)';
      word.style.transform=f===1?'none':'translateY('+((1-f)*6).toFixed(2)+'px)';
    });
  }
  function accessibility(el,active) {
    if (el.inert===!active && el.getAttribute('aria-hidden')===String(!active)) return;
    el.inert=!active; el.setAttribute('aria-hidden',String(!active));
  }
  function render() {
    raf=0; if(!enabled||!dimensions)return;
    const {w,h,art,mobile,size,seat,center,pinX,pinY,landX,landY,waist}=dimensions;
    const p=clamp(scrollY/h,0,total);
    // The street is a real document-height layer. Scroll moves the intact city, figures,
    // and typography together, leaving a hard boundary against the blue question stage.
    accessibility(hero,p<1);
    sky.style.opacity=1;
    const dusk=travelEase(progress(p,lastHold,landingEnd));
    sky.style.transform='translateY('+(-80*dusk)+'%)';

    let turn=0;
    turns.forEach(start=>{turn+=travelEase(progress(p,start,start+turnLength));});

    const first=progress(p,releaseEnd-.02,releaseEnd+.38);
    const closingExit=1-phase(p,catchEnd,catchEnd+.22);
    panels.forEach((el,i)=>{
      const delta=i-turn, distance=Math.abs(delta), arriving=delta>0;
      let alpha=distance>=1?0:(arriving?enterEase(progress(1-distance,.10,.86)):1-enterEase(progress(distance,0,.92)));
      alpha*=enterEase(first)*closingExit;
      const a=clamp(delta,-1,1)*Math.PI*.46;
      const x=Math.sin(a)*(mobile?300:550), y=(1-Math.cos(a))*(mobile?80:148)+(1-enterEase(first))*24;
      el.style.transform='translate3d('+x+'px,'+y+'px,0) rotate('+(a*4)+'deg)';
      el.style.opacity=alpha;el.style.visibility=alpha>.001?'visible':'hidden';
      // The same word-focus vocabulary as the opening, scrubbed in both directions.
      const reveal=i===0?first:progress(p,turns[i-1],turns[i-1]+turnLength*.96);
      if(alpha>.001 || reveal===0 || reveal===1) focusWords(el,chapterWords[i],reveal);
      const active=alpha>.48;el.style.pointerEvents=active?'auto':'none';accessibility(el,active);
    });

    const tiny=mobile?13.058:13.525*art;
    const slide=travelEase(progress(p,0,releaseEnd));
    const growth=travelEase(progress(p,waist,releaseEnd));
    const fall=travelEase(progress(p,catchEnd,landingEnd));
    // The lapel and chapter centres define a single straight segment, without side drift.
    let x=lerp(pinX,w/2,travelEase(progress(p,waist,releaseEnd))), y=lerp(pinY,seat,slide);
    let diameter=lerp(tiny,size,growth);
    const baseAngle=mobile?0:-40;
    let angle=baseAngle-8*(1-slide)-90*turn;
    // Native sticky containment releases the *whole* chapter rail at lastHold. Until
    // the entire flower is centred, its local x/y, angle and size remain unchanged.
    const falling=p>=catchEnd;
    const carrier=falling?stage:mount;
    if(flower.parentNode!==carrier)carrier.append(flower);
    if(falling){
      x=lerp(w/2,landX,fall);y=lerp(center,landY,fall);
      diameter=lerp(size,mobile?3:Math.min(size,101),fall);
      angle+=8*fall;
    }
    // Lay the raster out at its real display size; avoid upscaling a cached pin-sized surface.
    const ph=diameter*(767.71/798.579);
    flower.style.width=diameter+'px';flower.style.height=ph+'px';
    flower.style.left=(x-diameter/2)+'px';flower.style.top=(y-ph/2)+'px';
    rotor.style.transform='rotate('+angle+'deg)';
    flower.style.opacity=Math.max(pin.opacity,phase(p,.025,.16))*(mobile?1-phase(p,landingEnd-.075,landingEnd):1);
    flower.style.visibility=ready?'visible':'hidden';
    const arrival=phase(p,catchEnd-.15,landingEnd);
    finale.style.visibility=p>=catchEnd-.16?'visible':'hidden';
    field.style.setProperty('--field-rise',(100*(1-arrival))+'%');
    const finalReveal=progress(p,landingEnd-.53,landingEnd+.03);
    focusWords(closing,finalWords,finalReveal);
    closing.style.opacity=enterEase(finalReveal);
    closing.style.transform='translateY('+((1-arrival)*30)+'px)';
    accessibility(finale,p>=landingEnd-.49);
    const atSeed=mobile && p>=landingEnd-(mobileGate ? .19 : .065);
    if(atSeed!==mobileGate){
      mobileGate=atSeed;gateTween?.kill();gate.value=0;
      if(atSeed) gateTween=gs.to(gate,{value:1,duration:1.65,ease:'sine.inOut',onUpdate:queue});
    }
    const planted=mobile?gate.value*phase(p,landingEnd-.19,landingEnd-.065):phase(p,landingEnd,landingEnd+1.10);
    bloom.style.setProperty('--reach',(planted*124)+'%');
    bloom.style.visibility=planted>0?'visible':'hidden';
    emission.classList.toggle('is-alive',planted>.98);
    rotor.style.filter=planted?'brightness('+(1+.38*planted)+')':'none';
    footer.hidden=p<landingEnd-.03;
    footer.style.transform='translateY('+((1-phase(p,landingEnd-.03,landingEnd+.13))*12)+'px)';
    const theme=dusk>.6?'#031627':'#d5e6f6';
    if(themeColor.content!==theme)themeColor.content=theme;
  }
  function queue(){if(enabled&&!raf)raf=requestAnimationFrame(render);}
  function anchor(){
    if(!enabled||!dimensions)return;
    if(location.hash==='#remember')window.scrollTo(0,dimensions.h*total);
    else if(location.hash==='#story')window.scrollTo(0,dimensions.h*(releaseEnd+.40));
    queue();
  }
  function splitChapters(){
    if(!chapterSplits.length)panels.forEach((panel,i)=>{
      chapterWords[i]=[];
      panel.querySelectorAll('h2,.story_answer p').forEach(block=>{
        const split=SplitText.create(block,{type:'words',wordsClass:'focus_word',ignore:'a',aria:'none'});
        chapterSplits.push(split);chapterWords[i].push(...block.querySelectorAll('.focus_word,a'));
      });
    });
    if(!finalWords.length){
      const split=SplitText.create(closing.querySelector('h2'),{type:'words',wordsClass:'focus_word',aria:'auto'});
      chapterSplits.push(split);finalWords=split.words;
    }
  }
  function configure(){
    interruptIntro(); enabled=!reading && !reduce.matches;
    root.classList.toggle('is-enhanced',enabled);
    if(!enabled){
      root.classList.remove('motion-boot');
      [hero,...people,heading,city,...panels,finale,field,bloom,closing,footer,mobileMan,mobileWoman].forEach(el=>{
        el.removeAttribute('style');el.removeAttribute('aria-hidden');el.inert=false;
      });
      chapterSplits.splice(0).forEach(split=>split.revert());chapterWords.length=0;finalWords=[];delete closing._lastReveal;
      panels.forEach(el=>delete el._lastReveal);
      gateTween?.kill();mobileGate=false;gate.value=0;
      figures.forEach(el=>el.hidden=true);
      footer.hidden=false;root.style.removeProperty('--stage-height');return;
    }
    if(ready) splitChapters();
    figures.forEach(el=>el.hidden=false);
    gs.set([heading,...figures,mobileMan,mobileWoman],{opacity:0});
    gs.set(heading,{opacity:1,visibility:'hidden'});
    gs.set(people,{visibility:'hidden'}); flower.style.visibility='hidden';
    footer.hidden=true;measure(false);root.classList.remove('motion-boot');
    if(ready){introduce();anchor();}
  }
  configure();
  addEventListener('scroll',queue,{passive:true});
  let resizeFrame;
  addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>measure());},{passive:true});
  addEventListener('hashchange',anchor);
  addEventListener('pageshow',()=>{measure(false);anchor();});
  reduce.addEventListener('change',configure);
  Promise.allSettled([document.fonts.ready,city.querySelector('img').decode(),source.decode(),mobileWoman.decode(),$('.poppy_original').decode()]).then(()=>{
    ready=true;
    if(enabled){splitChapters();measure(false);introduce();anchor();queue();}
  });
})();
