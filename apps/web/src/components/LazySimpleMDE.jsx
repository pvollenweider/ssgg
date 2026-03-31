// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { lazy, Suspense } from 'react';

const SimpleMDE = lazy(() => import('react-simplemde-editor').then(mod => {
  // Side-effect: load the CSS when the editor is first requested
  import('easymde/dist/easymde.min.css');
  return mod;
}));

/**
 * Lazy-loaded SimpleMDE wrapper.
 * Defers loading of react-simplemde-editor + easymde (~300 KB) until first render.
 * Accepts the same props as <SimpleMDE />.
 */
export default function LazySimpleMDE(props) {
  return (
    <Suspense fallback={
      <div className="border rounded p-3 text-muted" style={{ minHeight: props.options?.minHeight || '180px' }}>
        <i className="fas fa-spinner fa-spin me-2" />Loading editor...
      </div>
    }>
      <SimpleMDE {...props} />
    </Suspense>
  );
}
