/** Original Buddy World v46 scenery and deterministic painted materials.
 * No third-party art, fonts, scans or external art downloads. Atlas provenance:
 * docs/GRAFIKA_V46.md and LICENCE_V46.md.
 */
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assetUrl } from '../assetUrl';

type Surface = 'wood' | 'stone' | 'plaster' | 'grass' | 'paving' | 'roof' | 'soil';
const palette = { wood:'#826043', dark:'#493c32', trim:'#bb8b56', plaster:'#f3dab0', stone:'#a5a38a', roof:'#387c7b', rust:'#bf6948', leaf:'#719852', lightLeaf:'#96b65f', grass:'#8ba65e', cream:'#fff0cf', light:'#ffd38a', water:'#62acae' };
function rgb(hex:string) { const c=new T.Color(hex); return [Math.round(c.r*255),Math.round(c.g*255),Math.round(c.b*255)]; }

export function createArt46() {
    const textures = new Set<T.Texture>(), materials = new Set<T.Material>(), geometries = new Set<T.BufferGeometry>();
    const mats = new Map<string,T.MeshStandardMaterial>(), templates = new Map<string,T.Group>();
    let disposed = false;
    const atlas = new T.TextureLoader().load(assetUrl('/buddyworld/artpack-v46/painted-materials.png'), () => {
        if (disposed) { atlas.dispose(); return; }
        textures.forEach(t => { if (t.source === atlas.source) t.needsUpdate = true; });
    });
    atlas.colorSpace = T.SRGBColorSpace;
    atlas.wrapS = atlas.wrapT = T.RepeatWrapping;
    atlas.anisotropy = 2;
    textures.add(atlas);
    let randomState=46019;
    const rnd=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
    function texture(kind:Surface,color:string) {
        const size=256,data=new Uint8Array(size*size*4),base=rgb(color);
        for(let y=0;y<size;y++)for(let x=0;x<size;x++){
            const noise=(rnd()-.5)*.08;
            let f=1+noise;
            if(kind==='wood') { const line=(x+Math.sin(y*.042+x*.018)*3)%32; f+=Math.sin(x*.64+Math.sin(y*.045)*2)*.07; if(line<1.2)f-=.24; f+=Math.sin(y*.018+x*.07)*.07; }
            if(kind==='stone'||kind==='paving') { const cell=kind==='stone'?64:32,row=Math.floor(y/cell),xx=(x+(row%2)*cell/2)%cell,yy=y%cell; const mortar=xx<2||yy<2; f+=mortar?-.29:Math.sin(Math.floor((x+row%2*cell/2)/cell)*39+row*17)*.09; if(!mortar)f+=(xx<5||yy<5)?.09:yy>cell-4?-.09:0; }
            if(kind==='plaster') f+=Math.sin(x*.05)*Math.cos(y*.037)*.025;
            if(kind==='roof') f+=Math.sin(x*.25)*.06+Math.sin(y*.035)*.06;
            if(kind==='soil')f+=Math.sin(x*.19+y*.27)*.05;
            if(kind==='grass')f+=Math.sin(x*.08)*Math.cos(y*.06)*.10+(rnd()>.95?.14:0);
            const i=(y*size+x)*4;
            for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,base[c]*f));
            data[i+3]=255;
        }
        // Values above are linear; Three.js consumes linear DataTextures directly.
        const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;textures.add(t);return t;
    }
    function material(color:string,kind?:Surface,glow=false) {
        const key=color+':'+kind+':'+glow;
        if(!mats.has(key)) {
            const painted = kind && ['wood','plaster','grass','paving'].includes(kind);
            const m=new T.MeshStandardMaterial({color:kind?'#ffffff':color,map:kind?(painted?atlas.clone():texture(kind,color)):null,roughness:kind==='roof'?.8:.94,emissive:glow?color:'#000000',emissiveIntensity:glow?.6:0});
            if (painted && m.map) {
                textures.add(m.map);m.map.needsUpdate=true;
                const bases:Record<string,string>={wood:'#a6733e',paving:'#c9b08a',grass:'#819349',plaster:'#ecd2a3'};
                const a=new T.Color(color),b=new T.Color(bases[kind!]);
                m.color.setRGB(Math.min(1.2,a.r/b.r),Math.min(1.2,a.g/b.g),Math.min(1.2,a.b/b.b));
                if (kind === 'grass') m.color.multiply(new T.Color().setRGB(.75,.9,.82));
                // Four quarters are sampled independently. UV repetition happens inside
                // a quarter, never across adjacent materials; gradients avoid mip seams.
                const offset:Record<string,[number,number]>={wood:[0,.5],paving:[.5,.5],grass:[0,0],plaster:[.5,0]};
                const [ox,oy]=offset[kind!];
                m.onBeforeCompile = shader => {
                    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', `
                    #ifdef USE_MAP
                        vec2 v46Uv = fract(vMapUv) * 0.488 + vec2(${ox+.006}, ${oy+.006});
                        vec4 v46Color = textureGrad(map, v46Uv, dFdx(vMapUv) * 0.488, dFdy(vMapUv) * 0.488);
                        ${kind === 'grass' ? 'v46Color.rgb = mix(vec3(0.29, 0.36, 0.12), v46Color.rgb, 0.72);' : ''}
                        diffuseColor *= v46Color;
                    #endif`);
                };
                m.customProgramCacheKey=()=> 'buddyworld-v46-atlas-'+kind;
            }
            mats.set(key,m);materials.add(m);
        }
        return mats.get(key)!;
    }
    function put(g:T.Object3D,geo:T.BufferGeometry,mat:T.Material,x=0,y=0,z=0,sx=1,sy=1,sz=1) {
        const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;g.add(m);geometries.add(geo);return m;
    }
    function box(g:T.Object3D,c:string,w:number,h:number,d:number,x=0,y=h/2,z=0,kind?:Surface,round=0) {
        return put(g,round?new RoundedBoxGeometry(w,h,d,1,Math.min(round,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d),material(c,kind),x,y,z);
    }
    function sphere(g:T.Object3D,c:string,r:number,x:number,y:number,z:number,sx=1,sy=1,sz=1) {return put(g,new T.SphereGeometry(r,10,7),material(c),x,y,z,sx,sy,sz);}
    function cyl(g:T.Object3D,c:string,top:number,bottom:number,h:number,x=0,y=h/2,z=0,kind?:Surface) {return put(g,new T.CylinderGeometry(top,bottom,h,10),material(c,kind),x,y,z);}
    function beam(g:T.Object3D,a:T.Vector3,b:T.Vector3,r=.06,c=palette.wood) {
        const v=b.clone().sub(a),m=put(g,new T.CylinderGeometry(r,r,v.length(),7),material(c,'wood'),...a.clone().add(b).multiplyScalar(.5).toArray() as [number,number,number]);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;
    }
    function flowers(g:T.Object3D,x:number,y:number,z:number,pot=false) {
        if(pot)cyl(g,'#bb7857',.20,.13,.3,x,y+.15,z);
        for(let i=0;i<3;i++) { const a=i*2.4,xx=x+Math.cos(a)*.13,zz=z+Math.sin(a)*.12,yy=y+(pot?.36:.2)+i*.045;
            cyl(g,'#53783d',.012,.018,.25,xx,yy-.1,zz);
            sphere(g,'#729b4b',.12,xx,yy-.05,zz,1,.45,1);
            for(let p=0;p<5;p++)sphere(g,i%2?'#f4c67f':'#f8e9d3',.065,xx+Math.cos(p*1.256)*.065,yy+.1,zz+Math.sin(p*1.256)*.065,1,.45,1);
            sphere(g,'#d7a13e',.04,xx,yy+.12,zz);
        }
    }
    function roof(g:T.Group,w:number,d:number,eave:number,peak:number,rust=false) {
        const half=w/2,rise=peak-eave,slope=Math.hypot(half,rise),angle=Math.atan2(rise,half);
        const colors=rust?['#b96549','#c67753','#aa5941']:['#327676','#498b83','#387c7d'];
        for(const side of[-1,1]) {
            box(g,palette.dark,slope+.08,.12,d,side*half/2,eave+rise/2,0,'wood').rotation.z=-side*angle;
            for(let row=0;row<5;row++)for(let col=0;col<7;col++) {
                const t=(row+.5)/5,m=box(g,colors[(col+row)%3],slope/5+.055,.065,d/7+.025,side*t*half,peak-rise*t+.09,-d/2+(col+.5)*d/7,'roof',.035);
                m.rotation.z=-side*angle;
            }
        }
        const ridge=cyl(g,colors[1],.095,.095,d+.12,0,peak+.1,0,'roof');ridge.rotation.x=Math.PI/2;
        for(const z of[-d/2-.04,d/2+.04])for(const side of[-1,1])beam(g,new T.Vector3(0,peak+.04,z),new T.Vector3(side*half,eave,z),.065,palette.trim);
    }
    function house(work=false) {
        const g=new T.Group(),w=work?3.5:3,d=work?2.8:2.6;
        box(g,palette.stone,w+.25,.34,d+.25,0,.17,0,'stone',.08);
        box(g,palette.plaster,w,1.9,d,0,1.22,0,'plaster');
        for(const z of[-d/2,d/2]) { const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(0,1.2);shape.closePath();const tri=put(g,new T.ShapeGeometry(shape),material(palette.plaster,'plaster'),0,2.15,z);if(z<0)tri.rotation.y=Math.PI;beam(g,new T.Vector3(-w/2,2.17,z+.02),new T.Vector3(w/2,2.17,z+.02),.075);beam(g,new T.Vector3(0,2.17,z+.02),new T.Vector3(0,3.35,z+.02),.065); }
        for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])box(g,palette.wood,.14,2,.14,x,1.3,z,'wood');
        box(g,palette.dark,w,.13,.12,0,.55,d/2+.02,'wood');box(g,palette.dark,w,.12,.12,0,2.05,d/2+.02,'wood');
        box(g,palette.dark,.84,1.5,.16,0,.97,d/2+.06,'wood',.05);box(g,palette.wood,.66,1.35,.17,0,.89,d/2+.15,'wood',.04);
        sphere(g,'#d9b567',.055,.23,.92,d/2+.26);
        for(const x of[-.98,.98]) {
            box(g,palette.dark,.67,.76,.14,x,1.43,d/2+.08,'wood',.025);
            put(g,new T.BoxGeometry(.5,.59,.15),material(palette.light,undefined,true),x,1.43,d/2+.1);
            box(g,palette.wood,.055,.62,.15,x,1.43,d/2+.20,'wood');box(g,palette.wood,.57,.055,.15,x,1.43,d/2+.20,'wood');
            box(g,palette.trim,.81,.12,.38,x,1.02,d/2+.19,'wood');flowers(g,x,1.09,d/2+.25,true);
            for(const s of[-1,1])box(g,palette.roof,.13,.67,.1,x+s*.4,1.43,d/2+.1,'wood');
        }
        roof(g,w+.55,d+.6,2.25,3.55,work);
        box(g,palette.stone,.5,1.25,.5,-.85,3.12,-.6,'stone',.06);box(g,palette.stone,.66,.15,.66,-.85,3.77,-.6,'stone',.04);
        box(g,palette.stone,w+.4,.13,.55,0,.08,d/2+.32,'stone',.04);
        if(work){const canopy=new T.Group();roof(canopy,1.4,1.3,1.8,2.08);canopy.position.set(2.4,0,.6);g.add(canopy);for(const z of[.05,1.15])box(g,palette.wood,.11,1.85,.11,3.1,.95,z,'wood');box(g,palette.trim,1.25,.12,.62,2.45,.95,.6,'wood');}
        for(const [x,z]of[[-w/2-.35,.8],[w/2+.3,-.55]])flowers(g,x,0,z,true);
        return g;
    }
    function tree(id:string) {
        const g=new T.Group(),birch=id==='briza',pine=id==='jedle',trunk=birch?'#c8c8a0':palette.wood;
        cyl(g,trunk,.16,.28,pine?3.8:3,0,pine?1.9:1.5,0,'wood');
        for(const s of[-1,1])beam(g,new T.Vector3(0,1.7,0),new T.Vector3(s*.7,2.9,.1),.10,trunk);
        if(birch)for(let i=0;i<5;i++)box(g,palette.dark,.17,.05,.02,0,.5+i*.48,.2);
        const parts:T.BufferGeometry[]=[];
        const leaf=(geo:T.BufferGeometry,c:string,x:number,y:number,z:number,sx=1,sy=1,sz=1)=>{
            geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion(),new T.Vector3(sx,sy,sz)));
            if(geo.index)geo=geo.toNonIndexed();const col=new T.Color(c),arr=new Float32Array(geo.getAttribute('position').count*3);
            for(let i=0;i<arr.length;i+=3){const f=.88+rnd()*.2;arr[i]=col.r*f;arr[i+1]=col.g*f;arr[i+2]=col.b*f;}geo.setAttribute('color',new T.BufferAttribute(arr,3));parts.push(geo);
        };
        if(pine)for(let i=0;i<4;i++)leaf(new T.ConeGeometry(1.15-i*.21,1.6,12),'#4a8061',0,1.7+i*.65,0);
        else for(const [x,y,z,r]of [[-.7,3,0,1],[.7,3.2,.1,1.1],[0,3.85,-.2,1.1],[0,3.2,.7,.85]])leaf(new T.SphereGeometry(r,12,8),birch?'#a8ba66':y>3.5?'#91ad57':'#6f9349',x,y,z,1,.88,1);
        const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());
        if(geo){const m=new T.MeshStandardMaterial({vertexColors:true,roughness:1});materials.add(m);const crown=put(g,geo,m);crown.name='v46-canopy';crown.material.transparent=true;}
        return g;
    }
    function well(){const g=new T.Group();for(let row=0;row<2;row++)for(let i=0;i<12;i++){const a=(i+row*.5)*Math.PI/6,m=box(g,i%3?'#aaa58b':'#bab49a',.36,.27,.31,Math.cos(a)*.58,.15+row*.28,Math.sin(a)*.58,'stone',.055);m.rotation.y=-a+Math.PI/2;}cyl(g,palette.water,.44,.44,.04,0,.28);for(const x of[-.85,.85])box(g,palette.wood,.15,2.1,.15,x,1.05,0,'wood');roof(g,2.3,1.75,2.05,2.65);beam(g,new T.Vector3(-.9,1.55,0),new T.Vector3(.9,1.55,0),.09,palette.trim);beam(g,new T.Vector3(0,.55,0),new T.Vector3(0,1.55,0),.018,palette.dark);flowers(g,-.8,0,.8);return g;}
    function lantern(){const g=new T.Group();box(g,palette.stone,.45,.2,.45,0,.1,0,'stone',.05);box(g,palette.wood,.13,2.5,.13,0,1.4,0,'wood');beam(g,new T.Vector3(0,2.55,0),new T.Vector3(.65,2.55,0),.055,palette.dark);box(g,palette.dark,.34,.08,.34,.6,1.95);put(g,new T.BoxGeometry(.24,.4,.24),material(palette.light,undefined,true),.6,2.19,0);for(const x of[.44,.76])for(const z of[-.16,.16])box(g,palette.dark,.03,.47,.03,x,2.2,z);put(g,new T.ConeGeometry(.32,.22,4),material(palette.roof,'roof'),.6,2.5,0).rotation.y=Math.PI/4;return g;}
    function garden(){const g=new T.Group();box(g,'#6a5138',2,.16,1.4,0,.08,0,'soil');for(const z of[-.73,.73])box(g,palette.trim,2.1,.22,.12,0,.13,z,'wood');for(const x of[-1,1])box(g,palette.wood,.12,.22,1.55,x,.13,0,'wood');for(let i=0;i<6;i++)for(let j=0;j<4;j++){const a=j*Math.PI/2;const leaf=sphere(g,j%2?'#8ba954':'#678741',.18,-.65+i%3*.65+Math.cos(a)*.09,.26,i<3?-.34:.34,1.3,.4,.7);leaf.rotation.y=a;}return g;}
    function stall(){const g=new T.Group();for(const x of[-1,1])for(const z of[-.6,.6])box(g,palette.wood,.1,2,.1,x,1,z,'wood');box(g,palette.trim,2.1,.14,1.25,0,.9,0,'wood');box(g,palette.wood,2,.6,.1,0,.58,.6,'wood');for(let i=0;i<8;i++){const m=box(g,i%2?'#f2d6a6':'#bb684d',2.35,.07,.19,0,2.15,-.67+i*.19);m.rotation.z=.05;box(g,i%2?'#f2d6a6':'#bb684d',.1,.22,.18,1.12,2.03,-.67+i*.19);}for(let i=0;i<9;i++)sphere(g,i%3?'#bc7847':'#809751',.12,-.7+(i%3)*.64,1.08,-.35+Math.floor(i/3)*.3);return g;}
    function patch(id:string){const g=new T.Group();if(id==='kvetiny'){flowers(g,0,0,0);return g;}for(let i=0;i<(id==='ker'?5:7);i++){const a=i*2.4;if(id==='ker')sphere(g,i%2?palette.leaf:palette.lightLeaf,.42,Math.cos(a)*.35,.36,Math.sin(a)*.28,1,.78,1);else{const b=put(g,new T.ConeGeometry(.035,.4+i%3*.1,3),material(i%2?'#8da953':'#647c3f'),Math.cos(a)*.16,.2,Math.sin(a)*.16);b.rotation.z=Math.cos(a)*.3;}}return g;}
    function furnishing(id:string) {
        const g=new T.Group();
        if(id==='lavicka') {for(const x of[-.65,.65])for(const z of[-.21,.21])box(g,palette.dark,.1,.55,.1,x,.275,z,'wood');for(const z of[-.2,0,.2])box(g,palette.trim,1.7,.1,.17,0,.58,z,'wood',.025);for(const x of[-.65,.65])box(g,palette.wood,.1,.65,.1,x,.85,-.25,'wood');for(const y of[.85,1.1])box(g,palette.trim,1.7,.16,.08,0,y,-.3,'wood',.02);}
        if(id==='bedna'){box(g,palette.trim,.85,.75,.75,0,.375,0,'wood',.035);for(const x of[-.38,.38])for(const z of[-.34,.34])box(g,palette.wood,.09,.8,.09,x,.4,z,'wood');beam(g,new T.Vector3(-.34,.12,.41),new T.Vector3(.34,.64,.41),.04,palette.dark);}
        if(id==='sud'){cyl(g,palette.wood,.35,.38,.95,0,.48,0,'wood');for(const y of[.14,.8])cyl(g,palette.dark,.39,.39,.075,0,y);cyl(g,palette.trim,.34,.34,.035,0,.97,0,'wood');}
        if(id==='brana'){for(const x of[-1.3,1.3]){box(g,palette.stone,.38,.3,.38,x,.15,0,'stone',.04);box(g,palette.wood,.18,2.1,.18,x,1.25,0,'wood');}beam(g,new T.Vector3(-1.4,2.3,0),new T.Vector3(1.4,2.3,0),.12,palette.dark);box(g,palette.trim,1.3,.36,.16,0,2.26,0,'wood',.04);put(g,new T.OctahedronGeometry(.15),material('#e5b66a'),0,2.26,.14);}
        if(id==='mustek'){for(let i=0;i<12;i++)box(g,i%2?palette.wood:palette.trim,2,.12,.29,0,.15+Math.sin(i/11*Math.PI)*.2,-1.8+i*.325,'wood',.025);for(const x of[-.9,.9]){for(const z of[-1.7,0,1.7])box(g,palette.wood,.12,.95,.12,x,.5,z,'wood');beam(g,new T.Vector3(x,.95,-1.7),new T.Vector3(x,.95,1.7),.055,palette.trim);}}
        return g;
    }
    return {
        material,
        ground(color:string){const m=material(color,'grass');m.map!.repeat.set(20,20);return m;},
        path(w:number,d:number){const base=material('#ceba91','paving'),m=base.clone(),t=m.map!.clone();m.onBeforeCompile=base.onBeforeCompile;m.customProgramCacheKey=base.customProgramCacheKey;t.repeat.set(w/2.4,d/2.4);t.needsUpdate=true;textures.add(t);m.map=t;materials.add(m);return m;},
        model(id:string){
            if(!templates.has(id)) {const g=id==='chata'?house():id==='dilna'?house(true):['dub','briza','jedle'].includes(id)?tree(id):id==='studna'?well():id==='lucerna'?lantern():id==='zahonek'?garden():id==='stanek'?stall():['trava','kvetiny','ker'].includes(id)?patch(id):['lavicka','bedna','sud','brana','mustek'].includes(id)?furnishing(id):null;if(!g)return null;g.name='BuddyWorld_v46_'+id;templates.set(id,g);}
            // Clone canopy material so foreground foliage can fade individually.
            const result=templates.get(id)!.clone(true);result.traverse(o=>{if(o instanceof T.Mesh&&o.name==='v46-canopy'){o.material=(o.material as T.Material).clone();materials.add(o.material);}});return result;
        },
        dispose(){disposed=true;textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());templates.clear();}
    };
}
