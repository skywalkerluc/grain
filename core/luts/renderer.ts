import { buildCubeTable, getLutById, type CubeLutDefinition, type LutDefinition, type MatrixLutDefinition } from './luts';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function applyMatrixLutFallbackCanvas(
  source: CanvasImageSource,
  size: { width: number; height: number },
  lut: MatrixLutDefinition,
  intensity: number,
  target?: HTMLCanvasElement
): HTMLCanvasElement {
  const canvas = target ?? createCanvas(size.width, size.height);
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('2D context not available');
  }

  ctx.clearRect(0, 0, size.width, size.height);
  ctx.drawImage(source, 0, 0, size.width, size.height);

  const imageData = ctx.getImageData(0, 0, size.width, size.height);
  const data = imageData.data;
  const mix = clamp(intensity, 0, 1);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    const lutR = clamp(lut.matrix[0] * r + lut.matrix[1] * g + lut.matrix[2] * b + lut.offset[0], 0, 1);
    const lutG = clamp(lut.matrix[3] * r + lut.matrix[4] * g + lut.matrix[5] * b + lut.offset[1], 0, 1);
    const lutB = clamp(lut.matrix[6] * r + lut.matrix[7] * g + lut.matrix[8] * b + lut.offset[2], 0, 1);

    data[i] = Math.round((r * (1 - mix) + lutR * mix) * 255);
    data[i + 1] = Math.round((g * (1 - mix) + lutG * mix) * 255);
    data[i + 2] = Math.round((b * (1 - mix) + lutB * mix) * 255);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function cubeSampleAt(table: Float32Array, size: number, r: number, g: number, b: number): [number, number, number] {
  const index = ((b * size + g) * size + r) * 3;
  return [table[index], table[index + 1], table[index + 2]];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleCubeLut(table: Float32Array, size: number, r: number, g: number, b: number): [number, number, number] {
  const scaledR = clamp(r, 0, 1) * (size - 1);
  const scaledG = clamp(g, 0, 1) * (size - 1);
  const scaledB = clamp(b, 0, 1) * (size - 1);

  const r0 = Math.floor(scaledR);
  const g0 = Math.floor(scaledG);
  const b0 = Math.floor(scaledB);

  const r1 = Math.min(size - 1, r0 + 1);
  const g1 = Math.min(size - 1, g0 + 1);
  const b1 = Math.min(size - 1, b0 + 1);

  const tr = scaledR - r0;
  const tg = scaledG - g0;
  const tb = scaledB - b0;

  const c000 = cubeSampleAt(table, size, r0, g0, b0);
  const c100 = cubeSampleAt(table, size, r1, g0, b0);
  const c010 = cubeSampleAt(table, size, r0, g1, b0);
  const c110 = cubeSampleAt(table, size, r1, g1, b0);
  const c001 = cubeSampleAt(table, size, r0, g0, b1);
  const c101 = cubeSampleAt(table, size, r1, g0, b1);
  const c011 = cubeSampleAt(table, size, r0, g1, b1);
  const c111 = cubeSampleAt(table, size, r1, g1, b1);

  const c00: [number, number, number] = [
    lerp(c000[0], c100[0], tr),
    lerp(c000[1], c100[1], tr),
    lerp(c000[2], c100[2], tr)
  ];
  const c10: [number, number, number] = [
    lerp(c010[0], c110[0], tr),
    lerp(c010[1], c110[1], tr),
    lerp(c010[2], c110[2], tr)
  ];
  const c01: [number, number, number] = [
    lerp(c001[0], c101[0], tr),
    lerp(c001[1], c101[1], tr),
    lerp(c001[2], c101[2], tr)
  ];
  const c11: [number, number, number] = [
    lerp(c011[0], c111[0], tr),
    lerp(c011[1], c111[1], tr),
    lerp(c011[2], c111[2], tr)
  ];

  const c0: [number, number, number] = [
    lerp(c00[0], c10[0], tg),
    lerp(c00[1], c10[1], tg),
    lerp(c00[2], c10[2], tg)
  ];
  const c1: [number, number, number] = [
    lerp(c01[0], c11[0], tg),
    lerp(c01[1], c11[1], tg),
    lerp(c01[2], c11[2], tg)
  ];

  return [
    lerp(c0[0], c1[0], tb),
    lerp(c0[1], c1[1], tb),
    lerp(c0[2], c1[2], tb)
  ];
}

function applyCubeLutFallbackCanvas(
  source: CanvasImageSource,
  size: { width: number; height: number },
  lut: CubeLutDefinition,
  intensity: number,
  target?: HTMLCanvasElement
): HTMLCanvasElement {
  const canvas = target ?? createCanvas(size.width, size.height);
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('2D context not available');
  }

  ctx.clearRect(0, 0, size.width, size.height);
  ctx.drawImage(source, 0, 0, size.width, size.height);

  const imageData = ctx.getImageData(0, 0, size.width, size.height);
  const data = imageData.data;
  const mix = clamp(intensity, 0, 1);
  const table = buildCubeTable(lut);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    const [lutR, lutG, lutB] = sampleCubeLut(table, lut.size, r, g, b);

    data[i] = Math.round((r * (1 - mix) + lutR * mix) * 255);
    data[i + 1] = Math.round((g * (1 - mix) + lutG * mix) * 255);
    data[i + 2] = Math.round((b * (1 - mix) + lutB * mix) * 255);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

const VERTEX_SOURCE = `
  attribute vec2 a_position;
  attribute vec2 a_uv;
  varying vec2 v_uv;

  void main() {
    v_uv = a_uv;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SOURCE = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_texture;
  uniform mat3 u_matrix;
  uniform vec3 u_offset;
  uniform float u_intensity;

  void main() {
    vec4 src = texture2D(u_texture, v_uv);
    vec3 graded = clamp((u_matrix * src.rgb) + u_offset, 0.0, 1.0);
    vec3 outColor = mix(src.rgb, graded, u_intensity);
    gl_FragColor = vec4(outColor, src.a);
  }
`;

const QUAD_VERTICES = new Float32Array([
  -1, -1, 0, 1,
   1, -1, 1, 1,
  -1,  1, 0, 0,
  -1,  1, 0, 0,
   1, -1, 1, 1,
   1,  1, 1, 0
]);

type GlCache = {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  matrixLoc: WebGLUniformLocation;
  offsetLoc: WebGLUniformLocation;
  intensityLoc: WebGLUniformLocation;
  texture: WebGLTexture;
};

let glCache: GlCache | null = null;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Unable to create shader');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'Unknown shader error';
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertex);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!program) {
    throw new Error('Unable to create WebGL program');
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'Unknown link error';
    gl.deleteProgram(program);
    throw new Error(log);
  }
  return program;
}

