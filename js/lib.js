// React + htm: escreve componentes com html`...` sem precisar de Babel/compilação.
// React e ReactDOM vêm de js/vendor (carregados no index.html).
import htm from "./vendor/htm.js";

const React = window.React;
export const html = htm.bind(React.createElement);
export const { useState, useEffect, useRef, useCallback, useMemo, Fragment } = React;
export const createRoot = (el) => window.ReactDOM.createRoot(el);
