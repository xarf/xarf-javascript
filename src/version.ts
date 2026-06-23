import { version, xarfSpec } from '../package.json';

/** The XARF specification version this library targets (without the leading "v"). */
export const SPEC_VERSION = xarfSpec.version.replace(/^v/, '');

/** The version of this library, derived from package.json. */
export const VERSION = version;
