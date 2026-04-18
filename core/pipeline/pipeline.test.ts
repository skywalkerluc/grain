import {
  createPipeline,
  deserializePipeline,
  getLatestAdjustments,
  getLatestOperation,
  rotateQuarterTurn,
  serializePipeline,
  setAdjustment,
  setCrop,
  setLut,
  setOverlay,
  toggleFlip,
  upsertOperation
} from './pipeline';

describe('pipeline core', () => {
  it('starts empty with version 1', () => {
    const pipeline = createPipeline();
    expect(pipeline.version).toBe(1);
    expect(pipeline.operations).toHaveLength(0);
  });

  it('serializes and deserializes safely', () => {
    const pipeline = upsertOperation(createPipeline(), {
      id: 'op-1',
      type: 'preset',
      payload: { presetId: 'vintage-01' }
    });

    const serialized = serializePipeline(pipeline);
    const restored = deserializePipeline(serialized);

    expect(restored).toEqual(pipeline);
  });

  it('replaces singleton operation types', () => {
    let pipeline = createPipeline();

    pipeline = upsertOperation(pipeline, {
      id: 'crop-1',
      type: 'crop',
      payload: { x: 0, y: 0, width: 100, height: 100 }
    });

    pipeline = upsertOperation(pipeline, {
      id: 'crop-2',
      type: 'crop',
      payload: { x: 10, y: 10, width: 90, height: 90 }
    });

    expect(pipeline.operations).toHaveLength(1);
    expect(pipeline.operations[0].id).toBe('crop-2');
  });

  it('updates adjustment operation without mutating original reference', () => {
    const base = createPipeline();
    const updated = setAdjustment(base, 'brightness', 40);

    expect(base.operations).toHaveLength(0);
    expect(updated.operations).toHaveLength(1);
    expect(getLatestAdjustments(updated).brightness).toBe(40);
  });

  it('rotates in quarter turns and clears on full turn', () => {
    const base = createPipeline();
    const once = rotateQuarterTurn(base, 'clockwise');
    const twice = rotateQuarterTurn(once, 'clockwise');
    const thrice = rotateQuarterTurn(twice, 'clockwise');
    const full = rotateQuarterTurn(thrice, 'clockwise');

    expect(getLatestOperation(once, 'rotate')?.payload.angle).toBe(90);
    expect(getLatestOperation(twice, 'rotate')?.payload.angle).toBe(180);
    expect(getLatestOperation(thrice, 'rotate')?.payload.angle).toBe(270);
    expect(getLatestOperation(full, 'rotate')).toBeUndefined();
  });

  it('toggles flip flags independently', () => {
    const base = createPipeline();
    const horizontal = toggleFlip(base, 'horizontal');
    const both = toggleFlip(horizontal, 'vertical');
    const onlyVertical = toggleFlip(both, 'horizontal');
    const none = toggleFlip(onlyVertical, 'vertical');

    expect(getLatestOperation(horizontal, 'flip')?.payload).toEqual({
      horizontal: true,
      vertical: false
    });
    expect(getLatestOperation(both, 'flip')?.payload).toEqual({
      horizontal: true,
      vertical: true
    });
    expect(getLatestOperation(onlyVertical, 'flip')?.payload).toEqual({
      horizontal: false,
      vertical: true
    });
    expect(getLatestOperation(none, 'flip')).toBeUndefined();
  });

  it('stores crop as singleton operation', () => {
    const base = createPipeline();
    const first = setCrop(base, { x: 0, y: 0, width: 300, height: 400 });
    const second = setCrop(first, { x: 10, y: 20, width: 200, height: 250 });

    expect(second.operations.filter((operation) => operation.type === 'crop')).toHaveLength(1);
    expect(getLatestOperation(second, 'crop')?.payload).toEqual({
      x: 10,
      y: 20,
      width: 200,
      height: 250
    });
  });

  it('stores LUT as singleton operation', () => {
    const base = createPipeline();
    const first = setLut(base, 'cinematic-teal', 0.7);
    const second = setLut(first, 'cinematic-teal', 1);

    expect(second.operations.filter((operation) => operation.type === 'lut')).toHaveLength(1);
    expect(getLatestOperation(second, 'lut')?.payload).toEqual({
      lutId: 'cinematic-teal',
      intensity: 1
    });
  });

  it('stores overlay as singleton operation', () => {
    const base = createPipeline();
    const first = setOverlay(base, {
      overlayId: 'film-grain',
      opacity: 0.4,
      blendMode: 'overlay'
    });
    const second = setOverlay(first, {
      overlayId: 'paper-texture',
      opacity: 0.2,
      blendMode: 'multiply'
    });

    expect(second.operations.filter((operation) => operation.type === 'overlay')).toHaveLength(1);
    expect(getLatestOperation(second, 'overlay')?.payload).toEqual({
      overlayId: 'paper-texture',
      opacity: 0.2,
      blendMode: 'multiply'
    });
  });
});
