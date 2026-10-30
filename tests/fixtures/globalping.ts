/**
 * Globalping answers shaped like the examples in its published OpenAPI description
 * (jsdelivr/globalping, docs/measurement). Values are invented for tests.
 */
export const CREATED = { id: 'PY8lHBpNhG0rOVpp', probesCount: 1 };

const probe = {
  continent: 'AS',
  region: 'Southern Asia',
  country: 'BD',
  state: null,
  city: 'Dhaka',
  asn: 63526,
  longitude: 90.4,
  latitude: 23.7,
  network: 'Example Networks Ltd',
  tags: [],
  resolvers: ['private'],
};

export const PING_RUNNING = {
  id: 'PY8lHBpNhG0rOVpp',
  type: 'ping',
  status: 'in-progress',
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.500Z',
  target: 'example.com',
  probesCount: 1,
  results: [{ probe, result: { status: 'in-progress', rawOutput: 'PING example.com' } }],
};

export const PING_DONE = {
  ...PING_RUNNING,
  status: 'finished',
  results: [
    {
      probe,
      result: {
        status: 'finished',
        rawOutput:
          'PING example.com (93.184.215.14) 56(84) bytes of data.\n3 packets transmitted, 3 received',
        resolvedAddress: '93.184.215.14',
        resolvedHostname: 'example.com',
        timings: [{ rtt: 12.1, ttl: 55 }],
        stats: { min: 11.5, max: 13.2, avg: 12.3, total: 3, loss: 0, rcv: 3, drop: 0 },
      },
    },
  ],
};

export const TRACE_DONE = {
  id: 'trace1',
  type: 'traceroute',
  status: 'finished',
  results: [
    {
      probe,
      result: {
        status: 'finished',
        rawOutput: 'traceroute to 8.8.8.8',
        resolvedAddress: '8.8.8.8',
        resolvedHostname: 'dns.google',
        hops: [
          {
            resolvedAddress: '10.0.0.1',
            resolvedHostname: 'gw.local',
            timings: [{ rtt: 1.2 }, { rtt: 1.4 }],
          },
          { resolvedAddress: null, resolvedHostname: null, timings: [] },
          { resolvedAddress: '8.8.8.8', resolvedHostname: 'dns.google', timings: [{ rtt: 20.5 }] },
        ],
      },
    },
  ],
};
