import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b0d0f, 0.035);
const camera = new THREE.PerspectiveCamera(32, innerWidth/innerHeight, .01, 100);
camera.position.set(2.6, 1.3, 4.9);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .06;
controls.enablePan = false;
controls.minDistance = 2.3;
controls.maxDistance = 7;
controls.target.set(0,1,0);

scene.add(new THREE.HemisphereLight(0xddeeea,0x090b0c,2.2));
const key = new THREE.DirectionalLight(0xffffff,3.2); key.position.set(3,4,5); scene.add(key);
const rim = new THREE.PointLight(0x76c9bc,28,10); rim.position.set(-2,1,2); scene.add(rim);
const fill = new THREE.PointLight(0xd7a884,9,9); fill.position.set(2,-2,-1); scene.add(fill);

let model, mixer, clock = new THREE.Clock();
const loader = new GLTFLoader();
loader.load('digestive_System.glb', gltf=>{
  model=gltf.scene;
  model.traverse(o=>{ if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.roughness=.72;} });
  const box=new THREE.Box3().setFromObject(model), size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const scale=3.0/Math.max(size.x,size.y,size.z);
  model.scale.setScalar(scale);
  scene.add(model);
  if(gltf.animations?.length){mixer=new THREE.AnimationMixer(model); gltf.animations.forEach(a=>mixer.clipAction(a).play());}
}, undefined, err=>console.error('GLB load error',err));

const slides=[...document.querySelectorAll('.slide')];
const rail=[...document.querySelectorAll('.rail-item')];
let index=0;
function goTo(n){
  n=Math.max(0,Math.min(slides.length-1,n));
  slides[index].classList.remove('active'); rail[index].classList.remove('active');
  index=n; slides[index].classList.add('active'); rail[index].classList.add('active');
  document.querySelector('#slideNo').textContent=String(index+1).padStart(2,'0');
  document.querySelector('#progressBar').style.width=((index+1)/slides.length*100)+'%';
  if(index===0) resetCamera();
}
function resetCamera(){
  camera.position.set(2.6,1.3,4.9); controls.target.set(0,0.2,0); controls.update();
}

document.querySelector('#next').onclick=()=>goTo(index+1);
document.querySelector('#prev').onclick=()=>goTo(index-1);
rail.forEach(b=>b.onclick=()=>goTo(+b.dataset.slide));
document.querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>goTo(index+1));
addEventListener('keydown',e=>{
  if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();goTo(index+1)}
  if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();goTo(index-1)}
  if(e.key==='Home')goTo(0); if(e.key==='End')goTo(slides.length-1);
});
let wheelLock=false;
addEventListener('wheel',e=>{if(wheelLock)return; if(Math.abs(e.deltaY)>35){wheelLock=true;goTo(index+(e.deltaY>0?1:-1));setTimeout(()=>wheelLock=false,800)}});

const focusTargets={
  mouth:[0,.65,3.9], esophagus:[.1,.25,3.7], stomach:[.05,-.05,3.5], small:[0,-.15,3.3], large:[0,-.05,3.25], rectum:[0,-.45,3.5]
};
document.querySelectorAll('.organ').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('.organ').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  const [x,y,z]=focusTargets[btn.dataset.focus]||[0,0,3.5];
  camera.position.set(x+1.1,y+.15,z); controls.target.set(x,y,0); controls.update();
});

document.querySelectorAll('.activity').forEach(btn=>btn.onclick=()=>{
  const n=document.querySelector('#activityPulse');n.textContent=btn.dataset.activity.toUpperCase()+' SELECTED';n.classList.remove('pulsing');void n.offsetWidth;n.classList.add('pulsing');
});
document.querySelectorAll('.health').forEach(btn=>btn.onclick=()=>document.querySelector('#healthToast').textContent=btn.dataset.tip+' • Small, consistent habits can support a healthy digestive routine.');

const questions=[
 {q:'Where does most nutrient absorption occur?',a:['Stomach','Small Intestine','Large Intestine'],c:1,why:'The small intestine is the main site where digested nutrients are absorbed.'},
 {q:'Which nutrient is associated with growth and tissue repair?',a:['Proteins','Fats','Carbohydrates'],c:0,why:'Proteins help support growth and repair of body tissues.'},
 {q:'Which habit supports healthy digestion?',a:['Staying hydrated','Frequently skipping meals','Avoiding all physical activity'],c:0,why:'The healthy-lifestyle guidance includes drinking enough water daily.'}
];
let qi=0;
function renderQuiz(){
 const q=questions[qi];
 document.querySelector('#quiz').innerHTML=`<div class="quiz-box"><div class="eyebrow">QUESTION 0${qi+1} / 03</div><div class="quiz-question">${q.q}</div><div class="answers">${q.a.map((a,i)=>`<button class="answer" data-a="${i}"><span>${String.fromCharCode(65+i)}</span>${a}</button>`).join('')}</div><div class="feedback" id="feedback"></div></div>`;
 document.querySelectorAll('.answer').forEach(b=>b.onclick=()=>{
   const val=+b.dataset.a, fb=document.querySelector('#feedback');
   if(val===q.c){fb.classList.remove('is-wrong');fb.textContent='CORRECT • '+q.why; if(qi<questions.length-1){setTimeout(()=>{qi++;renderQuiz()},700)}else{setTimeout(()=>fb.textContent='PATHWAY COMPLETE • Use the rail to revisit any section.',700)}}
   else{fb.classList.add('is-wrong');fb.textContent='NOT QUITE • TRY AGAIN'}
 });
}
renderQuiz();

let sound=false; const soundBtn=document.querySelector('#soundBtn'); if(soundBtn) soundBtn.onclick=()=>{sound=!sound;document.querySelector('#soundState').textContent=sound?'ON':'OFF'};

function animate(){requestAnimationFrame(animate);const dt=clock.getDelta();if(mixer)mixer.update(dt);if(model){model.rotation.y+=0.0018;if(index===0){model.rotation.y+=0.0012;model.position.y=Math.sin(performance.now()*.00055)*.025}else model.position.y=0;}controls.update();renderer.render(scene,camera)}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2))});
