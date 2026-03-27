// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

/**
 * BreadcrumbContext — lets any page within the management shell register
 * a human-readable name for an entity ID, so the breadcrumb replaces
 * raw IDs with real names (e.g., "abc123" → "Acme Corp").
 *
 * Usage in a page:
 *   const { setEntityName } = useBreadcrumb();
 *   useEffect(() => { if (org) setEntityName(orgId, org.name); }, [org]);
 */

import { createContext, useContext, useState, useCallback } from 'react';

const BreadcrumbContext = createContext({ entityNames: {}, setEntityName: () => {} });

export function BreadcrumbProvider({ children }) {
  const [entityNames, setEntityNames] = useState({});

  const setEntityName = useCallback((id, name) => {
    if (!id || !name) return;
    setEntityNames(prev => prev[id] === name ? prev : { ...prev, [id]: name });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ entityNames, setEntityName }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  return useContext(BreadcrumbContext);
}
