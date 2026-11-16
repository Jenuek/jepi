// JEPI — the entry: the data layer (window.JEPI_DATA), the screens (window.JEPI_UI), then start-up (app/flow/boot.ts).
import { installData } from './data';
import { installBridge } from './bridge';
import { boot } from './flow/boot';

installData();
installBridge();
boot();
