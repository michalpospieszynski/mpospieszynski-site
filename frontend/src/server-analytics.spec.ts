import { posthogTarget } from './server-analytics';

describe('posthogTarget', () => {
  it('sends events to the EU API host, query string included', () => {
    expect(posthogTarget('/e/?compression=gzip-js&ver=1.435.8')).toBe(
      'https://eu.i.posthog.com/e/?compression=gzip-js&ver=1.435.8',
    );
    expect(posthogTarget('/flags/?v=2')).toBe('https://eu.i.posthog.com/flags/?v=2');
  });

  it('loads scripts (recorder, toolbar) and the remote config from the EU assets host', () => {
    expect(posthogTarget('/static/recorder.js?v=1.435.8')).toBe(
      'https://eu-assets.i.posthog.com/static/recorder.js?v=1.435.8',
    );
    expect(posthogTarget('/array/phc_key/config.js')).toBe(
      'https://eu-assets.i.posthog.com/array/phc_key/config.js',
    );
  });
});
