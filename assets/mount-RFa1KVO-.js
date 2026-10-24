import{S as St,B as _t,M as Re,a as Vt,P as Ct,b as _,I as Ht,O as Qt,c as yt,d as Wt,e as Ue,F as me,f as k,U as Be,V as G,W as pe,H as ge,N as jt,C as Kt,g as U,h as H,A as be,R as Yt,i as Xt,j as qt,L as Zt,k as Jt,l as $t,m as es,n as ts,o as ss,p as is,q as fe,r as as,s as rs,t as os,u as ns,D as ft,v as ls,w as dt,x as Ae,E as Xe,y as us,G as Le,z as mt,J as cs,K as At,Q as Ze,T as hs,X as Et,Y as fs,Z as ds,_ as ms,$ as Pt,a0 as ps}from"./three.module-CAtCztSf.js";class gs extends St{constructor(){super();const e=new _t;e.deleteAttribute("uv");const t=new Re({side:Vt}),i=new Re,o=new Ct(16777215,900,28,2);o.position.set(.418,16.199,.3),this.add(o);const a=new _(e,t);a.position.set(-.757,13.219,.717),a.scale.set(31.713,28.305,28.591),this.add(a);const l=new Ht(e,i,6),r=new Qt;r.position.set(-10.906,2.009,1.846),r.rotation.set(0,-.195,0),r.scale.set(2.328,7.905,4.651),r.updateMatrix(),l.setMatrixAt(0,r.matrix),r.position.set(-5.607,-.754,-.758),r.rotation.set(0,.994,0),r.scale.set(1.97,1.534,3.955),r.updateMatrix(),l.setMatrixAt(1,r.matrix),r.position.set(6.167,.857,7.803),r.rotation.set(0,.561,0),r.scale.set(3.927,6.285,3.687),r.updateMatrix(),l.setMatrixAt(2,r.matrix),r.position.set(-2.017,.018,6.124),r.rotation.set(0,.333,0),r.scale.set(2.002,4.566,2.064),r.updateMatrix(),l.setMatrixAt(3,r.matrix),r.position.set(2.291,-.756,-2.621),r.rotation.set(0,-.286,0),r.scale.set(1.546,1.552,1.496),r.updateMatrix(),l.setMatrixAt(4,r.matrix),r.position.set(-2.193,-.369,-5.547),r.rotation.set(0,.516,0),r.scale.set(3.875,3.487,2.986),r.updateMatrix(),l.setMatrixAt(5,r.matrix),this.add(l);const h=new _(e,ae(50));h.position.set(-16.116,14.37,8.208),h.scale.set(.1,2.428,2.739),this.add(h);const m=new _(e,ae(50));m.position.set(-16.109,18.021,-8.207),m.scale.set(.1,2.425,2.751),this.add(m);const n=new _(e,ae(17));n.position.set(14.904,12.198,-1.832),n.scale.set(.15,4.265,6.331),this.add(n);const g=new _(e,ae(43));g.position.set(-.462,8.89,14.52),g.scale.set(4.38,5.441,.088),this.add(g);const p=new _(e,ae(20));p.position.set(3.235,11.486,-12.541),p.scale.set(2.5,2,.1),this.add(p);const f=new _(e,ae(100));f.position.set(0,20,0),f.scale.set(1,.1,1),this.add(f)}dispose(){const e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(const t of e)t.dispose()}}function ae(s){const e=new yt;return e.color.setScalar(s),e}const Ee={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class ne{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const vs=new Wt(-1,1,1,-1,0,1);class bs extends Ue{constructor(){super(),this.setAttribute("position",new me([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new me([0,2,0,0,2,0],2))}}const xs=new bs;class Je{constructor(e){this._mesh=new _(xs,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,vs)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class ws extends ne{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof k?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Be.clone(e.uniforms),this.material=new k({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new Je(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class pt extends ne{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const o=e.getContext(),a=e.state;a.buffers.color.setMask(!1),a.buffers.depth.setMask(!1),a.buffers.color.setLocked(!0),a.buffers.depth.setLocked(!0);let l,r;this.inverse?(l=0,r=1):(l=1,r=0),a.buffers.stencil.setTest(!0),a.buffers.stencil.setOp(o.REPLACE,o.REPLACE,o.REPLACE),a.buffers.stencil.setFunc(o.ALWAYS,l,4294967295),a.buffers.stencil.setClear(r),a.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),a.buffers.color.setLocked(!1),a.buffers.depth.setLocked(!1),a.buffers.color.setMask(!0),a.buffers.depth.setMask(!0),a.buffers.stencil.setLocked(!1),a.buffers.stencil.setFunc(o.EQUAL,1,4294967295),a.buffers.stencil.setOp(o.KEEP,o.KEEP,o.KEEP),a.buffers.stencil.setLocked(!0)}}class Ms extends ne{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class Ts{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const i=e.getSize(new G);this._width=i.width,this._height=i.height,t=new pe(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:ge}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new ws(Ee),this.copyPass.material.blending=jt,this.clock=new Kt}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let o=0,a=this.passes.length;o<a;o++){const l=this.passes[o];if(l.enabled!==!1){if(l.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(o),l.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),l.needsSwap){if(i){const r=this.renderer.getContext(),h=this.renderer.state.buffers.stencil;h.setFunc(r.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),h.setFunc(r.EQUAL,1,4294967295)}this.swapBuffers()}pt!==void 0&&(l instanceof pt?i=!0:l instanceof Ms&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new G);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,o=this._height*this._pixelRatio;this.renderTarget1.setSize(i,o),this.renderTarget2.setSize(i,o);for(let a=0;a<this.passes.length;a++)this.passes[a].setSize(i,o)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Ss extends ne{constructor(e,t,i=null,o=null,a=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=o,this.clearAlpha=a,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new U}render(e,t,i){const o=e.autoClear;e.autoClear=!1;let a,l;this.overrideMaterial!==null&&(l=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(a=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(a),this.overrideMaterial!==null&&(this.scene.overrideMaterial=l),e.autoClear=o}}const _s={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new U(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class oe extends ne{constructor(e,t=1,i,o){super(),this.strength=t,this.radius=i,this.threshold=o,this.resolution=e!==void 0?new G(e.x,e.y):new G(256,256),this.clearColor=new U(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let a=Math.round(this.resolution.x/2),l=Math.round(this.resolution.y/2);this.renderTargetBright=new pe(a,l,{type:ge}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let n=0;n<this.nMips;n++){const g=new pe(a,l,{type:ge});g.texture.name="UnrealBloomPass.h"+n,g.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(g);const p=new pe(a,l,{type:ge});p.texture.name="UnrealBloomPass.v"+n,p.texture.generateMipmaps=!1,this.renderTargetsVertical.push(p),a=Math.round(a/2),l=Math.round(l/2)}const r=_s;this.highPassUniforms=Be.clone(r.uniforms),this.highPassUniforms.luminosityThreshold.value=o,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new k({uniforms:this.highPassUniforms,vertexShader:r.vertexShader,fragmentShader:r.fragmentShader}),this.separableBlurMaterials=[];const h=[3,5,7,9,11];a=Math.round(this.resolution.x/2),l=Math.round(this.resolution.y/2);for(let n=0;n<this.nMips;n++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(h[n])),this.separableBlurMaterials[n].uniforms.invSize.value=new G(1/a,1/l),a=Math.round(a/2),l=Math.round(l/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const m=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=m,this.bloomTintColors=[new H(1,1,1),new H(1,1,1),new H(1,1,1),new H(1,1,1),new H(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Be.clone(Ee.uniforms),this.blendMaterial=new k({uniforms:this.copyUniforms,vertexShader:Ee.vertexShader,fragmentShader:Ee.fragmentShader,blending:be,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new U,this._oldClearAlpha=1,this._basic=new yt,this._fsQuad=new Je(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let i=Math.round(e/2),o=Math.round(t/2);this.renderTargetBright.setSize(i,o);for(let a=0;a<this.nMips;a++)this.renderTargetsHorizontal[a].setSize(i,o),this.renderTargetsVertical[a].setSize(i,o),this.separableBlurMaterials[a].uniforms.invSize.value=new G(1/i,1/o),i=Math.round(i/2),o=Math.round(o/2)}render(e,t,i,o,a){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();const l=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),a&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=i.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let r=this.renderTargetBright;for(let h=0;h<this.nMips;h++)this._fsQuad.material=this.separableBlurMaterials[h],this.separableBlurMaterials[h].uniforms.colorTexture.value=r.texture,this.separableBlurMaterials[h].uniforms.direction.value=oe.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[h]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[h].uniforms.colorTexture.value=this.renderTargetsHorizontal[h].texture,this.separableBlurMaterials[h].uniforms.direction.value=oe.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[h]),e.clear(),this._fsQuad.render(e),r=this.renderTargetsVertical[h];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(i),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=l}_getSeparableBlurMaterial(e){const t=[];for(let i=0;i<e;i++)t.push(.39894*Math.exp(-.5*i*i/(e*e))/e);return new k({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new G(.5,.5)},direction:{value:new G(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}_getCompositeMaterial(e){return new k({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}oe.BlurDirectionX=new G(1,0);oe.BlurDirectionY=new G(0,1);const Ce={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class Cs extends ne{constructor(){super(),this.uniforms=Be.clone(Ce.uniforms),this.material=new Yt({name:Ce.name,uniforms:this.uniforms,vertexShader:Ce.vertexShader,fragmentShader:Ce.fragmentShader}),this._fsQuad=new Je(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},Xt.getTransfer(this._outputColorSpace)===qt&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===Zt?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===Jt?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===$t?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===es?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===ts?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===ss?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===is&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}function Rt(s,e=!1){const t=s[0].index!==null,i=new Set(Object.keys(s[0].attributes)),o=new Set(Object.keys(s[0].morphAttributes)),a={},l={},r=s[0].morphTargetsRelative,h=new Ue;let m=0;for(let n=0;n<s.length;++n){const g=s[n];let p=0;if(t!==(g.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+n+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const f in g.attributes){if(!i.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+n+'. All geometries must have compatible attributes; make sure "'+f+'" attribute exists among all geometries, or in none of them.'),null;a[f]===void 0&&(a[f]=[]),a[f].push(g.attributes[f]),p++}if(p!==i.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+n+". Make sure all geometries have the same number of attributes."),null;if(r!==g.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+n+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const f in g.morphAttributes){if(!o.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+n+".  .morphAttributes must be consistent throughout all geometries."),null;l[f]===void 0&&(l[f]=[]),l[f].push(g.morphAttributes[f])}if(e){let f;if(t)f=g.index.count;else if(g.attributes.position!==void 0)f=g.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+n+". The geometry must have either an index or a position attribute"),null;h.addGroup(m,f,n),m+=f}}if(t){let n=0;const g=[];for(let p=0;p<s.length;++p){const f=s[p].index;for(let b=0;b<f.count;++b)g.push(f.getX(b)+n);n+=s[p].attributes.position.count}h.setIndex(g)}for(const n in a){const g=gt(a[n]);if(!g)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+n+" attribute."),null;h.setAttribute(n,g)}for(const n in l){const g=l[n][0].length;if(g===0)break;h.morphAttributes=h.morphAttributes||{},h.morphAttributes[n]=[];for(let p=0;p<g;++p){const f=[];for(let A=0;A<l[n].length;++A)f.push(l[n][A][p]);const b=gt(f);if(!b)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+n+" morphAttribute."),null;h.morphAttributes[n].push(b)}}return h}function gt(s){let e,t,i,o=-1,a=0;for(let m=0;m<s.length;++m){const n=s[m];if(e===void 0&&(e=n.array.constructor),e!==n.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=n.itemSize),t!==n.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(i===void 0&&(i=n.normalized),i!==n.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(o===-1&&(o=n.gpuType),o!==n.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;a+=n.count*t}const l=new e(a),r=new fe(l,t,i);let h=0;for(let m=0;m<s.length;++m){const n=s[m];if(n.isInterleavedBufferAttribute){const g=h/t;for(let p=0,f=n.count;p<f;p++)for(let b=0;b<t;b++){const A=n.getComponent(p,b);r.setComponent(p+g,b,A)}}else l.set(n.array,h);h+=n.count*t}return o!==void 0&&(r.gpuType=o),r}const qe=1186335,ys=new U(16185333),As=new U(qe),Es=new U(1515559),Ps=new U(8491417),Bt=(s,e=0,t=1)=>Math.min(t,Math.max(e,s)),O=(s,e,t)=>Bt((s-e)/(t-e)),re=s=>s<.5?4*s*s*s:1-Math.pow(-2*s+2,3)/2,u=(s,e,t)=>new H(s,e,t),J=6,ke=3,de=3.6,Ve=2,xe=6,He={h:.3,b:.3,tf:.019,tw:.011},$={h:.4,b:.18,tf:.0135,tw:.0086},S={h:.3,b:.15,tf:.0107,tw:.0071},vt=u(1.5*J,3.2,xe/2),Fe=xe-$.tw-.02,L=S.h/2,ee=L-S.tf,we=S.tw,y=.11,N=L-.06,F=.012,I=[[.05,.07],[.05,0],[.05,-.07]],ve=.011,Rs=.45,K=[.27,.46],bt=[.505,.585],Ge=[.595,.72],Pe=(K[1]-K[0])/I.length,Bs=s=>K[0]+Pe*(s+.95),Fs=s=>s>K[0]-.005&&s<Ge[1]+.01;function Gs({h:s,b:e,tf:t,tw:i}){const o=new Ze,a=e/2,l=s/2,r=i/2;return[[a,-l],[a,-l+t],[r,-l+t],[r,l-t],[a,l-t],[a,l],[-a,l],[-a,l-t],[-r,l-t],[-r,-l+t],[-a,-l+t]].reduce((h,[m,n])=>h.lineTo(m,n),o.moveTo(-a,-l)),o.closePath(),o}function Qe(s,e,t){const i=new At(Gs(s),{depth:e.distanceTo(t),bevelEnabled:!1}),o=new Xe(i);i.dispose();const a=new ps().setFromUnitVectors(u(0,0,1),t.clone().sub(e).normalize());return o.applyMatrix4(new Pt().compose(e,a,u(1,1,1)))}function Us(){const s=[];for(const t of[0,xe]){for(let i=0;i<=ke;i++)s.push(Qe(He,u(i*J,0,t),u(i*J,Ve*de,t)));for(let i=1;i<=Ve;i++)for(let o=0;o<ke;o++)s.push(Qe($,u(o*J+He.h/2,i*de-$.h/2,t),u((o+1)*J-He.h/2,i*de-$.h/2,t)))}for(let t=1;t<=Ve;t++)for(let i=0;i<=2*ke;i++){if(t===1&&i===3)continue;const o=i*J/2,a=t*de-S.h/2;s.push(Qe(S,u(o,a,$.tw/2+.01),u(o,a,xe-$.tw/2-.01)))}const e=Rt(s);return s.forEach(t=>t.dispose()),e}function Ns(){const s=new Ze;s.moveTo(0,-ee),s.lineTo(Fe,-ee),s.lineTo(Fe,ee),s.lineTo(y,ee),s.lineTo(y,N+F),s.absarc(y-F,N+F,F,0,-Math.PI/2,!0),s.lineTo(0,N),s.closePath();for(const[e,t]of I){const i=new hs;i.absarc(e,t,ve,0,Math.PI*2,!0),s.holes.push(i)}return s}function zs(){const s=new Ze;return s.moveTo(0,N),s.lineTo(y-F,N),s.absarc(y-F,N+F,F,-Math.PI/2,0,!1),s.lineTo(y,ee),s.lineTo(0,ee),s.closePath(),s}const xt=s=>new At(s,{depth:we,bevelEnabled:!1,curveSegments:40}).translate(0,0,-we/2),We=(s,e,t,i,o)=>new _t(e-s,i,o).translate((s+e)/2,t,0);function $e(s,e,t){const i=[0];for(let a=1;a<s.length;a++)i.push(i[a-1]+s[a].distanceTo(s[a-1]));const o=i[i.length-1];return{points:s,a:e,b:t,ts:i.map(a=>e+(t-e)*a/o),at(a){if(a<e||a>t)return null;const l=(a-e)/(t-e)*o;let r=1;for(;r<i.length-1&&i[r]<l;)r++;return s[r-1].clone().lerp(s[r],Bt((l-i[r-1])/(i[r]-i[r-1]||1)))}}}const Ft=(s,e,t,i,o,a,l)=>Array.from({length:a+1},(r,h)=>{const m=i+(o-i)*h/a;return u(s+t*Math.cos(m),e+t*Math.sin(m),l)}),j=-we/2,wt=I.map(([s,e],t)=>{const i=K[0]+Pe*t;return $e(Ft(s,e,ve,-Math.PI/2,1.5*Math.PI,64,j),i+Pe*.27,i+Pe*.95)}),je=$e([u(y,L,S.b/2),u(y,L,-.15/2)],bt[0],bt[1]),Ke=$e([u(y,ee,j),u(y,N+F,j),...Ft(y-F,N+F,F,0,-Math.PI/2,14,j).slice(1),u(0,N,j)],Ge[0],Ge[1]),Ds=s=>s.x>y-1e-4||s.y<N+1e-4;function he(s,e,t,i,o){const a=s.points,l=[],r=[],h=[],m=[];a.forEach((g,p)=>{const f=a[Math.min(p+1,a.length-1)].clone().sub(a[Math.max(p-1,0)]).normalize(),b=new H().crossVectors(e,f).normalize();o&&!Ds(g.clone().addScaledVector(b,.004))&&b.negate();const A=g.clone().addScaledVector(e,i);if(l.push(...A.clone().addScaledVector(b,o?0:-t).toArray(),...A.clone().addScaledVector(b,t).toArray()),r.push(s.ts[p],s.ts[p]),h.push(o?0:-1,1),p){const E=2*(p-1);m.push(E,E+1,E+2,E+1,E+3,E+2)}});const n=new Ue;return n.setAttribute("position",new me(l,3)),n.setAttribute("aT",new me(r,1)),n.setAttribute("aS",new me(h,1)),n.setIndex(m),n}const Gt=`attribute float aT; attribute float aS; varying float vT; varying float vS;
void main() { vT = aT; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,Mt=(s,e)=>new k({uniforms:{uNow:{value:0},uCool:{value:s},uGain:{value:e}},vertexShader:Gt,fragmentShader:`uniform float uNow, uCool, uGain; varying float vT; varying float vS;
void main() {
  float age = uNow - vT;
  if (age < 0.0) discard;
  float h = (1.0 - clamp(age / uCool, 0.0, 1.0)) * (1.0 - smoothstep(0.3, 1.0, abs(vS)));
  if (h < 0.002) discard;
  vec3 c = mix(vec3(0.5, 0.05, 0.0), vec3(1.0, 0.3, 0.04), smoothstep(0.0, 0.45, h));
  c = mix(c, vec3(1.0, 0.85, 0.6), smoothstep(0.6, 1.0, h));
  gl_FragColor = vec4(c * h * (0.8 + uGain * h * h), 1.0);
}`,blending:be,transparent:!0,depthWrite:!1}),Os=()=>new k({uniforms:{uNow:{value:0}},vertexShader:Gt,fragmentShader:`uniform float uNow; varying float vT; varying float vS;
void main() {
  float a = smoothstep(0.0, 0.03, uNow - vT);
  if (a <= 0.0) discard;
  vec3 blue = vec3(0.07, 0.11, 0.32), purple = vec3(0.22, 0.09, 0.22), straw = vec3(0.5, 0.33, 0.11);
  vec3 c = vS < 0.4 ? mix(blue, purple, vS / 0.4) : mix(purple, straw, (vS - 0.4) / 0.6);
  gl_FragColor = vec4(c, a * 0.55 * (1.0 - smoothstep(0.55, 1.0, vS)));
}`,transparent:!0,depthWrite:!1});function Tt(s,{spread:e,speed:t,life:i,streak:o,hot:a,warm:l}){const r=new Float32Array(s*6),h=new Float32Array(s*4),m=new Float32Array(s*2);for(let f=0;f<s;f++){const b=e*Math.sqrt(Math.random()),A=2*Math.PI*Math.random(),E=t[0]+(t[1]-t[0])*Math.random()**1.5,Me=[Math.sin(b)*Math.cos(A)*E,Math.cos(b)*E,Math.sin(b)*Math.sin(A)*E],w=Math.random(),Q=i[0]+(i[1]-i[0])*Math.random();for(let z=0;z<2;z++)r.set(Me,(2*f+z)*3),h.set([w,Q],(2*f+z)*2),m[2*f+z]=z}const n=new Ue;n.setAttribute("position",new fe(new Float32Array(s*6),3)),n.setAttribute("aVel",new fe(r,3)),n.setAttribute("aSeed",new fe(h,2)),n.setAttribute("aEnd",new fe(m,1));const g=new k({uniforms:{uTime:{value:0},uOn:{value:0},uStreak:{value:o},uOrigin:{value:u(0,0,0)},uBasis:{value:new Et},uGrav:{value:u(0,-9.8,0)},uHot:{value:a},uWarm:{value:l}},vertexShader:`uniform float uTime, uStreak, uOn; uniform vec3 uOrigin, uGrav; uniform mat3 uBasis;
attribute vec3 aVel; attribute vec2 aSeed; attribute float aEnd; varying float vA; varying float vAge;
void main() {
  float age = mod(uTime + aSeed.x * aSeed.y, aSeed.y);
  float a = max(age - uStreak * aEnd, 0.0);
  vec3 p = uOrigin + uBasis * aVel * a + 0.5 * uGrav * a * a;
  vAge = age / aSeed.y; vA = uOn * (1.0 - 0.92 * aEnd);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`,fragmentShader:`uniform vec3 uHot, uWarm; varying float vA; varying float vAge;
void main() { gl_FragColor = vec4(mix(uHot, uWarm, vAge) * pow(clamp(1.0 - vAge, 0.0, 1.0), 1.6) * vA, 1.0); }`,blending:be,transparent:!0,depthWrite:!1}),p=new Ae(n,g);return p.frustumCulled=!1,p}const Ye=s=>{const e=s.clone().normalize(),t=new H().crossVectors(Math.abs(e.y)<.9?u(0,1,0):u(1,0,0),e).normalize();return new Et().setFromMatrix4(new Pt().makeBasis(t,e,new H().crossVectors(t,e)))};function Is(){const s=document.createElement("canvas");s.width=s.height=64;const e=s.getContext("2d"),t=e.createRadialGradient(32,32,0,32,32,32);return t.addColorStop(0,"rgba(255,255,255,1)"),t.addColorStop(.2,"rgba(255,255,255,0.5)"),t.addColorStop(1,"rgba(255,255,255,0)"),e.fillStyle=t,e.fillRect(0,0,64,64),new fs(s)}const ye=[{t:0,fov:30,at:()=>[vt,u(-9,13.2,25.8)]},{t:.1,fov:30,at:()=>[vt,u(-6.6,12,27.6)]},{t:.26,fov:26,at:s=>[s(.07,0,0),s(-.28,.1,-.78)]},{t:.46,fov:26,at:s=>[s(.06,.01,0),s(-.2,.06,-.74)]},{t:.5,fov:28,at:s=>[s(.08,.1,0),s(-.38,.42,-.62)]},{t:.76,fov:28,at:s=>[s(.07,.09,0),s(-.3,.38,-.66)]},{t:.83,fov:30,at:s=>[s(.4,0,0),s(-1.6,1,-2.8)]},{t:.94,fov:30,at:()=>[u(9,3.4,3),u(-16.2,10.1,22.2)]},{t:1,fov:30,at:()=>[u(9,3.4,3),u(-17.2,10.5,21.2)]}];function ks(s,{small:e=!1}={}){const t=new as({canvas:s,antialias:!1,powerPreference:"high-performance"});t.setPixelRatio(Math.min(window.devicePixelRatio||1,e?1.5:1.75));const i=new St;i.background=new U(qe),i.fog=new rs(qe,50,200);const o=new os(t),a=new gs,l=o.fromScene(a,.04).texture;o.dispose(),a.dispose(),i.environment=l,i.environmentIntensity=.45,i.add(new ns(12109520,724754,.25));const r=new ft(15002869,1.6);r.position.set(-6,10,8),i.add(r);const h=new ft(16777215,.7);h.position.set(9,4,-10),i.add(h);const m=new ls(30,1,.1,400),n=new dt({color:8491417,transparent:!0,opacity:.55,fog:!0});i.add(new Ae(Us(),n));const g=u(1.5*J,de-L,xe-$.tw/2-.01),p=(c,v=0)=>{c.position.copy(g).add(u(0,v,0)),c.rotation.y=Math.PI/2},f=[xt(Ns()),We(y,Fe,L-S.tf/2,S.tf,S.b),We(0,Fe,-L+S.tf/2,S.tf,S.b)],b=Rt(f.map(c=>new Xe(c,20))),A=new us({color:15751716,dashSize:.14,gapSize:.09,transparent:!0,opacity:.85,fog:!0}),E=new Ae(b,A);E.computeLineDistances(),p(E),i.add(E);const Me={polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1},w=new Re({color:3356990,metalness:.5,roughness:.62,...Me}),Q=new Re({color:11844801,metalness:1,roughness:.28,...Me}),z=new dt({color:13292503,transparent:!0,opacity:.3}),C=new Le,le=(c,v,d=C)=>{d.add(new _(c,v)),d.add(new Ae(new Xe(c,20),z))};le(f[0],[w,Q]),le(f[1],[w,Q,w,w,w,w]),le(f[2],w);const Ut=I.map(([c,v])=>{const d=new Le;return d.add(new _(new mt(ve,ve,we,40).rotateX(Math.PI/2),[Q,w,w])),d.position.set(c,v,0),C.add(d),d}),Te=new Le,ue=u(y/2,(N+L)/2,0);le(xt(zs()).translate(-ue.x,-ue.y,0),[w,Q],Te),le(We(0,y,L-S.tf/2,S.tf,S.b).translate(-ue.x,-ue.y,0),[Q,w,w,w,w,w],Te),C.add(Te),i.add(C);const et=Mt(.03,5),Ne=Mt(.06,6),ze=Os(),ce=we/8;wt.forEach(c=>C.add(new _(he(c,u(0,0,-1),.0013,ce,!1),et))),C.add(new _(he(je,u(0,1,0),.003,ce,!1),Ne)),C.add(new _(he(Ke,u(0,0,-1),.003,ce,!1),Ne)),C.add(new _(he(je,u(0,1,0),.016,ce/2,!0),ze)),C.add(new _(he(Ke,u(0,0,-1),.016,ce/2,!0),ze));const tt=e?.5:1,De=Tt(Math.round(600*tt),{spread:.5,speed:[1.2,3.4],life:[.22,.55],streak:.012,hot:u(4.5,3.4,2),warm:u(2,.6,.15)}),Oe=Tt(Math.round(2600*tt),{spread:.85,speed:[.7,2.6],life:[.3,.85],streak:.02,hot:u(5,2.8,1.1),warm:u(2.2,.45,.08)});C.add(De,Oe);const st=Is(),it=c=>new ds(new ms({map:st,color:c,blending:be,transparent:!0,depthWrite:!1})),te=it(new U(9,7,5)),Y=it(new U(.7,.45,1.6)),Se=new _(new mt(.004,.002,.06,16,1,!0),new k({vertexShader:"varying float vY; void main() { vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:"varying float vY; void main() { float a = pow(clamp(1.0 - vY, 0.0, 1.0), 2.2); gl_FragColor = vec4(vec3(3.5, 4.2, 8.0) * a, 1.0); }",blending:be,transparent:!0,depthWrite:!1,side:cs})),X=new Ct(16752736,0,.5,2);C.add(te,Y,Se,X);const at=new pe(1,1,{type:ge,samples:e?2:4}),q=new Ts(t,at);q.addPass(new Ss(i,m));const Nt=new oe(new G(1,1),.55,.3,1);q.addPass(Nt),q.addPass(new Cs);let R=0,B=0,rt=null;const ot=()=>{R=s.clientWidth,B=s.clientHeight,!(!R||!B)&&(t.setSize(R,B,!1),q.setPixelRatio(t.getPixelRatio()),q.setSize(R,B))};ot();const zt=c=>{C.visible=c>0;const v=c<1;for(const d of[w,Q])d.opacity=c,d.transparent!==v&&(d.transparent=v,d.needsUpdate=!0);z.opacity=.3*c,rt=c},nt=(c,v,d)=>C.localToWorld(u(c,v,d));function Dt(c){let v=0;for(;v<ye.length-2&&c>ye[v+1].t;)v++;const d=ye[v],x=ye[v+1],P=re(O(c,d.t,x.t)),[T,V]=d.at(nt),[M,se]=x.at(nt),Z=V.clone().sub(T),ie=se.clone().sub(M),W=Z.length(),_e=ie.length(),D=W*Math.pow(_e/W,P),ut=T.clone().lerp(M,P);m.position.copy(ut).addScaledVector(Z.normalize().lerp(ie.normalize(),P).normalize(),D),m.lookAt(ut);const It=R/B<1.5?Math.pow(1.5/(R/B),.75):1,Lt=1+(It-1)*O(D,1.5,6);m.fov=2*Math.atan(Math.tan((d.fov+(x.fov-d.fov)*P)*Math.PI/360)*Lt)*180/Math.PI,m.near=D*.02,m.far=D*40+60,i.fog.near=D*1.6,i.fog.far=D*1.6+Math.max(4,D*6);const ct=R/B>1.1,ht=re(O(c,.14,.24)),kt=re(O(c,.83,.94));m.setViewOffset(R,B,ct?-(.1*ht+.12*kt)*R:0,ct?0:.16*ht*B,R,B),m.aspect=R/B,m.updateProjectionMatrix()}const Ie={laser:Ye(u(0,-.35,-1)),web:Ye(u(0,-.45,-1)),flange:Ye(u(0,-1,-.25))};function Ot(c,v){let d=null,x=null,P=0,T=!1;const V=(c-K[0])/(K[1]-K[0]);if(V>=0&&V<1){const ie=Math.min(I.length-1,Math.floor(V*I.length)),W=V*I.length-ie,[_e,D]=I[ie];W<.15?(d="laser",x=u(_e,D,j),P=1-W/.15):W<.27?(d="laser",x=u(_e,D-ve*(W-.15)/.12,j)):W<.95&&(d="laser",x=wt[ie].at(c))}else(x=je.at(c))?(d="plasma",T=!0):(x=Ke.at(c))&&(d="plasma");const M=.82+.18*Math.sin(v*61)*Math.sin(v*37.3+1.7);if(De.visible=d==="laser",Oe.visible=d==="plasma",te.visible=Y.visible=X.visible=!!d,Se.visible=d==="plasma"&&T,!d)return;const se=T?u(0,.0015,0):u(0,0,-.0015);te.position.copy(x).add(se),Y.position.copy(te.position);const Z=d==="laser"?De:Oe;Z.material.uniforms.uTime.value=v,Z.material.uniforms.uOn.value=P>0?.25:1,Z.material.uniforms.uOrigin.value.copy(T?u(x.x,L-S.tf,x.z):u(x.x,x.y,j-5e-4)),Z.material.uniforms.uBasis.value.copy(d==="laser"?Ie.laser:T?Ie.flange:Ie.web),d==="laser"?(te.scale.setScalar((.006+.022*P)*M),Y.scale.setScalar(.03+.03*P),Y.material.color.setRGB(.5,.18,.04),X.color.setRGB(1,.62,.32),X.intensity=(.025+.04*P)*M):(te.scale.setScalar(.014*M),Y.scale.setScalar(.07*M),Y.material.color.setRGB(.5,.32,1.2),X.color.setRGB(.8,.78,1),X.intensity=.07*M,Se.position.copy(x).add(u(0,.03,0)),Se.scale.set(M,1,M)),X.position.copy(x).add(T?u(0,.05,-.03):u(0,-.01,-.05))}function lt(c,v,d,x,P,T,V){const M=Math.max(0,x-d)*P,se=.5*9.8*M*M;c.visible=se<3,c.position.set(v.x+T.x*M,v.y-se,v.z+T.z*M),c.rotation.set(V.x*M,0,V.z*M)}return{resize:ot,busy:Fs,render(c,v=0){if(!R||!B)return;p(C,Rs*(re(O(c,.12,.24))-re(O(c,.85,.94)))),C.updateMatrixWorld();const d=O(c,.14,.23);d!==rt&&zt(d);const x=re(O(c,.05,.17));i.background.copy(ys).lerp(As,x),i.fog.color.copy(i.background),n.color.copy(Es).lerp(Ps,x),A.opacity=.85*(1-O(c,.92,.97)),z.opacity=.3*d+.45*O(c,.92,.97),Ut.forEach((P,T)=>lt(P,u(I[T][0],I[T][1],0),Bs(T),c,24,u(0,0,-.9),u(6,0,0))),lt(Te,ue,Ge[1],c,14,u(-.3,0,-.5),u(1,0,2)),et.uniforms.uNow.value=Ne.uniforms.uNow.value=ze.uniforms.uNow.value=c,Ot(c,v),Dt(c),q.render()},dispose(){i.traverse(c=>{c.isSprite||c.geometry?.dispose(),(Array.isArray(c.material)?c.material:[c.material]).forEach(v=>v?.dispose())}),st.dispose(),l.dispose(),q.dispose(),at.dispose(),t.dispose()}}}export{ks as mount};
