'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

interface SplashCursorProps {
  SIM_RESOLUTION?: number;
  DYE_RESOLUTION?: number;
  CAPTURE_RESOLUTION?: number;
  DENSITY_DISSIPATION?: number;
  VELOCITY_DISSIPATION?: number;
  PRESSURE?: number;
  PRESSURE_ITERATIONS?: number;
  CURL?: number;
  SPLAT_RADIUS?: number;
  SPLAT_FORCE?: number;
  SHADING?: boolean;
  COLOR_UPDATE_SPEED?: number;
  BACK_COLOR?: ColorRGB;
  TRANSPARENT?: boolean;
}

interface PointerState {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: ColorRGB;
}

interface SupportedFormat {
  internalFormat: number;
  format: number;
}

interface GLContextResult {
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  ext: {
    formatRGBA: SupportedFormat;
    formatRG: SupportedFormat;
    formatR: SupportedFormat;
    halfFloatTexType: number;
    supportLinearFiltering: boolean;
  };
}

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (id: number) => number;
}

interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap: () => void;
}

function pointerPrototype(): PointerState {
  return {
    id: -1,
    texcoordX: 0,
    texcoordY: 0,
    prevTexcoordX: 0,
    prevTexcoordY: 0,
    deltaX: 0,
    deltaY: 0,
    down: false,
    moved: false,
    color: { r: 0, g: 0, b: 0 },
  };
}

function wrap(value: number, min: number, max: number) {
  const range = max - min;
  if (range === 0) return min;
  return ((value - min) % range) + min;
}

function hashCode(source: string) {
  if (!source.length) return 0;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

function addKeywords(source: string, keywords: string[] | null) {
  if (!keywords) return source;
  return `${keywords.map((keyword) => `#define ${keyword}\n`).join('')}${source}`;
}

function HSVtoRGB(h: number, s: number, v: number): ColorRGB {
  let r = 0;
  let g = 0;
  let b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    default:
      r = v;
      g = p;
      b = q;
      break;
  }

  return { r, g, b };
}

function generateColor(): ColorRGB {
  const hue = 0.105 + Math.random() * 0.035;
  const saturation = 0.32 + Math.random() * 0.14;
  const value = 0.72 + Math.random() * 0.1;
  const color = HSVtoRGB(hue, saturation, value);
  color.r *= 0.34;
  color.g *= 0.28;
  color.b *= 0.16;
  return color;
}

