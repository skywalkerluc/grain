import { getLutById, type LutDefinition } from './luts';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function applyLutFallbackCanvas(
  source: CanvasImageSource,
  size: { width: number; height: number },
  lut: LutDefinition,
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

function applyLutWebGL(
  source: CanvasImageSource,
  size: { width: number; height: number },
  lut: LutDefinition,
  intensity: number,
  target?: HTMLCanvasElement
): HTMLCanvasElement | null {
  const canvas = target ?? createCanvas(size.width, size.height);
  canvas.width = size.width;
  canvas.height = size.height;

  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    return null;
  }

  const vertexSource = `
    attribute vec2 a_position;
    attribute vec2 a_uv;
    varying vec2 v_uv;

    void main() {
      v_uv = a_uv;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
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

  let program: WebGLProgram;
  try {
    program = createProgram(gl, vertexSource, fragmentSource);
  } catch {
    return null;
  }

  gl.viewport(0, 0, size.width, size.height);
  gl.useProgram(program);

  const vertices = new Float32Array([
    -1, -1, 0, 1,
    1, -1, 1, 1,
    -1, 1, 0, 0,
    -1, 1, 0, 0,
    1, -1, 1, 1,
    1, 1, 1, 0
  ]);

  const buffer = gl.createBuffer();
  if (!buffer) {
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const uvLocation = gl.getAttribLocation(program, 'a_uv');

  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(uvLocation);
  gl.vertexAttribPointer(
    uvLocation,
    2,
    gl.FLOAT,
    false,
    stride,
    2 * Float32Array.BYTES_PER_ELEMENT
  );

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
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    source as unknown as TexImageSource
  );

  const textureLocation = gl.getUniformLocation(program, 'u_texture');
  const matrixLocation = gl.getUniformLocation(program, 'u_matrix');
  const offsetLocation = gl.getUniformLocation(program, 'u_offset');
  const intensityLocation = gl.getUniformLocation(program, 'u_intensity');

  gl.uniform1i(textureLocation, 0);
  gl.uniformMatrix3fv(matrixLocation, false, new Float32Array(lut.matrix));
  gl.uniform3fv(offsetLocation, new Float32Array(lut.offset));
  gl.uniform1f(intensityLocation, clamp(intensity, 0, 1));
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

  const webgl = applyLutWebGL(source, size, lut, intensity, target);
  if (webgl) {
    return webgl;
  }

  return applyLutFallbackCanvas(source, size, lut, intensity, target);
}
