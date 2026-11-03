// JEPI — React entry. Runs before the old code (src/js), so the old code can use the data layer
// (window.JEPI_DATA) and hand screens to React (window.JEPI_UI).
import { installData } from './data';
import { installBridge } from './bridge';

installData();
installBridge();