export default function SplashCursor({
  SIM_RESOLUTION = 128,
  DYE_RESOLUTION = 1024,
  CAPTURE_RESOLUTION = 512,
  DENSITY_DISSIPATION = 4.2,
  VELOCITY_DISSIPATION = 2.6,
  PRESSURE = 0.1,
  PRESSURE_ITERATIONS = 16,
  CURL = 2,
  SPLAT_RADIUS = 0.16,
  SPLAT_FORCE = 2800,
  SHADING = true,
  COLOR_UPDATE_SPEED = 7,
  BACK_COLOR = { r: 0.7725, g: 0.647, b: 0.447 },
  TRANSPARENT = true,
}: SplashCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const refreshFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const isTouchDevice = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;

    let animationFrameId = 0;
    let pointers: PointerState[] = [pointerPrototype()];
    let dye: DoubleFBO;
    let velocity: DoubleFBO;
    let divergence: FBO;
    let curl: FBO;
    let pressure: DoubleFBO;

    const config = {
      SIM_RESOLUTION: isTouchDevice ? Math.min(SIM_RESOLUTION, 96) : SIM_RESOLUTION,
      DYE_RESOLUTION: isTouchDevice ? Math.min(DYE_RESOLUTION, 512) : DYE_RESOLUTION,
      CAPTURE_RESOLUTION,
      DENSITY_DISSIPATION: isTouchDevice ? Math.max(DENSITY_DISSIPATION, 4.8) : DENSITY_DISSIPATION,
      VELOCITY_DISSIPATION: isTouchDevice ? Math.max(VELOCITY_DISSIPATION, 3.1) : VELOCITY_DISSIPATION,
      PRESSURE,
      PRESSURE_ITERATIONS,
      CURL: isTouchDevice ? Math.min(CURL, 1.5) : CURL,
      SPLAT_RADIUS: isTouchDevice ? Math.min(SPLAT_RADIUS, 0.14) : SPLAT_RADIUS,
      SPLAT_FORCE: isTouchDevice ? Math.min(SPLAT_FORCE, 2200) : SPLAT_FORCE,
      SHADING,
      COLOR_UPDATE_SPEED,
      BACK_COLOR,
      TRANSPARENT,
      PAUSED: false,
    };

    const getWebGLContext = (targetCanvas: HTMLCanvasElement): GLContextResult => {
      const params = {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false,
      };

      let gl = targetCanvas.getContext('webgl2', params) as WebGL2RenderingContext | null;

      if (!gl) {
        gl = (targetCanvas.getContext('webgl', params) ||
          targetCanvas.getContext('experimental-webgl', params)) as WebGL2RenderingContext | null;
      }

      if (!gl) {
        throw new Error('Unable to initialize WebGL.');
      }

      const isWebGL2 = 'drawBuffers' in gl;
      let supportLinearFiltering = false;
      let halfFloat: OES_texture_half_float | null = null;

      if (isWebGL2) {
        (gl as WebGL2RenderingContext).getExtension('EXT_color_buffer_float');
        supportLinearFiltering = !!(gl as WebGL2RenderingContext).getExtension('OES_texture_float_linear');
      } else {
        halfFloat = gl.getExtension('OES_texture_half_float');
        supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear');
      }

      gl.clearColor(0, 0, 0, 1);

      const halfFloatTexType = isWebGL2
        ? (gl as WebGL2RenderingContext).HALF_FLOAT
        : halfFloat?.HALF_FLOAT_OES || 0;

      const supportRenderTextureFormat = (
        targetGl: WebGLRenderingContext | WebGL2RenderingContext,
        internalFormat: number,
        format: number,
        type: number
      ) => {
        const texture = targetGl.createTexture();
        if (!texture) return false;

        targetGl.bindTexture(targetGl.TEXTURE_2D, texture);
        targetGl.texParameteri(targetGl.TEXTURE_2D, targetGl.TEXTURE_MIN_FILTER, targetGl.NEAREST);
        targetGl.texParameteri(targetGl.TEXTURE_2D, targetGl.TEXTURE_MAG_FILTER, targetGl.NEAREST);
        targetGl.texParameteri(targetGl.TEXTURE_2D, targetGl.TEXTURE_WRAP_S, targetGl.CLAMP_TO_EDGE);
        targetGl.texParameteri(targetGl.TEXTURE_2D, targetGl.TEXTURE_WRAP_T, targetGl.CLAMP_TO_EDGE);
        targetGl.texImage2D(targetGl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

        const framebuffer = targetGl.createFramebuffer();
        if (!framebuffer) return false;

        targetGl.bindFramebuffer(targetGl.FRAMEBUFFER, framebuffer);
        targetGl.framebufferTexture2D(targetGl.FRAMEBUFFER, targetGl.COLOR_ATTACHMENT0, targetGl.TEXTURE_2D, texture, 0);
        return targetGl.checkFramebufferStatus(targetGl.FRAMEBUFFER) === targetGl.FRAMEBUFFER_COMPLETE;
      };

      const getSupportedFormat = (
        targetGl: WebGLRenderingContext | WebGL2RenderingContext,
        internalFormat: number,
        format: number,
        type: number
      ): SupportedFormat => {
        if (supportRenderTextureFormat(targetGl, internalFormat, format, type)) {
          return { internalFormat, format };
        }

        if ('drawBuffers' in targetGl) {
          const gl2 = targetGl as WebGL2RenderingContext;
          if (internalFormat === gl2.R16F) {
            return getSupportedFormat(gl2, gl2.RG16F, gl2.RG, type);
          }
          if (internalFormat === gl2.RG16F) {
            return getSupportedFormat(gl2, gl2.RGBA16F, gl2.RGBA, type);
          }
        }

        return { internalFormat: targetGl.RGBA, format: targetGl.RGBA };
      };

      const formatRGBA = isWebGL2
        ? getSupportedFormat(gl, (gl as WebGL2RenderingContext).RGBA16F, gl.RGBA, halfFloatTexType)
        : getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);

      const formatRG = isWebGL2
        ? getSupportedFormat(gl, (gl as WebGL2RenderingContext).RG16F, (gl as WebGL2RenderingContext).RG, halfFloatTexType)
        : getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);

      const formatR = isWebGL2
        ? getSupportedFormat(gl, (gl as WebGL2RenderingContext).R16F, (gl as WebGL2RenderingContext).RED, halfFloatTexType)
        : getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);

      return {
        gl,
        ext: {
          formatRGBA,
          formatRG,
          formatR,
          halfFloatTexType,
          supportLinearFiltering,
        },
      };
    };

    const { gl, ext } = getWebGLContext(canvas);

    if (!ext.supportLinearFiltering) {
      config.DYE_RESOLUTION = 256;
      config.SHADING = false;
    }

    const compileShader = (type: number, source: string, keywords: string[] | null = null) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, addKeywords(source, keywords));
      gl.compileShader(shader);
      return shader;
    };

    const createProgram = (vertexShader: WebGLShader | null, fragmentShader: WebGLShader | null) => {
      if (!vertexShader || !fragmentShader) return null;
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      return program;
    };

    const getUniforms = (program: WebGLProgram) => {
      const uniforms: Record<string, WebGLUniformLocation | null> = {};
      const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let index = 0; index < uniformCount; index += 1) {
        const uniformInfo = gl.getActiveUniform(program, index);
        if (uniformInfo) {
          uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name);
        }
      }
      return uniforms;
    };

    class Program {
      program: WebGLProgram | null;
      uniforms: Record<string, WebGLUniformLocation | null>;

      constructor(vertexShader: WebGLShader | null, fragmentShader: WebGLShader | null) {
        this.program = createProgram(vertexShader, fragmentShader);
        this.uniforms = this.program ? getUniforms(this.program) : {};
      }

      bind() {
        if (this.program) {
          gl.useProgram(this.program);
        }
      }
    }

    class Material {
      vertexShader: WebGLShader | null;
      fragmentShaderSource: string;
      programs: Record<number, WebGLProgram | null>;
      activeProgram: WebGLProgram | null;
      uniforms: Record<string, WebGLUniformLocation | null>;

      constructor(vertexShader: WebGLShader | null, fragmentShaderSource: string) {
        this.vertexShader = vertexShader;
        this.fragmentShaderSource = fragmentShaderSource;
        this.programs = {};
        this.activeProgram = null;
        this.uniforms = {};
      }

      setKeywords(keywords: string[]) {
        let hash = 0;
        keywords.forEach((keyword) => {
          hash += hashCode(keyword);
        });

        let program = this.programs[hash];
        if (program == null) {
          const fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
          program = createProgram(this.vertexShader, fragmentShader);
          this.programs[hash] = program;
        }

        if (program === this.activeProgram) return;

        if (program) {
          this.uniforms = getUniforms(program);
        }
        this.activeProgram = program;
      }

      bind() {
        if (this.activeProgram) {
          gl.useProgram(this.activeProgram);
        }
      }
    }

    const baseVertexShader = compileShader(
      gl.VERTEX_SHADER,
      `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;

        void main () {
          vUv = aPosition * 0.5 + 0.5;
          vL = vUv - vec2(texelSize.x, 0.0);
          vR = vUv + vec2(texelSize.x, 0.0);
          vT = vUv + vec2(0.0, texelSize.y);
          vB = vUv - vec2(0.0, texelSize.y);
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `
    );

    const copyShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;

      void main () {
        gl_FragColor = texture2D(uTexture, vUv);
      }
    `);

    const clearShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;

      void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `);

    const displayShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uTexture;
      uniform vec2 texelSize;

      void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        #ifdef SHADING
          vec3 lc = texture2D(uTexture, vL).rgb;
          vec3 rc = texture2D(uTexture, vR).rgb;
          vec3 tc = texture2D(uTexture, vT).rgb;
          vec3 bc = texture2D(uTexture, vB).rgb;

          float dx = length(rc) - length(lc);
          float dy = length(tc) - length(bc);

          vec3 n = normalize(vec3(dx, dy, length(texelSize)));
          vec3 l = vec3(0.0, 0.0, 1.0);
          float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
          c *= diffuse;
        #endif

        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a);
      }
    `;

    const splatShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;

      void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `);

    const advectionShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;

        vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
          vec2 st = uv / tsize - 0.5;
          vec2 iuv = floor(st);
          vec2 fuv = fract(st);

          vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
          vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
          vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
          vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

          return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
        }

        void main () {
          #ifdef MANUAL_FILTERING
            vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
            vec4 result = bilerp(uSource, coord, dyeTexelSize);
          #else
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            vec4 result = texture2D(uSource, coord);
          #endif
          float decay = 1.0 + dissipation * dt;
          gl_FragColor = result / decay;
        }
      `,
      ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']
    );

    const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;

      void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `);

    const curlShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;

      void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `);

    const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;

      void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;

        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;

        vec2 velocityValue = texture2D(uVelocity, vUv).xy;
        velocityValue += force * dt;
        velocityValue = min(max(velocityValue, -1000.0), 1000.0);
        gl_FragColor = vec4(velocityValue, 0.0, 1.0);
      }
    `);

    const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;

      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float divergenceValue = texture2D(uDivergence, vUv).x;
        float pressureValue = (L + R + B + T - divergenceValue) * 0.25;
        gl_FragColor = vec4(pressureValue, 0.0, 0.0, 1.0);
      }
    `);

    const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;

      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocityValue = texture2D(uVelocity, vUv).xy;
        velocityValue.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocityValue, 0.0, 1.0);
      }
    `);

    const copyProgram = new Program(baseVertexShader, copyShader);
    const clearProgram = new Program(baseVertexShader, clearShader);
    const splatProgram = new Program(baseVertexShader, splatShader);
    const advectionProgram = new Program(baseVertexShader, advectionShader);
    const divergenceProgram = new Program(baseVertexShader, divergenceShader);
    const curlProgram = new Program(baseVertexShader, curlShader);
    const vorticityProgram = new Program(baseVertexShader, vorticityShader);
    const pressureProgram = new Program(baseVertexShader, pressureShader);
    const gradientSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
    const displayMaterial = new Material(baseVertexShader, displayShaderSource);

    const blit = (() => {
      const buffer = gl.createBuffer();
      const elementBuffer = gl.createBuffer();
      if (!buffer || !elementBuffer) {
        return (_target: FBO | null) => undefined;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);

      return (target: FBO | null, shouldClear = false) => {
        if (target) {
          gl.viewport(0, 0, target.width, target.height);
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        } else {
          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        if (shouldClear) {
          gl.clear(gl.COLOR_BUFFER_BIT);
        }

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      };
    })();

    const createFBO = (
      width: number,
      height: number,
      internalFormat: number,
      format: number,
      type: number,
      param: number
    ): FBO => {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture() as WebGLTexture;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

      const framebuffer = gl.createFramebuffer() as WebGLFramebuffer;
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, width, height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      return {
        texture,
        fbo: framebuffer,
        width,
        height,
        texelSizeX: 1 / width,
        texelSizeY: 1 / height,
        attach(textureUnit: number) {
          gl.activeTexture(gl.TEXTURE0 + textureUnit);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return textureUnit;
        },
      };
    };

    const createDoubleFBO = (
      width: number,
      height: number,
      internalFormat: number,
      format: number,
      type: number,
      param: number
    ): DoubleFBO => {
      const first = createFBO(width, height, internalFormat, format, type, param);
      const second = createFBO(width, height, internalFormat, format, type, param);

      return {
        width,
        height,
        texelSizeX: first.texelSizeX,
        texelSizeY: first.texelSizeY,
        read: first,
        write: second,
        swap() {
          const temp = this.read;
          this.read = this.write;
          this.write = temp;
        },
      };
    };

    const resizeFBO = (
      target: FBO,
      width: number,
      height: number,
      internalFormat: number,
      format: number,
      type: number,
      param: number
    ) => {
      const newFBO = createFBO(width, height, internalFormat, format, type, param);
      copyProgram.bind();
      if (copyProgram.uniforms.uTexture) {
        gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
      }
      blit(newFBO, false);
      return newFBO;
    };

    const resizeDoubleFBO = (
      target: DoubleFBO,
      width: number,
      height: number,
      internalFormat: number,
      format: number,
      type: number,
      param: number
    ) => {
      if (target.width === width && target.height === height) return target;

      target.read = resizeFBO(target.read, width, height, internalFormat, format, type, param);
      target.write = createFBO(width, height, internalFormat, format, type, param);
      target.width = width;
      target.height = height;
      target.texelSizeX = 1 / width;
      target.texelSizeY = 1 / height;

      return target;
    };

    const getResolution = (resolution: number) => {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      const aspectRatio = width / height;
      const aspect = aspectRatio < 1 ? 1 / aspectRatio : aspectRatio;
      const min = Math.round(resolution);
      const max = Math.round(resolution * aspect);

      if (width > height) {
        return { width: max, height: min };
      }

      return { width: min, height: max };
    };

    const scaleByPixelRatio = (value: number) => {
      const pixelRatio = window.devicePixelRatio || 1;
      return Math.floor(value * pixelRatio);
    };

    const updateKeywords = () => {
      const displayKeywords: string[] = [];
      if (config.SHADING) displayKeywords.push('SHADING');
      displayMaterial.setKeywords(displayKeywords);
    };

    const initFramebuffers = () => {
      const simRes = getResolution(config.SIM_RESOLUTION);
      const dyeRes = getResolution(config.DYE_RESOLUTION);
      const texType = ext.halfFloatTexType;
      const rgba = ext.formatRGBA;
      const rg = ext.formatRG;
      const single = ext.formatR;
      const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

      gl.disable(gl.BLEND);

      if (!dye) {
        dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
      } else {
        dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
      }

      if (!velocity) {
        velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
      } else {
        velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
      }

      divergence = createFBO(simRes.width, simRes.height, single.internalFormat, single.format, texType, gl.NEAREST);
      curl = createFBO(simRes.width, simRes.height, single.internalFormat, single.format, texType, gl.NEAREST);
      pressure = createDoubleFBO(simRes.width, simRes.height, single.internalFormat, single.format, texType, gl.NEAREST);
    };

    const correctRadius = (radius: number) => {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio > 1) return radius * aspectRatio;
      return radius;
    };

    const correctDeltaX = (delta: number) => {
      const aspectRatio = canvas.width / canvas.height;
      return aspectRatio < 1 ? delta * aspectRatio : delta;
    };

    const correctDeltaY = (delta: number) => {
      const aspectRatio = canvas.width / canvas.height;
      return aspectRatio > 1 ? delta / aspectRatio : delta;
    };

    const splat = (x: number, y: number, dx: number, dy: number, color: ColorRGB) => {
      splatProgram.bind();
      if (splatProgram.uniforms.uTarget) gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
      if (splatProgram.uniforms.aspectRatio) gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
      if (splatProgram.uniforms.point) gl.uniform2f(splatProgram.uniforms.point, x, y);
      if (splatProgram.uniforms.color) gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
      if (splatProgram.uniforms.radius) gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100));
      blit(velocity.write);
      velocity.swap();

      if (splatProgram.uniforms.uTarget) gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
      if (splatProgram.uniforms.color) gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
      blit(dye.write);
      dye.swap();
    };

    const splatPointer = (pointer: PointerState) => {
      splat(pointer.texcoordX, pointer.texcoordY, pointer.deltaX * config.SPLAT_FORCE, pointer.deltaY * config.SPLAT_FORCE, pointer.color);
    };

    const clickSplat = (pointer: PointerState) => {
      const color = generateColor();
      color.r *= 10;
      color.g *= 10;
      color.b *= 10;
      splat(pointer.texcoordX, pointer.texcoordY, 10 * (Math.random() - 0.5), 30 * (Math.random() - 0.5), color);
    };

    const updatePointerDownData = (pointer: PointerState, id: number, positionX: number, positionY: number) => {
      pointer.id = id;
      pointer.down = true;
      pointer.moved = false;
      pointer.texcoordX = positionX / canvas.width;
      pointer.texcoordY = 1 - positionY / canvas.height;
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.deltaX = 0;
      pointer.deltaY = 0;
      pointer.color = generateColor();
    };

    const updatePointerMoveData = (pointer: PointerState, positionX: number, positionY: number, color: ColorRGB) => {
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.texcoordX = positionX / canvas.width;
      pointer.texcoordY = 1 - positionY / canvas.height;
      pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
      pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
      pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
      pointer.color = color;
    };

    const updatePointerUpData = (pointer: PointerState) => {
      pointer.down = false;
    };

    const drawDisplay = (target: FBO | null) => {
      const width = target ? target.width : gl.drawingBufferWidth;
      const height = target ? target.height : gl.drawingBufferHeight;
      displayMaterial.bind();
      if (config.SHADING && displayMaterial.uniforms.texelSize) {
        gl.uniform2f(displayMaterial.uniforms.texelSize, 1 / width, 1 / height);
      }
      if (displayMaterial.uniforms.uTexture) {
        gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
      }
      blit(target, false);
    };

    const render = (target: FBO | null) => {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
      drawDisplay(target);
    };

    const step = (dt: number) => {
      gl.disable(gl.BLEND);

      curlProgram.bind();
      if (curlProgram.uniforms.texelSize) gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      if (curlProgram.uniforms.uVelocity) gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
      blit(curl);

      vorticityProgram.bind();
      if (vorticityProgram.uniforms.texelSize) gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      if (vorticityProgram.uniforms.uVelocity) gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
      if (vorticityProgram.uniforms.uCurl) gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
      if (vorticityProgram.uniforms.curl) gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
      if (vorticityProgram.uniforms.dt) gl.uniform1f(vorticityProgram.uniforms.dt, dt);
      blit(velocity.write);
      velocity.swap();

      divergenceProgram.bind();
      if (divergenceProgram.uniforms.texelSize) gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      if (divergenceProgram.uniforms.uVelocity) gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
      blit(divergence);

      clearProgram.bind();
      if (clearProgram.uniforms.uTexture) gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
      if (clearProgram.uniforms.value) gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
      blit(pressure.write);
      pressure.swap();

      pressureProgram.bind();
      if (pressureProgram.uniforms.texelSize) gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      if (pressureProgram.uniforms.uDivergence) gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));

      for (let index = 0; index < config.PRESSURE_ITERATIONS; index += 1) {
        if (pressureProgram.uniforms.uPressure) gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
      }

      gradientSubtractProgram.bind();
      if (gradientSubtractProgram.uniforms.texelSize) gl.uniform2f(gradientSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      if (gradientSubtractProgram.uniforms.uPressure) gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
      if (gradientSubtractProgram.uniforms.uVelocity) gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
      blit(velocity.write);
      velocity.swap();

      advectionProgram.bind();
      if (advectionProgram.uniforms.texelSize) gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      if (!ext.supportLinearFiltering && advectionProgram.uniforms.dyeTexelSize) {
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
      }
      const velocityId = velocity.read.attach(0);
      if (advectionProgram.uniforms.uVelocity) gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
      if (advectionProgram.uniforms.uSource) gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
      if (advectionProgram.uniforms.dt) gl.uniform1f(advectionProgram.uniforms.dt, dt);
      if (advectionProgram.uniforms.dissipation) gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
      blit(velocity.write);
      velocity.swap();

      if (!ext.supportLinearFiltering && advectionProgram.uniforms.dyeTexelSize) {
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
      }
      if (advectionProgram.uniforms.uVelocity) gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
      if (advectionProgram.uniforms.uSource) gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
      if (advectionProgram.uniforms.dissipation) gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
      blit(dye.write);
      dye.swap();
    };

    const resizeCanvas = () => {
      const width = scaleByPixelRatio(canvas.clientWidth);
      const height = scaleByPixelRatio(canvas.clientHeight);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
      }
      return false;
    };

    let lastUpdateTime = Date.now();
    let colorUpdateTimer = 0;

    const updateColors = (dt: number) => {
      colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
      if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
        pointers.forEach((pointer) => {
          pointer.color = generateColor();
        });
      }
    };

    const applyInputs = () => {
      pointers.forEach((pointer) => {
        if (pointer.moved) {
          pointer.moved = false;
          splatPointer(pointer);
        }
      });
    };

    const calcDeltaTime = () => {
      const now = Date.now();
      let dt = (now - lastUpdateTime) / 1000;
      dt = Math.min(dt, 0.016666);
      lastUpdateTime = now;
      return dt;
    };

    const updateFrame = () => {
      const dt = calcDeltaTime();
      if (resizeCanvas()) initFramebuffers();
      updateColors(dt);
      applyInputs();
      step(dt);
      render(null);
      animationFrameId = requestAnimationFrame(updateFrame);
    };

    updateKeywords();
    initFramebuffers();
    updateFrame();

    const refreshAfterNavigation = () => {
      resizeCanvas();
      initFramebuffers();

      const pointer = pointers[0];
      updatePointerDownData(
        pointer,
        -1,
        scaleByPixelRatio(window.innerWidth * 0.5),
        scaleByPixelRatio(window.innerHeight * 0.35)
      );
      clickSplat(pointer);
      updatePointerUpData(pointer);
    };

    refreshFnRef.current = refreshAfterNavigation;

    const refreshFrameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(refreshAfterNavigation);
    });

    const handleMouseDown = (event: MouseEvent) => {
      const pointer = pointers[0];
      updatePointerDownData(pointer, -1, scaleByPixelRatio(event.clientX), scaleByPixelRatio(event.clientY));
      clickSplat(pointer);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const pointer = pointers[0];
      updatePointerMoveData(pointer, scaleByPixelRatio(event.clientX), scaleByPixelRatio(event.clientY), pointer.color);
    };

    const handleTouchStart = (event: TouchEvent) => {
      const pointer = pointers[0];
      Array.from(event.targetTouches).forEach((touch) => {
        updatePointerDownData(pointer, touch.identifier, scaleByPixelRatio(touch.clientX), scaleByPixelRatio(touch.clientY));
      });
    };

    const handleTouchMove = (event: TouchEvent) => {
      const pointer = pointers[0];
      Array.from(event.targetTouches).forEach((touch) => {
        updatePointerMoveData(pointer, scaleByPixelRatio(touch.clientX), scaleByPixelRatio(touch.clientY), pointer.color);
      });
    };

    const handleTouchEnd = () => {
      updatePointerUpData(pointers[0]);
    };

    const handleResize = () => {
      resizeCanvas();
      initFramebuffers();
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, false);
    window.addEventListener('touchmove', handleTouchMove, false);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('resize', handleResize);

    return () => {
      refreshFnRef.current = null;
      window.cancelAnimationFrame(refreshFrameId);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart, false);
      window.removeEventListener('touchmove', handleTouchMove, false);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
      pointers = [pointerPrototype()];
      // Do NOT call loseContext() here — this component lives in the root layout and
      // never truly unmounts during navigation. Calling loseContext() would permanently
      // destroy the WebGL context on the same canvas, breaking all subsequent renders.
      // The browser cleans up GPU resources automatically when the page unloads.
    };
  }, [
    SIM_RESOLUTION,
    DYE_RESOLUTION,
    CAPTURE_RESOLUTION,
    DENSITY_DISSIPATION,
    VELOCITY_DISSIPATION,
    PRESSURE,
    PRESSURE_ITERATIONS,
    CURL,
    SPLAT_RADIUS,
    SPLAT_FORCE,
    SHADING,
    COLOR_UPDATE_SPEED,
    BACK_COLOR,
    TRANSPARENT,
  ]);

  // On client-side navigation, trigger a fresh splash without reinitialising the WebGL context
  useEffect(() => {
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        refreshFnRef.current?.();
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [pathname]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30" aria-hidden="true">
      <canvas ref={canvasRef} id="fluid" className="block h-screen w-screen" />
    </div>
  );
}