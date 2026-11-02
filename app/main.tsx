// JEPI — React entry. Runs before the old code (src/js), so the old code can hand screens to React.
import { installBridge } from './bridge';

installBridge();
