/**
 * A registry to map attached worklets by their audio-context
 */
export type WorkletGraph = {
  node?: AudioWorkletNode;
  handlers: Array<(this: MessagePort, ev: MessageEvent) => void>;
};

export const registeredWorklets: Map<AudioContext, Record<string, WorkletGraph>> = new Map();

export const createWorkletFromSrc = (workletName: string, workletSrc: string): string => {
  const script = new Blob([`registerProcessor("${workletName}", ${workletSrc})`], {
    type: 'application/javascript',
  });

  return URL.createObjectURL(script);
};
