import { logger } from '../../utils/logger';

describe('Logger', () => {
  const originalConsole = { ...console };

  beforeEach(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
  });

  it('calls console.log in dev mode', () => {
    logger.log('test message');
    expect(console.log).toHaveBeenCalledWith('test message');
  });

  it('calls console.warn in dev mode', () => {
    logger.warn('warning');
    expect(console.warn).toHaveBeenCalledWith('warning');
  });

  it('calls console.error in dev mode', () => {
    logger.error('error');
    expect(console.error).toHaveBeenCalledWith('error');
  });

  it('calls console.info in dev mode', () => {
    logger.info('info');
    expect(console.info).toHaveBeenCalledWith('info');
  });

  it('passes multiple arguments', () => {
    logger.log('msg', 42, { key: 'value' });
    expect(console.log).toHaveBeenCalledWith('msg', 42, { key: 'value' });
  });
});
