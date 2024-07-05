/* eslint-disable no-console */

import Queue from 'queue';
import { useState, useRef, useEffect, useCallback } from 'react';

import { pdf } from '../index';

/**
 * PDF hook
 *
 * @param {Object} [options] hook options
 * @returns {[Object, Function]} pdf state and update function
 */
export const usePDF = ({ document } = {}) => {
  const pdfInstance = useRef(null);

  const [state, setState] = useState({
    url: null,
    blob: null,
    error: null,
    loading: !!document,
  });

  // Setup rendering queue
  useEffect(() => {
    const renderQueue = new Queue({ autostart: true, concurrency: 1 });

    const queueDocumentRender = () => {
      setState((prev) => ({ ...prev, loading: true }));

      renderQueue.splice(0, renderQueue.length, () =>
        state.error ? Promise.resolve() : pdfInstance.current.toBlob(),
      );
    };

    const onRenderFailed = (error) => {
      console.error(error);
      setState((prev) => ({ ...prev, loading: false, error }));
    };

    const onRenderSuccessful = (e) => {
      const blob = e.detail.result?.[0] || null;
      setState({
        blob: blob,
        error: null,
        loading: false,
        url: URL.createObjectURL(blob),
      });
    };

    pdfInstance.current = pdf();
    pdfInstance.current.on('change', queueDocumentRender);
    if (document) {
      pdfInstance.current.updateContainer(document);
    }

    renderQueue.addEventListener('error', onRenderFailed);
    renderQueue.addEventListener('success', onRenderSuccessful);

    return () => {
      renderQueue.end();
      pdfInstance.current.removeListener('change', queueDocumentRender);
    };
  }, []);

  // Revoke old unused url instances
  useEffect(() => {
    return () => {
      if (state.url) {
        URL.revokeObjectURL(state.url);
      }
    };
  }, [state.url]);

  const update = useCallback((newDoc) => {
    pdfInstance.current.updateContainer(newDoc);
  }, []);

  return [state, update];
};

export default usePDF;
