// JEPI — every file in src/js is pasted into ONE function scope, in file-name order.
// A file may use what an earlier file defines. Top-level code runs at load time, so keep
// start-up actions in 390-boot.js (after every file has defined its variables).
(function(){
