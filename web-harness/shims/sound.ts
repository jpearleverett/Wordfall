/** Harness shim for src/services/sound — playSound is a no-op. */
export const soundManager = {
  async init(): Promise<void> {},
  async playSound(_slot: string): Promise<void> {},
  async setVolume(_v: number): Promise<void> {},
  async pauseBgm(): Promise<void> {},
  async resumeBgm(): Promise<void> {},
  async crossfadeToBgm(_slot: string): Promise<void> {},
};
export default soundManager;