function buildGlCache(): GlCache | null {
  const canvas = createCanvas(1, 1);
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    return null;
  }

  let program: WebGLProgram;
  try {
    program = createProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
  } catch {
    return null;
  }

  gl.useProgram(program);

  const buffer = gl.createBuffer();
  if (!buffer) {
    return null;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);

  const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
  const positionLoc = gl.getAttribLocation(program, 'a_position');
  const uvLoc = gl.getAttribLocation(program, 'a_uv');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(uvLoc);
  gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

  const texture = gl.createTexture();
  if (!texture) {
    return null;
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);

  const matrixLoc = gl.getUniformLocation(program, 'u_matrix');
  const offsetLoc = gl.getUniformLocation(program, 'u_offset');
  const intensityLoc = gl.getUniformLocation(program, 'u_intensity');

  if (!matrixLoc || !offsetLoc || !intensityLoc) {
    return null;
  }

  return { canvas, gl, matrixLoc, offsetLoc, intensityLoc, texture };
}

function getGlCache(): GlCache | null {
  if (glCache !== null && !glCache.gl.isContextLost()) {
    return glCache;
  }
  glCache = buildGlCache();
  return glCache;
}

function applyLutWebGL(
  source: CanvasImageSource,
  size: { width: number; height: number },
  lut: MatrixLutDefinition,
  intensity: number
): HTMLCanvasElement | null {
  const cache = getGlCache();
  if (!cache) {
    return null;
  }

  const { canvas, gl, matrixLoc, offsetLoc, intensityLoc, texture } = cache;

  canvas.width = size.width;
  canvas.height = size.height;
  gl.viewport(0, 0, size.width, size.height);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    source as unknown as TexImageSource
  );

  gl.uniformMatrix3fv(matrixLoc, false, new Float32Array(lut.matrix));
  gl.uniform3fv(offsetLoc, new Float32Array(lut.offset));
  gl.uniform1f(intensityLoc, clamp(intensity, 0, 1));

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  return canvas;
}

export async function applyLutToCanvas(
  source: CanvasImageSource,
  size: { width: number; height: number },
  lutId: string,
  intensity: number,
  target?: HTMLCanvasElement
): Promise<HTMLCanvasElement> {
  const lut = getLutById(lutId);
  if (!lut || intensity <= 0) {
    const passthrough = target ?? createCanvas(size.width, size.height);
    const ctx = passthrough.getContext('2d');
    if (!ctx) {
      throw new Error('2D context not available');
    }
    passthrough.width = size.width;
    passthrough.height = size.height;
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.drawImage(source, 0, 0, size.width, size.height);
    return passthrough;
  }

  if (lut.kind === 'matrix') {
    // Use 2D fallback as the source of truth to avoid orientation inconsistencies
    // reported on some environments when WebGL is used for matrix LUTs.
    return applyMatrixLutFallbackCanvas(source, size, lut, intensity, target);
  }

  return applyCubeLutFallbackCanvas(source, size, lut, intensity, target);
}
