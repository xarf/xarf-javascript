# Field Naming Conventions

## snake_case Throughout

The XARF v4.0.0 specification uses **snake_case** for all field names, and this library follows that convention in both input and output.

### Example

```typescript
import { XARFGenerator } from '@xarf/xarf-javascript';

const generator = new XARFGenerator();

const report = generator.generateReport({
  category: 'connection',
  type: 'ddos',
  source_identifier: '192.0.2.100',
  evidence_source: 'honeypot',
  reporter: {
    org: 'Security Team',
    contact: 'security@example.com',
    domain: 'example.com',
  },
  sender: {
    org: 'SOC',
    contact: 'soc@example.com',
    domain: 'example.com',
  },
  destination_ip: '203.0.113.50',
  protocol: 'tcp',
});
```

### Additional Fields

The `additionalFields` object should also use snake_case field names:

```typescript
generator.generateReport({
  // ...
  additionalFields: {
    destination_ip: '203.0.113.50',
    destination_port: 80,
    packet_count: 1500,
  },
});
```

## See Also

- [XARF v4.0.0 Specification](https://xarf.org/spec/)
- [Generator Examples](../examples/snake-case-usage.ts)
- [API Reference](./API.md)
