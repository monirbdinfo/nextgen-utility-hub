// RDAP fixtures shaped like real registry answers (ARIN for IPv4, APNIC for IPv6), trimmed.
// Addresses and names are documentation/example values.

export const BOOTSTRAP_V4 = {
  version: '1.0',
  publication: '2026-10-01T00:00:00Z',
  services: [
    [
      ['8.0.0.0/8', '23.0.0.0/8'],
      ['https://rdap.arin.net/registry/', 'http://rdap.arin.net/registry/'],
    ],
    [['1.0.0.0/8', '103.0.0.0/8'], ['https://rdap.apnic.net/']],
    [['103.4.0.0/14'], ['https://rdap.example-nir.net/']],
  ],
};

export const BOOTSTRAP_V6 = {
  version: '1.0',
  services: [
    [['2001:4800::/23', '2600::/12'], ['https://rdap.arin.net/registry/']],
    [['2400::/12', '2001:200::/23'], ['https://rdap.apnic.net/']],
  ],
};

export const ARIN_V4 = {
  rdapConformance: ['rdap_level_0', 'cidr0'],
  objectClassName: 'ip network',
  handle: 'NET-8-8-8-0-2',
  startAddress: '8.8.8.0',
  endAddress: '8.8.8.255',
  ipVersion: 'v4',
  name: 'GOGL',
  type: 'DIRECT ALLOCATION',
  parentHandle: 'NET-8-0-0-0-0',
  status: ['active'],
  cidr0_cidrs: [{ v4prefix: '8.8.8.0', length: 24 }],
  events: [
    { eventAction: 'last changed', eventDate: '2023-12-28T17:24:56-05:00' },
    { eventAction: 'registration', eventDate: '2014-03-14T16:52:05-04:00' },
  ],
  entities: [
    {
      objectClassName: 'entity',
      handle: 'GOGL',
      roles: ['registrant'],
      vcardArray: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'Example Search LLC'],
          [
            'adr',
            { label: '1600 Example Pkwy\nMountain View\nCA\n94043\nUnited States' },
            'text',
            ['', '', '', '', '', '', ''],
          ],
          ['kind', {}, 'text', 'org'],
        ],
      ],
      entities: [
        {
          objectClassName: 'entity',
          handle: 'ABUSE5250-ARIN',
          roles: ['abuse'],
          vcardArray: [
            'vcard',
            [
              ['version', {}, 'text', '4.0'],
              ['fn', {}, 'text', 'Abuse'],
              ['kind', {}, 'text', 'group'],
              ['email', {}, 'text', 'network-abuse@example.com'],
              ['tel', { type: ['work', 'voice'] }, 'text', '+1-650-253-0000'],
            ],
          ],
        },
      ],
    },
  ],
  port43: 'whois.arin.net',
};

export const APNIC_V6 = {
  objectClassName: 'ip network',
  handle: '2001:DB8::/32',
  startAddress: '2001:db8::',
  endAddress: '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff',
  ipVersion: 'v6',
  name: 'EXAMPLE-BD-V6',
  type: 'ALLOCATED PORTABLE',
  country: 'BD',
  status: ['active'],
  cidr0_cidrs: [{ v6prefix: '2001:db8::', length: 32 }],
  events: [{ eventAction: 'registration', eventDate: '2010-05-02T00:00:00Z' }],
  remarks: [{ title: 'description', description: ['Example ISP Limited', 'Dhaka'] }],
  entities: [
    {
      handle: 'IRT-EXAMPLE-BD',
      roles: ['abuse'],
      vcardArray: [
        'vcard',
        [
          ['fn', {}, 'text', 'IRT-EXAMPLE-BD'],
          ['email', {}, 'text', 'abuse@example.net'],
        ],
      ],
    },
    {
      handle: 'ORG-EIL1-AP',
      roles: ['registrant'],
      vcardArray: [
        'vcard',
        [
          ['fn', {}, 'text', 'Example ISP Limited'],
          ['adr', {}, 'text', ['', '', 'House 1, Road 2', 'Dhaka', '', '1212', 'Bangladesh']],
        ],
      ],
    },
  ],
};

/** Shaped like IANA's dns.json (RFC 9224); a small subset. */
export const BOOTSTRAP_DNS = {
  version: '1.0',
  publication: '2026-10-01T00:00:00Z',
  services: [
    [['com', 'net'], ['https://rdap.verisign.com/com/v1/']],
    [['org'], ['https://rdap.publicinterestregistry.org/rdap/']],
    [['uk'], ['http://insecure.example/', 'https://rdap.nominet.uk/uk/']],
  ],
};

/** Shaped like a thin-registry RDAP domain answer (RFC 9083); values invented. */
export const VERISIGN_DOMAIN = {
  objectClassName: 'domain',
  handle: '2336799_DOMAIN_COM-VRSN',
  ldhName: 'EXAMPLE.COM',
  status: ['client delete prohibited', 'client transfer prohibited'],
  entities: [
    {
      objectClassName: 'entity',
      handle: '376',
      roles: ['registrar'],
      vcardArray: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'Example Registrar, Inc.'],
        ],
      ],
    },
  ],
  events: [
    { eventAction: 'registration', eventDate: '1995-08-14T04:00:00Z' },
    { eventAction: 'expiration', eventDate: '2027-08-13T04:00:00Z' },
    { eventAction: 'last changed', eventDate: '2026-08-14T07:01:38Z' },
  ],
  secureDNS: { delegationSigned: true },
  nameservers: [
    { objectClassName: 'nameserver', ldhName: 'A.IANA-SERVERS.NET' },
    { objectClassName: 'nameserver', ldhName: 'B.IANA-SERVERS.NET' },
  ],
};
